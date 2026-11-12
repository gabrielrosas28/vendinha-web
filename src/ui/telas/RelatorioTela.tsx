import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { db } from '../../data/db';
import { lerRelatorio, type DadosRelatorio } from '../../data/relatorio';
import { resultado } from '../../domain/contaCaixa';
import { formatar } from '../../domain/dinheiro';
import { turmaGrupo } from '../../domain/grupos';
import { Cores } from '../cores';
import { FaixaAviso, Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Logo, URL_LOGO } from '../componentes/Logo';
import { TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { useConsulta } from '../dados';
import { arquivo, dataHora, plural } from '../formatos';
import { gerarPngRelatorio } from '../relatorioImagem';
import { TabelaItens, textoEstornadas } from './FechamentoTelas';

function baixar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function podeCompartilharArquivos(): boolean {
  try {
    const teste = new File([new Blob(['x'], { type: 'image/png' })], 'teste.png', { type: 'image/png' });
    return typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [teste] });
  } catch {
    return false;
  }
}

export function RelatorioTela() {
  const { id } = useParams();
  const fechamentoId = Number(id) || 0;
  const navegar = useNavigate();
  const local = useLocation();
  const passos = (local.state as { voltarPassos?: number } | null)?.voltarPassos ?? 1;
  const { carregado, valor: dados } = useConsulta(async () => {
    const f = await db.fechamentos.get(fechamentoId);
    return f ? lerRelatorio(f) : null;
  }, [fechamentoId]);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [compartilhar] = useState(podeCompartilharArquivos);
  const voltar = () => navegar(-passos);

  const nomeArquivo = (d: DadosRelatorio) =>
    `vendinha_relatorio_${d.fechamento.nomeGrupo.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '')}_${arquivo(d.fechamento.data)}.png`;

  const comImagem = async (usar: (blob: Blob, nome: string) => Promise<void> | void) => {
    if (!dados || gerando) return;
    setGerando(true);
    setErro(null);
    try {
      await usar(await gerarPngRelatorio(dados, URL_LOGO), nomeArquivo(dados));
    } catch (e) {
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        console.error('Vendinha: relatório', e);
        setErro('Não deu para compartilhar. Use "Baixar imagem".');
      }
    } finally {
      setGerando(false);
    }
  };

  return (
    <Tela titulo="Relatório" onVoltar={voltar}>
      <div className="rolagem">
        {dados && (
          <div className="pilha" style={{ alignItems: 'center', '--vao': '14px' } as React.CSSProperties}>
            <CartaoRelatorio d={dados} />
            {erro && (
              <div style={{ width: '100%', maxWidth: 640 }}>
                <FaixaAviso texto={erro} tipo="erro" />
              </div>
            )}
            <div className="acoes-relatorio">
              <TeclaTexto
                texto="Baixar imagem"
                icone="baixar"
                onClick={() => void comImagem(baixar)}
                cor={Cores.azul}
                corConteudo="#FFFFFF"
                habilitada={!gerando}
                alturaMinima={72}
              />
              <TeclaSecundaria texto="Imprimir" icone="imprimir" onClick={() => window.print()} alturaMinima={72} />
              {compartilhar && (
                <TeclaSecundaria
                  texto="Compartilhar"
                  icone="compartilhar"
                  onClick={() =>
                    void comImagem(async (blob, nome) => {
                      await navigator.share({ files: [new File([blob], nome, { type: 'image/png' })], title: 'Relatório do caixa' });
                    })
                  }
                  habilitada={!gerando}
                  alturaMinima={72}
                />
              )}
            </div>
            <div style={{ width: '100%', maxWidth: 640 }}>
              <TeclaSecundaria texto="Voltar" onClick={voltar} />
            </div>
          </div>
        )}
        {carregado && !dados && (
          <p className="t-tl c-apoio" style={{ textAlign: 'center', padding: 32 }}>
            Este relatório não existe mais.
          </p>
        )}
      </div>
    </Tela>
  );
}

function CartaoRelatorio({ d }: { d: DadosRelatorio }) {
  const f = d.fechamento;
  const dif = d.diferencaCentavos ?? 0;
  const r = resultado(dif);
  return (
    <article className="cartao-relatorio pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
      <Logo largura={640} />
      <div>
        <p className="t-bl c-apoio">Relatório do caixa</p>
        <h2 className="t-hl c-tinta">{f.nomeGrupo}</h2>
        <p className="t-tm c-apoio">{turmaGrupo(f.turma, f.numeroGrupo)}</p>
        <p className="t-bl c-apoio">{dataHora(f.data)}</p>
      </div>
      <div className="visor" style={{ borderRadius: 20 }}>
        <p className="t-tm visor-texto">Total ganho</p>
        <p className="t-dm numeros" style={{ color: Cores.visorNumero }}>
          {formatar(f.totalCentavos)}
        </p>
        <p className="t-bl visor-texto">{plural(f.numVendas, 'venda', 'vendas')}</p>
      </div>
      {d.campeao && (
        <div className="linha">
          <span className="bolinha-estrela" style={{ width: 44, height: 44 }}>
            <Icone nome="estrela" tamanho={26} cor={Cores.tinta} />
          </span>
          <span className="t-tm c-tinta">
            Campeão: {d.campeao.nome} ({d.campeao.quantidade})
          </span>
        </div>
      )}
      {d.itens.length > 0 && <TabelaItens resumo={d} />}
      <div className="conta-relatorio">
        <LinhaConta rotulo="Troco inicial" valor={formatar(f.trocoInicialCentavos)} />
        <LinhaConta rotulo="Dinheiro esperado" valor={formatar(d.esperadoCentavos)} />
        {f.contadoCentavos == null ? (
          <LinhaConta rotulo="Contado" valor="não contado" />
        ) : (
          <>
            <LinhaConta rotulo="Contado" valor={formatar(f.contadoCentavos)} />
            <p
              className="t-tm"
              style={{ color: r === 'BATEU' ? Cores.verdeTexto : r === 'SOBROU' ? Cores.azulTexto : Cores.erro }}
            >
              {r === 'BATEU' ? 'Bateu certinho!' : r === 'SOBROU' ? `Sobrou ${formatar(dif)}` : `Faltou ${formatar(-dif)}`}
            </p>
          </>
        )}
        {d.numeroEstornadas > 0 && <p className="t-bm c-apoio">{textoEstornadas(d.numeroEstornadas)}</p>}
      </div>
      <p className="t-bs c-apoio" style={{ textAlign: 'center' }}>
        Vendinha · Colégio Santa Chiara · Aracaju-SE
      </p>
    </article>
  );
}

function LinhaConta({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="linha" style={{ justifyContent: 'space-between' }}>
      <span className="t-bl c-apoio">{rotulo}</span>
      <span className="t-tm numeros c-tinta">{valor}</span>
    </div>
  );
}
