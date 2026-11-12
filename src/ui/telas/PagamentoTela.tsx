import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { podeConfirmar, troco as calcularTroco } from '../../domain/contaCaixa';
import { contagemDe, decomporTroco, ehMultiploDaMenorMoeda, emPecas, formatar, lerReais } from '../../domain/dinheiro';
import { useAtalhos } from '../atalhos';
import { Cores } from '../cores';
import { BandejaPecas, TecladoDinheiro } from '../componentes/Dinheiro';
import { FaixaAviso, Tela } from '../componentes/Estrutura';
import { TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { LinhaVisor, SeparadorVisor, Visor } from '../componentes/Visor';
import { usePedido } from '../pedido';

export function PagamentoTela() {
  const navegar = useNavigate();
  const p = usePedido();
  const [digitado, setDigitado] = useState('');
  const concluido = useRef(false);
  const troco = calcularTroco(p.total, p.recebido);
  const pode = podeConfirmar(p.total, p.recebido);

  useEffect(() => {
    if (p.carregado && p.total === 0 && !concluido.current) navegar('/venda', { replace: true });
  }, [p.carregado, p.total, navegar]);

  const confirmar = async () => {
    if (!pode || p.confirmando) return;
    if (await p.confirmar()) {
      concluido.current = true;
      navegar('/pronto', { replace: true });
    }
  };

  const somarDigitado = () => {
    const v = lerReais(digitado);
    if (v == null || v <= 0) {
      p.avisar('Não entendi esse valor. Ex.: 20 ou 7,50');
    } else if (!ehMultiploDaMenorMoeda(v)) {
      p.avisar('Use um valor que dá para pagar com moedas: termina em 0 ou 5 centavos.');
    } else {
      p.receberContagem(contagemDe(decomporTroco(v).pecas));
    }
    setDigitado('');
  };

  useAtalhos((e) => {
    if (/^[0-9]$/.test(e.key) || e.key === ',' || e.key === '.' || e.code === 'NumpadDecimal') {
      const c = e.key === '.' || e.code === 'NumpadDecimal' ? ',' : e.key;
      setDigitado((d) => (d.length < 9 ? d + c : d));
      return true;
    }
    if (e.key === 'Backspace') {
      setDigitado((d) => d.slice(0, -1));
      return true;
    }
    if (e.key === 'Enter') {
      if (digitado) somarDigitado();
      else void confirmar();
      return true;
    }
    if (e.key === 'Escape') {
      if (digitado) setDigitado('');
      else if (p.recebido > 0) p.apagarRecebido();
      else navegar(-1);
      return true;
    }
    return false;
  });

  const valorDigitado = lerReais(digitado);

  return (
    <Tela titulo="Pagamento" onVoltar={() => navegar(-1)} larga>
      <div className="rolagem">
        <div className="duas-colunas">
          <div className="pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
            <Visor>
              <LinhaVisor rotulo="Total" centavos={p.total} cor="#FFFFFF" />
              <LinhaVisor rotulo="Recebido" centavos={p.recebido} cor="#FFFFFF" />
              <SeparadorVisor />
              {troco >= 0 ? (
                <LinhaVisor rotulo="Troco" centavos={troco} grande />
              ) : (
                <LinhaVisor rotulo="Falta" centavos={-troco} cor={Cores.visorFalta} grande />
              )}
            </Visor>
            <h2 className="t-hs c-tinta">Quanto o cliente deu?</h2>
            <BandejaPecas
              pecas={emPecas(p.contagem)}
              textoVazio="Clique nas notas e moedas que o cliente deu."
              tamanho={84}
              onTirar={p.tirar}
            />
            {digitado && (
              <div className="digitando" role="status">
                <span className="t-bl c-apoio">Digitando:</span>
                <span className="t-hs numeros c-tinta">{valorDigitado != null ? formatar(valorDigitado) : digitado}</span>
                <span className="t-bm c-apoio">
                  <kbd className="tecla-atalho">Enter</kbd> soma ao recebido
                </span>
              </div>
            )}
            {p.aviso && <FaixaAviso key={p.aviso.id} texto={p.aviso.texto} tipo="erro" />}
          </div>
          <div className="pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
            <TecladoDinheiro onToque={(d) => p.receber(d)} />
            <div className="linha">
              <div className="peso-1">
                <TeclaSecundaria texto="Apagar" onClick={p.apagarRecebido} corTexto={Cores.erro} habilitada={p.recebido > 0} />
              </div>
              <div className="peso-1">
                <TeclaTexto texto="Valor certinho" onClick={p.valorCertinho} cor={Cores.azul} corConteudo="#FFFFFF" habilitada={p.total > 0} />
              </div>
            </div>
            <TeclaTexto
              texto="Confirmar venda"
              icone="ok"
              onClick={() => void confirmar()}
              cor={Cores.verde}
              corConteudo="#FFFFFF"
              habilitada={pode && !p.confirmando}
              alturaMinima={88}
            />
            <p className="dicas-teclado so-com-teclado">
              Digite o valor (ex.: <kbd>20</kbd> ou <kbd>7,50</kbd>) e <kbd>Enter</kbd> soma · <kbd>Enter</kbd> confirma ·{' '}
              <kbd>Esc</kbd> apaga
            </p>
          </div>
        </div>
      </div>
    </Tela>
  );
}
