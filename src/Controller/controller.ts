import { Service } from "../Service/service.js";

export class Controller {
  private service: Service;

  constructor() {
    this.service = new Service();
  }

  handleCreatePessoa(pessoa: any) {
    return this.service.createPessoa(pessoa);
  }

  handleGetAllPessoas() {
    return this.service.getAllPessoas();
  }

  handleGetPessoaById(id: number) {
    return this.service.getPessoaById(id);
  }

  handleUpdatePessoa(id: number, updates: any) {
    return this.service.updatePessoa(id, updates);
  }

  handleDeletePessoa(id: number) {
    return this.service.deletePessoa(id);
  }

  handleCreatePlano(plano: any) {
    return this.service.createPlano(plano);
  }

  handleGetAllPlanos() {
    return this.service.getAllPlanos();
  }

  handleGetPlanoById(id: number) {
    return this.service.getPlanoById(id);
  }

  handleUpdatePlano(id: number, updates: any) {
    return this.service.updatePlano(id, updates);
  }

  handleDeletePlano(id: number) {
    return this.service.deletePlano(id);
  }

  // Para PlanoContratado
  handleCreatePlanoContratado(planoContratado: any) {
    return this.service.createPlanoContratado(planoContratado);
  }

  handleGetAllPlanosContratados() {
    return this.service.getAllPlanosContratados();
  }

  handleGetPlanoContratadoById(id: number) {
    return this.service.getPlanoContratadoById(id);
  }

  handleUpdatePlanoContratado(id: number, updates: any) {
    return this.service.updatePlanoContratado(id, updates);
  }

  handleDeletePlanoContratado(id: number) {
    return this.service.deletePlanoContratado(id);
  }
}
