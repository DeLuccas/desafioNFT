import { gql } from "graphql-tag";
import { LRUCache } from "lru-cache";
import DataLoader from "dataloader";
import { db, PlanoContratado, Plano, Pessoa } from "./data.js";
import type { Request } from "express";

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
}
export const createContext = async ({
  req,
}: {
  req: Request;
}): Promise<GraphQLContext> => {
  const key = (req.headers["x-api-key"] as string) || req.ip || "anon";
  checkRateLimit(key);
  return { loaders: { pessoaLoader, planoLoader }, key };
};

export const resolvers = {
  Query: {
    pessoas: (_: unknown, { pagination }: { pagination?: Pagination }) => {
      const cacheKey = "pessoas:" + JSON.stringify(pagination);
      if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);
      const result = paginate(db.pessoas, pagination || {});
      responseCache.set(cacheKey, result);
      return result;
    },
    pessoa: (_: unknown, { id }: { id: string }) =>
      db.pessoas.find((p: Pessoa) => p.id == +id),
    planos: (_: unknown, { pagination }: { pagination?: Pagination }) => {
      const cacheKey = "planos:" + JSON.stringify(pagination);
      if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);
      const result = paginate(db.planos, pagination || {});
      responseCache.set(cacheKey, result);
      return result;
    },
    plano: (_: unknown, { id }: { id: string }) =>
      db.planos.find((p: Plano) => p.id == +id),
    planosContratados: (
      _: unknown,
      { status, pagination }: { status?: string; pagination?: Pagination }
    ) => {
      let list = db.planos_contratados as PlanoContratado[];
      if (status) list = list.filter((c) => c.status === status);
      const cacheKey = "contratos:" + status + ":" + JSON.stringify(pagination);
      if (responseCache.has(cacheKey)) return responseCache.get(cacheKey);
      const result = paginate(list, pagination || {});
      responseCache.set(cacheKey, result);
      return result;
    },
    planoContratado: (_: unknown, { id }: { id: string }) =>
      db.planos_contratados.find((c: PlanoContratado) => c.id == +id),
    statusCounts: () => {
      const counts: Record<string, number> = {};
      for (const c of db.planos_contratados)
        counts[c.status] = (counts[c.status] || 0) + 1;
      return Object.entries(counts).map(([status, total]) => ({
        status,
        total,
      }));
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
