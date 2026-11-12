export interface GrupoPredefinido {
  turma: string;
  numero: number;
  produto: string;
}

export const TURMAS_INICIAIS: readonly string[] = ['2º A', '2º B', '2º C', '2º D', '2º E'];

const TABELA: Readonly<Record<string, readonly (string | null)[]>> = {
  '2º A': ['Bolo de chocolate', 'Brigadeiros', 'Pipoca', 'Geladinhos', 'Brownie'],
  '2º B': ['Cupcake', 'A definir', 'Pipoca', 'Sanduíche natural', 'Brigadeiros'],
  '2º C': ['Pipoca gourmet', 'Geladinhos', 'Sanduíche natural', 'Tortalete', 'Brigadeiros'],
  '2º D': ['Geladinhos', 'Brigadeiro de potinho', 'Brownie', 'Pipoca', 'Pastel'],
  '2º E': ['Bolo', 'Beijinhos', 'Brigadeiros', null, null],
};

export function gruposDaTurma(turma: string): GrupoPredefinido[] {
  const lista = TABELA[turma] ?? [];
  const r: GrupoPredefinido[] = [];
  lista.forEach((produto, i) => {
    if (produto != null) r.push({ turma, numero: i + 1, produto });
  });
  return r;
}

export function todosOsGruposIniciais(): GrupoPredefinido[] {
  return TURMAS_INICIAIS.flatMap((t) => gruposDaTurma(t));
}

export const TOTAL_CORES_GRUPO = 5;

export function corDoNumero(numeroGrupo: number): number {
  return (((numeroGrupo - 1) % TOTAL_CORES_GRUPO) + TOTAL_CORES_GRUPO) % TOTAL_CORES_GRUPO;
}

export function nomeCompletoGrupo(nome: string, turma: string, numeroGrupo: number): string {
  return numeroGrupo > 0 ? `${nome} · ${turma} · Grupo ${numeroGrupo}` : `${nome} · ${turma}`;
}

export function turmaGrupo(turma: string, numeroGrupo: number): string {
  return numeroGrupo > 0 ? `${turma} · Grupo ${numeroGrupo}` : turma;
}
