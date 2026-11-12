export interface ValorRegistro {
  totalCentavos: number;
  recebidoCentavos: number;
  trocoCentavos: number;
  estornada: boolean;
}

export interface TotaisRegistro {
  numeroVendas: number;
  numeroEstornadas: number;
  vendidoCentavos: number;
  recebidoCentavos: number;
  trocoCentavos: number;
}

export function totaisRegistro(vendas: readonly ValorRegistro[]): TotaisRegistro {
  const validas = vendas.filter((v) => !v.estornada);
  return {
    numeroVendas: validas.length,
    numeroEstornadas: vendas.length - validas.length,
    vendidoCentavos: validas.reduce((s, v) => s + v.totalCentavos, 0),
    recebidoCentavos: validas.reduce((s, v) => s + v.recebidoCentavos, 0),
    trocoCentavos: validas.reduce((s, v) => s + v.trocoCentavos, 0),
  };
}

export function nomeTurmaValido(nome: string): boolean {
  const n = [...nome.trim()].length;
  return n >= 1 && n <= 20;
}

export function nomeGrupoValido(nome: string): boolean {
  const n = [...nome.trim()].length;
  return n >= 1 && n <= 40;
}
