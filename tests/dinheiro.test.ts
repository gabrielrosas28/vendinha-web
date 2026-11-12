import { describe, expect, it } from 'vitest';
import {
  Denominacoes as D,
  TODAS_DENOMINACOES,
  adicionarPeca,
  decomporTroco,
  ehMultiploDaMenorMoeda,
  emPecas,
  formatar,
  formatarSemSimbolo,
  lerReais,
  numeroDePecas,
  somar,
  tirarPeca,
  totalPecas,
  type Pecas,
} from '../src/domain/dinheiro';

const p = (denominacao: Pecas['denominacao'], quantidade: number): Pecas => ({ denominacao, quantidade });
const pecas = (c: number) => decomporTroco(c).pecas;

describe('decomposição do troco (guloso)', () => {
  it('troco zero não tem peças', () => {
    const d = decomporTroco(0);
    expect(d.pecas).toEqual([]);
    expect(d.restoCentavos).toBe(0);
  });

  it('R$ 0,05', () => {
    expect(pecas(5)).toEqual([p(D.M005, 1)]);
  });

  it('R$ 7,50 = 5 + 2 + 0,50', () => {
    expect(pecas(750)).toEqual([p(D.R5, 1), p(D.R2, 1), p(D.M050, 1)]);
  });

  it('R$ 8,00 = 5 + 2 + 1', () => {
    expect(pecas(800)).toEqual([p(D.R5, 1), p(D.R2, 1), p(D.M1, 1)]);
  });

  it('R$ 199,95', () => {
    expect(pecas(19_995)).toEqual([
      p(D.R100, 1),
      p(D.R50, 1),
      p(D.R20, 2),
      p(D.R5, 1),
      p(D.R2, 2),
      p(D.M050, 1),
      p(D.M025, 1),
      p(D.M010, 2),
    ]);
    const d = decomporTroco(19_995);
    expect(d.pecas.reduce((s, x) => s + totalPecas(x), 0)).toBe(19_995);
    expect(d.restoCentavos).toBe(0);
  });

  it('R$ 4,00 usa duas notas de 2', () => {
    expect(pecas(400)).toEqual([p(D.R2, 2)]);
  });

  it('valor fora do múltiplo de 5 informa o resto', () => {
    const d = decomporTroco(103);
    expect(d.pecas).toEqual([p(D.M1, 1)]);
    expect(d.restoCentavos).toBe(3);
  });

  it('guloso é ótimo para todos os valores até R$ 50 (comparado com programação dinâmica)', () => {
    const dens = TODAS_DENOMINACOES.map((d) => d.centavos);
    const limite = 5_000;
    const melhor = new Array<number>(limite + 1).fill(Number.MAX_SAFE_INTEGER);
    melhor[0] = 0;
    for (let v = 5; v <= limite; v += 5)
      for (const d of dens) if (d <= v && melhor[v - d] !== Number.MAX_SAFE_INTEGER) melhor[v] = Math.min(melhor[v], melhor[v - d] + 1);
    for (let v = 0; v <= limite; v += 5) expect(numeroDePecas(decomporTroco(v)), `valor ${v}`).toBe(melhor[v]);
  });

  it('troco negativo é erro', () => {
    expect(() => decomporTroco(-5)).toThrow(RangeError);
  });

  it('não aceita fração de centavo', () => {
    expect(() => decomporTroco(2.5)).toThrow(RangeError);
  });
});

describe('formatação pt-BR', () => {
  it.each([
    [0, 'R$ 0,00'],
    [5, 'R$ 0,05'],
    [750, 'R$ 7,50'],
    [123_456, 'R$ 1.234,56'],
    [100_000_000, 'R$ 1.000.000,00'],
    [-500, '-R$ 5,00'],
  ])('%i centavos → %s', (c, texto) => {
    expect(formatar(c)).toBe(texto);
  });

  it('sem símbolo', () => {
    expect(formatarSemSimbolo(19_995)).toBe('199,95');
  });
});

describe('lerReais', () => {
  it.each([
    ['2', 200],
    ['2,5', 250],
    ['2,50', 250],
    ['2.50', 250],
    ['1.234,56', 123_456],
    ['R$ 3,00', 300],
    [',05', 5],
    ['  7,50 ', 750],
    ['20', 2_000],
  ])('"%s" → %i', (t, c) => {
    expect(lerReais(t)).toBe(c);
  });

  it.each(['', '   ', 'abc', '2,555', '1,2,3', '-2', '2,5a', '12345678', '99999,99'])('"%s" é inválido', (t) => {
    expect(lerReais(t)).toBeNull();
  });
});

describe('contagem de peças', () => {
  it('soma a contagem', () => {
    expect(somar({ R5: 2, R2: 1, M050: 1, M025: 1 })).toBe(1_275);
  });

  it('adiciona, tira e agrupa da maior para a menor', () => {
    let c = adicionarPeca({}, D.M050);
    c = adicionarPeca(c, D.R20);
    c = adicionarPeca(c, D.M050);
    expect(emPecas(c)).toEqual([p(D.R20, 1), p(D.M050, 2)]);
    c = tirarPeca(c, D.M050);
    c = tirarPeca(c, D.R20);
    expect(emPecas(c)).toEqual([p(D.M050, 1)]);
    expect(somar(c)).toBe(50);
  });

  it('múltiplo de 5 centavos', () => {
    expect(ehMultiploDaMenorMoeda(250)).toBe(true);
    expect(ehMultiploDaMenorMoeda(0)).toBe(true);
    expect(ehMultiploDaMenorMoeda(252)).toBe(false);
  });
});
