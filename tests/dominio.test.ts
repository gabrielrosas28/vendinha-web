import { describe, expect, it } from 'vitest';
import * as Conta from '../src/domain/contaCaixa';
import * as Estoque from '../src/domain/estoque';
import { calcularResumo } from '../src/domain/resumo';
import { nomeGrupoValido, nomeTurmaValido, totaisRegistro } from '../src/domain/registro';
import { TURMAS_INICIAIS, corDoNumero, gruposDaTurma, nomeCompletoGrupo, todosOsGruposIniciais } from '../src/domain/grupos';
import * as Senha from '../src/domain/senha';

describe('conta do caixa', () => {
  const vendas = [
    { totalCentavos: 500, estornada: false },
    { totalCentavos: 300, estornada: true },
    { totalCentavos: 1_250, estornada: false },
  ];

  it('total ganho desconta estornos', () => {
    expect(Conta.totalGanho(vendas)).toBe(1_750);
    expect(Conta.numeroVendasValidas(vendas)).toBe(2);
  });

  it('sem vendas é zero; todas estornadas é zero', () => {
    expect(Conta.totalGanho([])).toBe(0);
    expect(Conta.totalGanho([{ totalCentavos: 500, estornada: true }, { totalCentavos: 200, estornada: true }])).toBe(0);
  });

  it('esperado com e sem troco inicial', () => {
    expect(Conta.dinheiroEsperado(2_000, 1_750)).toBe(3_750);
    expect(Conta.dinheiroEsperado(0, 1_750)).toBe(1_750);
  });

  it('diferença positiva: sobrou', () => {
    const d = Conta.diferenca(4_000, 3_750);
    expect(d).toBe(250);
    expect(Conta.resultado(d)).toBe('SOBROU');
  });

  it('diferença negativa: faltou', () => {
    const d = Conta.diferenca(3_500, 3_750);
    expect(d).toBe(-250);
    expect(Conta.resultado(d)).toBe('FALTOU');
  });

  it('diferença zero: bateu certinho', () => {
    const d = Conta.diferenca(3_750, 3_750);
    expect(d).toBe(0);
    expect(Conta.resultado(d)).toBe('BATEU');
  });

  it('só confirma com recebido >= total', () => {
    expect(Conta.podeConfirmar(750, 750)).toBe(true);
    expect(Conta.podeConfirmar(750, 1_000)).toBe(true);
    expect(Conta.podeConfirmar(750, 700)).toBe(false);
    expect(Conta.podeConfirmar(0, 500)).toBe(false);
    expect(Conta.troco(750, 1_000)).toBe(250);
    expect(Conta.troco(750, 700)).toBe(-50);
  });
});

describe('regras de estoque', () => {
  it('com controle bloqueia acima do disponível', () => {
    expect(Estoque.podeVender(true, 3, 3)).toBe(true);
    expect(Estoque.podeVender(true, 3, 4)).toBe(false);
    expect(Estoque.podeAdicionarUm(true, 3, 2)).toBe(true);
    expect(Estoque.podeAdicionarUm(true, 3, 3)).toBe(false);
    expect(Estoque.podeAdicionarUm(true, 0, 0)).toBe(false);
  });

  it('item sem limite nunca bloqueia', () => {
    expect(Estoque.podeVender(false, null, 1_000)).toBe(true);
    expect(Estoque.podeAdicionarUm(false, null, 9_999)).toBe(true);
    expect(Estoque.podeVender(false, 0, 50)).toBe(true);
    expect(Estoque.situacao(false, null)).toBe('SEM_LIMITE');
    expect(Estoque.situacao(false, 0)).toBe('SEM_LIMITE');
  });

  it('acabando (≤ 3) e esgotado', () => {
    expect(Estoque.situacao(true, 4)).toBe('NORMAL');
    expect(Estoque.situacao(true, 3)).toBe('ACABANDO');
    expect(Estoque.situacao(true, 1)).toBe('ACABANDO');
    expect(Estoque.situacao(true, 0)).toBe('ESGOTADO');
  });

  it('venda baixa e estorno devolve só com controle', () => {
    expect(Estoque.aposVenda(true, 5, 3)).toBe(2);
    expect(Estoque.aposVenda(false, null, 3)).toBeNull();
    expect(Estoque.aposEstorno(true, 2, 3)).toBe(5);
    expect(Estoque.aposEstorno(false, null, 3)).toBeNull();
  });

  it('reposição acompanha a quantidade inicial', () => {
    expect(Estoque.inicialAposAjuste(10, 2, 7)).toBe(15);
    expect(Estoque.inicialAposAjuste(null, null, 8)).toBe(8);
    expect(Estoque.inicialAposAjuste(10, 9, 3)).toBe(4);
  });
});

describe('resumo do caixa', () => {
  it('ignora estornos e escolhe o campeão', () => {
    const r = calcularResumo(
      [
        { totalCentavos: 700, estornada: false },
        { totalCentavos: 200, estornada: true },
        { totalCentavos: 300, estornada: false },
      ],
      [
        { itemId: 1, nome: 'Brigadeiro', quantidade: 2, precoUnitCentavos: 200, estornada: false },
        { itemId: 2, nome: 'Pipoca', quantidade: 1, precoUnitCentavos: 300, estornada: false },
        { itemId: 1, nome: 'Brigadeiro', quantidade: 1, precoUnitCentavos: 200, estornada: true },
        { itemId: 2, nome: 'Pipoca', quantidade: 1, precoUnitCentavos: 300, estornada: false },
      ],
    );
    expect(r.totalGanhoCentavos).toBe(1_000);
    expect(r.numeroVendas).toBe(2);
    expect(r.numeroEstornadas).toBe(1);
    expect(r.itens).toEqual([
      { itemId: 2, nome: 'Pipoca', quantidade: 2, totalCentavos: 600 },
      { itemId: 1, nome: 'Brigadeiro', quantidade: 2, totalCentavos: 400 },
    ]);
    expect(r.campeao?.nome).toBe('Pipoca');
  });

  it('sem vendas não há campeão', () => {
    expect(calcularResumo([], []).campeao).toBeNull();
  });
});

describe('registro de vendas', () => {
  it('totais ignoram estornadas e fecham a conta', () => {
    const t = totaisRegistro([
      { totalCentavos: 950, recebidoCentavos: 1_500, trocoCentavos: 550, estornada: false },
      { totalCentavos: 600, recebidoCentavos: 600, trocoCentavos: 0, estornada: true },
      { totalCentavos: 400, recebidoCentavos: 2_000, trocoCentavos: 1_600, estornada: false },
    ]);
    expect(t.numeroVendas).toBe(2);
    expect(t.numeroEstornadas).toBe(1);
    expect(t.vendidoCentavos).toBe(1_350);
    expect(t.recebidoCentavos).toBe(3_500);
    expect(t.trocoCentavos).toBe(2_150);
    expect(t.recebidoCentavos - t.trocoCentavos).toBe(t.vendidoCentavos);
  });

  it('registro vazio dá zero', () => {
    const t = totaisRegistro([]);
    expect(t.numeroVendas).toBe(0);
    expect(t.recebidoCentavos).toBe(0);
  });

  it('valida nomes de turma (até 20) e grupo (até 40)', () => {
    expect(nomeTurmaValido('5º C')).toBe(true);
    expect(nomeTurmaValido('   ')).toBe(false);
    expect(nomeTurmaValido('x'.repeat(21))).toBe(false);
    expect(nomeGrupoValido('Brigadeiro de potinho')).toBe(true);
    expect(nomeGrupoValido('')).toBe(false);
    expect(nomeGrupoValido('x'.repeat(41))).toBe(false);
  });
});

describe('turmas e grupos iniciais', () => {
  it('tabela da feira', () => {
    expect(TURMAS_INICIAIS).toEqual(['2º A', '2º B', '2º C', '2º D', '2º E']);
    expect(gruposDaTurma('2º A')).toHaveLength(5);
    expect(gruposDaTurma('2º E')).toHaveLength(3);
    expect(gruposDaTurma('2º D')[1].produto).toBe('Brigadeiro de potinho');
    expect(todosOsGruposIniciais()).toHaveLength(23);
  });

  it('cor fixa por número do grupo', () => {
    expect(corDoNumero(1)).toBe(0);
    expect(corDoNumero(5)).toBe(4);
    expect(corDoNumero(6)).toBe(0);
    expect(corDoNumero(0)).toBe(4);
    expect(nomeCompletoGrupo('Brigadeiros', '2º A', 2)).toBe('Brigadeiros · 2º A · Grupo 2');
    expect(nomeCompletoGrupo('Cookies', '3º A', 0)).toBe('Cookies · 3º A');
  });
});

describe('senha do Organizador', () => {
  it('formato de 4 a 8 dígitos', () => {
    expect(Senha.formatoValido('1234')).toBe(true);
    expect(Senha.formatoValido('12345678')).toBe(true);
    expect(Senha.formatoValido('123')).toBe(false);
    expect(Senha.formatoValido('123456789')).toBe(false);
    expect(Senha.formatoValido('12a4')).toBe(false);
  });

  it('hash com salt confere a certa e rejeita a errada', async () => {
    const salt = Senha.gerarSalt();
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    const hash = await Senha.hash('2468', salt);
    expect(await Senha.confere('2468', salt, hash)).toBe(true);
    expect(await Senha.confere('2469', salt, hash)).toBe(false);
    expect(await Senha.confere('24', salt, hash)).toBe(false);
    expect(await Senha.hash('2468', Senha.gerarSalt())).not.toBe(hash);
  });

  it('comparação em tempo constante', () => {
    expect(Senha.iguaisTempoConstante('abc', 'abc')).toBe(true);
    expect(Senha.iguaisTempoConstante('abc', 'abd')).toBe(false);
    expect(Senha.iguaisTempoConstante('abc', 'abcd')).toBe(false);
  });
});
