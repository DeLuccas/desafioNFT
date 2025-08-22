import { Repository } from "../Repository/repository.js";

export class Service {
  private repository: Repository;

  constructor() {
    this.repository = new Repository();
  }

  createPessoa(pessoa: any) {
    return this.repository.createPessoa(pessoa);
  }

  getAllPessoas() {
    return this.repository.getAllPessoas();
  }

  getPessoaById(id: number) {
    return this.repository.getPessoaById(id);
  }

  updatePessoa(id: number, updates: any) {
    return this.repository.updatePessoa(id, updates);
  }

  deletePessoa(id: number) {
    return this.repository.deletePessoa(id);
  }

  createPlano(plano: any) {
    return this.repository.createPlano(plano);
  }

  getAllPlanos() {
    return this.repository.getAllPlanos();
  }

  getPlanoById(id: number) {
    return this.repository.getPlanoById(id);
  }

  updatePlano(id: number, updates: any) {
    return this.repository.updatePlano(id, updates);
  }

  deletePlano(id: number) {
    return this.repository.deletePlano(id);
  }

  createPlanoContratado(planoContratado: any) {
    return this.repository.createPlanoContratado(planoContratado);
  }

  getAllPlanosContratados() {
    return this.repository.getAllPlanosContratados();
  }

  getPlanoContratadoById(id: number) {
    return this.repository.getPlanoContratadoById(id);
  }

  updatePlanoContratado(id: number, updates: any) {
    return this.repository.updatePlanoContratado(id, updates);
  }

  deletePlanoContratado(id: number) {
    return this.repository.deletePlanoContratado(id);
  }
}
