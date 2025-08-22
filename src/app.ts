import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { Controller } from "./Controller/controller.js";

const controller = new Controller();

const typeDefs = `
  type Pessoa {
    id: Int
    nome: String
    cpf: String
    email: String
    telefone: String
  }

  type Plano {
    id: Int
    nome: String
    valor_credito: Float
    parcelas: Int
    taxa_adm_percentual: Float
  }

  enum StatusPlano {
    ativo
    contemplado
    inadimplente
    quitado
  }

  type PlanoContratado {
    id: Int
    pessoa_id: Int
    plano_id: Int
    data_contratacao: String
    status: StatusPlano
    parcelas_pagas: Int
  }

  type Query {
    pessoas: [Pessoa]
    pessoa(id: Int!): Pessoa
    planos: [Plano]
    plano(id: Int!): Plano
    planosContratados: [PlanoContratado]
    planoContratado(id: Int!): PlanoContratado
  }

  type Mutation {
    createPessoa(nome: String!, cpf: String!, email: String!, telefone: String!): Pessoa
    updatePessoa(id: Int!, nome: String, cpf: String, email: String, telefone: String): Pessoa
    deletePessoa(id: Int!): Boolean

    createPlano(nome: String!, valor_credito: Float!, parcelas: Int!, taxa_adm_percentual: Float!): Plano
    updatePlano(id: Int!, nome: String, valor_credito: Float, parcelas: Int, taxa_adm_percentual: Float): Plano
    deletePlano(id: Int!): Boolean

    createPlanoContratado(pessoa_id: Int!, plano_id: Int!, data_contratacao: String!, status: StatusPlano!, parcelas_pagas: Int!): PlanoContratado
    updatePlanoContratado(id: Int!, pessoa_id: Int, plano_id: Int, data_contratacao: String, status: StatusPlano, parcelas_pagas: Int): PlanoContratado
    deletePlanoContratado(id: Int!): Boolean
  }
`;

const resolvers = {
  Query: {
    pessoas: () => controller.handleGetAllPessoas(),
    pessoa: (_: any, { id }: { id: number }) =>
      controller.handleGetPessoaById(id),
    planos: () => controller.handleGetAllPlanos(),
    plano: (_: any, { id }: { id: number }) =>
      controller.handleGetPlanoById(id),
    planosContratados: () => controller.handleGetAllPlanosContratados(),
    planoContratado: (_: any, { id }: { id: number }) =>
      controller.handleGetPlanoContratadoById(id),
  },
  Mutation: {
    createPessoa: (_: any, args: any) => controller.handleCreatePessoa(args),
    updatePessoa: (
      _: any,
      { id, ...updates }: { id: number; [key: string]: any }
    ) => controller.handleUpdatePessoa(id, updates),
    deletePessoa: (_: any, { id }: { id: number }) =>
      controller.handleDeletePessoa(id),

    createPlano: (_: any, args: any) => controller.handleCreatePlano(args),
    updatePlano: (
      _: any,
      { id, ...updates }: { id: number; [key: string]: any }
    ) => controller.handleUpdatePlano(id, updates),
    deletePlano: (_: any, { id }: { id: number }) =>
      controller.handleDeletePlano(id),

    createPlanoContratado: (_: any, args: any) =>
      controller.handleCreatePlanoContratado(args),
    updatePlanoContratado: (
      _: any,
      { id, ...updates }: { id: number; [key: string]: any }
    ) => controller.handleUpdatePlanoContratado(id, updates),
    deletePlanoContratado: (_: any, { id }: { id: number }) =>
      controller.handleDeletePlanoContratado(id),
  },
};

(async () => {
  const server = new ApolloServer({ typeDefs, resolvers });

  const { url } = await startStandaloneServer(server, {
    listen: { port: 4000 },
  });

  console.log(`🚀 Server ready at ${url}`);
})();
