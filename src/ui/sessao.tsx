import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { somar, type Contagem } from '../domain/dinheiro';

export interface LinhaPedidoSessao {
  itemId: number;
  quantidade: number;
}

export interface VendaFeita {
  totalCentavos: number;
  recebidoCentavos: number;
}

export type ModoConferencia = 'CONTAR' | 'DIGITAR';

export interface Aviso {
  texto: string;
  id: number;
}

interface Sessao {
  pedido: LinhaPedidoSessao[];
  setPedido: (f: (p: LinhaPedidoSessao[]) => LinhaPedidoSessao[]) => void;
  recebido: Contagem;
  setRecebido: (f: (c: Contagem) => Contagem) => void;
  ultimaVenda: VendaFeita | null;
  setUltimaVenda: (v: VendaFeita | null) => void;
  aviso: Aviso | null;
  avisar: (texto: string) => void;
  limparAviso: () => void;
  conferencia: { contagem: Contagem; modo: ModoConferencia; digitado: number };
  setConferencia: (f: (c: Sessao['conferencia']) => Sessao['conferencia']) => void;
  orgLiberado: boolean;
  setOrgLiberado: (v: boolean) => void;
  pedidoEmAndamento: boolean;
  reiniciar: () => void;
}

const SessaoContexto = createContext<Sessao | null>(null);

const CONFERENCIA_VAZIA: Sessao['conferencia'] = { contagem: {}, modo: 'CONTAR', digitado: 0 };

export function SessaoProvider({ children }: { children: ReactNode }) {
  const [pedido, setPedidoBruto] = useState<LinhaPedidoSessao[]>([]);
  const [recebido, setRecebidoBruto] = useState<Contagem>({});
  const [ultimaVenda, setUltimaVenda] = useState<VendaFeita | null>(null);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [conferencia, setConferenciaBruta] = useState(CONFERENCIA_VAZIA);
  const [orgLiberado, setOrgLiberado] = useState(false);
  const temporizador = useRef<number | null>(null);

  const setPedido = useCallback((f: (p: LinhaPedidoSessao[]) => LinhaPedidoSessao[]) => setPedidoBruto(f), []);
  const setRecebido = useCallback((f: (c: Contagem) => Contagem) => setRecebidoBruto(f), []);
  const setConferencia = useCallback((f: (c: Sessao['conferencia']) => Sessao['conferencia']) => setConferenciaBruta(f), []);

  const limparAviso = useCallback(() => {
    if (temporizador.current != null) window.clearTimeout(temporizador.current);
    temporizador.current = null;
    setAviso(null);
  }, []);

  const avisar = useCallback((texto: string) => {
    const novo = { texto, id: Date.now() + Math.random() };
    setAviso(novo);
    if (temporizador.current != null) window.clearTimeout(temporizador.current);
    temporizador.current = window.setTimeout(() => {
      setAviso((a) => (a?.id === novo.id ? null : a));
      temporizador.current = null;
    }, 3_000);
  }, []);

  const reiniciar = useCallback(() => {
    setPedidoBruto([]);
    setRecebidoBruto({});
    setUltimaVenda(null);
    setConferenciaBruta(CONFERENCIA_VAZIA);
    limparAviso();
  }, [limparAviso]);

  const pedidoEmAndamento = pedido.length > 0 || somar(recebido) > 0;

  const valor = useMemo<Sessao>(
    () => ({
      pedido,
      setPedido,
      recebido,
      setRecebido,
      ultimaVenda,
      setUltimaVenda,
      aviso,
      avisar,
      limparAviso,
      conferencia,
      setConferencia,
      orgLiberado,
      setOrgLiberado,
      pedidoEmAndamento,
      reiniciar,
    }),
    [pedido, setPedido, recebido, setRecebido, ultimaVenda, aviso, avisar, limparAviso, conferencia, setConferencia, orgLiberado, pedidoEmAndamento, reiniciar],
  );

  return <SessaoContexto.Provider value={valor}>{children}</SessaoContexto.Provider>;
}

export function useSessao(): Sessao {
  const s = useContext(SessaoContexto);
  if (!s) throw new Error('useSessao fora do SessaoProvider');
  return s;
}

export { CONFERENCIA_VAZIA };
