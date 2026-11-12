import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Cores } from '../cores';
import { Icone } from './Icone';
import { TeclaIcone } from './Tecla';

export function Tela({
  titulo,
  onVoltar,
  acoes,
  fundo,
  larga = false,
  children,
}: {
  titulo?: string | null;
  onVoltar?: (() => void) | null;
  acoes?: ReactNode;
  fundo?: string;
  larga?: boolean;
  children?: ReactNode;
}) {
  useEffect(() => {
    document.title = titulo ? `${titulo} · Vendinha` : 'Vendinha';
  }, [titulo]);
  return (
    <div className={`tela ${larga ? 'tela-larga' : ''}`} style={fundo ? ({ '--tela-fundo': fundo } as CSSProperties) : undefined}>
      <div className="tela-coluna">
        {(titulo != null || onVoltar) && <Cabecalho titulo={titulo ?? null} onVoltar={onVoltar ?? null} acoes={acoes} />}
        {children}
      </div>
    </div>
  );
}

export function Cabecalho({ titulo, onVoltar, acoes }: { titulo: string | null; onVoltar: (() => void) | null; acoes?: ReactNode }) {
  return (
    <header className="cabecalho">
      {onVoltar && <TeclaIcone icone="voltar" descricao="Voltar" onClick={onVoltar} />}
      {titulo != null ? <h1 className="t-hm">{titulo}</h1> : <span className="cresce" style={{ flex: 1 }} />}
      {acoes && <div className="cabecalho-acoes">{acoes}</div>}
    </header>
  );
}

export type TipoAviso = 'alerta' | 'erro' | 'sucesso' | 'info';

export function FaixaAviso({ texto, tipo = 'alerta', className = '' }: { texto: string; tipo?: TipoAviso; className?: string }) {
  return (
    <div className={`aviso ${tipo} ${className}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      {(tipo === 'alerta' || tipo === 'erro') && <Icone nome="alerta" tamanho={24} />}
      <span>{texto}</span>
    </div>
  );
}

export function Selo({ texto, cor, fundo }: { texto: string; cor: string; fundo: string }) {
  return (
    <span className="selo" style={{ color: cor, background: fundo }}>
      {texto}
    </span>
  );
}

export function TituloSecao({ texto }: { texto: string }) {
  return <h2 className="secao-titulo">{texto}</h2>;
}

const DURACAO_CADEADO = 2000;

export function CadeadoOrganizador({ onAbrir }: { onAbrir: () => void }) {
  const [progresso, setProgresso] = useState(0);
  const quadro = useRef<number | null>(null);
  const inicio = useRef(0);

  const parar = () => {
    if (quadro.current != null) cancelAnimationFrame(quadro.current);
    quadro.current = null;
    setProgresso(0);
  };

  useEffect(() => () => {
    if (quadro.current != null) cancelAnimationFrame(quadro.current);
  }, []);

  const comecar = () => {
    parar();
    inicio.current = performance.now();
    const passo = (t: number) => {
      const p = Math.min(1, (t - inicio.current) / DURACAO_CADEADO);
      setProgresso(p);
      if (p >= 1) {
        quadro.current = null;
        setProgresso(0);
        onAbrir();
      } else {
        quadro.current = requestAnimationFrame(passo);
      }
    };
    quadro.current = requestAnimationFrame(passo);
  };

  const circ = 2 * Math.PI * 20;
  return (
    <button
      type="button"
      className="cadeado"
      aria-label="Área do Organizador. Segure por 2 segundos (ou Ctrl+Shift+O)."
      title="Área do Organizador: segure por 2 segundos"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId);
        comecar();
      }}
      onPointerUp={parar}
      onPointerCancel={parar}
      onLostPointerCapture={parar}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
          e.preventDefault();
          comecar();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') parar();
      }}
    >
      {progresso > 0 && (
        <svg className="anel" viewBox="0 0 48 48" aria-hidden="true">
          <circle
            cx="24"
            cy="24"
            r="20"
            fill="none"
            stroke={Cores.azul}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - progresso)}
          />
        </svg>
      )}
      <span style={{ display: 'flex', opacity: 0.55 + 0.45 * progresso }}>
        <Icone nome="cadeado" tamanho={22} cor={Cores.apoio} />
      </span>
    </button>
  );
}
