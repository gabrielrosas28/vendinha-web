import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, type RegistroVenda } from '../../data/db';
import { listarRegistro } from '../../data/repositorios';
import { formatar } from '../../domain/dinheiro';
import { nomeCompletoGrupo } from '../../domain/grupos';
import { totaisRegistro } from '../../domain/registro';
import { Cores } from '../cores';
import { Selo, Tela } from '../componentes/Estrutura';
import { Tecla } from '../componentes/Tecla';
import { LinhaVisor, Visor } from '../componentes/Visor';
import { useConsulta } from '../dados';
import { dataHora, plural } from '../formatos';

const chaveGrupo = (r: RegistroVenda) => `${r.turma}|${r.numeroGrupo}|${r.nomeGrupo}`;
const rotuloGrupo = (r: RegistroVenda) => nomeCompletoGrupo(r.nomeGrupo, r.turma, r.numeroGrupo);

type Filtro = { tipo: 'TODOS' } | { tipo: 'TURMA'; turma: string } | { tipo: 'GRUPO'; chave: string };

export function RegistroVendasTela() {
  const navegar = useNavigate();
  const { valor: todos } = useConsulta(() => listarRegistro(db));
  const [filtro, setFiltro] = useState<Filtro>({ tipo: 'TODOS' });

  const turmas = useMemo(() => [...new Set((todos ?? []).map((r) => r.turma))].sort((a, b) => a.localeCompare(b, 'pt-BR')), [todos]);
  const grupos = useMemo(() => {
    const vistos = new Map<string, RegistroVenda>();
    for (const r of todos ?? []) {
      if (filtro.tipo === 'TURMA' && r.turma !== filtro.turma) continue;
      if (!vistos.has(chaveGrupo(r))) vistos.set(chaveGrupo(r), r);
    }
    return [...vistos.values()];
  }, [todos, filtro]);

  const lista = useMemo(
    () =>
      (todos ?? []).filter((r) =>
        filtro.tipo === 'TODOS' ? true : filtro.tipo === 'TURMA' ? r.turma === filtro.turma : chaveGrupo(r) === filtro.chave,
      ),
    [todos, filtro],
  );
  const totais = totaisRegistro(lista);
  const turmaAtiva = filtro.tipo === 'TURMA' ? filtro.turma : filtro.tipo === 'GRUPO' ? (lista[0]?.turma ?? null) : null;

  return (
    <Tela titulo="Registro de vendas" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {todos && (
          <div className="pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
            {turmas.length > 1 && (
              <div className="filtros" role="group" aria-label="Filtrar por turma">
                <Filtro texto="Todas as turmas" ativo={filtro.tipo === 'TODOS'} onClick={() => setFiltro({ tipo: 'TODOS' })} />
                {turmas.map((t) => (
                  <Filtro key={t} texto={t} ativo={turmaAtiva === t} onClick={() => setFiltro({ tipo: 'TURMA', turma: t })} />
                ))}
              </div>
            )}
            {grupos.length > 1 && (
              <div className="filtros" role="group" aria-label="Filtrar por grupo">
                <Filtro
                  texto="Todos"
                  ativo={filtro.tipo !== 'GRUPO'}
                  onClick={() => setFiltro(turmaAtiva && filtro.tipo !== 'TODOS' ? { tipo: 'TURMA', turma: turmaAtiva } : { tipo: 'TODOS' })}
                />
                {grupos.map((r) => (
                  <Filtro
                    key={chaveGrupo(r)}
                    texto={rotuloGrupo(r)}
                    ativo={filtro.tipo === 'GRUPO' && filtro.chave === chaveGrupo(r)}
                    onClick={() => setFiltro({ tipo: 'GRUPO', chave: chaveGrupo(r) })}
                  />
                ))}
              </div>
            )}
            <Visor>
              <LinhaVisor rotulo="Vendido" centavos={totais.vendidoCentavos} grande animar={false} />
              <LinhaVisor rotulo="Recebido dos clientes" centavos={totais.recebidoCentavos} cor="#FFFFFF" />
              <LinhaVisor rotulo="Troco devolvido" centavos={totais.trocoCentavos} cor="#FFFFFF" />
              <p className="t-bl visor-texto">
                {plural(totais.numeroVendas, 'compra', 'compras')}
                {totais.numeroEstornadas > 0 &&
                  ` · ${totais.numeroEstornadas} ${totais.numeroEstornadas === 1 ? 'estornada' : 'estornadas'} (fora dos totais)`}
              </p>
            </Visor>
            {lista.length === 0 && (
              <p className="t-tm c-apoio" style={{ textAlign: 'center', padding: 24 }}>
                Nenhuma venda registrada ainda.
              </p>
            )}
            {lista.map((r) => (
              <CartaoRegistro key={r.id} r={r} mostrarGrupo={filtro.tipo !== 'GRUPO'} />
            ))}
          </div>
        )}
      </div>
    </Tela>
  );
}

function Filtro({ texto, ativo, onClick }: { texto: string; ativo: boolean; onClick: () => void }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <Tecla
        onClick={onClick}
        cor={ativo ? Cores.tinta : Cores.superficie}
        corConteudo={ativo ? '#FFFFFF' : Cores.tinta}
        borda={ativo ? null : Cores.linha}
        alturaMinima={56}
        raio={16}
        selecionada={ativo}
      >
        <span className="t-ts" style={{ whiteSpace: 'nowrap' }}>
          {texto}
        </span>
      </Tecla>
    </div>
  );
}

function CartaoRegistro({ r, mostrarGrupo }: { r: RegistroVenda; mostrarGrupo: boolean }) {
  const riscado = r.estornada;
  return (
    <div className="cartao pilha" style={{ '--vao': '6px', padding: '14px 18px' } as React.CSSProperties}>
      <div className="linha">
        <span className="t-tm numeros c-apoio cresce">{dataHora(r.dataHora)}</span>
        {r.estornada && <Selo texto="Estornada" cor={Cores.erro} fundo={Cores.erroFundo} />}
      </div>
      {mostrarGrupo && <p className="t-bm c-azul uma-linha">{rotuloGrupo(r)}</p>}
      <p className="t-tm c-tinta duas-linhas">{r.itens}</p>
      <div className="linha" style={{ marginTop: 4, gap: 8 }}>
        <Valor rotulo="Total" centavos={r.totalCentavos} cor={Cores.tinta} riscado={riscado} />
        <Valor rotulo="Recebido" centavos={r.recebidoCentavos} cor={Cores.azulTexto} riscado={riscado} />
        <Valor rotulo="Troco" centavos={r.trocoCentavos} cor={Cores.verdeTexto} riscado={riscado} />
      </div>
    </div>
  );
}

function Valor({ rotulo, centavos, cor, riscado }: { rotulo: string; centavos: number; cor: string; riscado: boolean }) {
  return (
    <div className="peso-1" style={{ background: Cores.fundo, borderRadius: 14, padding: '8px 12px' }}>
      <p className="t-bm c-apoio">{rotulo}</p>
      <p
        className="t-tl numeros"
        style={{ color: riscado ? Cores.apoio : cor, textDecoration: riscado ? 'line-through' : undefined, whiteSpace: 'nowrap' }}
      >
        {formatar(centavos)}
      </p>
    </div>
  );
}
