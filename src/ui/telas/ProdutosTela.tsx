import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import { grupoAtivo, itensDoGrupoAtivo } from '../../data/repositorios';
import { formatar } from '../../domain/dinheiro';
import { situacao } from '../../domain/estoque';
import { Cores, corGrupo } from '../cores';
import { Tela } from '../componentes/Estrutura';
import { FotoProduto } from '../componentes/FotoProduto';
import { Icone } from '../componentes/Icone';
import { Tecla, TeclaTexto } from '../componentes/Tecla';
import { useConsulta } from '../dados';
import type { Item } from '../../data/db';

export function ProdutosTela() {
  const navegar = useNavigate();
  const { valor } = useConsulta(async () => ({ itens: await itensDoGrupoAtivo(db), grupo: await grupoAtivo(db) }));
  const cor = corGrupo(valor?.grupo?.corIndex ?? 0);

  return (
    <Tela titulo="Produtos" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {valor && (
          <div className="pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
            <TeclaTexto texto="Novo item" icone="mais" onClick={() => navegar('/produto/0')} cor={Cores.verde} corConteudo="#FFFFFF" alturaMinima={80} />
            {valor.itens.length === 0 && (
              <div className="pilha centro" style={{ paddingTop: 40, '--vao': '6px' } as React.CSSProperties}>
                <Icone nome="camera" tamanho={64} cor={Cores.apoio} />
                <h2 className="t-hs c-tinta" style={{ marginTop: 6 }}>
                  Nenhum produto ainda
                </h2>
                <p className="t-bl c-apoio">Clique em Novo item e cadastre o que vocês vão vender.</p>
              </div>
            )}
            {valor.itens.map((item) => (
              <LinhaProduto key={item.id} item={item} cor={cor} onClick={() => navegar(`/produto/${item.id}`)} />
            ))}
          </div>
        )}
      </div>
    </Tela>
  );
}

function LinhaProduto({ item, cor, onClick }: { item: Item; cor: string; onClick: () => void }) {
  const s = situacao(item.controlaEstoque, item.qtdDisponivel);
  const [texto, corTexto] = !item.ativo
    ? ['Desativado (não aparece na venda)', Cores.apoio]
    : s === 'SEM_LIMITE'
      ? ['sem limite', Cores.apoio]
      : s === 'ESGOTADO'
        ? ['Esgotado', Cores.erro]
        : s === 'ACABANDO'
          ? [`restam ${item.qtdDisponivel ?? 0}`, Cores.alertaTexto]
          : [`restam ${item.qtdDisponivel ?? 0}`, Cores.apoio];
  return (
    <Tecla onClick={onClick} cor={Cores.superficie} corConteudo={Cores.tinta} borda={Cores.linha} alturaMinima={104} raio={22} recheio="10px 16px">
      <FotoProduto fotoId={item.fotoId} nome={item.nome} corGrupo={cor} tamanho={84} opacidade={item.ativo ? 1 : 0.4} />
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', marginLeft: 6 }}>
        <span className="t-tl duas-linhas" style={{ display: 'block' }}>
          {item.nome}
        </span>
        <span className="t-tm numeros" style={{ display: 'block' }}>
          {formatar(item.precoCentavos)}
        </span>
        <span className="t-bl" style={{ display: 'block', color: corTexto }}>
          {texto}
        </span>
      </span>
      <Icone nome="editar" tamanho={28} cor={Cores.apoio} />
    </Tecla>
  );
}
