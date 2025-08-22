# Desafio NFT: API GraphQL para Gerenciar Consórcios

Ei, bem-vindo ao **Desafio NFT**! Essa é uma API GraphQL super simples e poderosa para gerenciar pessoas, planos de consórcio e planos contratados. Usamos Apollo Server para tornar tudo mágico e fácil. Esqueça endpoints REST complicados – aqui é só um endpoint e queries/mutations que fazem o trabalho!

## Por Que Essa API é Incrível?

- **Fácil de Usar**: GraphQL permite pedir exatamente o que você quer, sem overfetching.
- **CRUD Completo**: Crie, leia, atualize e delete dados de forma intuitiva.
- **In-Memory por Enquanto**: Dados são armazenados na memória (baseados em `data.ts`), mas podemos evoluir para um banco real se quiser!

## Instalação Rápida (5 Minutos e Pronto!)

1. **Clone o Repo**: `git clone [seu-repo-aqui]`
2. **Entre na Pasta**: `cd desafioNFT`
3. **Instale Dependências**: `npm install`
4. **Rode o Servidor**: `ts-node src/app.ts`
   - O servidor vai subir em `http://localhost:4000` (ou a porta que você configurar).
5. **Acesse o Playground**: Abra no navegador `http://localhost:4000` – é o GraphQL Playground, onde você testa tudo!

Pronto! Agora você tem uma API rodando. Vamos aos endpoints? 😎

## Como Usar: O Playground GraphQL

No Playground (http://localhost:4000), você vê o schema à direita. Escreva queries/mutations na esquerda, clique em "Play" e veja a mágica acontecer!

### Dicas Rápidas:

- **Queries**: Para ler dados (GET-like).
- **Mutations**: Para criar/atualizar/deletar (POST/PUT/DELETE-like).
- **Exemplos**: Copie e cole abaixo no Playground para testar.

## Endpoints Sensacionais (Schema GraphQL)

### 1. **Pessoas** (Gerencie usuários)

- **Listar Todas**: `pessoas`
- **Pegar Uma por ID**: `pessoa(id: Int!)`
- **Criar Nova**: `createPessoa(nome: String!, cpf: String!, email: String!, telefone: String!)`
- **Atualizar**: `updatePessoa(id: Int!, [campos opcionais])`
- **Deletar**: `deletePessoa(id: Int!)`

**Exemplo de Query (Listar e Pegar Uma):**

```
query {
  pessoas {
    id
    nome
    email
  }
  pessoa(id: 1) {
    nome
    cpf
  }
}
```

**Exemplo de Mutation (Criar e Atualizar):**

```
mutation {
  createPessoa(nome: "Super Herói", cpf: "123.456.789-00", email: "heroi@exemplo.com", telefone: "+55 11 99999-9999") {
    id
    nome
  }

  updatePessoa(id: 1, nome: "Nome Atualizado") {
    id
    nome
  }

  deletePessoa(id: 10)
}
```

### 2. **Planos** (Planos de Consórcio Disponíveis)

- **Listar Todos**: `planos`
- **Pegar Um por ID**: `plano(id: Int!)`
- **Criar Novo**: `createPlano(nome: String!, valor_credito: Float!, parcelas: Int!, taxa_adm_percentual: Float!)`
- **Atualizar**: `updatePlano(id: Int!, [campos opcionais])`
- **Deletar**: `deletePlano(id: Int!)`

**Exemplo de Query:**

```
query {
  planos {
    id
    nome
    valor_credito
  }
}
```

**Exemplo de Mutation:**

```
mutation {
  createPlano(nome: "Plano Épico", valor_credito: 100000, parcelas: 60, taxa_adm_percentual: 15) {
    id
    nome
  }
}
```

### 3. **Planos Contratados** (Contratos Ativos)

- **Listar Todos**: `planosContratados`
- **Pegar Um por ID**: `planoContratado(id: Int!)`
- **Criar Novo**: `createPlanoContratado(pessoa_id: Int!, plano_id: Int!, data_contratacao: String!, status: StatusPlano!, parcelas_pagas: Int!)`
- **Atualizar**: `updatePlanoContratado(id: Int!, [campos opcionais])`
- **Deletar**: `deletePlanoContratado(id: Int!)`

**Exemplo de Query:**

```
query {
  planosContratados {
    id
    pessoa_id
    status
  }
}
```

**Exemplo de Mutation:**

```
mutation {
  createPlanoContratado(pessoa_id: 1, plano_id: 101, data_contratacao: "2023-10-01", status: ativo, parcelas_pagas: 0) {
    id
    status
  }

  updatePlanoContratado(id: 1001, status: contemplado) {
    id
    status
  }
}
```

## Dicas Finais para Virar um Mestre

- **Erros?**: Se algo der errado (ex: ID não encontrado), o GraphQL retorna mensagens claras.
- **Expanda!**: Quer adicionar autenticação ou persistência em banco? Me avise!
- **Teste com Ferramentas**: Use Postman ou Insomnia para queries GraphQL se preferir.
- **Divirta-se**: Essa API é como um super-herói – rápida, flexível e pronta para ação!

Qualquer dúvida, é só perguntar. Vamos codar! 🚀
