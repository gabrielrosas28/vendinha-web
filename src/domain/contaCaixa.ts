export interface ValorVenda {
  totalCentavos: number;
  estornada: boolean;
}

export type ResultadoConferencia = 'BATEU' | 'SOBROU' | 'FALTOU';

export function totalGanho(vendas: readonly ValorVenda[]): number {
  const todas = vendas.reduce((s, v) => s + v.totalCentavos, 0);
  const estornadas = vendas.filter((v) => v.estornada).reduce((s, v) => s + v.totalCentavos, 0);
  return todas - estornadas;
}

export function numeroVendasValidas(vendas: readonly ValorVenda[]): number {
  return vendas.filter((v) => !v.estornada).length;
}

export function dinheiroEsperado(trocoInicialCentavos: number, totalGanhoCentavos: number): number {
  return trocoInicialCentavos + totalGanhoCentavos;
}

export function diferenca(contadoCentavos: number, esperadoCentavos: number): number {
  return contadoCentavos - esperadoCentavos;
}

export function resultado(diferencaCentavos: number): ResultadoConferencia {
  if (diferencaCentavos > 0) return 'SOBROU';
  if (diferencaCentavos < 0) return 'FALTOU';
  return 'BATEU';
}

export function troco(totalCentavos: number, recebidoCentavos: number): number {
  return recebidoCentavos - totalCentavos;
}

export function podeConfirmar(totalCentavos: number, recebidoCentavos: number): boolean {
  return totalCentavos > 0 && recebidoCentavos >= totalCentavos;
}
