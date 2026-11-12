import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import { iniciarGrupo, turmasComGrupos } from '../../data/repositorios';
import { TOTAL_CORES_GRUPO, corDoNumero, nomeCompletoGrupo, type GrupoPredefinido } from '../../domain/grupos';
import { Cores, NOMES_CORES, corGrupo, corSobre } from '../cores';
import { CampoTexto, DialogoConfirmacao, Janela } from '../componentes/Dialogos';
import { CadeadoOrganizador, Tela } from '../componentes/Estrutura';
import { Logo } from '../componentes/Logo';
import { Tecla, TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { useConsulta } from '../dados';

export function IniciarGrupoTela() {
  const navegar = useNavigate();
  const { carregado, valor: turmas } = useConsulta(() => turmasComGrupos(db));
  const [turmaEscolhida, setTurmaEscolhida] = useState<string | null>(null);
  const [escolhido, setEscolhido] = useState<GrupoPredefinido | null>(null);
  const [outro, setOutro] = useState(false);
  const lista = turmas ?? [];
  const atual = lista.find((t) => t.turma.nome === turmaEscolhida) ?? lista[0];
  const grupos: GrupoPredefinido[] = atual ? atual.grupos.map((g) => ({ turma: atual.turma.nome, numero: g.numero, produto: g.produto })) : [];

  const iniciar = async (turma: string, numero: number, nome: string, cor: number) => {
    await iniciarGrupo(db, turma, numero, nome, cor);
    navegar('/painel', { replace: true });
  };

  return (
    <Tela>
      <div className="rolagem">
        <div className="pilha" style={{ '--vao': '0px' } as React.CSSProperties}>
          <div className="linha" style={{ alignItems: 'flex-start' }}>
            <div className="cresce">
              <Logo largura={520} />
            </div>
            <CadeadoOrganizador onAbrir={() => navegar('/organizador')} />
          </div>
          <h1 className="t-ds c-tinta" style={{ marginTop: 20 }}>
            Qual é o seu grupo?
          </h1>
          {lista.length > 0 && (
            <div className="abas-turma" role="tablist" aria-label="Turmas" style={{ marginTop: 16 }}>
              {lista.map((t) => {
                const ativa = t.turma.id === atual?.turma.id;
                return (
                  <div key={t.turma.id} style={{ width: 120, flexShrink: 0 }} role="presentation">
                    <Tecla
                      onClick={() => setTurmaEscolhida(t.turma.nome)}
                      cor={ativa ? Cores.tinta : Cores.superficie}
                      corConteudo={ativa ? '#FFFFFF' : Cores.tinta}
                      borda={ativa ? null : Cores.linha}
                      alturaMinima={60}
                      raio={18}
                      selecionada={ativa}
                    >
                      <span className="t-tm" style={{ whiteSpace: 'nowrap' }}>
                        {t.turma.nome.replace(' ', ' ')}
                      </span>
                    </Tecla>
                  </div>
                );
              })}
            </div>
          )}
          <div className="grade-grupos" style={{ marginTop: 14 }}>
            {grupos.map((g) => (
              <CardGrupo key={`${g.turma}-${g.numero}`} g={g} onClick={() => setEscolhido(g)} />
            ))}
          </div>
          {carregado && grupos.length === 0 && (
            <p className="t-tm c-apoio" style={{ padding: '8px 0' }}>
              {lista.length === 0
                ? 'Nenhuma turma cadastrada. Use "Outro grupo" ou peça ao organizador para cadastrar.'
                : 'Esta turma ainda não tem grupos.'}
            </p>
          )}
          <div style={{ marginTop: 18, marginBottom: 24, alignSelf: 'flex-start', minWidth: 260 }}>
            <TeclaSecundaria texto="Outro grupo" icone="editar" onClick={() => setOutro(true)} />
          </div>
        </div>
      </div>

      {escolhido && (
        <DialogoConfirmacao
          titulo="Começar a vender?"
          texto={nomeCompletoGrupo(escolhido.produto, escolhido.turma, escolhido.numero)}
          textoConfirmar="Começar"
          onConfirmar={() => {
            const g = escolhido;
            setEscolhido(null);
            void iniciar(g.turma, g.numero, g.produto, corDoNumero(g.numero));
          }}
          onCancelar={() => setEscolhido(null)}
        />
      )}
      {outro && (
        <DialogoOutroGrupo
          onCancelar={() => setOutro(false)}
          onComecar={(t, nome, cor) => {
            setOutro(false);
            void iniciar(t, 0, nome, cor);
          }}
        />
      )}
    </Tela>
  );
}

function CardGrupo({ g, onClick }: { g: GrupoPredefinido; onClick: () => void }) {
  const cor = corGrupo(corDoNumero(g.numero));
  const texto = corSobre(cor);
  const rotulo = `Grupo ${g.numero}`;
  return (
    <Tecla onClick={onClick} cor={cor} corConteudo={texto} alturaMinima={132} raio={24} beico={6} descricao={`${g.produto}, ${rotulo}`}>
      <span
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: texto === '#FFFFFF' ? 'rgb(255 255 255 / 0.16)' : 'rgb(27 35 64 / 0.16)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
        className="t-ds"
      >
        {g.numero}
      </span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', marginLeft: 6 }}>
        <span className="t-ts" style={{ display: 'block', opacity: 0.85 }}>
          {rotulo}
        </span>
        <span className="t-hs" style={{ display: 'block' }}>
          {g.produto}
        </span>
      </span>
    </Tecla>
  );
}

function DialogoOutroGrupo({ onCancelar, onComecar }: { onCancelar: () => void; onComecar: (turma: string, nome: string, cor: number) => void }) {
  const [turma, setTurma] = useState('');
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState(0);
  const pode = turma.trim() !== '' && nome.trim() !== '';
  const comecar = () => {
    if (pode) onComecar(turma.trim(), nome.trim(), cor);
  };
  return (
    <Janela onFechar={onCancelar} rotulo="Outro grupo">
      <h2 className="t-hs c-tinta">Outro grupo</h2>
      <div className="pilha" style={{ '--vao': '12px', marginTop: 16 } as React.CSSProperties}>
        <CampoTexto valor={turma} onMudar={(v) => setTurma(v.slice(0, 20))} rotulo="Turma" exemplo="Ex.: 3º A" maximo={20} onEnter={comecar} />
        <CampoTexto valor={nome} onMudar={(v) => setNome(v.slice(0, 40))} rotulo="Nome do grupo" exemplo="Ex.: Cookies" maximo={40} onEnter={comecar} />
      </div>
      <p className="t-ts c-tinta" style={{ marginTop: 16 }}>
        Cor do grupo
      </p>
      <div className="linha" role="radiogroup" aria-label="Cor do grupo" style={{ marginTop: 8 }}>
        {Array.from({ length: TOTAL_CORES_GRUPO }, (_, i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === cor}
            aria-label={NOMES_CORES[i]}
            title={NOMES_CORES[i]}
            onClick={() => setCor(i)}
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: corGrupo(i),
              border: i === cor ? `4px solid ${Cores.tinta}` : '4px solid transparent',
              boxShadow: i === cor ? 'inset 0 0 0 3px #fff' : undefined,
            }}
          />
        ))}
      </div>
      <div className="linha" style={{ marginTop: 24 }}>
        <div className="peso-1">
          <TeclaSecundaria texto="Cancelar" onClick={onCancelar} />
        </div>
        <div className="peso-1">
          <TeclaTexto texto="Começar" onClick={comecar} cor={Cores.verde} corConteudo="#FFFFFF" habilitada={pode} />
        </div>
      </div>
    </Janela>
  );
}
