import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import { caixaAtual, fechamentoDoCaixa, grupoAtivo, itensAtivos, renomearGrupo, vendasAtuais } from '../../data/repositorios';
import { numeroVendasValidas, totalGanho } from '../../domain/contaCaixa';
import { situacao, type SituacaoEstoque } from '../../domain/estoque';
import { turmaGrupo } from '../../domain/grupos';
import { Cores, corGrupo, corSobre } from '../cores';
import { CampoTexto, Janela } from '../componentes/Dialogos';
import { CadeadoOrganizador, FaixaAviso, Tela } from '../componentes/Estrutura';
import { Icone, type NomeIcone } from '../componentes/Icone';
import { Tecla, TeclaIcone, TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { LinhaVisor, Visor } from '../componentes/Visor';
import { useAtalhos } from '../atalhos';
import { useConsulta } from '../dados';
import { plural } from '../formatos';

interface AlertaEstoque {
  nome: string;
  situacao: SituacaoEstoque;
  restam: number;
}

export function PainelTela() {
  const navegar = useNavigate();
  const { carregado, valor: e } = useConsulta(async () => {
    const [grupo, caixa, vendas, itens] = await Promise.all([grupoAtivo(db), caixaAtual(db), vendasAtuais(db), itensAtivos(db)]);
    const valores = vendas.map((v) => ({ totalCentavos: v.venda.totalCentavos, estornada: v.venda.estornada }));
    const alertas: AlertaEstoque[] = itens
      .map((i) => ({ nome: i.nome, situacao: situacao(i.controlaEstoque, i.qtdDisponivel), restam: i.qtdDisponivel ?? 0 }))
      .filter((a) => a.situacao === 'ACABANDO' || a.situacao === 'ESGOTADO')
      .sort((a, b) => a.restam - b.restam);
    return { grupo, caixa, totalGanho: totalGanho(valores), numVendas: numeroVendasValidas(valores), itensAtivos: itens.length, alertas };
  });
  const [editarNome, setEditarNome] = useState(false);

  const semGrupo = carregado && !e?.grupo;
  useEffect(() => {
    if (semGrupo) navegar('/inicio', { replace: true });
  }, [semGrupo, navegar]);

  const grupo = e?.grupo;
  const caixa = e?.caixa;
  const fechado = caixa?.status === 'FECHADO';
  const semItens = (e?.itensAtivos ?? 0) === 0;
  const vender = () => {
    if (fechado) return;
    if (semItens) navegar('/produtos');
    else if (!caixa) navegar('/abrir-caixa');
    else navegar('/venda');
  };
  const abrirRelatorio = async () => {
    if (!caixa) return;
    const id = await fechamentoDoCaixa(db, caixa.id);
    if (id != null) navegar(`/relatorio/${id}`);
  };

  useAtalhos((ev) => {
    if (ev.key === 'Enter' && grupo) {
      vender();
      return true;
    }
    return false;
  }, !!grupo);

  if (!grupo || !e) return <Tela />;
  const cor = corGrupo(grupo.corIndex);
  const dica = fechado
    ? 'Caixa fechado. Chame o organizador.'
    : semItens
      ? 'Primeiro, cadastre o que vocês vão vender.'
      : !caixa
        ? 'Clique em Vender para abrir o caixa.'
        : null;

  return (
    <Tela larga>
      <div className="rolagem">
        <div className="painel">
          <div className="painel-esquerda pilha">
            <div className="linha" style={{ gap: 14 }}>
              <div
                className="t-hl"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  background: cor,
                  color: corSobre(cor),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
                aria-hidden="true"
              >
                {grupo.numeroGrupo > 0 ? grupo.numeroGrupo : [...grupo.nome][0]?.toLocaleUpperCase('pt-BR')}
              </div>
              <div className="cresce">
                <h1 className="t-hm c-tinta duas-linhas">{grupo.nome}</h1>
                <p className="t-bl c-apoio">{turmaGrupo(grupo.turma, grupo.numeroGrupo)}</p>
              </div>
              <TeclaIcone icone="editar" descricao="Mudar o nome do grupo" onClick={() => setEditarNome(true)} tamanho={52} />
              <CadeadoOrganizador onAbrir={() => navegar('/organizador')} />
            </div>

            <Visor>
              <LinhaVisor rotulo="Vendido hoje" centavos={e.totalGanho} grande />
              <p className="t-bl visor-texto">{plural(e.numVendas, 'venda', 'vendas')}</p>
            </Visor>

            {e.alertas.slice(0, 3).map((a) => (
              <FaixaAviso
                key={a.nome}
                texto={
                  a.situacao === 'ESGOTADO'
                    ? `${a.nome} esgotou`
                    : `${a.nome} está acabando: ${a.restam === 1 ? 'resta' : 'restam'} ${a.restam}`
                }
                tipo={a.situacao === 'ESGOTADO' ? 'erro' : 'alerta'}
              />
            ))}
            {e.alertas.length > 3 && <p className="t-bl c-alerta">E mais {e.alertas.length - 3} itens acabando. Veja no Estoque.</p>}
          </div>

          <div className="painel-direita pilha">
            <Tecla onClick={vender} habilitada={!fechado} alturaMinima={168} raio={28} beico={7}>
              <Icone nome="carrinho" tamanho={52} />
              <span className="t-dm" style={{ marginLeft: 6 }}>
                Vender
              </span>
            </Tecla>
            {dica && <p className="t-bl c-apoio" style={{ textAlign: 'center' }}>{dica}</p>}
            <div className="painel-atalhos">
              <Atalho icone="estoque" texto="Estoque" corIcone={Cores.azul} onClick={() => navegar('/estoque')} />
              <Atalho icone="historico" texto="Histórico" corIcone={Cores.grupos[3]} onClick={() => navegar('/historico')} />
              <Atalho icone="etiqueta" texto="Produtos" corIcone={Cores.verde} onClick={() => navegar('/produtos')} />
              {fechado ? (
                <Atalho icone="recibo" texto="Relatório" corIcone={Cores.tinta} onClick={() => void abrirRelatorio()} />
              ) : (
                <Atalho icone="cadeado" texto="Fechar caixa" corIcone={Cores.erro} onClick={() => navegar('/fechar')} habilitado={!!caixa} />
              )}
            </div>
          </div>
        </div>
      </div>

      {editarNome && <DialogoNomeGrupo inicial={grupo.nome} onFechar={() => setEditarNome(false)} onSalvar={(n) => void renomearGrupo(db, grupo.id, n)} />}
    </Tela>
  );
}

function DialogoNomeGrupo({ inicial, onFechar, onSalvar }: { inicial: string; onFechar: () => void; onSalvar: (nome: string) => void }) {
  const [nome, setNome] = useState(inicial);
  const salvar = () => {
    if (!nome.trim()) return;
    onSalvar(nome);
    onFechar();
  };
  return (
    <Janela onFechar={onFechar} rotulo="Mudar o nome do grupo">
      <h2 className="t-hs c-tinta">Mudar o nome do grupo</h2>
      <div style={{ marginTop: 16 }}>
        <CampoTexto valor={nome} onMudar={(v) => setNome(v.slice(0, 40))} rotulo="Nome do grupo" maximo={40} onEnter={salvar} />
      </div>
      <div className="linha" style={{ marginTop: 20 }}>
        <div className="peso-1">
          <TeclaSecundaria texto="Cancelar" onClick={onFechar} />
        </div>
        <div className="peso-1">
          <TeclaTexto texto="Salvar" onClick={salvar} cor={Cores.verde} corConteudo="#FFFFFF" habilitada={nome.trim() !== ''} />
        </div>
      </div>
    </Janela>
  );
}

function Atalho({
  icone,
  texto,
  corIcone,
  onClick,
  habilitado = true,
}: {
  icone: NomeIcone;
  texto: string;
  corIcone: string;
  onClick: () => void;
  habilitado?: boolean;
}) {
  return (
    <Tecla onClick={onClick} cor={Cores.superficie} corConteudo={Cores.tinta} borda={Cores.linha} habilitada={habilitado} alturaMinima={132} raio={24}>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <Icone nome={icone} tamanho={36} cor={habilitado ? corIcone : '#6B7391'} />
        <span className="t-tm">{texto}</span>
      </span>
    </Tecla>
  );
}
