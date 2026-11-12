import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import { caixaAtual, fecharCaixa, resumoDe, vendasAtuais } from '../../data/repositorios';
import { diferenca, dinheiroEsperado, resultado } from '../../domain/contaCaixa';
import { MAXIMO_CENTAVOS, adicionarPeca, emPecas, formatar, somar, tirarPeca } from '../../domain/dinheiro';
import type { ResumoCaixa } from '../../domain/resumo';
import { useAtalhos } from '../atalhos';
import { Cores } from '../cores';
import { DialogoConfirmacao } from '../componentes/Dialogos';
import { BandejaPecas, TecladoDinheiro } from '../componentes/Dinheiro';
import { FaixaAviso, Tela, TituloSecao } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Tecla, TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { TecladoNumerico } from '../componentes/TecladoNumerico';
import { LinhaVisor, SeparadorVisor, Visor } from '../componentes/Visor';
import { useConsulta } from '../dados';
import { plural } from '../formatos';
import { useSessao } from '../sessao';

function useFechamento() {
  return useConsulta(async () => {
    const [caixa, vendas] = await Promise.all([caixaAtual(db), vendasAtuais(db)]);
    const resumo = resumoDe(vendas);
    return { caixa, resumo, esperado: dinheiroEsperado(caixa?.trocoInicialCentavos ?? 0, resumo.totalGanhoCentavos) };
  });
}

function useAoFechar(passosAtePainel: number) {
  const navegar = useNavigate();
  return (id: number) => navegar(`/relatorio/${id}`, { replace: true, state: { voltarPassos: passosAtePainel } });
}

export function FecharCaixaTela() {
  const navegar = useNavigate();
  const { carregado, valor } = useFechamento();
  const [confirmarPular, setConfirmarPular] = useState(false);
  const fechando = useRef(false);
  const aoFechar = useAoFechar(1);

  const aberto = valor?.caixa?.status === 'ABERTO';
  useEffect(() => {
    if (carregado && !aberto && !fechando.current) navegar('/painel', { replace: true });
  }, [carregado, aberto, navegar]);

  const fechar = async () => {
    const caixa = valor?.caixa;
    if (!caixa || fechando.current) return;
    fechando.current = true;
    aoFechar(await fecharCaixa(db, caixa.id, null));
  };

  const resumo = valor?.resumo;
  return (
    <Tela titulo="Fechar o caixa" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {resumo && (
          <div className="pilha">
            <Visor>
              <LinhaVisor rotulo="Total ganho" centavos={resumo.totalGanhoCentavos} grande />
              <p className="t-bl visor-texto">{plural(resumo.numeroVendas, 'venda', 'vendas')}</p>
            </Visor>
            {resumo.campeao && (
              <div className="linha" style={{ background: Cores.alertaFundo, borderRadius: 22, padding: 16, gap: 14 }}>
                <span className="bolinha-estrela" style={{ width: 60, height: 60 }}>
                  <Icone nome="estrela" tamanho={36} cor={Cores.tinta} />
                </span>
                <span>
                  <span className="t-bl c-alerta" style={{ display: 'block' }}>
                    Campeão de vendas
                  </span>
                  <span className="t-hs c-tinta" style={{ display: 'block' }}>
                    {resumo.campeao.nome}
                  </span>
                  <span className="t-bl c-alerta" style={{ display: 'block' }}>
                    {plural(resumo.campeao.quantidade, 'vendido', 'vendidos')}
                  </span>
                </span>
              </div>
            )}
            {resumo.itens.length > 0 && (
              <>
                <TituloSecao texto="Quanto vendeu de cada um" />
                <TabelaItens resumo={resumo} />
              </>
            )}
            {resumo.numeroEstornadas > 0 && <p className="t-bl c-apoio">{textoEstornadas(resumo.numeroEstornadas)}</p>}
            <TeclaTexto texto="Contar o dinheiro" onClick={() => navegar('/conferir')} cor={Cores.azul} corConteudo="#FFFFFF" alturaMinima={80} />
            <TeclaSecundaria texto="Fechar sem contar" onClick={() => setConfirmarPular(true)} />
          </div>
        )}
      </div>
      {confirmarPular && (
        <DialogoConfirmacao
          titulo="Fechar o caixa?"
          texto="Depois de fechar, não dá para vender mais. O relatório fica salvo no computador."
          textoConfirmar="Fechar"
          onConfirmar={() => {
            setConfirmarPular(false);
            void fechar();
          }}
          onCancelar={() => setConfirmarPular(false)}
        />
      )}
    </Tela>
  );
}

export function textoEstornadas(n: number): string {
  return n === 1 ? '1 venda estornada (não entra no total)' : `${n} vendas estornadas (não entram no total)`;
}

export function TabelaItens({ resumo }: { resumo: Pick<ResumoCaixa, 'itens'> }) {
  return (
    <div className="tabela-itens">
      {resumo.itens.map((it) => (
        <div key={it.itemId} className="tabela-itens-linha">
          <span className="t-tm c-tinta" style={{ flex: 1, minWidth: 0 }}>
            {it.nome}
          </span>
          <span className="t-tm numeros c-apoio" style={{ width: 64, textAlign: 'right' }}>
            {it.quantidade}×
          </span>
          <span className="t-tm numeros c-tinta" style={{ width: 128, textAlign: 'right' }}>
            {formatar(it.totalCentavos)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ConferirTela() {
  const navegar = useNavigate();
  const { carregado, valor } = useFechamento();
  const { conferencia: c, setConferencia } = useSessao();
  const [confirmar, setConfirmar] = useState(false);
  const [confirmarPular, setConfirmarPular] = useState(false);
  const [fechandoUi, setFechandoUi] = useState(false);
  const fechando = useRef(false);
  const aoFechar = useAoFechar(2);

  const aberto = valor?.caixa?.status === 'ABERTO';
  useEffect(() => {
    if (carregado && !aberto && !fechando.current) navegar('/painel', { replace: true });
  }, [carregado, aberto, navegar]);

  const contado = c.modo === 'CONTAR' ? somar(c.contagem) : c.digitado;
  const esperado = valor?.esperado ?? 0;
  const dif = diferenca(contado, esperado);
  const comecou = contado > 0;

  const digitar = (d: string) =>
    setConferencia((x) => {
      const novo = x.digitado * 10 + Number(d);
      return novo <= MAXIMO_CENTAVOS ? { ...x, digitado: novo } : x;
    });
  const apagarDigito = () => setConferencia((x) => ({ ...x, digitado: Math.trunc(x.digitado / 10) }));

  const fechar = async (valorContado: number | null) => {
    const caixa = valor?.caixa;
    if (!caixa || fechando.current) return;
    fechando.current = true;
    setFechandoUi(true);
    aoFechar(await fecharCaixa(db, caixa.id, valorContado));
  };

  useAtalhos(
    (e) => {
      if (c.modo !== 'DIGITAR') return false;
      if (/^[0-9]$/.test(e.key)) {
        digitar(e.key);
        return true;
      }
      if (e.key === 'Backspace') {
        apagarDigito();
        return true;
      }
      return false;
    },
    !confirmar && !confirmarPular,
  );

  return (
    <Tela titulo="Contar o dinheiro" onVoltar={() => navegar(-1)} larga>
      <div className="rolagem">
        {valor && (
          <div className="duas-colunas">
            <div className="pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
              <Visor>
                <LinhaVisor rotulo="Troco inicial" centavos={valor.caixa?.trocoInicialCentavos ?? 0} cor="#FFFFFF" />
                <LinhaVisor rotulo="Total ganho" centavos={valor.resumo.totalGanhoCentavos} cor="#FFFFFF" />
                <LinhaVisor rotulo="Dinheiro esperado" centavos={esperado} cor="#FFFFFF" />
                <SeparadorVisor />
                <LinhaVisor rotulo="Contado" centavos={contado} grande />
              </Visor>
              {comecou &&
                (resultado(dif) === 'BATEU' ? (
                  <FaixaAviso texto="Bateu certinho!" tipo="sucesso" />
                ) : resultado(dif) === 'SOBROU' ? (
                  <FaixaAviso texto={`Sobrou ${formatar(dif)}`} tipo="info" />
                ) : (
                  <FaixaAviso texto={`Faltou ${formatar(-dif)}`} tipo="erro" />
                ))}
              <div className="linha" role="tablist" aria-label="Como contar">
                <div className="peso-1">
                  <AbaModo texto="Contar notas e moedas" ativa={c.modo === 'CONTAR'} onClick={() => setConferencia((x) => ({ ...x, modo: 'CONTAR' }))} />
                </div>
                <div className="peso-1">
                  <AbaModo texto="Digitar o valor" ativa={c.modo === 'DIGITAR'} onClick={() => setConferencia((x) => ({ ...x, modo: 'DIGITAR' }))} />
                </div>
              </div>
              {c.modo === 'CONTAR' ? (
                <BandejaPecas
                  pecas={emPecas(c.contagem)}
                  textoVazio="Clique nas notas e moedas que estão na caixinha."
                  tamanho={84}
                  onTirar={(d) => setConferencia((x) => ({ ...x, contagem: tirarPeca(x.contagem, d) }))}
                />
              ) : (
                <p className="t-dm numeros c-tinta" style={{ textAlign: 'center' }}>
                  {formatar(c.digitado)}
                </p>
              )}
            </div>
            <div className="pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
              {c.modo === 'CONTAR' ? (
                <TecladoDinheiro onToque={(d) => setConferencia((x) => ({ ...x, contagem: adicionarPeca(x.contagem, d) }))} />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <TecladoNumerico
                    onDigito={digitar}
                    onApagar={apagarDigito}
                    extra={
                      <Tecla
                        onClick={() => {
                          digitar('0');
                          digitar('0');
                        }}
                        cor={Cores.superficie}
                        corConteudo={Cores.tinta}
                        borda={Cores.linha}
                      >
                        <span className="t-hl">00</span>
                      </Tecla>
                    }
                  />
                  <p className="dicas-teclado so-com-teclado">Dá para digitar os números no teclado (os centavos entram pela direita).</p>
                </div>
              )}
              <TeclaTexto
                texto="Fechar e salvar no histórico"
                icone="cadeado"
                onClick={() => setConfirmar(true)}
                cor={Cores.verde}
                corConteudo="#FFFFFF"
                habilitada={!fechandoUi}
                alturaMinima={84}
              />
              <TeclaSecundaria texto="Fechar sem contar" onClick={() => setConfirmarPular(true)} habilitada={!fechandoUi} />
            </div>
          </div>
        )}
      </div>
      {confirmar && (
        <DialogoConfirmacao
          titulo="Fechar o caixa?"
          texto={`Vocês contaram ${formatar(contado)}. Depois de fechar, não dá para vender mais. O relatório fica salvo no computador.`}
          textoConfirmar="Fechar"
          onConfirmar={() => {
            setConfirmar(false);
            void fechar(contado);
          }}
          onCancelar={() => setConfirmar(false)}
        />
      )}
      {confirmarPular && (
        <DialogoConfirmacao
          titulo="Fechar o caixa?"
          texto="Depois de fechar, não dá para vender mais. O relatório fica salvo no computador."
          textoConfirmar="Fechar"
          onConfirmar={() => {
            setConfirmarPular(false);
            void fechar(null);
          }}
          onCancelar={() => setConfirmarPular(false)}
        />
      )}
    </Tela>
  );
}

function AbaModo({ texto, ativa, onClick }: { texto: string; ativa: boolean; onClick: () => void }) {
  return (
    <Tecla
      onClick={onClick}
      cor={ativa ? Cores.tinta : Cores.superficie}
      corConteudo={ativa ? '#FFFFFF' : Cores.tinta}
      borda={ativa ? null : Cores.linha}
      alturaMinima={60}
      selecionada={ativa}
    >
      <span className="t-tm">{texto}</span>
    </Tecla>
  );
}
