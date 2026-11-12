export type SituacaoEstoque = 'SEM_LIMITE' | 'NORMAL' | 'ACABANDO' | 'ESGOTADO';

export const LIMITE_ACABANDO = 3;

export function situacao(controlaEstoque: boolean, disponivel: number | null): SituacaoEstoque {
  if (!controlaEstoque) return 'SEM_LIMITE';
  const d = disponivel ?? 0;
  if (d <= 0) return 'ESGOTADO';
  if (d <= LIMITE_ACABANDO) return 'ACABANDO';
  return 'NORMAL';
}

export function podeVender(controlaEstoque: boolean, disponivel: number | null, quantidade: number): boolean {
  return !controlaEstoque || quantidade <= (disponivel ?? 0);
}

export function podeAdicionarUm(controlaEstoque: boolean, disponivel: number | null, noPedido: number): boolean {
  return podeVender(controlaEstoque, disponivel, noPedido + 1);
}

export function aposVenda(controlaEstoque: boolean, disponivel: number | null, quantidade: number): number | null {
  return controlaEstoque ? (disponivel ?? 0) - quantidade : disponivel;
}

export function aposEstorno(controlaEstoque: boolean, disponivel: number | null, quantidade: number): number | null {
  return controlaEstoque ? (disponivel ?? 0) + quantidade : disponivel;
}

export function inicialAposAjuste(inicialAtual: number | null, disponivelAtual: number | null, novoDisponivel: number): number {
  if (inicialAtual == null || disponivelAtual == null) return novoDisponivel;
  return Math.max(inicialAtual + (novoDisponivel - disponivelAtual), novoDisponivel);
}
