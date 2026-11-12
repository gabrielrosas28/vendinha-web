import { diferenca } from '../domain/contaCaixa';
import type { ItemVendido, ResumoCaixa } from '../domain/resumo';
import type { Fechamento } from './db';

export interface DadosRelatorio {
  fechamento: Fechamento;
  itens: ItemVendido[];
  campeao: ItemVendido | null;
  esperadoCentavos: number;
  numeroEstornadas: number;
  abertoEm: number | null;
  diferencaCentavos: number | null;
}

export function gerarResumoJson(resumo: ResumoCaixa, esperadoCentavos: number, abertoEm: number, fechadoEm: number): string {
  return JSON.stringify({
    versao: 1,
    esperadoCentavos,
    numeroEstornadas: resumo.numeroEstornadas,
    abertoEm,
    fechadoEm,
    campeaoItemId: resumo.campeao?.itemId ?? null,
    itens: resumo.itens.map((i) => ({
      itemId: i.itemId,
      nome: i.nome,
      quantidade: i.quantidade,
      totalCentavos: i.totalCentavos,
    })),
  });
}

function obj(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function inteiro(v: unknown, padrao = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : padrao;
}

export function lerResumoObjeto(texto: string): Record<string, unknown> {
  try {
    return obj(JSON.parse(texto));
  } catch {
    return {};
  }
}

export function lerRelatorio(f: Fechamento): DadosRelatorio {
  const o = lerResumoObjeto(f.resumoJson);
  const arr = Array.isArray(o.itens) ? o.itens : [];
  const itens: ItemVendido[] = arr.map((x) => {
    const i = obj(x);
    return {
      itemId: inteiro(i.itemId),
      nome: typeof i.nome === 'string' ? i.nome : '',
      quantidade: inteiro(i.quantidade),
      totalCentavos: inteiro(i.totalCentavos),
    };
  });
  const campeaoId = typeof o.campeaoItemId === 'number' ? o.campeaoItemId : null;
  const esperado = inteiro(o.esperadoCentavos, f.trocoInicialCentavos + f.totalCentavos);
  return {
    fechamento: f,
    itens,
    campeao: itens.find((i) => i.itemId === campeaoId) ?? itens[0] ?? null,
    esperadoCentavos: esperado,
    numeroEstornadas: inteiro(o.numeroEstornadas),
    abertoEm: typeof o.abertoEm === 'number' ? o.abertoEm : null,
    diferencaCentavos: f.contadoCentavos == null ? null : diferenca(f.contadoCentavos, esperado),
  };
}
