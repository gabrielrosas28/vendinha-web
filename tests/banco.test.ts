import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VendinhaDB } from '../src/data/db';
import { gerarBackup, importarBackup, exportarBackup, BackupInvalidoError } from '../src/data/backup';
import { lerRelatorio } from '../src/data/relatorio';
import * as R from '../src/data/repositorios';

let db: VendinhaDB;
let contador = 0;
let caixaId = 0;
let brigadeiro = 0;
let bolo = 0;

async function prepararGrupo() {
  await R.iniciarGrupo(db, '2º A', 2, 'Brigadeiros', 1, 1);
  brigadeiro = await R.salvarItem(db, {
    nome: 'Brigadeiro',
    fotoId: null,
    precoCentavos: 250,
    controlaEstoque: true,
    qtdInicial: 5,
    qtdDisponivel: 5,
    ativo: true,
  });
  bolo = await R.salvarItem(db, {
    nome: 'Fatia de bolo',
    fotoId: null,
    precoCentavos: 500,
    controlaEstoque: false,
    qtdInicial: null,
    qtdDisponivel: null,
    ativo: true,
  });
  caixaId = await R.abrirCaixa(db, 2_000, 1);
}

const pedido = (qtdBrigadeiro: number, qtdBolo: number): R.LinhaPedido[] => [
  { itemId: brigadeiro, nome: 'Brigadeiro', precoUnitCentavos: 250, quantidade: qtdBrigadeiro },
  { itemId: bolo, nome: 'Fatia de bolo', precoUnitCentavos: 500, quantidade: qtdBolo },
];

beforeEach(async () => {
  db = new VendinhaDB(`teste-${++contador}-${Date.now()}`);
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('semente e senha', () => {
  it('cria as turmas do 2º ano na primeira abertura', async () => {
    const turmas = await R.turmasComGrupos(db);
    expect(turmas.map((t) => t.turma.nome)).toEqual(['2º A', '2º B', '2º C', '2º D', '2º E']);
    expect(turmas[turmas.length - 1].grupos).toHaveLength(3);
    expect(turmas[0].grupos[1].produto).toBe('Brigadeiros');
  });

  it('cria a senha e confere', async () => {
    expect(await R.obterConfig(db)).toBeUndefined();
    await R.criarSenha(db, '2468');
    const c = await R.obterConfig(db);
    expect(c?.somAtivo).toBe(true);
    expect(c?.senhaHash).not.toContain('2468');
    expect(await R.conferirSenha(db, '2468')).toBe(true);
    expect(await R.conferirSenha(db, '1357')).toBe(false);
    await R.definirSom(db, false);
    await R.criarSenha(db, '1111');
    expect((await R.obterConfig(db))?.somAtivo).toBe(false);
  });
});

describe('venda em transação', () => {
  beforeEach(prepararGrupo);

  it('grava venda, itens, baixa estoque só com controle e registro', async () => {
    const vendaId = await R.confirmarVenda(db, caixaId, pedido(2, 3), 2_500, 10);
    const v = await R.obterVenda(db, vendaId);
    expect(v?.venda.totalCentavos).toBe(2_000);
    expect(v?.venda.trocoCentavos).toBe(500);
    expect(v?.itens).toHaveLength(2);
    expect((await db.itens.get(brigadeiro))?.qtdDisponivel).toBe(3);
    expect((await db.itens.get(bolo))?.qtdDisponivel).toBeNull();
    expect(Object.fromEntries(await R.qtdVendidaAtual(db))).toEqual({ [brigadeiro]: 2, [bolo]: 3 });

    const reg = await R.listarRegistro(db);
    expect(reg).toHaveLength(1);
    expect(reg[0]).toMatchObject({
      vendaId,
      turma: '2º A',
      numeroGrupo: 2,
      nomeGrupo: 'Brigadeiros',
      itens: '2× Brigadeiro, 3× Fatia de bolo',
      totalCentavos: 2_000,
      recebidoCentavos: 2_500,
      trocoCentavos: 500,
      estornada: false,
    });
  });

  it('falta de estoque desfaz tudo (rollback)', async () => {
    await expect(R.confirmarVenda(db, caixaId, pedido(6, 1), 5_000, 10)).rejects.toSatisfy(
      (e) => e instanceof R.EstoqueInsuficienteError && e.nomeItem === 'Brigadeiro',
    );
    expect(await R.vendasDoCaixa(db, caixaId)).toEqual([]);
    expect(await db.itensVenda.count()).toBe(0);
    expect(await db.registroVendas.count()).toBe(0);
    expect((await db.itens.get(brigadeiro))?.qtdDisponivel).toBe(5);
  });

  it('rollback também desfaz a baixa de itens anteriores do mesmo pedido', async () => {
    const linhas: R.LinhaPedido[] = [
      { itemId: brigadeiro, nome: 'Brigadeiro', precoUnitCentavos: 250, quantidade: 2 },
      { itemId: brigadeiro, nome: 'Brigadeiro', precoUnitCentavos: 250, quantidade: 4 },
    ];
    await expect(R.confirmarVenda(db, caixaId, linhas, 5_000, 10)).rejects.toBeInstanceOf(R.EstoqueInsuficienteError);
    expect((await db.itens.get(brigadeiro))?.qtdDisponivel).toBe(5);
    expect(await db.vendas.count()).toBe(0);
  });

  it('recebido menor que o total não grava', async () => {
    await expect(R.confirmarVenda(db, caixaId, pedido(1, 0), 200, 10)).rejects.toBeInstanceOf(RangeError);
    expect(await db.vendas.count()).toBe(0);
  });

  it('caixa fechado não vende', async () => {
    await R.fecharCaixa(db, caixaId, null, 50);
    await expect(R.confirmarVenda(db, caixaId, pedido(1, 0), 500, 60)).rejects.toBeInstanceOf(R.CaixaFechadoError);
    expect(await db.vendas.count()).toBe(0);
  });
});

describe('estorno', () => {
  beforeEach(prepararGrupo);

  it('devolve estoque só com controle, nunca apaga e marca o registro', async () => {
    const vendaId = await R.confirmarVenda(db, caixaId, pedido(2, 1), 1_000, 10);
    expect((await db.itens.get(brigadeiro))?.qtdDisponivel).toBe(3);

    expect(await R.estornarVenda(db, vendaId, 20)).toBe(true);
    const v = await R.obterVenda(db, vendaId);
    expect(v?.venda.estornada).toBe(true);
    expect(v?.venda.estornadaEm).toBe(20);
    expect((await db.itens.get(brigadeiro))?.qtdDisponivel).toBe(5);
    expect((await db.itens.get(bolo))?.qtdDisponivel).toBeNull();
    expect((await R.qtdVendidaAtual(db)).size).toBe(0);
    const reg = await R.listarRegistro(db);
    expect(reg[0].estornada).toBe(true);
    expect(reg[0].estornadaEm).toBe(20);

    expect(await R.estornarVenda(db, vendaId, 30)).toBe(false);
    expect((await db.itens.get(brigadeiro))?.qtdDisponivel).toBe(5);
  });
});

describe('fechamento', () => {
  beforeEach(prepararGrupo);

  it('fechar, reabrir e fechar de novo atualiza o MESMO relatório', async () => {
    const id1 = await R.fecharCaixa(db, caixaId, null, 100);
    await R.reabrirCaixa(db, caixaId);
    expect((await db.caixas.get(caixaId))?.status).toBe('ABERTO');
    await R.confirmarVenda(db, caixaId, pedido(1, 0), 250, 110);
    const id2 = await R.fecharCaixa(db, caixaId, 2_250, 120);
    expect(id2).toBe(id1);
    const todos = await R.listarFechamentos(db);
    expect(todos).toHaveLength(1);
    expect(todos[0].totalCentavos).toBe(250);
    expect(todos[0].contadoCentavos).toBe(2_250);
    expect(todos[0].data).toBe(120);
    const dados = lerRelatorio(todos[0]);
    expect(dados.esperadoCentavos).toBe(2_250);
    expect(dados.diferencaCentavos).toBe(0);
  });

  it('snapshot com campeão, estornos e diferença', async () => {
    await R.confirmarVenda(db, caixaId, pedido(2, 0), 500, 10);
    const v = await R.confirmarVenda(db, caixaId, pedido(0, 1), 500, 20);
    await R.confirmarVenda(db, caixaId, pedido(1, 2), 2_000, 30);
    await R.estornarVenda(db, v, 40);
    const id = await R.fecharCaixa(db, caixaId, 3_400, 50);
    const f = (await db.fechamentos.get(id))!;
    expect(f.totalCentavos).toBe(500 + 1_250);
    expect(f.numVendas).toBe(2);
    const d = lerRelatorio(f);
    expect(d.numeroEstornadas).toBe(1);
    expect(d.esperadoCentavos).toBe(2_000 + 1_750);
    expect(d.diferencaCentavos).toBe(3_400 - 3_750);
    expect(d.campeao?.nome).toBe('Brigadeiro');
    expect(d.itens.map((i) => [i.nome, i.quantidade, i.totalCentavos])).toEqual([
      ['Brigadeiro', 3, 750],
      ['Fatia de bolo', 2, 1_000],
    ]);
  });
});

describe('zerar o computador', () => {
  beforeEach(prepararGrupo);

  it('apaga grupo, itens, fotos, caixa e vendas; mantém fechamentos, registro, turmas, senha e config', async () => {
    await R.criarSenha(db, '2468');
    const fotoId = await R.guardarFoto(db, new Blob(['x'], { type: 'image/jpeg' }));
    await db.itens.update(brigadeiro, { fotoId });
    await R.confirmarVenda(db, caixaId, pedido(1, 1), 1_000, 10);
    const fechamentoId = await R.fecharCaixa(db, caixaId, 2_750, 100);

    await R.zerarComputador(db);

    expect(await R.grupoAtivo(db)).toBeUndefined();
    expect(await db.itens.get(brigadeiro)).toBeUndefined();
    expect(await db.fotos.count()).toBe(0);
    expect(await db.caixas.get(caixaId)).toBeUndefined();
    expect(await db.vendas.count()).toBe(0);
    expect(await db.itensVenda.count()).toBe(0);

    const fechamentos = await R.listarFechamentos(db);
    expect(fechamentos).toHaveLength(1);
    expect(fechamentos[0].id).toBe(fechamentoId);
    expect(fechamentos[0].totalCentavos).toBe(750);
    expect(fechamentos[0].nomeGrupo).toBe('Brigadeiros');
    const dados = lerRelatorio(fechamentos[0]);
    expect(dados.esperadoCentavos).toBe(2_750);
    expect(dados.diferencaCentavos).toBe(0);

    expect(await R.listarRegistro(db)).toHaveLength(1);
    expect(await db.turmas.count()).toBe(5);
    expect(await R.conferirSenha(db, '2468')).toBe(true);
  });

  it('venda vai para o registro, estorno marca e zerar mantém (ordem: mais nova primeiro)', async () => {
    const v1 = await R.confirmarVenda(db, caixaId, [{ itemId: bolo, nome: 'Cookie', precoUnitCentavos: 300, quantidade: 2 }], 1_000, 10);
    await R.confirmarVenda(db, caixaId, [{ itemId: bolo, nome: 'Cookie', precoUnitCentavos: 300, quantidade: 1 }], 500, 20);
    await R.estornarVenda(db, v1, 30);
    await R.zerarComputador(db);
    const [maisNova, maisAntiga] = await R.listarRegistro(db);
    expect(maisNova).toMatchObject({ totalCentavos: 300, recebidoCentavos: 500, trocoCentavos: 200, estornada: false });
    expect(maisAntiga).toMatchObject({ itens: '2× Cookie', trocoCentavos: 400, estornada: true, estornadaEm: 30 });
  });

  it('ids de venda não se repetem depois de zerar (o registro continua apontando certo)', async () => {
    const v1 = await R.confirmarVenda(db, caixaId, pedido(1, 0), 250, 10);
    await R.zerarComputador(db);
    await prepararGrupo();
    const v2 = await R.confirmarVenda(db, caixaId, pedido(1, 0), 250, 20);
    expect(v2).toBeGreaterThan(v1);
    await R.estornarVenda(db, v2, 30);
    const reg = await R.listarRegistro(db);
    expect(reg.find((r) => r.vendaId === v1)?.estornada).toBe(false);
    expect(reg.find((r) => r.vendaId === v2)?.estornada).toBe(true);
  });
});

describe('apagar histórico', () => {
  beforeEach(prepararGrupo);

  it('apaga fechamentos e registro, mas não o grupo atual', async () => {
    await R.confirmarVenda(db, caixaId, pedido(1, 0), 250, 10);
    await R.fecharCaixa(db, caixaId, null, 20);
    await R.apagarHistorico(db);
    expect(await db.fechamentos.count()).toBe(0);
    expect(await db.registroVendas.count()).toBe(0);
    expect(await R.grupoAtivo(db)).toBeDefined();
  });
});

describe('grupo ativo e produtos', () => {
  it('só um grupo ativo por vez', async () => {
    const a = await R.iniciarGrupo(db, '2º A', 1, 'Bolo', 0, 1);
    const b = await R.iniciarGrupo(db, '2º B', 2, 'Cupcake', 1, 2);
    expect(b).toBe(a);
    expect((await R.grupoAtivo(db))?.nome).toBe('Bolo');
  });

  it('abrir caixa duas vezes devolve o mesmo caixa', async () => {
    await R.iniciarGrupo(db, '2º A', 1, 'Bolo', 0, 1);
    const c1 = await R.abrirCaixa(db, 1_000, 1);
    const c2 = await R.abrirCaixa(db, 5_000, 2);
    expect(c2).toBe(c1);
    expect((await db.caixas.get(c1))?.trocoInicialCentavos).toBe(1_000);
  });

  it('trocar a foto apaga a antiga; desativar tira da venda', async () => {
    await R.iniciarGrupo(db, '2º A', 1, 'Bolo', 0, 1);
    const f1 = await R.guardarFoto(db, new Blob(['a']));
    const id = await R.salvarItem(db, { nome: 'Bolo', fotoId: f1, precoCentavos: 500, controlaEstoque: false, qtdInicial: null, qtdDisponivel: null, ativo: true });
    const f2 = await R.guardarFoto(db, new Blob(['b']));
    const item = (await db.itens.get(id))!;
    await R.salvarItem(db, { ...item, fotoId: f2 });
    expect(await db.fotos.get(f1)).toBeUndefined();
    expect(await db.fotos.get(f2)).toBeDefined();
    await R.definirItemAtivo(db, id, false);
    expect(await R.itensAtivos(db)).toEqual([]);
    expect(await R.itensDoGrupoAtivo(db)).toHaveLength(1);
  });
});

describe('turmas e grupos (Organizador)', () => {
  it('criar, renomear e apagar turma e grupos', async () => {
    for (const t of await db.turmas.toArray()) await R.apagarTurma(db, t.id);
    expect(await R.criarTurma(db, '  4º   B ')).toBe('OK');
    expect(await R.criarTurma(db, '4º b')).toBe('JA_EXISTE');
    expect(await R.criarTurma(db, '   ')).toBe('NOME_INVALIDO');
    const [turma] = await R.turmasComGrupos(db);
    expect(turma.turma.nome).toBe('4º B');

    expect(await R.adicionarGrupoCatalogo(db, turma.turma.id, 'Pipoca')).toBe(true);
    expect(await R.adicionarGrupoCatalogo(db, turma.turma.id, 'Cookies')).toBe(true);
    expect(await R.adicionarGrupoCatalogo(db, turma.turma.id, ' ')).toBe(false);
    let grupos = (await R.turmaComGrupos(db, turma.turma.id))!.grupos;
    expect(grupos.map((g) => g.numero)).toEqual([1, 2]);

    await R.apagarGrupoCatalogo(db, grupos[0].id);
    await R.adicionarGrupoCatalogo(db, turma.turma.id, 'Suco');
    await R.renomearGrupoCatalogo(db, grupos[1].id, 'Cookies de aveia');
    grupos = (await R.turmaComGrupos(db, turma.turma.id))!.grupos;
    expect(grupos.map((g) => [g.numero, g.produto])).toEqual([
      [2, 'Cookies de aveia'],
      [3, 'Suco'],
    ]);

    expect(await R.renomearTurma(db, turma.turma.id, '4º C')).toBe('OK');
    expect(await R.renomearTurma(db, turma.turma.id, '4º c')).toBe('OK');
    await R.apagarTurma(db, turma.turma.id);
    expect(await R.turmasComGrupos(db)).toEqual([]);
    expect(await R.turmaComGrupos(db, turma.turma.id)).toBeNull();
    expect(await db.gruposCatalogo.count()).toBe(0);
  });
});

describe('backup', () => {
  beforeEach(prepararGrupo);

  it('exporta no formato 2 do Android', async () => {
    await R.confirmarVenda(db, caixaId, pedido(1, 0), 500, 10);
    await R.fecharCaixa(db, caixaId, 2_250, 20);
    const json = JSON.parse(await exportarBackup(db, 99));
    expect(Object.keys(json)).toEqual(['app', 'formato', 'registroVendas', 'geradoEm', 'fechamentos']);
    expect(json.app).toBe('Vendinha');
    expect(json.formato).toBe(2);
    expect(json.geradoEm).toBe(99);
    expect(Object.keys(json.registroVendas[0])).toEqual([
      'dataHora', 'turma', 'numeroGrupo', 'nomeGrupo', 'itens', 'totalCentavos', 'recebidoCentavos', 'trocoCentavos', 'estornada', 'estornadaEm',
    ]);
    expect(Object.keys(json.fechamentos[0])).toEqual([
      'id', 'turma', 'numeroGrupo', 'nomeGrupo', 'data', 'totalCentavos', 'numVendas', 'trocoInicialCentavos', 'contadoCentavos', 'resumo',
    ]);
    expect(json.fechamentos[0].resumo).toMatchObject({ versao: 1, esperadoCentavos: 2_250, campeaoItemId: brigadeiro });
  });

  it('importar só acrescenta, sem duplicar', async () => {
    await R.confirmarVenda(db, caixaId, pedido(1, 0), 500, 10);
    await R.fecharCaixa(db, caixaId, null, 20);
    const texto = await exportarBackup(db, 99);

    expect(await importarBackup(db, texto)).toEqual({ fechamentosNovos: 0, fechamentosRepetidos: 1, registrosNovos: 0, registrosRepetidos: 1 });

    const outro = new VendinhaDB(`outro-${Date.now()}`);
    try {
      expect(await importarBackup(outro, texto)).toEqual({ fechamentosNovos: 1, fechamentosRepetidos: 0, registrosNovos: 1, registrosRepetidos: 0 });
      expect(await importarBackup(outro, texto)).toEqual({ fechamentosNovos: 0, fechamentosRepetidos: 1, registrosNovos: 0, registrosRepetidos: 1 });
      const [f] = await R.listarFechamentos(outro);
      expect(f.caixaId).toBeNull();
      expect(lerRelatorio(f).itens[0].nome).toBe('Brigadeiro');
      const reexportado = JSON.parse(gerarBackup(await R.listarFechamentos(outro), 99, await R.listarRegistro(outro)));
      expect(reexportado.registroVendas).toEqual(JSON.parse(texto).registroVendas);
    } finally {
      await outro.delete();
    }
  });

  it('recusa arquivo que não é backup do Vendinha', async () => {
    await expect(importarBackup(db, 'oi')).rejects.toBeInstanceOf(BackupInvalidoError);
    await expect(importarBackup(db, '{"app":"Outro","fechamentos":[]}')).rejects.toBeInstanceOf(BackupInvalidoError);
  });
});
