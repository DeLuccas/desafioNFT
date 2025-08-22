import { db } from "../data.js";

export class Repository {
  getAllPessoas() {
    return db.pessoas;
  }

  getPessoaById(id: number) {
    return db.pessoas.find((p: any) => p.id === id);
  }

  createPessoa(pessoa: any) {
    const newId = Math.max(...db.pessoas.map((p: any) => p.id), 0) + 1;
    const newPessoa = { id: newId, ...pessoa };
    db.pessoas.push(newPessoa);
    return newPessoa;
  }

  updatePessoa(id: number, updates: any) {
    const index = db.pessoas.findIndex((p: any) => p.id === id);
    if (index === -1) return undefined;
    db.pessoas[index] = { ...db.pessoas[index], ...updates };
    return db.pessoas[index];
  }

  deletePessoa(id: number) {
    const index = db.pessoas.findIndex((p: any) => p.id === id);
    if (index === -1) return false;
    db.pessoas.splice(index, 1);
    return true;
  }

  getAllPlanos() {
    return db.planos;
  }

  getPlanoById(id: number) {
    return db.planos.find((p: any) => p.id === id);
  }

  createPlano(plano: any) {
    const newId = Math.max(...db.planos.map((p: any) => p.id), 0) + 1;
    const newPlano = { id: newId, ...plano };
    db.planos.push(newPlano);
    return newPlano;
  }

  updatePlano(id: number, updates: any) {
    const index = db.planos.findIndex((p: any) => p.id === id);
    if (index === -1) return undefined;
    db.planos[index] = { ...db.planos[index], ...updates };
    return db.planos[index];
  }

  deletePlano(id: number) {
    const index = db.planos.findIndex((p: any) => p.id === id);
    if (index === -1) return false;
    db.planos.splice(index, 1);
    return true;
  }

  getAllPlanosContratados() {
    return db.planos_contratados;
  }

  getPlanoContratadoById(id: number) {
    return db.planos_contratados.find((p: any) => p.id === id);
  }

  createPlanoContratado(planoContratado: any) {
    const newId =
      Math.max(...db.planos_contratados.map((p: any) => p.id), 0) + 1;
    const newPlanoContratado = { id: newId, ...planoContratado };
    db.planos_contratados.push(newPlanoContratado);
    return newPlanoContratado;
  }

  updatePlanoContratado(id: number, updates: any) {
    const index = db.planos_contratados.findIndex((p: any) => p.id === id);
    if (index === -1) return undefined;
    db.planos_contratados[index] = {
      ...db.planos_contratados[index],
      ...updates,
    };
    return db.planos_contratados[index];
  }

  deletePlanoContratado(id: number) {
    const index = db.planos_contratados.findIndex((p: any) => p.id === id);
    if (index === -1) return false;
    db.planos_contratados.splice(index, 1);
    return true;
  }
}
