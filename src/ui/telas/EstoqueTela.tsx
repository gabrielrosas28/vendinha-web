import { useNavigate } from 'react-router-dom';
import { db, type Item } from '../../data/db';
import { grupoAtivo, itensDoGrupoAtivo, qtdVendidaAtual } from '../../data/repositorios';
import { situacao } from '../../domain/estoque';
import { Cores, corGrupo } from '../cores';
import { Selo, Tela } from '../componentes/Estrutura';
import { FotoProduto } from '../componentes/FotoProduto';
import { useConsulta } from '../dados';
import { plural } from '../formatos';

interface LinhaEstoque {
  item: Item;
  vendidos: number;
}

export function EstoqueTela() {
  const navegar = useNavigate();
  const { valor } = useConsulta(async () => {
    const [itens, vendidos, grupo] = await Promise.all([itensDoGrupoAtivo(db), qtdVendidaAtual(db), grupoAtivo(db)]);
    const linhas: LinhaEstoque[] = itens
      .map((item) => ({ item, vendidos: vendidos.get(item.id) ?? 0 }))
      .filter((l) => l.item.ativo || l.vendidos > 0);
    return { linhas, cor: corGrupo(grupo?.corIndex ?? 0) };
  });

  return (
    <Tela titulo="Estoque" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {valor && valor.linhas.length === 0 && (
          <p className="t-tl c-apoio" style={{ textAlign: 'center', padding: 32 }}>
            Nenhum produto ainda.
          </p>
        )}
        {valor && valor.linhas.length > 0 && (
          <div className="pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
            <p className="t-tl c-tinta">
              {plural(
                valor.linhas.reduce((s, l) => s + l.vendidos, 0),
                'produto vendido',
                'produtos vendidos',
              )}
            </p>
            {valor.linhas.map((l) => (
              <LinhaDeEstoque key={l.item.id} l={l} cor={valor.cor} />
            ))}
          </div>
        )}
      </div>
    </Tela>
  );
}

function LinhaDeEstoque({ l, cor }: { l: LinhaEstoque; cor: string }) {
  const i = l.item;
  const s = situacao(i.controlaEstoque, i.qtdDisponivel);
  const inicial = Math.max(i.qtdInicial ?? 0, 1);
  const disponivel = Math.max(i.qtdDisponivel ?? 0, 0);
  const corBarra = s === 'ESGOTADO' ? Cores.erro : s === 'ACABANDO' ? Cores.laranja : Cores.verde;
  const fracao = Math.min(1, Math.max(0, disponivel / inicial));
  return (
    <div className="cartao linha" style={{ padding: 14, gap: 14 }}>
      <FotoProduto fotoId={i.fotoId} nome={i.nome} corGrupo={cor} tamanho={76} raio={14} />
      <div className="cresce">
        <p className="t-tl c-tinta duas-linhas">{i.nome}</p>
        {i.controlaEstoque ? (
          <>
            <p className="t-bl c-apoio">
              Começou com {i.qtdInicial ?? 0} · Restam {disponivel}
            </p>
            <div
              className="barra-estoque"
              role="img"
              aria-label={`Restam ${disponivel} de ${i.qtdInicial ?? 0}`}
              style={{ marginTop: 8 }}
            >
              <div style={{ width: `${fracao * 100}%`, background: corBarra }} />
            </div>
            {(s === 'ACABANDO' || s === 'ESGOTADO') && (
              <div style={{ marginTop: 6 }}>
                <Selo
                  texto={s === 'ESGOTADO' ? 'Esgotado' : 'Acabando'}
                  cor={s === 'ESGOTADO' ? Cores.erro : Cores.alertaTexto}
                  fundo={s === 'ESGOTADO' ? Cores.erroFundo : Cores.alertaFundo}
                />
              </div>
            )}
          </>
        ) : (
          <p className="t-bl c-apoio">sem limite</p>
        )}
        {!i.ativo && <p className="t-bm c-apoio">Desativado (não aparece na venda)</p>}
      </div>
      <div style={{ width: 96, textAlign: 'center', flexShrink: 0 }}>
        <p className="t-ds numeros c-tinta">{l.vendidos}</p>
        <p className="t-bm c-apoio">vendidos</p>
      </div>
    </div>
  );
}
