import { dinheiroEsperado, podeConfirmar, type ValorVenda } from '../domain/contaCaixa';
import { calcularResumo, type LinhaVendida, type ResumoCaixa } from '../domain/resumo';
import { nomeGrupoValido, nomeTurmaValido } from '../domain/registro';
import * as Senha from '../domain/senha';
import type { Caixa, Config, Fechamento, Grupo, GrupoCatalogo, Item, ItemVenda, RegistroVenda, Turma, Venda, VendinhaDB } from './db';
import { ID_CONFIG } from './db';
import { gerarResumoJson } from './relatorio';

export class EstoqueInsuficienteError extends Error {
  constructor(readonly nomeItem: string) {
    super(`Sem estoque: ${nomeItem}`);
    this.name = 'EstoqueInsuficienteError';
  }
}

export class CaixaFechadoError extends Error {
  constructor() {
    super('O caixa não está aberto');
    this.name = 'CaixaFechadoError';
  }
}

export interface LinhaPedido {
  itemId: number;
  nome: string;
  precoUnitCentavos: number;
  quantidade: number;
}

export interface VendaComItens {
  venda: Venda;
  itens: ItemVenda[];
}

export interface TurmaComGrupos {
  turma: Turma;
  grupos: GrupoCatalogo[];
}

const agoraPadrao = () => Date.now();

function porNome(a: string, b: string): number {
  return a.localeCompare(b, 'pt-BR', { sensitivity: 'base' });
}

export async function obterConfig(db: VendinhaDB): Promise<Config | undefined> {
  return db.config.get(ID_CONFIG);
}

export async function criarSenha(db: VendinhaDB, senha: string): Promise<void> {
  if (!Senha.formatoValido(senha)) throw new Error('Senha precisa ter de 4 a 8 dígitos');
  const salt = Senha.gerarSalt();
  const hash = await Senha.hash(senha, salt);
  const atual = await db.config.get(ID_CONFIG);
  await db.config.put({ id: ID_CONFIG, senhaHash: hash, senhaSalt: salt, somAtivo: atual?.somAtivo ?? true });
}

export async function conferirSenha(db: VendinhaDB, senha: string): Promise<boolean> {
  const c = await db.config.get(ID_CONFIG);
  if (!c) return false;
  return Senha.confere(senha, c.senhaSalt, c.senhaHash);
}

export async function definirSom(db: VendinhaDB, ativo: boolean): Promise<void> {
  await db.config.update(ID_CONFIG, { somAtivo: ativo });
}

export async function grupoAtivo(db: VendinhaDB): Promise<Grupo | undefined> {
  const ativos = await db.grupos.filter((g) => g.ativo).toArray();
  return ativos.sort((a, b) => b.id - a.id)[0];
}

export async function iniciarGrupo(
  db: VendinhaDB,
  turma: string,
  numeroGrupo: number,
  nome: string,
  corIndex: number,
  agora = agoraPadrao(),
): Promise<number> {
  return db.transaction('rw', db.grupos, async () => {
    const atual = await grupoAtivo(db);
    if (atual) return atual.id;
    return db.grupos.add({
      turma: turma.trim(),
      numeroGrupo,
      nome: nome.trim(),
      corIndex,
      iniciadoEm: agora,
      ativo: true,
    }) as Promise<number>;
  });
}

export async function renomearGrupo(db: VendinhaDB, id: number, nome: string): Promise<void> {
  const limpo = nome.trim();
  if (!limpo) return;
  await db.grupos.update(id, { nome: limpo });
}

function ordenarItens(itens: Item[]): Item[] {
  return itens.sort((a, b) => Number(b.ativo) - Number(a.ativo) || porNome(a.nome, b.nome));
}

export async function itensDoGrupoAtivo(db: VendinhaDB): Promise<Item[]> {
  const g = await grupoAtivo(db);
  if (!g) return [];
  return ordenarItens(await db.itens.where('grupoId').equals(g.id).toArray());
}

export async function itensAtivos(db: VendinhaDB): Promise<Item[]> {
  return (await itensDoGrupoAtivo(db)).filter((i) => i.ativo);
}

export type NovoItem = Omit<Item, 'id' | 'grupoId'>;

export async function salvarItem(db: VendinhaDB, item: NovoItem & { id?: number }): Promise<number> {
  return db.transaction('rw', db.itens, db.grupos, db.fotos, async () => {
    if (item.id == null || item.id === 0) {
      const g = await grupoAtivo(db);
      if (!g) throw new Error('Nenhum grupo ativo');
      const { id: _semId, ...dados } = item;
      return (await db.itens.add({ ...dados, grupoId: g.id })) as number;
    }
    const antigo = await db.itens.get(item.id);
    if (!antigo) throw new Error('Item não existe');
    await db.itens.put({ ...antigo, ...item, id: item.id, grupoId: antigo.grupoId });
    if (antigo.fotoId != null && antigo.fotoId !== item.fotoId) await db.fotos.delete(antigo.fotoId);
    return item.id;
  });
}

export async function definirItemAtivo(db: VendinhaDB, id: number, ativo: boolean): Promise<void> {
  await db.itens.update(id, { ativo });
}

export async function guardarFoto(db: VendinhaDB, blob: Blob): Promise<number> {
  return (await db.fotos.add({ blob })) as number;
}

export async function apagarFoto(db: VendinhaDB, id: number): Promise<void> {
  await db.fotos.delete(id);
}

export async function caixaAtual(db: VendinhaDB): Promise<Caixa | undefined> {
  const g = await grupoAtivo(db);
  if (!g) return undefined;
  const caixas = await db.caixas.where('grupoId').equals(g.id).toArray();
  return caixas.sort((a, b) => b.id - a.id)[0];
}

export async function abrirCaixa(db: VendinhaDB, trocoInicialCentavos: number, agora = agoraPadrao()): Promise<number> {
  return db.transaction('rw', db.grupos, db.caixas, async () => {
    const g = await grupoAtivo(db);
    if (!g) throw new Error('Nenhum grupo ativo');
    const existente = (await db.caixas.where('grupoId').equals(g.id).toArray()).sort((a, b) => b.id - a.id)[0];
    if (existente) return existente.id;
    return (await db.caixas.add({
      grupoId: g.id,
      abertoEm: agora,
      fechadoEm: null,
      trocoInicialCentavos: Math.max(0, trocoInicialCentavos),
      contadoCentavos: null,
      status: 'ABERTO',
    })) as number;
  });
}

export async function vendasDoCaixa(db: VendinhaDB, caixaId: number): Promise<VendaComItens[]> {
  const vendas = await db.vendas.where('caixaId').equals(caixaId).toArray();
  vendas.sort((a, b) => b.dataHora - a.dataHora || b.id - a.id);
  const ids = vendas.map((v) => v.id);
  const itens = ids.length ? await db.itensVenda.where('vendaId').anyOf(ids).toArray() : [];
  return vendas.map((venda) => ({
    venda,
    itens: itens.filter((i) => i.vendaId === venda.id).sort((a, b) => a.id - b.id),
  }));
}

export async function vendasAtuais(db: VendinhaDB): Promise<VendaComItens[]> {
  const c = await caixaAtual(db);
  return c ? vendasDoCaixa(db, c.id) : [];
}

export async function obterVenda(db: VendinhaDB, id: number): Promise<VendaComItens | undefined> {
  const venda = await db.vendas.get(id);
  if (!venda) return undefined;
  const itens = (await db.itensVenda.where('vendaId').equals(id).toArray()).sort((a, b) => a.id - b.id);
  return { venda, itens };
}

export async function qtdVendidaAtual(db: VendinhaDB): Promise<Map<number, number>> {
  const r = new Map<number, number>();
  for (const v of await vendasAtuais(db)) {
    if (v.venda.estornada) continue;
    for (const iv of v.itens) r.set(iv.itemId, (r.get(iv.itemId) ?? 0) + iv.quantidade);
  }
  return r;
}

export async function confirmarVenda(
  db: VendinhaDB,
  caixaId: number,
  linhas: readonly LinhaPedido[],
  recebidoCentavos: number,
  agora = agoraPadrao(),
): Promise<number> {
  const validas = linhas.filter((l) => l.quantidade > 0);
  if (validas.length === 0) throw new RangeError('Pedido vazio');
  const total = validas.reduce((s, l) => s + l.precoUnitCentavos * l.quantidade, 0);
  if (!podeConfirmar(total, recebidoCentavos)) throw new RangeError('Recebido menor que o total');

  return db.transaction('rw', [db.caixas, db.grupos, db.itens, db.vendas, db.itensVenda, db.registroVendas], async () => {
    const caixa = await db.caixas.get(caixaId);
    if (caixa?.status !== 'ABERTO') throw new CaixaFechadoError();

    const vendaId = (await db.vendas.add({
      caixaId,
      dataHora: agora,
      totalCentavos: total,
      recebidoCentavos,
      trocoCentavos: recebidoCentavos - total,
      estornada: false,
      estornadaEm: null,
    })) as number;

    for (const l of validas) {
      const atual = await db.itens.get(l.itemId);
      if (atual && atual.controlaEstoque) {
        const disponivel = atual.qtdDisponivel ?? 0;
        if (disponivel < l.quantidade) throw new EstoqueInsuficienteError(l.nome);
        await db.itens.update(l.itemId, { qtdDisponivel: disponivel - l.quantidade });
      }
    }

    await db.itensVenda.bulkAdd(
      validas.map((l) => ({
        vendaId,
        itemId: l.itemId,
        nomeItem: l.nome,
        quantidade: l.quantidade,
        precoUnitCentavos: l.precoUnitCentavos,
      })),
    );

    const g = await db.grupos.get(caixa.grupoId);
    await db.registroVendas.add({
      vendaId,
      dataHora: agora,
      turma: g?.turma ?? '',
      numeroGrupo: g?.numeroGrupo ?? 0,
      nomeGrupo: g?.nome ?? '',
      itens: validas.map((l) => `${l.quantidade}× ${l.nome}`).join(', '),
      totalCentavos: total,
      recebidoCentavos,
      trocoCentavos: recebidoCentavos - total,
      estornada: false,
      estornadaEm: null,
    });
    return vendaId;
  });
}

export async function estornarVenda(db: VendinhaDB, vendaId: number, agora = agoraPadrao()): Promise<boolean> {
  return db.transaction('rw', [db.vendas, db.itensVenda, db.itens, db.registroVendas], async () => {
    const venda = await db.vendas.get(vendaId);
    if (!venda || venda.estornada) return false;
    await db.vendas.update(vendaId, { estornada: true, estornadaEm: agora });
    for (const iv of await db.itensVenda.where('vendaId').equals(vendaId).toArray()) {
      const item = await db.itens.get(iv.itemId);
      if (item && item.controlaEstoque) {
        await db.itens.update(iv.itemId, { qtdDisponivel: (item.qtdDisponivel ?? 0) + iv.quantidade });
      }
    }
    await db.registroVendas.where('vendaId').equals(vendaId).modify({ estornada: true, estornadaEm: agora });
    return true;
  });
}

export function resumoDe(vendas: readonly VendaComItens[]): ResumoCaixa {
  const valores: ValorVenda[] = vendas.map((v) => ({ totalCentavos: v.venda.totalCentavos, estornada: v.venda.estornada }));
  const linhas: LinhaVendida[] = vendas.flatMap((v) =>
    v.itens.map((iv) => ({
      itemId: iv.itemId,
      nome: iv.nomeItem,
      quantidade: iv.quantidade,
      precoUnitCentavos: iv.precoUnitCentavos,
      estornada: v.venda.estornada,
    })),
  );
  return calcularResumo(valores, linhas);
}

export async function fecharCaixa(
  db: VendinhaDB,
  caixaId: number,
  contadoCentavos: number | null,
  agora = agoraPadrao(),
): Promise<number> {
  return db.transaction('rw', [db.caixas, db.grupos, db.vendas, db.itensVenda, db.fechamentos], async () => {
    const caixa = await db.caixas.get(caixaId);
    if (!caixa) throw new Error('Caixa não existe');
    const grupo = await db.grupos.get(caixa.grupoId);
    if (!grupo) throw new Error('Nenhum grupo ativo');
    await db.caixas.update(caixaId, { status: 'FECHADO', fechadoEm: agora, contadoCentavos });
    const resumo = resumoDe(await vendasDoCaixa(db, caixaId));
    const esperado = dinheiroEsperado(caixa.trocoInicialCentavos, resumo.totalGanhoCentavos);
    const dados: Omit<Fechamento, 'id'> = {
      turma: grupo.turma,
      numeroGrupo: grupo.numeroGrupo,
      nomeGrupo: grupo.nome,
      data: agora,
      totalCentavos: resumo.totalGanhoCentavos,
      numVendas: resumo.numeroVendas,
      trocoInicialCentavos: caixa.trocoInicialCentavos,
      contadoCentavos,
      resumoJson: gerarResumoJson(resumo, esperado, caixa.abertoEm, agora),
      caixaId,
    };
    const anteriores = await db.fechamentos.where('caixaId').equals(caixaId).toArray();
    const anterior = anteriores.sort((a, b) => b.id - a.id)[0];
    if (anterior) {
      await db.fechamentos.put({ ...dados, id: anterior.id });
      return anterior.id;
    }
    return (await db.fechamentos.add(dados)) as number;
  });
}

export async function reabrirCaixa(db: VendinhaDB, caixaId: number): Promise<void> {
  await db.caixas.update(caixaId, { status: 'ABERTO', fechadoEm: null });
}

export async function fechamentoDoCaixa(db: VendinhaDB, caixaId: number): Promise<number | undefined> {
  const f = await db.fechamentos.where('caixaId').equals(caixaId).toArray();
  return f.sort((a, b) => b.id - a.id)[0]?.id;
}

export async function listarFechamentos(db: VendinhaDB): Promise<Fechamento[]> {
  return (await db.fechamentos.toArray()).sort((a, b) => b.data - a.data || b.id - a.id);
}

export async function listarRegistro(db: VendinhaDB): Promise<RegistroVenda[]> {
  return (await db.registroVendas.toArray()).sort((a, b) => b.dataHora - a.dataHora || b.id - a.id);
}

export async function apagarHistorico(db: VendinhaDB): Promise<void> {
  await db.transaction('rw', db.fechamentos, db.registroVendas, async () => {
    await db.fechamentos.clear();
    await db.registroVendas.clear();
  });
}

export async function zerarComputador(db: VendinhaDB): Promise<void> {
  await db.transaction('rw', [db.itensVenda, db.vendas, db.caixas, db.itens, db.grupos, db.fotos], async () => {
    await db.itensVenda.clear();
    await db.vendas.clear();
    await db.caixas.clear();
    await db.itens.clear();
    await db.grupos.clear();
    await db.fotos.clear();
  });
}

export type ResultadoTurma = 'OK' | 'NOME_INVALIDO' | 'JA_EXISTE';

export async function turmasComGrupos(db: VendinhaDB): Promise<TurmaComGrupos[]> {
  const [turmas, grupos] = await Promise.all([db.turmas.toArray(), db.gruposCatalogo.toArray()]);
  return turmas
    .sort((a, b) => porNome(a.nome, b.nome))
    .map((turma) => ({
      turma,
      grupos: grupos.filter((g) => g.turmaId === turma.id).sort((a, b) => a.numero - b.numero),
    }));
}

export async function turmaComGrupos(db: VendinhaDB, id: number): Promise<TurmaComGrupos | null> {
  const turma = await db.turmas.get(id);
  if (!turma) return null;
  const grupos = (await db.gruposCatalogo.where('turmaId').equals(id).toArray()).sort((a, b) => a.numero - b.numero);
  return { turma, grupos };
}

async function salvarNomeTurma(
  db: VendinhaDB,
  nome: string,
  ignorarId: number | null,
  gravar: (limpo: string) => Promise<unknown>,
): Promise<ResultadoTurma> {
  const limpo = nome.trim().replace(/\s+/g, ' ');
  if (!nomeTurmaValido(limpo)) return 'NOME_INVALIDO';
  return db.transaction('rw', db.turmas, async () => {
    const repetida = (await db.turmas.toArray()).some(
      (t) => t.id !== ignorarId && t.nome.localeCompare(limpo, 'pt-BR', { sensitivity: 'accent' }) === 0,
    );
    if (repetida) return 'JA_EXISTE' as const;
    await gravar(limpo);
    return 'OK' as const;
  });
}

export function criarTurma(db: VendinhaDB, nome: string): Promise<ResultadoTurma> {
  return salvarNomeTurma(db, nome, null, (n) => db.turmas.add({ nome: n }));
}

export function renomearTurma(db: VendinhaDB, id: number, nome: string): Promise<ResultadoTurma> {
  return salvarNomeTurma(db, nome, id, (n) => db.turmas.update(id, { nome: n }));
}

export async function apagarTurma(db: VendinhaDB, id: number): Promise<void> {
  await db.transaction('rw', db.turmas, db.gruposCatalogo, async () => {
    await db.gruposCatalogo.where('turmaId').equals(id).delete();
    await db.turmas.delete(id);
  });
}

export async function adicionarGrupoCatalogo(db: VendinhaDB, turmaId: number, produto: string): Promise<boolean> {
  if (!nomeGrupoValido(produto)) return false;
  await db.transaction('rw', db.gruposCatalogo, async () => {
    const grupos = await db.gruposCatalogo.where('turmaId').equals(turmaId).toArray();
    const maior = grupos.reduce((m, g) => Math.max(m, g.numero), 0);
    await db.gruposCatalogo.add({ turmaId, numero: maior + 1, produto: produto.trim() });
  });
  return true;
}

export async function renomearGrupoCatalogo(db: VendinhaDB, id: number, produto: string): Promise<boolean> {
  if (!nomeGrupoValido(produto)) return false;
  await db.gruposCatalogo.update(id, { produto: produto.trim() });
  return true;
}

export async function apagarGrupoCatalogo(db: VendinhaDB, id: number): Promise<void> {
  await db.gruposCatalogo.delete(id);
}
