import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type GrupoCatalogo } from '../../data/db';
import {
  adicionarGrupoCatalogo,
  apagarGrupoCatalogo,
  apagarTurma,
  criarTurma,
  renomearGrupoCatalogo,
  renomearTurma,
  turmaComGrupos,
  turmasComGrupos,
  type ResultadoTurma,
} from '../../data/repositorios';
import { corDoNumero } from '../../domain/grupos';
import { Cores, corGrupo, corSobre } from '../cores';
import { CampoTexto, DialogoConfirmacao, Janela } from '../componentes/Dialogos';
import { Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Tecla, TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { useConsulta } from '../dados';
import { plural } from '../formatos';

function erroTurma(r: ResultadoTurma): string | null {
  return r === 'OK' ? null : r === 'JA_EXISTE' ? 'Já existe uma turma com esse nome.' : 'Escreva um nome de até 20 letras.';
}

export function TurmasTela() {
  const navegar = useNavigate();
  const { valor: turmas } = useConsulta(() => turmasComGrupos(db));
  const [nova, setNova] = useState(false);

  return (
    <Tela titulo="Turmas e grupos" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {turmas && (
          <div className="pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
            <TeclaTexto texto="Nova turma" icone="mais" onClick={() => setNova(true)} cor={Cores.verde} corConteudo="#FFFFFF" alturaMinima={76} />
            <p className="t-bm c-apoio">
              Estas turmas aparecem em "Qual é o seu grupo?". Clique numa turma para mudar o nome, apagar ou cuidar dos grupos.
            </p>
            {turmas.length === 0 && <p className="t-tm c-apoio">Nenhuma turma ainda. Clique em Nova turma.</p>}
            {turmas.map((t) => (
              <Tecla
                key={t.turma.id}
                onClick={() => navegar(`/turma/${t.turma.id}`)}
                cor={Cores.superficie}
                corConteudo={Cores.tinta}
                borda={Cores.linha}
                alturaMinima={84}
                raio={22}
                recheio="10px 18px"
              >
                <span className="t-hs" style={{ width: 120, textAlign: 'left', flexShrink: 0 }}>
                  {t.turma.nome}
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="t-tm" style={{ display: 'block' }}>
                    {plural(t.grupos.length, 'grupo', 'grupos')}
                  </span>
                  <span className="t-bm c-apoio uma-linha" style={{ display: 'block' }}>
                    {t.grupos.map((g) => g.produto).join(' · ')}
                  </span>
                </span>
                <Icone nome="editar" tamanho={26} cor={Cores.apoio} />
              </Tecla>
            ))}
          </div>
        )}
      </div>
      {nova && (
        <DialogoNome
          titulo="Nova turma"
          rotulo="Nome da turma"
          exemplo="Ex.: 4º B"
          inicial=""
          maximo={20}
          textoSalvar="Criar turma"
          onCancelar={() => setNova(false)}
          salvar={async (nome) => {
            const erro = erroTurma(await criarTurma(db, nome));
            if (!erro) setNova(false);
            return erro;
          }}
        />
      )}
    </Tela>
  );
}

type Edicao =
  | { tipo: 'RENOMEAR_TURMA' }
  | { tipo: 'APAGAR_TURMA' }
  | { tipo: 'NOVO_GRUPO' }
  | { tipo: 'GRUPO'; grupo: GrupoCatalogo }
  | { tipo: 'APAGAR_GRUPO'; grupo: GrupoCatalogo };

export function TurmaTela() {
  const { id } = useParams();
  const turmaId = Number(id) || 0;
  const navegar = useNavigate();
  const { carregado, valor: t } = useConsulta(() => turmaComGrupos(db, turmaId), [turmaId]);
  const [edicao, setEdicao] = useState<Edicao | null>(null);
  const existiu = useRef(false);
  if (t) existiu.current = true;

  useEffect(() => {
    if (carregado && !t && existiu.current) navegar(-1);
  }, [carregado, t, navegar]);

  const proximoNumero = (t?.grupos.reduce((m, g) => Math.max(m, g.numero), 0) ?? 0) + 1;

  return (
    <Tela titulo={t?.turma.nome ?? ''} onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {t && (
          <div className="pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
            <div className="linha">
              <div className="peso-1">
                <TeclaSecundaria texto="Mudar nome" icone="editar" onClick={() => setEdicao({ tipo: 'RENOMEAR_TURMA' })} />
              </div>
              <div className="peso-1">
                <TeclaSecundaria texto="Apagar turma" icone="lixeira" corTexto={Cores.erro} onClick={() => setEdicao({ tipo: 'APAGAR_TURMA' })} />
              </div>
            </div>
            <p className="t-tl c-tinta">Grupos</p>
            {t.grupos.length === 0 && <p className="t-bl c-apoio">Esta turma ainda não tem grupos.</p>}
            {t.grupos.map((g) => {
              const cor = corGrupo(corDoNumero(g.numero));
              return (
                <Tecla
                  key={g.id}
                  onClick={() => setEdicao({ tipo: 'GRUPO', grupo: g })}
                  cor={Cores.superficie}
                  corConteudo={Cores.tinta}
                  borda={Cores.linha}
                  alturaMinima={84}
                  raio={22}
                  recheio="10px 16px"
                >
                  <span
                    className="t-hs"
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: '50%',
                      background: cor,
                      color: corSobre(cor),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {g.numero}
                  </span>
                  <span style={{ flex: 1, minWidth: 0, textAlign: 'left', marginLeft: 4 }}>
                    <span className="t-bm c-apoio" style={{ display: 'block' }}>
                      Grupo {g.numero}
                    </span>
                    <span className="t-tl" style={{ display: 'block' }}>
                      {g.produto}
                    </span>
                  </span>
                  <Icone nome="editar" tamanho={26} cor={Cores.apoio} />
                </Tecla>
              );
            })}
            <TeclaTexto texto="Novo grupo" icone="mais" onClick={() => setEdicao({ tipo: 'NOVO_GRUPO' })} cor={Cores.verde} corConteudo="#FFFFFF" />
          </div>
        )}
      </div>

      {t && edicao?.tipo === 'RENOMEAR_TURMA' && (
        <DialogoNome
          titulo="Mudar nome"
          rotulo="Nome da turma"
          exemplo="Ex.: 4º B"
          inicial={t.turma.nome}
          maximo={20}
          textoSalvar="Salvar"
          onCancelar={() => setEdicao(null)}
          salvar={async (nome) => {
            const erro = erroTurma(await renomearTurma(db, turmaId, nome));
            if (!erro) setEdicao(null);
            return erro;
          }}
        />
      )}
      {t && edicao?.tipo === 'APAGAR_TURMA' && (
        <DialogoConfirmacao
          titulo={`Apagar a turma ${t.turma.nome}?`}
          texto="A turma e os grupos dela saem da lista. Vendas, relatórios e o registro de vendas continuam salvos."
          textoConfirmar="Apagar turma"
          perigoso
          onConfirmar={() => {
            setEdicao(null);
            void apagarTurma(db, turmaId);
          }}
          onCancelar={() => setEdicao(null)}
        />
      )}
      {edicao?.tipo === 'NOVO_GRUPO' && (
        <DialogoNome
          titulo={`Novo grupo (Grupo ${proximoNumero})`}
          rotulo="O que o grupo vende"
          exemplo="Ex.: Brigadeiros"
          inicial=""
          textoSalvar="Adicionar"
          onCancelar={() => setEdicao(null)}
          salvar={async (nome) => {
            if (await adicionarGrupoCatalogo(db, turmaId, nome)) {
              setEdicao(null);
              return null;
            }
            return 'Escreva um nome de até 40 letras.';
          }}
        />
      )}
      {edicao?.tipo === 'GRUPO' && (
        <DialogoNome
          titulo={`Grupo ${edicao.grupo.numero}`}
          rotulo="O que o grupo vende"
          exemplo="Ex.: Brigadeiros"
          inicial={edicao.grupo.produto}
          textoSalvar="Salvar"
          onCancelar={() => setEdicao(null)}
          salvar={async (nome) => {
            if (await renomearGrupoCatalogo(db, edicao.grupo.id, nome)) {
              setEdicao(null);
              return null;
            }
            return 'Escreva um nome de até 40 letras.';
          }}
          textoApagar="Apagar grupo"
          onApagar={() => setEdicao({ tipo: 'APAGAR_GRUPO', grupo: edicao.grupo })}
        />
      )}
      {edicao?.tipo === 'APAGAR_GRUPO' && (
        <DialogoConfirmacao
          titulo={`Apagar o Grupo ${edicao.grupo.numero} (${edicao.grupo.produto})?`}
          texto="O grupo sai da lista desta turma. As vendas e os relatórios dele continuam salvos."
          textoConfirmar="Apagar grupo"
          perigoso
          onConfirmar={() => {
            const g = edicao.grupo;
            setEdicao(null);
            void apagarGrupoCatalogo(db, g.id);
          }}
          onCancelar={() => setEdicao(null)}
        />
      )}
    </Tela>
  );
}

function DialogoNome({
  titulo,
  rotulo,
  exemplo,
  inicial,
  textoSalvar,
  onCancelar,
  salvar,
  textoApagar,
  onApagar,
  maximo = 40,
}: {
  titulo: string;
  rotulo: string;
  exemplo: string;
  inicial: string;
  textoSalvar: string;
  onCancelar: () => void;
  salvar: (nome: string) => Promise<string | null>;
  textoApagar?: string;
  onApagar?: () => void;
  maximo?: number;
}) {
  const [nome, setNome] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const pode = nome.trim() !== '' && !salvando;
  const enviar = async () => {
    if (!pode) return;
    setSalvando(true);
    setErro(await salvar(nome));
    setSalvando(false);
  };
  return (
    <Janela onFechar={onCancelar} rotulo={titulo}>
      <h2 className="t-hs c-tinta">{titulo}</h2>
      <div style={{ marginTop: 16 }}>
        <CampoTexto
          valor={nome}
          onMudar={(v) => {
            setNome(v.slice(0, 40));
            setErro(null);
          }}
          rotulo={rotulo}
          exemplo={exemplo}
          erro={erro}
          maximo={Math.max(maximo, 40)}
          onEnter={() => void enviar()}
        />
      </div>
      <div className="linha" style={{ marginTop: 20 }}>
        <div className="peso-1">
          <TeclaSecundaria texto="Cancelar" onClick={onCancelar} />
        </div>
        <div className="peso-1">
          <TeclaTexto texto={textoSalvar} onClick={() => void enviar()} cor={Cores.verde} corConteudo="#FFFFFF" habilitada={pode} />
        </div>
      </div>
      {textoApagar && onApagar && (
        <div style={{ marginTop: 12 }}>
          <TeclaSecundaria texto={textoApagar} onClick={onApagar} icone="lixeira" corTexto={Cores.erro} />
        </div>
      )}
    </Janela>
  );
}
