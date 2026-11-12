import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Item } from '../../data/db';
import { prepararSom } from '../../data/som';
import { formatar } from '../../domain/dinheiro';
import { situacao } from '../../domain/estoque';
import { numeroDaTecla, useAtalhos } from '../atalhos';
import { Cores } from '../cores';
import { FaixaAviso, Tela } from '../componentes/Estrutura';
import { FotoProduto } from '../componentes/FotoProduto';
import { Tecla, TeclaIcone, TeclaSecundaria } from '../componentes/Tecla';
import { LinhaVisor, Visor } from '../componentes/Visor';
import { usePedido, type LinhaPedidoUi } from '../pedido';

export function VendaTela() {
  const navegar = useNavigate();
  const p = usePedido();
  const itens = p.itens ?? [];

  useEffect(() => prepararSom(), []);
  useEffect(() => {
    if (p.carregado && !p.caixa) navegar('/painel', { replace: true });
  }, [p.carregado, p.caixa, navegar]);

  const cobrar = () => {
    if (p.total > 0) navegar('/pagamento');
  };

  useAtalhos((e) => {
    const n = numeroDaTecla(e);
    if (n != null && n >= 1 && n <= 9) {
      const item = itens[n - 1];
      if (item) p.tocarItem(item);
      return true;
    }
    if (e.key === 'Enter') {
      cobrar();
      return true;
    }
    if (e.key === 'Escape') {
      if (p.linhas.length > 0) p.limparPedido();
      else navegar(-1);
      return true;
    }
    return false;
  });

  return (
    <Tela titulo="Vender" onVoltar={() => navegar(-1)} larga>
      <div className="venda">
        <section className="venda-produtos" aria-label="Produtos">
          {p.carregado && itens.length === 0 && (
            <p className="t-tl c-apoio" style={{ textAlign: 'center', padding: 24 }}>
              Nenhum produto para vender. Cadastre em Produtos.
            </p>
          )}
          <div className="grade-produtos">
            {itens.map((item, i) => (
              <CardItem
                key={item.id}
                item={item}
                indice={i}
                noPedido={p.quantidades.get(item.id) ?? 0}
                cor={p.corGrupo}
                onToque={() => p.tocarItem(item)}
              />
            ))}
          </div>
        </section>

        <aside className="venda-lado">
          <Visor>
            <LinhaVisor rotulo="Total" centavos={p.total} grande />
          </Visor>
          {p.aviso && <FaixaAviso key={p.aviso.id} texto={p.aviso.texto} tipo="alerta" />}
          <PainelPedido linhas={p.linhas} cor={p.corGrupo} onMais={p.tocarItem} onMenos={p.menos} />
          <div className="linha">
            <div className="peso-1">
              <TeclaSecundaria texto="Limpar" onClick={p.limparPedido} corTexto={Cores.erro} habilitada={p.linhas.length > 0} alturaMinima={76} />
            </div>
            <div className="peso-2">
              <Tecla onClick={cobrar} habilitada={p.total > 0} alturaMinima={76}>
                <span className="t-hm">Cobrar</span>
              </Tecla>
            </div>
          </div>
          <p className="dicas-teclado so-com-teclado">
            <kbd>1</kbd>–<kbd>9</kbd> soma o produto · <kbd>Enter</kbd> cobra · <kbd>Esc</kbd> limpa
          </p>
        </aside>
      </div>
    </Tela>
  );
}

function CardItem({ item, indice, noPedido, cor, onToque }: { item: Item; indice: number; noPedido: number; cor: string; onToque: () => void }) {
  const s = situacao(item.controlaEstoque, item.qtdDisponivel);
  const esgotado = s === 'ESGOTADO';
  const restam = item.qtdDisponivel ?? 0;
  const [texto, corTexto, fundo] =
    s === 'SEM_LIMITE'
      ? ['sem limite', Cores.apoio, 'transparent']
      : s === 'NORMAL'
        ? [`restam ${restam}`, Cores.apoio, 'transparent']
        : s === 'ACABANDO'
          ? [`Acabando: restam ${restam}`, Cores.alertaTexto, Cores.alertaFundo]
          : ['Esgotado', Cores.erro, 'transparent'];
  return (
    <Tecla
      onClick={onToque}
      cor={Cores.superficie}
      corConteudo={Cores.tinta}
      borda={Cores.linha}
      habilitada={!esgotado}
      raio={22}
      recheio="10px"
      alturaMinima={56}
      descricao={`${item.nome}, ${formatar(item.precoCentavos)}${noPedido > 0 ? `, ${noPedido} no pedido` : ''}${indice < 9 ? `. Tecla ${indice + 1}` : ''}`}
      className="card-item"
    >
      <span className="card-item-conteudo">
        <span className="card-item-foto">
          <FotoProduto fotoId={item.fotoId} nome={item.nome} corGrupo={cor} opacidade={esgotado ? 0.35 : 1} rotulo={false} />
          {noPedido > 0 && (
            <span key={noPedido} className="selo-pedido t-hs" aria-hidden="true">
              {noPedido}
            </span>
          )}
          {indice < 9 && (
            <span className="tecla-atalho atalho-card so-com-teclado" aria-hidden="true">
              {indice + 1}
            </span>
          )}
          {esgotado && (
            <span className="t-tl selo-esgotado" aria-hidden="true">
              Esgotado
            </span>
          )}
        </span>
        <span className="t-tm duas-linhas card-item-nome">{item.nome}</span>
        <span className="t-hs numeros">{formatar(item.precoCentavos)}</span>
        <span
          className="t-bm"
          style={{
            color: corTexto,
            background: fundo,
            borderRadius: 8,
            padding: fundo === 'transparent' ? '2px 0' : '2px 8px',
            alignSelf: 'flex-start',
            whiteSpace: 'nowrap',
          }}
        >
          {texto}
        </span>
      </span>
    </Tecla>
  );
}

function PainelPedido({
  linhas,
  cor,
  onMais,
  onMenos,
}: {
  linhas: LinhaPedidoUi[];
  cor: string;
  onMais: (i: Item) => void;
  onMenos: (i: Item) => void;
}) {
  return (
    <div className="painel-pedido" aria-label="Pedido">
      {linhas.length === 0 ? (
        <p className="t-tm c-apoio painel-pedido-vazio">Clique na foto para vender</p>
      ) : (
        <ul className="lista-pedido">
          {linhas.map((l) => (
            <li key={l.item.id} className="linha-pedido">
              <FotoProduto fotoId={l.item.fotoId} nome={l.item.nome} corGrupo={cor} tamanho={52} raio={12} rotulo={false} />
              <span className="cresce" style={{ minWidth: 0, flex: 1 }}>
                <span className="t-tm c-tinta uma-linha" style={{ display: 'block' }}>
                  {l.item.nome}
                </span>
                <span className="t-bm c-apoio uma-linha" style={{ display: 'block' }}>
                  {formatar(l.item.precoCentavos)} cada
                </span>
              </span>
              <TeclaIcone icone="menos" descricao={`Menos um ${l.item.nome}`} onClick={() => onMenos(l.item)} tamanho={56} />
              <span className="t-hm numeros c-tinta" style={{ minWidth: 34, textAlign: 'center' }} aria-label={`${l.quantidade}`}>
                {l.quantidade}
              </span>
              <TeclaIcone icone="mais" descricao={`Mais um ${l.item.nome}`} onClick={() => onMais(l.item)} tamanho={56} cor={Cores.laranja} />
              <span className="t-tm numeros c-tinta" style={{ minWidth: 92, textAlign: 'right', whiteSpace: 'nowrap' }}>
                {formatar(l.subtotal)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
