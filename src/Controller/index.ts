import { Controller } from "./controller.js";

const controller = new Controller();

// Exemplo: Criar uma nova pessoa
const novaPessoa = controller.handleCreatePessoa({
  nome: "Novo Usuário",
  cpf: "123.456.789-10",
  email: "novo@example.com",
  telefone: "+55 11 99999-9999",
  //@ts-ignore
});

console.log("Nova Pessoa Criada:", novaPessoa);

// Exemplo: Listar todas as pessoas
const todasPessoas = controller.handleGetAllPessoas();
console.log("Todas as Pessoas:", todasPessoas);

// Você pode adicionar mais exemplos para outros métodos e entidades
