import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import { abrirCaixa } from '../../data/repositorios';
import { adicionarPeca, emPecas, formatar, somar, tirarPeca, type Contagem } from '../../domain/dinheiro';
import { Cores } from '../cores';
import { BandejaPecas, TecladoDinheiro } from '../componentes/Dinheiro';
import { Tela } from '../componentes/Estrutura';
import { TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { LinhaVisor, Visor } from '../componentes/Visor';

export function AbrirCaixaTela() {
  const navegar = useNavigate();
  const [contagem, setContagem] = useState<Contagem>({});
  const [abrindo, setAbrindo] = useState(false);
  const total = somar(contagem);

  const abrir = async (troco: number) => {
    if (abrindo) return;
    setAbrindo(true);
    await abrirCaixa(db, troco);
    navegar('/venda', { replace: true });
  };

  return (
    <Tela titulo="Abrir o caixa" onVoltar={() => navegar(-1)} larga>
      <div className="rolagem">
        <div className="duas-colunas">
          <div className="pilha">
            <p className="t-tl c-tinta">Quanto dinheiro tem na caixinha para dar troco?</p>
            <Visor>
              <LinhaVisor rotulo="Troco inicial" centavos={total} grande />
            </Visor>
            <BandejaPecas
              pecas={emPecas(contagem)}
              textoVazio="Clique nas notas e moedas que estão na caixinha."
              tamanho={84}
              onTirar={(d) => setContagem((c) => tirarPeca(c, d))}
            />
          </div>
          <div className="pilha">
            <TecladoDinheiro onToque={(d) => setContagem((c) => adicionarPeca(c, d))} />
            <div className="linha">
              <div className="peso-1">
                <TeclaSecundaria texto="Apagar" onClick={() => setContagem({})} corTexto={Cores.erro} habilitada={total > 0} />
              </div>
              <div className="peso-2">
                <TeclaTexto
                  texto={`Começar com ${formatar(total)}`}
                  onClick={() => void abrir(total)}
                  cor={Cores.verde}
                  corConteudo="#FFFFFF"
                  habilitada={total > 0 && !abrindo}
                />
              </div>
            </div>
            <TeclaSecundaria texto="Começar sem troco" onClick={() => void abrir(0)} alturaMinima={72} habilitada={!abrindo} />
          </div>
        </div>
      </div>
    </Tela>
  );
}
