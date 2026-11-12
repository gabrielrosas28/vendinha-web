import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db } from '../../data/db';
import { caixaAtual, conferirSenha, estornarVenda, obterVenda, vendasAtuais, type VendaComItens } from '../../data/repositorios';
import { formatar } from '../../domain/dinheiro';
import { Cores } from '../cores';
import { FaixaAviso, Selo, Tela } from '../componentes/Estrutura';
import { Tecla, TeclaTexto } from '../componentes/Tecla';
import { DialogoSenha } from '../componentes/TecladoNumerico';
import { LinhaVisor, Visor } from '../componentes/Visor';
import { useConsulta } from '../dados';
import { dataHora, hora } from '../formatos';

const resumoItens = (v: VendaComItens) => v.itens.map((i) => `${i.quantidade}× ${i.nomeItem}`).join(', ');

export function HistoricoTela() {
  const navegar = useNavigate();
  const { valor: vendas } = useConsulta(() => vendasAtuais(db));

  return (
    <Tela titulo="Histórico de vendas" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {vendas && vendas.length === 0 && (
          <p className="t-tl c-apoio" style={{ textAlign: 'center', padding: 32 }}>
            Nenhuma venda ainda. Bora vender!
          </p>
        )}
        {vendas && vendas.length > 0 && (
          <div className="pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
            {vendas.map((v) => (
              <CartaoVenda key={v.venda.id} v={v} onClick={() => navegar(`/venda/${v.venda.id}`)} />
            ))}
          </div>
        )}
      </div>
    </Tela>
  );
}

function CartaoVenda({ v, onClick }: { v: VendaComItens; onClick: () => void }) {
  const estornada = v.venda.estornada;
  return (
    <Tecla onClick={onClick} cor={Cores.superficie} corConteudo={Cores.tinta} borda={Cores.linha} alturaMinima={96} raio={22} recheio="12px 18px">
      <span className="t-hs numeros c-apoio">{hora(v.venda.dataHora)}</span>
      <span style={{ flex: 1, minWidth: 0, textAlign: 'left', marginLeft: 6 }}>
        <span className="t-tm duas-linhas" style={{ display: 'block' }}>
          {resumoItens(v)}
        </span>
        <span className="t-bm c-apoio" style={{ display: 'block' }}>
          Recebeu {formatar(v.venda.recebidoCentavos)} · Troco {formatar(v.venda.trocoCentavos)}
        </span>
        {estornada && (
          <span style={{ display: 'block', marginTop: 4 }}>
            <Selo texto="Estornada" cor={Cores.erro} fundo={Cores.erroFundo} />
          </span>
        )}
      </span>
      <span
        className="t-hs numeros"
        style={{ color: estornada ? Cores.apoio : Cores.tinta, textDecoration: estornada ? 'line-through' : undefined }}
      >
        {formatar(v.venda.totalCentavos)}
      </span>
    </Tecla>
  );
}

export function VendaDetalheTela() {
  const { id } = useParams();
  const vendaId = Number(id) || 0;
  const navegar = useNavigate();
  const { valor } = useConsulta(async () => ({ venda: await obterVenda(db, vendaId), caixa: await caixaAtual(db) }), [vendaId]);
  const [pedirSenha, setPedirSenha] = useState(false);
  const venda = valor?.venda;

  return (
    <Tela titulo="Venda" onVoltar={() => navegar(-1)}>
      <div className="rolagem">
        {venda && (
          <div className="pilha" style={{ '--vao': '14px' } as React.CSSProperties}>
            <p className="t-tl c-apoio">{dataHora(venda.venda.dataHora)}</p>
            <div className="pilha" style={{ '--vao': '10px', padding: '4px 0' } as React.CSSProperties}>
              {venda.itens.map((iv) => (
                <div key={iv.id} className="linha">
                  <span className="t-hs c-tinta" style={{ width: 64 }}>
                    {iv.quantidade}×
                  </span>
                  <span className="cresce">
                    <span className="t-tl c-tinta" style={{ display: 'block' }}>
                      {iv.nomeItem}
                    </span>
                    <span className="t-bm c-apoio" style={{ display: 'block' }}>
                      {formatar(iv.precoUnitCentavos)} cada
                    </span>
                  </span>
                  <span className="t-tl numeros c-tinta">{formatar(iv.precoUnitCentavos * iv.quantidade)}</span>
                </div>
              ))}
            </div>
            <Visor>
              <LinhaVisor rotulo="Total" centavos={venda.venda.totalCentavos} cor="#FFFFFF" />
              <LinhaVisor rotulo="Recebido" centavos={venda.venda.recebidoCentavos} cor="#FFFFFF" />
              <LinhaVisor rotulo="Troco" centavos={venda.venda.trocoCentavos} />
            </Visor>
            {venda.venda.estornada ? (
              <FaixaAviso texto={`Venda estornada às ${hora(venda.venda.estornadaEm ?? 0)}.`} tipo="erro" />
            ) : valor?.caixa?.status === 'FECHADO' ? (
              <FaixaAviso texto="O caixa está fechado. Para estornar, o organizador reabre o caixa." tipo="info" />
            ) : (
              <>
                <TeclaTexto texto="Estornar venda" icone="desfazer" onClick={() => setPedirSenha(true)} cor={Cores.erro} corConteudo="#FFFFFF" />
                <p className="t-bm c-apoio">
                  Use quando o cliente desistir. O dinheiro volta para o cliente e os produtos voltam para o estoque.
                </p>
              </>
            )}
          </div>
        )}
        {valor && !venda && <p className="t-tl c-apoio" style={{ padding: 32, textAlign: 'center' }}>Esta venda não existe mais.</p>}
      </div>
      {pedirSenha && (
        <DialogoSenha
          titulo="Estornar venda"
          explicacao="O organizador digita a senha para desfazer esta venda."
          onCancelar={() => setPedirSenha(false)}
          verificar={(s) => conferirSenha(db, s)}
          onSucesso={() => {
            setPedirSenha(false);
            void estornarVenda(db, vendaId);
          }}
        />
      )}
    </Tela>
  );
}
