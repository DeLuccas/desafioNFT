import { gql } from "graphql-tag";
import { GraphQLError } from "graphql";
import { LRUCache } from "lru-cache";
import DataLoader from "dataloader";
import { db, PlanoContratado, Plano, Pessoa } from "./data.js";
import type { Request } from "express";
import jwt from "jsonwebtoken";

export const responseCache = new LRUCache<string, any>({
  max: 500,
  ttl: 30_000,
});

const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 60_000;
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX) || 60;
const rateMap = new Map<string, { count: number; start: number }>();
export function checkRateLimit(key: string) {
  const now = Date.now();
  const record = rateMap.get(key) || { count: 0, start: now };
  if (now - record.start > RATE_LIMIT_WINDOW_MS) {
    record.count = 0;
    record.start = now;
  }
  record.count++;
  rateMap.set(key, record);
  if (record.count > RATE_LIMIT_MAX)
    throw new Error("Rate limit excedido. Tente novamente mais tarde.");
}

export const typeDefs = gql`
  type AuthRequestResult {
    telefone: String!
    mensagem: String!
    codigoDebug: String
  }
  type AuthPayload {
    token: String!
    pessoa: Pessoa!
  }
  type Pessoa {
    id: ID!
    nome: String!
    cpf: String!
    email: String!
    telefone: String!
    planosContratados(
      status: StatusPlano
      limit: Int
      offset: Int
    ): [PlanoContratado!]!
  }
  type Plano {
    id: ID!
    nome: String!
    valor_credito: Float!
    parcelas: Int!
    taxa_adm_percentual: Float!
    contratos(status: StatusPlano, limit: Int, offset: Int): [PlanoContratado!]!
  }
  enum StatusPlano {
    ativo
    contemplado
    inadimplente
    quitado
  }
  type PlanoContratado {
    id: ID!
    pessoa: Pessoa!
    plano: Plano!
    data_contratacao: String!
    status: StatusPlano!
    parcelas_pagas: Int!
    progresso_percentual: Float!
  }
  type PageInfoOffset {
    totalCount: Int!
    limit: Int!
    offset: Int!
    hasMore: Boolean!
  }
  type PessoaConnection {
    nodes: [Pessoa!]!
    pageInfo: PageInfoOffset!
  }
  type PlanoConnection {
    nodes: [Plano!]!
    pageInfo: PageInfoOffset!
  }
  type PlanoContratadoConnection {
    nodes: [PlanoContratado!]!
    pageInfo: PageInfoOffset!
  }
  input PaginationInput {
    limit: Int = 5
    offset: Int = 0
  }
  type StatusStat {
    status: StatusPlano!
    total: Int!
  }
  type Query {
    pessoas(pagination: PaginationInput): PessoaConnection!
    pessoa(id: ID!): Pessoa
    planos(pagination: PaginationInput): PlanoConnection!
    plano(id: ID!): Plano
    planosContratados(
      status: StatusPlano
      pagination: PaginationInput
    ): PlanoContratadoConnection!
    planoContratado(id: ID!): PlanoContratado
    statusCounts: [StatusStat!]!
    me: Pessoa
  }

  type Mutation {
    "Inicia login gerando (fake) um código de 6 dígitos para o telefone informado"
    loginTelefone(telefone: String!): AuthRequestResult!
    "Confirma o código recebido e retorna JWT"
    confirmarCodigo(telefone: String!, codigo: String!): AuthPayload!
  }
`;

interface Pagination {
  limit?: number;
  offset?: number;
}
function paginate<T>(array: T[], { limit = 5, offset = 0 }: Pagination = {}) {
  const total = array.length;
  const slice = array.slice(offset, offset + limit);
  return {
    nodes: slice,
    pageInfo: {
      totalCount: total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

const pessoaLoader = new DataLoader<number, Pessoa | undefined>(
  async (ids: readonly number[]) =>
    ids.map((id: number) => db.pessoas.find((p: Pessoa) => p.id === id))
);
const planoLoader = new DataLoader<number, Plano | undefined>(
  async (ids: readonly number[]) =>
    ids.map((id: number) => db.planos.find((p: Plano) => p.id === id))
);

export interface GraphQLContext {
  loaders: {
    pessoaLoader: typeof pessoaLoader;
    planoLoader: typeof planoLoader;
  };
  key: string;
  user?: Pessoa;
  isAdmin: boolean;
  authError?: string; // motivo da falha de autenticação
  hadAuthHeader?: boolean;
}
export const createContext = async ({
  req,
}: {
  req: Request;
}): Promise<GraphQLContext> => {
  const key = (req.headers["x-api-key"] as string) || req.ip || "anon";
  checkRateLimit(key);
  let user: Pessoa | undefined;
  let authError: string | undefined;
  const adminPhones = (process.env.ADMIN_PHONES || "")
    .split(/[,;]\s*/)
    .filter(Boolean);
  const auth = req.headers.authorization;
  const hadAuthHeader = !!auth;
  if (auth?.startsWith("Bearer ")) {
    const token = auth.substring(7);
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev") as any;
      if (decoded?.pessoaId) {
        user = db.pessoas.find((p) => p.id === decoded.pessoaId);
        if (!user) authError = "usuario_nao_encontrado";
      } else {
        authError = "payload_invalido";
      }
    } catch (e: any) {
      if (e?.name === "TokenExpiredError") authError = "token_expirado";
      else authError = "token_invalido";
      if (process.env.LOG_AUTH === "1") {
        console.error("[AUTH] Falha verificação token:", e?.message);
      }
    }
  } else if (auth) {
    authError = "formato_autorizacao_invalido"; // header presente mas não Bearer
  }
  if (process.env.LOG_AUTH === "1") {
    console.log("[AUTH] header=", auth, "user=", user?.id, "erro=", authError);
  }
  const isAdmin = !!user && adminPhones.includes(user.telefone);
  return {
    loaders: { pessoaLoader, planoLoader },
    key,
    user,
    isAdmin,
    authError,
    hadAuthHeader,
  };
};

// Armazenamento in-memory de códigos de verificação { telefone: { codigo, exp, tentativas } }
const loginCodes = new Map<
  string,
  { codigo: string; exp: number; tentativas: number }
>();
function gerarCodigo(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutos
// (logout removido) nenhum controle de tokens revogados mantido em memória

function unauthenticated(ctx?: GraphQLContext) {
  let motivo = ctx?.authError;
  let mensagemBase = "Não autenticado";
  if (motivo === "token_expirado") mensagemBase = "Token expirado";
  else if (motivo === "token_invalido") mensagemBase = "Token inválido";
  else if (motivo === "usuario_nao_encontrado")
    mensagemBase = "Usuário não encontrado";
  else if (motivo === "payload_invalido")
    mensagemBase = "Token payload inválido";
  else if (motivo === "formato_autorizacao_invalido")
    mensagemBase = "Header Authorization deve usar 'Bearer'";
  return new GraphQLError(mensagemBase, {
    extensions: { code: "UNAUTHENTICATED", motivo },
  });
}

export const resolvers = {
  Query: {
    pessoas: (
      _: unknown,
      { pagination }: { pagination?: Pagination },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw unauthenticated(ctx);
      const cacheKey = "pessoas:" + JSON.stringify(pagination);
      if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);
      const result = paginate(db.pessoas, pagination || {});
      responseCache.set(cacheKey, result);
      return result;
    },
    pessoa: (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) throw unauthenticated(ctx);
      return db.pessoas.find((p: Pessoa) => p.id == +id) || null;
    },
    planos: (
      _: unknown,
      { pagination }: { pagination?: Pagination },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw unauthenticated(ctx);
      const cacheKey =
        "planos:" + JSON.stringify(pagination) + ":admin=" + ctx.isAdmin;
      if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);
      const base = ctx.isAdmin ? db.planos : db.planos.slice(0, 3);
      const result = paginate(base, pagination || {});
      responseCache.set(cacheKey, result);
      return result;
    },
    plano: (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      if (!ctx.user) throw unauthenticated(ctx);
      return db.planos.find((p: Plano) => p.id == +id);
    },
    planosContratados: (
      _: unknown,
      { status, pagination }: { status?: string; pagination?: Pagination },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw unauthenticated(ctx);
      let list = db.planos_contratados as PlanoContratado[];
      if (status) list = list.filter((c) => c.status === status);
      const cacheKey = "contratos:" + status + ":" + JSON.stringify(pagination);
      if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);
      const result = paginate(list, pagination || {});
      responseCache.set(cacheKey, result);
      return result;
    },
    planoContratado: (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext
    ) => {
      if (!ctx.user) throw unauthenticated(ctx);
      return db.planos_contratados.find((c: PlanoContratado) => c.id == +id);
    },
    statusCounts: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw unauthenticated(ctx);
      const counts: Record<string, number> = {};
      for (const c of db.planos_contratados)
        counts[c.status] = (counts[c.status] || 0) + 1;
      return Object.entries(counts).map(([status, total]) => ({
        status,
        total,
      }));
    },
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => {
      if (!ctx.user) throw unauthenticated(ctx);
      return ctx.user;
    },
  },
  Mutation: {
    loginTelefone: (_: unknown, { telefone }: { telefone: string }) => {
      const pessoa = db.pessoas.find((p) => p.telefone === telefone);
      if (!pessoa) throw new Error("Telefone não cadastrado");
      const codigo = gerarCodigo();
      loginCodes.set(telefone, {
        codigo,
        exp: Date.now() + CODE_TTL_MS,
        tentativas: 0,
      });
      // Em produção: enviar via SMS. Aqui retornamos mensagem e (debug) código.
      return {
        telefone,
        mensagem: "Código enviado (simulado)",
        codigoDebug: codigo,
      };
    },
    confirmarCodigo: async (
      _: unknown,
      { telefone, codigo }: { telefone: string; codigo: string }
    ) => {
      const entry = loginCodes.get(telefone);
      if (!entry) throw new Error("Solicite o código primeiro");
      if (Date.now() > entry.exp) {
        loginCodes.delete(telefone);
        throw new Error("Código expirado");
      }
      entry.tentativas++;
      if (entry.tentativas > 5) {
        loginCodes.delete(telefone);
        throw new Error("Muitas tentativas");
      }
      if (entry.codigo !== codigo) throw new Error("Código inválido");
      loginCodes.delete(telefone);
      const pessoa = db.pessoas.find((p) => p.telefone === telefone)!;
      const token = jwt.sign(
        { pessoaId: pessoa.id },
        process.env.JWT_SECRET || "dev",
        { expiresIn: "1h" }
      );
      return { token, pessoa };
    },
  },
  Pessoa: {
    planosContratados: (
      pessoa: Pessoa,
      {
        status,
        limit = 5,
        offset = 0,
      }: { status?: string; limit?: number; offset?: number }
    ) => {
      let list = db.planos_contratados.filter(
        (c: PlanoContratado) => c.pessoa_id === pessoa.id
      );
      if (status)
        list = list.filter((c: PlanoContratado) => c.status === status);
      return list.slice(offset, offset + limit);
    },
  },
  Plano: {
    contratos: (
      plano: Plano,
      {
        status,
        limit = 5,
        offset = 0,
      }: { status?: string; limit?: number; offset?: number }
    ) => {
      let list = db.planos_contratados.filter(
        (c: PlanoContratado) => c.plano_id === plano.id
      );
      if (status)
        list = list.filter((c: PlanoContratado) => c.status === status);
      return list.slice(offset, offset + limit);
    },
  },
  PlanoContratado: {
    pessoa: (
      contrato: PlanoContratado,
      _: unknown,
      { loaders }: GraphQLContext
    ) => loaders.pessoaLoader.load(contrato.pessoa_id),
    plano: (
      contrato: PlanoContratado,
      _: unknown,
      { loaders }: GraphQLContext
    ) => loaders.planoLoader.load(contrato.plano_id),
    progresso_percentual: (contrato: PlanoContratado) => {
      const plano = db.planos.find((p: Plano) => p.id === contrato.plano_id);
      if (!plano) return 0;
      return +(
        Math.min(1, contrato.parcelas_pagas / plano.parcelas) * 100
      ).toFixed(2);
    },
  },
};
