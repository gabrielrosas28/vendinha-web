import { numeroVendasValidas, totalGanho, type ValorVenda } from './contaCaixa';

export interface LinhaVendida {
  itemId: number;
  nome: string;
  quantidade: number;
  precoUnitCentavos: number;
  estornada: boolean;
}

export interface ItemVendido {
  itemId: number;
  nome: string;
  quantidade: number;
  totalCentavos: number;
}

export interface ResumoCaixa {
  totalGanhoCentavos: number;
  numeroVendas: number;
  numeroEstornadas: number;
  itens: ItemVendido[];
  campeao: ItemVendido | null;
}

export function calcularResumo(vendas: readonly ValorVenda[], linhas: readonly LinhaVendida[]): ResumoCaixa {
  const porItem = new Map<number, LinhaVendida[]>();
  for (const l of linhas) {
    if (l.estornada) continue;
    const lista = porItem.get(l.itemId);
    if (lista) lista.push(l);
    else porItem.set(l.itemId, [l]);
  }
  const itens: ItemVendido[] = [...porItem.entries()].map(([id, ls]) => ({
    itemId: id,
    nome: ls[ls.length - 1].nome,
    quantidade: ls.reduce((s, l) => s + l.quantidade, 0),
    totalCentavos: ls.reduce((s, l) => s + l.precoUnitCentavos * l.quantidade, 0),
  }));
  itens.sort(
    (a, b) =>
      b.quantidade - a.quantidade ||
      b.totalCentavos - a.totalCentavos ||
      (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : 0),
  );
  return {
    totalGanhoCentavos: totalGanho(vendas),
    numeroVendas: numeroVendasValidas(vendas),
    numeroEstornadas: vendas.filter((v) => v.estornada).length,
    itens,
    campeao: itens[0] ?? null,
  };
}
