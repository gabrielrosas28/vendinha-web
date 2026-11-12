import { useMemo, useState } from 'react';
import { db, type Item } from '../data/db';
import { CaixaFechadoError, EstoqueInsuficienteError, caixaAtual, confirmarVenda, grupoAtivo, itensAtivos, obterConfig } from '../data/repositorios';
import { tocarSom } from '../data/som';
import { podeConfirmar } from '../domain/contaCaixa';
import { adicionarPeca, contagemDe, decomporTroco, somar, tirarPeca, type Contagem, type Denominacao } from '../domain/dinheiro';
import { podeAdicionarUm } from '../domain/estoque';
import { corGrupo } from './cores';
import { useConsulta } from './dados';
import { useSessao } from './sessao';

export interface LinhaPedidoUi {
  item: Item;
  quantidade: number;
  subtotal: number;
}

export function usePedido() {
  const s = useSessao();
  const { carregado, valor } = useConsulta(async () => {
    const [itens, caixa, config, grupo] = await Promise.all([itensAtivos(db), caixaAtual(db), obterConfig(db), grupoAtivo(db)]);
    return { itens, caixa, somAtivo: config?.somAtivo ?? true, cor: corGrupo(grupo?.corIndex ?? 0) };
  });
  const [confirmando, setConfirmando] = useState(false);
  const itens = valor?.itens;

  const linhas: LinhaPedidoUi[] = useMemo(() => {
    const porId = new Map((itens ?? []).map((i) => [i.id, i]));
    return s.pedido.flatMap((l) => {
      const item = porId.get(l.itemId);
      return item ? [{ item, quantidade: l.quantidade, subtotal: item.precoCentavos * l.quantidade }] : [];
    });
  }, [itens, s.pedido]);

  const total = linhas.reduce((t, l) => t + l.subtotal, 0);
  const recebido = somar(s.recebido);
  const quantidades = new Map(s.pedido.map((l) => [l.itemId, l.quantidade]));

  const tocarItem = (item: Item) => {
    const noPedido = quantidades.get(item.id) ?? 0;
    if (!podeAdicionarUm(item.controlaEstoque, item.qtdDisponivel, noPedido)) {
      const restam = item.qtdDisponivel ?? 0;
      s.avisar(restam <= 0 ? `${item.nome} esgotou!` : `Só tem ${restam} de ${item.nome}.`);
      return;
    }
    s.setPedido((p) =>
      p.some((l) => l.itemId === item.id)
        ? p.map((l) => (l.itemId === item.id ? { ...l, quantidade: l.quantidade + 1 } : l))
        : [...p, { itemId: item.id, quantidade: 1 }],
    );
  };

  const menos = (item: Item) =>
    s.setPedido((p) => p.flatMap((l) => (l.itemId !== item.id ? [l] : l.quantidade > 1 ? [{ ...l, quantidade: l.quantidade - 1 }] : [])));

  const limparPedido = () => {
    s.setPedido(() => []);
    s.setRecebido(() => ({}));
  };

  const receber = (d: Denominacao, quantidade = 1) => s.setRecebido((c) => adicionarPeca(c, d, quantidade));
  const receberContagem = (extra: Contagem) =>
    s.setRecebido((c) => {
      const novo: Record<string, number> = { ...c };
      for (const [k, q] of Object.entries(extra)) novo[k] = (novo[k] ?? 0) + q;
      return novo;
    });
  const tirar = (d: Denominacao) => s.setRecebido((c) => tirarPeca(c, d));
  const apagarRecebido = () => s.setRecebido(() => ({}));

  const valorCertinho = () => s.setRecebido(() => contagemDe(decomporTroco(total).pecas));

  const confirmar = async (): Promise<boolean> => {
    const caixa = valor?.caixa;
    if (!caixa || confirmando || !podeConfirmar(total, recebido)) return false;
    setConfirmando(true);
    try {
      await confirmarVenda(
        db,
        caixa.id,
        linhas.map((l) => ({ itemId: l.item.id, nome: l.item.nome, precoUnitCentavos: l.item.precoCentavos, quantidade: l.quantidade })),
        recebido,
      );
      s.setUltimaVenda({ totalCentavos: total, recebidoCentavos: recebido });
      if (valor?.somAtivo) tocarSom();
      s.setPedido(() => []);
      s.setRecebido(() => ({}));
      s.limparAviso();
      return true;
    } catch (e) {
      if (e instanceof EstoqueInsuficienteError) s.avisar(`Acabou o estoque de ${e.nomeItem}. Confira o pedido.`);
      else if (e instanceof CaixaFechadoError) s.avisar('O caixa está fechado. Chame o organizador.');
      else {
        console.error('Vendinha: erro ao confirmar a venda', e);
        s.avisar('Não deu para salvar a venda. Tente de novo.');
      }
      return false;
    } finally {
      setConfirmando(false);
    }
  };

  return {
    carregado,
    itens,
    caixa: valor?.caixa,
    corGrupo: valor?.cor ?? corGrupo(0),
    linhas,
    total,
    recebido,
    contagem: s.recebido,
    quantidades,
    aviso: s.aviso,
    confirmando,
    tocarItem,
    menos,
    limparPedido,
    receber,
    receberContagem,
    tirar,
    apagarRecebido,
    valorCertinho,
    confirmar,
    avisar: s.avisar,
  };
}
