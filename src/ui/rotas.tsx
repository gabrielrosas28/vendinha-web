import { useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { db } from '../data/db';
import { grupoAtivo, obterConfig } from '../data/repositorios';
import { FaixaVersao } from './componentes/FaixaVersao';
import { SessaoProvider, useSessao } from './sessao';
import { AbrirCaixaTela } from './telas/AbrirCaixaTela';
import { CriarSenhaTela } from './telas/CriarSenhaTela';
import { EstoqueTela } from './telas/EstoqueTela';
import { ConferirTela, FecharCaixaTela } from './telas/FechamentoTelas';
import { HistoricoTela, VendaDetalheTela } from './telas/HistoricoTelas';
import { IniciarGrupoTela } from './telas/IniciarGrupoTela';
import { OrganizadorTela } from './telas/OrganizadorTela';
import { PagamentoTela } from './telas/PagamentoTela';
import { PainelTela } from './telas/PainelTela';
import { ProdutoFormTela } from './telas/ProdutoFormTela';
import { ProdutosTela } from './telas/ProdutosTela';
import { ProntoTela } from './telas/ProntoTela';
import { RegistroVendasTela } from './telas/RegistroVendasTela';
import { RelatorioTela } from './telas/RelatorioTela';
import { TurmaTela, TurmasTela } from './telas/TurmasTelas';
import { VendaTela } from './telas/VendaTela';

const AREA_ORGANIZADOR = /^\/(organizador|turmas|turma\/\d+|registro|relatorio\/\d+)$/;
const PRECISA_SENHA = /^\/(turmas|turma\/\d+|registro)$/;

function Raiz() {
  const [destino, setDestino] = useState<string | null>(null);
  useEffect(() => {
    let vivo = true;
    void (async () => {
      const [config, grupo] = await Promise.all([obterConfig(db), grupoAtivo(db)]);
      if (vivo) setDestino(!config ? '/criar-senha' : !grupo ? '/inicio' : '/painel');
    })();
    return () => {
      vivo = false;
    };
  }, []);
  return destino ? <Navigate to={destino} replace /> : null;
}

function Global() {
  const navegar = useNavigate();
  const local = useLocation();
  const sessao = useSessao();
  const { orgLiberado, setOrgLiberado, pedidoEmAndamento, setConferencia } = sessao;

  useEffect(() => {
    if (orgLiberado && !AREA_ORGANIZADOR.test(local.pathname)) setOrgLiberado(false);
  }, [local.pathname, orgLiberado, setOrgLiberado]);

  useEffect(() => {
    if (local.pathname === '/painel') setConferencia(() => ({ contagem: {}, modo: 'CONTAR', digitado: 0 }));
  }, [local.pathname, setConferencia]);

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'O' || e.key === 'o' || e.code === 'KeyO')) {
        e.preventDefault();
        if (local.pathname !== '/criar-senha' && local.pathname !== '/organizador' && !document.querySelector('.dialogo-fundo')) {
          navegar('/organizador');
        }
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [local.pathname, navegar]);

  useEffect(() => {
    if (!pedidoEmAndamento) return;
    const antes = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', antes);
    return () => window.removeEventListener('beforeunload', antes);
  }, [pedidoEmAndamento]);

  return <FaixaVersao pedidoEmAndamento={pedidoEmAndamento} />;
}

function ComSenha({ children }: { children: React.ReactElement }) {
  const { orgLiberado } = useSessao();
  const local = useLocation();
  if (!orgLiberado && PRECISA_SENHA.test(local.pathname)) return <Navigate to="/organizador" replace />;
  return children;
}

export function App() {
  return (
    <SessaoProvider>
      <HashRouter>
        <Global />
        <Routes>
          <Route path="/" element={<Raiz />} />
          <Route path="/criar-senha" element={<CriarSenhaTela />} />
          <Route path="/inicio" element={<IniciarGrupoTela />} />
          <Route path="/painel" element={<PainelTela />} />
          <Route path="/produtos" element={<ProdutosTela />} />
          <Route path="/produto/:id" element={<ProdutoFormTela />} />
          <Route path="/abrir-caixa" element={<AbrirCaixaTela />} />
          <Route path="/venda" element={<VendaTela />} />
          <Route path="/pagamento" element={<PagamentoTela />} />
          <Route path="/pronto" element={<ProntoTela />} />
          <Route path="/estoque" element={<EstoqueTela />} />
          <Route path="/historico" element={<HistoricoTela />} />
          <Route path="/venda/:id" element={<VendaDetalheTela />} />
          <Route path="/fechar" element={<FecharCaixaTela />} />
          <Route path="/conferir" element={<ConferirTela />} />
          <Route path="/relatorio/:id" element={<RelatorioTela />} />
          <Route path="/organizador" element={<OrganizadorTela />} />
          <Route path="/turmas" element={<ComSenha><TurmasTela /></ComSenha>} />
          <Route path="/turma/:id" element={<ComSenha><TurmaTela /></ComSenha>} />
          <Route path="/registro" element={<ComSenha><RegistroVendasTela /></ComSenha>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </SessaoProvider>
  );
}
