export type TipoDinheiro = 'CEDULA' | 'MOEDA';

export interface Denominacao {
  readonly id: string;
  readonly centavos: number;
  readonly tipo: TipoDinheiro;
}

function den(id: string, centavos: number, tipo: TipoDinheiro): Denominacao {
  return Object.freeze({ id, centavos, tipo });
}

export const Denominacoes = Object.freeze({
  R200: den('R200', 20_000, 'CEDULA'),
  R100: den('R100', 10_000, 'CEDULA'),
  R50: den('R50', 5_000, 'CEDULA'),
  R20: den('R20', 2_000, 'CEDULA'),
  R10: den('R10', 1_000, 'CEDULA'),
  R5: den('R5', 500, 'CEDULA'),
  R2: den('R2', 200, 'CEDULA'),
  M1: den('M1', 100, 'MOEDA'),
  M050: den('M050', 50, 'MOEDA'),
  M025: den('M025', 25, 'MOEDA'),
  M010: den('M010', 10, 'MOEDA'),
  M005: den('M005', 5, 'MOEDA'),
});

export const TODAS_DENOMINACOES: readonly Denominacao[] = Object.freeze(Object.values(Denominacoes));
export const CEDULAS = TODAS_DENOMINACOES.filter((d) => d.tipo === 'CEDULA');
export const MOEDAS = TODAS_DENOMINACOES.filter((d) => d.tipo === 'MOEDA');

export function denominacaoPorId(id: string): Denominacao | undefined {
  return TODAS_DENOMINACOES.find((d) => d.id === id);
}

export interface Pecas {
  denominacao: Denominacao;
  quantidade: number;
}

export function totalPecas(p: Pecas): number {
  return p.denominacao.centavos * p.quantidade;
}

export interface Decomposicao {
  pecas: Pecas[];
  restoCentavos: number;
}

export type Contagem = Readonly<Record<string, number>>;

export const MENOR_MOEDA_CENTAVOS = 5;

export const MAXIMO_CENTAVOS = 9_999_995;

function exigirInteiro(centavos: number): void {
  if (!Number.isSafeInteger(centavos)) throw new RangeError(`Centavos precisa ser inteiro: ${centavos}`);
}

export function formatarSemSimbolo(centavos: number): string {
  exigirInteiro(centavos);
  const abs = Math.abs(centavos);
  const reais = Math.trunc(abs / 100);
  const cent = abs % 100;
  const reaisTxt = String(reais).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${reaisTxt},${String(cent).padStart(2, '0')}`;
}

export function formatar(centavos: number): string {
  const sinal = centavos < 0 ? '-' : '';
  return `${sinal}R$ ${formatarSemSimbolo(centavos)}`;
}

export function lerReais(texto: string): number | null {
  let t = texto.trim().replace(/R\$/g, '').replace(/\s/g, '');
  if (t.length === 0) return null;
  const pontos = (t.match(/\./g) ?? []).length;
  if (!t.includes(',') && pontos === 1) {
    const depois = t.substring(t.indexOf('.') + 1);
    if (depois.length >= 1 && depois.length <= 2) t = t.replace('.', ',');
  }
  t = t.replace(/\./g, '');
  const partes = t.split(',');
  if (partes.length > 2) return null;
  const inteiro = partes[0] === '' ? '0' : partes[0];
  const decimal = partes[1] ?? '';
  if (!/^\d+$/.test(inteiro) || !/^\d*$/.test(decimal)) return null;
  if (decimal.length > 2 || inteiro.length > 7) return null;
  const centavos = Number(inteiro) * 100 + Number(decimal.padEnd(2, '0'));
  return centavos > MAXIMO_CENTAVOS ? null : centavos;
}

export function decomporTroco(centavos: number): Decomposicao {
  exigirInteiro(centavos);
  if (centavos < 0) throw new RangeError('Troco não pode ser negativo');
  let resto = centavos;
  const pecas: Pecas[] = [];
  for (const d of TODAS_DENOMINACOES) {
    const qtd = Math.trunc(resto / d.centavos);
    if (qtd > 0) {
      pecas.push({ denominacao: d, quantidade: qtd });
      resto -= qtd * d.centavos;
    }
  }
  return { pecas, restoCentavos: resto };
}

export function numeroDePecas(d: Decomposicao): number {
  return d.pecas.reduce((s, p) => s + p.quantidade, 0);
}

export function somar(contagem: Contagem): number {
  let total = 0;
  for (const d of TODAS_DENOMINACOES) total += d.centavos * (contagem[d.id] ?? 0);
  return total;
}

export function emPecas(contagem: Contagem): Pecas[] {
  return TODAS_DENOMINACOES.filter((d) => (contagem[d.id] ?? 0) > 0).map((d) => ({
    denominacao: d,
    quantidade: contagem[d.id],
  }));
}

export function contagemDe(pecas: Pecas[]): Contagem {
  const c: Record<string, number> = {};
  for (const p of pecas) c[p.denominacao.id] = (c[p.denominacao.id] ?? 0) + p.quantidade;
  return c;
}

export function adicionarPeca(c: Contagem, d: Denominacao, quantidade = 1): Contagem {
  return { ...c, [d.id]: (c[d.id] ?? 0) + quantidade };
}

export function tirarPeca(c: Contagem, d: Denominacao): Contagem {
  const q = (c[d.id] ?? 0) - 1;
  const novo: Record<string, number> = { ...c };
  if (q <= 0) delete novo[d.id];
  else novo[d.id] = q;
  return novo;
}

export function ehMultiploDaMenorMoeda(centavos: number): boolean {
  return centavos % MENOR_MOEDA_CENTAVOS === 0;
}
