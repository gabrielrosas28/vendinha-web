import Dexie, { type EntityTable, type Transaction } from 'dexie';
import { TURMAS_INICIAIS, gruposDaTurma } from '../domain/grupos';

export type StatusCaixa = 'ABERTO' | 'FECHADO';

export interface Grupo {
  id: number;
  turma: string;
  numeroGrupo: number;
  nome: string;
  corIndex: number;
  iniciadoEm: number;
  ativo: boolean;
}

export interface Item {
  id: number;
  grupoId: number;
  nome: string;
  fotoId: number | null;
  precoCentavos: number;
  controlaEstoque: boolean;
  qtdInicial: number | null;
  qtdDisponivel: number | null;
  ativo: boolean;
}

export interface Foto {
  id: number;
  blob: Blob;
}

export interface Caixa {
  id: number;
  grupoId: number;
  abertoEm: number;
  fechadoEm: number | null;
  trocoInicialCentavos: number;
  contadoCentavos: number | null;
  status: StatusCaixa;
}

export interface Venda {
  id: number;
  caixaId: number;
  dataHora: number;
  totalCentavos: number;
  recebidoCentavos: number;
  trocoCentavos: number;
  estornada: boolean;
  estornadaEm: number | null;
}

export interface ItemVenda {
  id: number;
  vendaId: number;
  itemId: number;
  nomeItem: string;
  quantidade: number;
  precoUnitCentavos: number;
}

export interface Fechamento {
  id: number;
  turma: string;
  numeroGrupo: number;
  nomeGrupo: string;
  data: number;
  totalCentavos: number;
  numVendas: number;
  trocoInicialCentavos: number;
  contadoCentavos: number | null;
  resumoJson: string;
  caixaId: number | null;
}

export interface Config {
  id: number;
  senhaHash: string;
  senhaSalt: string;
  somAtivo: boolean;
}

export interface Turma {
  id: number;
  nome: string;
}

export interface GrupoCatalogo {
  id: number;
  turmaId: number;
  numero: number;
  produto: string;
}

export interface RegistroVenda {
  id: number;
  vendaId: number;
  dataHora: number;
  turma: string;
  numeroGrupo: number;
  nomeGrupo: string;
  itens: string;
  totalCentavos: number;
  recebidoCentavos: number;
  trocoCentavos: number;
  estornada: boolean;
  estornadaEm: number | null;
}

export const NOME_BANCO = 'vendinha';
export const ID_CONFIG = 1;

export class VendinhaDB extends Dexie {
  config!: EntityTable<Config, 'id'>;
  grupos!: EntityTable<Grupo, 'id'>;
  itens!: EntityTable<Item, 'id'>;
  fotos!: EntityTable<Foto, 'id'>;
  caixas!: EntityTable<Caixa, 'id'>;
  vendas!: EntityTable<Venda, 'id'>;
  itensVenda!: EntityTable<ItemVenda, 'id'>;
  fechamentos!: EntityTable<Fechamento, 'id'>;
  turmas!: EntityTable<Turma, 'id'>;
  gruposCatalogo!: EntityTable<GrupoCatalogo, 'id'>;
  registroVendas!: EntityTable<RegistroVenda, 'id'>;

  constructor(nome: string = NOME_BANCO) {
    super(nome);
    this.version(1).stores({
      config: 'id',
      grupos: '++id',
      itens: '++id, grupoId',
      fotos: '++id',
      caixas: '++id, grupoId',
      vendas: '++id, caixaId',
      itensVenda: '++id, vendaId, itemId',
      fechamentos: '++id, caixaId, data',
      turmas: '++id, &nome',
      gruposCatalogo: '++id, turmaId',
      registroVendas: '++id, vendaId, dataHora',
    });
    this.on('populate', (tx) => semearTurmas(tx));
  }
}

export async function semearTurmas(tx: Transaction): Promise<void> {
  for (const nome of TURMAS_INICIAIS) {
    const turmaId = (await tx.table('turmas').add({ nome })) as number;
    for (const g of gruposDaTurma(nome)) {
      await tx.table('gruposCatalogo').add({ turmaId, numero: g.numero, produto: g.produto });
    }
  }
}

export const db = new VendinhaDB();
