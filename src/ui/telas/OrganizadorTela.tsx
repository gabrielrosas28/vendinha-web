import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackupInvalidoError, exportarBackup, importarBackup } from '../../data/backup';
import { db, type Fechamento } from '../../data/db';
import {
  apagarHistorico,
  caixaAtual,
  conferirSenha,
  definirSom,
  grupoAtivo,
  listarFechamentos,
  obterConfig,
  reabrirCaixa,
  zerarComputador,
} from '../../data/repositorios';
import { formatar } from '../../domain/dinheiro';
import { nomeCompletoGrupo, turmaGrupo } from '../../domain/grupos';
import { Cores } from '../cores';
import { Chave, DialogoConfirmacao } from '../componentes/Dialogos';
import { FaixaAviso, Tela, TituloSecao } from '../componentes/Estrutura';
import { esquecerFotos } from '../componentes/FotoProduto';
import { Icone } from '../componentes/Icone';
import { Tecla, TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { DialogoSenha } from '../componentes/TecladoNumerico';
import { useConsulta } from '../dados';
import { arquivo, bytesLegiveis, dataHora } from '../formatos';
import { useSessao } from '../sessao';
import { lerArmazenamento, pedirArmazenamentoPersistente, type InfoArmazenamento } from '../armazenamento';

type Confirmacao = 'REABRIR' | 'ZERAR' | 'APAGAR_1' | 'APAGAR_2';

function baixarTexto(texto: string, nome: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function OrganizadorTela() {
  const navegar = useNavigate();
  const sessao = useSessao();
  const { valor: e } = useConsulta(async () => {
    const [grupo, caixa, fechamentos, config, registros] = await Promise.all([
      grupoAtivo(db),
      caixaAtual(db),
      listarFechamentos(db),
      obterConfig(db),
      db.registroVendas.count(),
    ]);
    return { grupo, caixa, fechamentos, somAtivo: config?.somAtivo ?? true, registros };
  });
  const [confirmar, setConfirmar] = useState<Confirmacao | null>(null);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'sucesso' | 'erro' | 'info' } | null>(null);
  const [armazenamento, setArmazenamento] = useState<InfoArmazenamento | null>(null);
  const importarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (sessao.orgLiberado) void lerArmazenamento().then(setArmazenamento);
  }, [sessao.orgLiberado, e?.fechamentos.length, e?.registros]);

  if (!sessao.orgLiberado) {
    return (
      <Tela titulo="Área do Organizador" onVoltar={() => navegar(-1)}>
        <DialogoSenha
          titulo="Área do Organizador"
          explicacao="Só para o professor ou a equipe de TI."
          onCancelar={() => navegar(-1)}
          verificar={(s) => conferirSenha(db, s)}
          onSucesso={() => sessao.setOrgLiberado(true)}
        />
      </Tela>
    );
  }

  const status = e?.caixa?.status;
  const temHistorico = (e?.fechamentos.length ?? 0) > 0 || (e?.registros ?? 0) > 0;

  const exportar = async () => {
    const agora = Date.now();
    baixarTexto(await exportarBackup(db, agora), `vendinha_backup_${arquivo(agora)}.json`);
    setMensagem({ texto: 'Backup baixado. Guarde o arquivo num pendrive, no Drive ou mande por e-mail.', tipo: 'sucesso' });
  };

  const importar = async (f: File) => {
    try {
      const r = await importarBackup(db, await f.text());
      const partes = [
        `${r.fechamentosNovos} relatório(s) e ${r.registrosNovos} venda(s) do registro foram acrescentados.`,
        r.fechamentosRepetidos + r.registrosRepetidos > 0 ? `${r.fechamentosRepetidos + r.registrosRepetidos} já estavam aqui e foram pulados.` : '',
      ];
      setMensagem({ texto: partes.filter(Boolean).join(' '), tipo: 'sucesso' });
    } catch (err) {
      setMensagem({
        texto: err instanceof BackupInvalidoError ? 'Este arquivo não é um backup do Vendinha.' : 'Não deu para ler este arquivo.',
        tipo: 'erro',
      });
    }
  };

  const zerar = async () => {
    await zerarComputador(db);
    esquecerFotos();
    sessao.reiniciar();
    navegar('/inicio', { replace: true });
  };

  return (
    <Tela titulo="Área do Organizador" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {e && (
          <div className="pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
            <TituloSecao texto="Este computador" />
            <div className="cartao pilha" style={{ '--vao': '6px', padding: 18 } as React.CSSProperties}>
              <p className="t-tl c-tinta">
                {e.grupo ? nomeCompletoGrupo(e.grupo.nome, e.grupo.turma, e.grupo.numeroGrupo) : 'Nenhum grupo vendendo agora'}
              </p>
              <p className="t-bl c-apoio">
                {status == null ? 'Caixa ainda não foi aberto' : status === 'ABERTO' ? 'Caixa aberto, vendendo' : 'Caixa fechado (só consulta)'}
              </p>
              {armazenamento && <InfoDoArmazenamento info={armazenamento} onProteger={async () => setArmazenamento(await pedirArmazenamentoPersistente())} />}
            </div>
            {status === 'FECHADO' && (
              <TeclaTexto texto="Reabrir caixa" icone="reabrir" onClick={() => setConfirmar('REABRIR')} cor={Cores.azul} corConteudo="#FFFFFF" />
            )}
            <TeclaTexto
              texto="Zerar computador"
              icone="lixeira"
              onClick={() => setConfirmar('ZERAR')}
              cor={Cores.erro}
              corConteudo="#FFFFFF"
              habilitada={!!e.grupo}
            />
            <p className="t-bm c-apoio">
              Apaga o grupo, os produtos, as fotos, o caixa e as vendas, para o próximo grupo. Os relatórios salvos e o registro de vendas ficam.
            </p>
            {status === 'ABERTO' && (
              <FaixaAviso texto="O caixa ainda está aberto. Feche o caixa antes de zerar para não perder o relatório." tipo="alerta" />
            )}

            <div style={{ marginTop: 4 }}>
              <TituloSecao texto="Feira" />
            </div>
            <div className="linha">
              <div className="peso-1">
                <TeclaTexto texto="Turmas e grupos" icone="pessoas" onClick={() => navegar('/turmas')} cor={Cores.grupos[3]} corConteudo="#FFFFFF" alturaMinima={80} />
              </div>
              <div className="peso-1">
                <TeclaTexto texto="Registro de vendas" icone="recibo" onClick={() => navegar('/registro')} cor={Cores.azul} corConteudo="#FFFFFF" alturaMinima={80} />
              </div>
            </div>

            <Chave ligada={e.somAtivo} onMudar={(v) => void definirSom(db, v)}>
              <span className="linha" style={{ gap: 14 }}>
                <Icone nome={e.somAtivo ? 'somLigado' : 'somDesligado'} tamanho={28} cor={Cores.tinta} />
                <span className="t-tl c-tinta">Som de caixa registradora</span>
              </span>
            </Chave>

            <div style={{ marginTop: 4 }}>
              <TituloSecao texto="Relatórios salvos" />
            </div>
            {e.fechamentos.length === 0 && <p className="t-bl c-apoio">Nenhum caixa fechado ainda.</p>}
            {e.fechamentos.map((f) => (
              <LinhaFechamento key={f.id} f={f} onClick={() => navegar(`/relatorio/${f.id}`)} />
            ))}

            {mensagem && <FaixaAviso texto={mensagem.texto} tipo={mensagem.tipo} />}
            <div className="linha" style={{ flexWrap: 'wrap' }}>
              <div className="peso-1" style={{ minWidth: 220 }}>
                <TeclaSecundaria texto="Exportar backup" icone="exportar" onClick={() => void exportar()} habilitada={temHistorico} />
              </div>
              <div className="peso-1" style={{ minWidth: 220 }}>
                <TeclaSecundaria texto="Importar backup" icone="importar" onClick={() => importarRef.current?.click()} />
              </div>
              <div className="peso-1" style={{ minWidth: 220 }}>
                <TeclaSecundaria texto="Apagar histórico" icone="lixeira" corTexto={Cores.erro} onClick={() => setConfirmar('APAGAR_1')} habilitada={temHistorico} />
              </div>
            </div>
            <p className="t-bm c-apoio">
              Exporte o backup ao fim de cada turno. "Importar backup" só acrescenta relatórios e vendas que ainda não estão aqui; nada é apagado.
            </p>
            <input
              ref={importarRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(ev) => {
                const f = ev.target.files?.[0];
                ev.target.value = '';
                if (f) void importar(f);
              }}
            />
            <div style={{ height: 24 }} />
          </div>
        )}
      </div>

      {confirmar === 'REABRIR' && (
        <DialogoConfirmacao
          titulo="Reabrir caixa"
          texto="O grupo volta a poder vender e estornar. Quando fechar de novo, o relatório salvo é atualizado."
          textoConfirmar="Reabrir"
          onConfirmar={() => {
            setConfirmar(null);
            if (e?.caixa) void reabrirCaixa(db, e.caixa.id);
          }}
          onCancelar={() => setConfirmar(null)}
        />
      )}
      {confirmar === 'ZERAR' && (
        <DialogoConfirmacao
          titulo="Zerar este computador?"
          texto="Vai apagar o grupo, os produtos, as fotos, o caixa e as vendas. Os relatórios salvos e o registro de vendas continuam aqui. Não dá para desfazer."
          textoConfirmar="Zerar"
          perigoso
          onConfirmar={() => {
            setConfirmar(null);
            void zerar();
          }}
          onCancelar={() => setConfirmar(null)}
        />
      )}
      {confirmar === 'APAGAR_1' && (
        <DialogoConfirmacao
          titulo="Apagar relatórios e registro?"
          texto={`Vai apagar ${e?.fechamentos.length ?? 0} relatório(s) e todo o registro de vendas deste computador. Dica: exporte o backup antes.`}
          textoConfirmar="Continuar"
          perigoso
          onConfirmar={() => setConfirmar('APAGAR_2')}
          onCancelar={() => setConfirmar(null)}
        />
      )}
      {confirmar === 'APAGAR_2' && (
        <DialogoConfirmacao
          titulo="Tem certeza mesmo?"
          texto="Depois de apagar, não dá para recuperar os relatórios nem o registro de vendas."
          textoConfirmar="Apagar tudo"
          perigoso
          onConfirmar={() => {
            setConfirmar(null);
            void apagarHistorico(db);
          }}
          onCancelar={() => setConfirmar(null)}
        />
      )}
    </Tela>
  );
}

function InfoDoArmazenamento({ info, onProteger }: { info: InfoArmazenamento; onProteger: () => void }) {
  return (
    <div className="linha" style={{ marginTop: 6, flexWrap: 'wrap', gap: 10 }}>
      <span
        className="selo"
        style={info.protegido ? { color: Cores.verdeTexto, background: '#E3F6EE' } : { color: Cores.alertaTexto, background: Cores.alertaFundo }}
      >
        {info.protegido ? 'Armazenamento protegido' : 'Armazenamento não protegido'}
      </span>
      {info.usado != null && (
        <span className="t-bm c-apoio">
          Em uso: {bytesLegiveis(info.usado)}
          {info.cota ? ` de ${bytesLegiveis(info.cota)} disponíveis` : ''}
        </span>
      )}
      {!info.protegido && info.suportado && (
        <button type="button" className="link-botao t-bm" onClick={onProteger}>
          Pedir proteção ao navegador
        </button>
      )}
      {!info.protegido && (
        <p className="t-bs c-apoio" style={{ width: '100%' }}>
          Sem proteção, o navegador pode apagar os dados se o disco encher. Instale o app (ícone na barra de endereço) e exporte o backup ao fim de cada turno.
        </p>
      )}
    </div>
  );
}

function LinhaFechamento({ f, onClick }: { f: Fechamento; onClick: () => void }) {
  return (
    <Tecla onClick={onClick} cor={Cores.superficie} corConteudo={Cores.tinta} borda={Cores.linha} alturaMinima={84} raio={22} recheio="10px 18px">
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
        <span className="t-tl" style={{ display: 'block' }}>
          {f.nomeGrupo}
        </span>
        <span className="t-bm c-apoio" style={{ display: 'block' }}>
          {turmaGrupo(f.turma, f.numeroGrupo)} · {dataHora(f.data)}
        </span>
      </span>
      <span className="t-hs numeros">{formatar(f.totalCentavos)}</span>
    </Tecla>
  );
}
