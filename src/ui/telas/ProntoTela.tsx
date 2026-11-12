import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { decomporTroco } from '../../domain/dinheiro';
import { useAtalhos } from '../atalhos';
import { Cores } from '../cores';
import { BandejaPecas } from '../componentes/Dinheiro';
import { Tela } from '../componentes/Estrutura';
import { Icone } from '../componentes/Icone';
import { Tecla } from '../componentes/Tecla';
import { LinhaVisor, Visor } from '../componentes/Visor';
import { useSessao } from '../sessao';

export function ProntoTela() {
  const navegar = useNavigate();
  const { ultimaVenda } = useSessao();

  useEffect(() => {
    if (!ultimaVenda) navegar('/venda', { replace: true });
  }, [ultimaVenda, navegar]);

  const proximo = () => navegar(-1);
  const abertaEm = useRef(performance.now());

  useAtalhos((e) => {
    if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') {
      if (performance.now() - abertaEm.current < 800) return true;
      proximo();
      return true;
    }
    return false;
  });

  if (!ultimaVenda) return <Tela fundo={Cores.verde} />;
  const troco = ultimaVenda.recebidoCentavos - ultimaVenda.totalCentavos;
  const pecas = decomporTroco(troco).pecas;

  return (
    <Tela fundo={Cores.verde} larga>
      <div className="rolagem pronto">
        <div className="pronto-conteudo">
          <div className="pronto-check" aria-hidden="true">
            <Icone nome="ok" tamanho={80} cor={Cores.verde} />
          </div>
          <h1 className="t-dl c-branco" style={{ textAlign: 'center' }}>
            Venda feita!
          </h1>
          <Visor estilo={{ width: '100%', maxWidth: 620 }}>
            <LinhaVisor rotulo="Troco" centavos={troco} grande animar={false} />
          </Visor>
          <div className="pronto-troco">
            {troco > 0 ? (
              <>
                <p className="t-hs c-branco">Devolva para o cliente:</p>
                <div style={{ marginTop: 14 }}>
                  <BandejaPecas pecas={pecas} tamanho={160} corTexto="#FFFFFF" centralizar />
                </div>
              </>
            ) : (
              <p className="t-hs c-branco" style={{ textAlign: 'center' }}>
                Não tem troco. Foi o valor certinho!
              </p>
            )}
          </div>
          <div style={{ width: '100%', maxWidth: 620, marginTop: 8 }}>
            <Tecla onClick={proximo} cor="#FFFFFF" corConteudo={Cores.verdeTexto} borda="#0A6E4B" alturaMinima={96} beico={7}>
              <span className="t-hm">Próximo cliente</span>
            </Tecla>
          </div>
          <p className="dicas-teclado so-com-teclado" style={{ color: '#fff' }}>
            <kbd>Enter</kbd> próximo cliente
          </p>
        </div>
      </div>
    </Tela>
  );
}
