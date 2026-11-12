import type { Fechamento, RegistroVenda, VendinhaDB } from './db';
import { lerResumoObjeto } from './relatorio';
import { listarFechamentos, listarRegistro } from './repositorios';

export function gerarBackup(fechamentos: readonly Fechamento[], geradoEm: number, registro: readonly RegistroVenda[] = []): string {
  return JSON.stringify(
    {
      app: 'Vendinha',
      formato: 2,
      registroVendas: registro.map((r) => ({
        dataHora: r.dataHora,
        turma: r.turma,
        numeroGrupo: r.numeroGrupo,
        nomeGrupo: r.nomeGrupo,
        itens: r.itens,
        totalCentavos: r.totalCentavos,
        recebidoCentavos: r.recebidoCentavos,
        trocoCentavos: r.trocoCentavos,
        estornada: r.estornada,
        estornadaEm: r.estornadaEm ?? null,
      })),
      geradoEm,
      fechamentos: fechamentos.map((f) => ({
        id: f.id,
        turma: f.turma,
        numeroGrupo: f.numeroGrupo,
        nomeGrupo: f.nomeGrupo,
        data: f.data,
        totalCentavos: f.totalCentavos,
        numVendas: f.numVendas,
        trocoInicialCentavos: f.trocoInicialCentavos,
        contadoCentavos: f.contadoCentavos ?? null,
        resumo: lerResumoObjeto(f.resumoJson),
      })),
    },
    null,
    2,
  );
}

export async function exportarBackup(db: VendinhaDB, agora = Date.now()): Promise<string> {
  return gerarBackup(await listarFechamentos(db), agora, await listarRegistro(db));
}

export class BackupInvalidoError extends Error {
  constructor() {
    super('Este arquivo não é um backup do Vendinha.');
    this.name = 'BackupInvalidoError';
  }
}

export interface ResultadoImportacao {
  fechamentosNovos: number;
  fechamentosRepetidos: number;
  registrosNovos: number;
  registrosRepetidos: number;
}

type Obj = Record<string, unknown>;
const ehObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);
const int = (v: unknown): number | null => (typeof v === 'number' && Number.isSafeInteger(v) ? v : null);
const txt = (v: unknown): string => (typeof v === 'string' ? v : '');

function chaveFechamento(f: Pick<Fechamento, 'turma' | 'numeroGrupo' | 'nomeGrupo' | 'data' | 'totalCentavos'>): string {
  return [f.turma, f.numeroGrupo, f.nomeGrupo, f.data, f.totalCentavos].join('|');
}

function chaveRegistro(
  r: Pick<RegistroVenda, 'dataHora' | 'turma' | 'numeroGrupo' | 'nomeGrupo' | 'itens' | 'totalCentavos' | 'recebidoCentavos'>,
): string {
  return [r.dataHora, r.turma, r.numeroGrupo, r.nomeGrupo, r.itens, r.totalCentavos, r.recebidoCentavos].join('|');
}

function lerFechamento(o: unknown): Omit<Fechamento, 'id'> | null {
  if (!ehObj(o)) return null;
  const data = int(o.data);
  const total = int(o.totalCentavos);
  if (data == null || total == null) return null;
  return {
    turma: txt(o.turma),
    numeroGrupo: int(o.numeroGrupo) ?? 0,
    nomeGrupo: txt(o.nomeGrupo),
    data,
    totalCentavos: total,
    numVendas: int(o.numVendas) ?? 0,
    trocoInicialCentavos: int(o.trocoInicialCentavos) ?? 0,
    contadoCentavos: int(o.contadoCentavos),
    resumoJson: JSON.stringify(ehObj(o.resumo) ? o.resumo : {}),
    caixaId: null,
  };
}

function lerRegistro(o: unknown): Omit<RegistroVenda, 'id'> | null {
  if (!ehObj(o)) return null;
  const dataHora = int(o.dataHora);
  const total = int(o.totalCentavos);
  const recebido = int(o.recebidoCentavos);
  if (dataHora == null || total == null || recebido == null) return null;
  return {
    vendaId: 0,
    dataHora,
    turma: txt(o.turma),
    numeroGrupo: int(o.numeroGrupo) ?? 0,
    nomeGrupo: txt(o.nomeGrupo),
    itens: txt(o.itens),
    totalCentavos: total,
    recebidoCentavos: recebido,
    trocoCentavos: int(o.trocoCentavos) ?? recebido - total,
    estornada: o.estornada === true,
    estornadaEm: int(o.estornadaEm),
  };
}

export async function importarBackup(db: VendinhaDB, texto: string): Promise<ResultadoImportacao> {
  let raiz: unknown;
  try {
    raiz = JSON.parse(texto);
  } catch {
    throw new BackupInvalidoError();
  }
  if (!ehObj(raiz) || raiz.app !== 'Vendinha' || !Array.isArray(raiz.fechamentos)) throw new BackupInvalidoError();

  const fechamentos = raiz.fechamentos.map(lerFechamento).filter((f): f is Omit<Fechamento, 'id'> => f != null);
  const registros = (Array.isArray(raiz.registroVendas) ? raiz.registroVendas : [])
    .map(lerRegistro)
    .filter((r): r is Omit<RegistroVenda, 'id'> => r != null);

  return db.transaction('rw', db.fechamentos, db.registroVendas, async () => {
    const r: ResultadoImportacao = { fechamentosNovos: 0, fechamentosRepetidos: 0, registrosNovos: 0, registrosRepetidos: 0 };
    const existentesF = new Set((await db.fechamentos.toArray()).map(chaveFechamento));
    for (const f of fechamentos) {
      const k = chaveFechamento(f);
      if (existentesF.has(k)) {
        r.fechamentosRepetidos++;
        continue;
      }
      existentesF.add(k);
      await db.fechamentos.add(f);
      r.fechamentosNovos++;
    }
    const existentesR = new Set((await db.registroVendas.toArray()).map(chaveRegistro));
    for (const reg of registros) {
      const k = chaveRegistro(reg);
      if (existentesR.has(k)) {
        r.registrosRepetidos++;
        continue;
      }
      existentesR.add(k);
      await db.registroVendas.add(reg);
      r.registrosNovos++;
    }
    return r;
  });
}
