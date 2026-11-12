import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from 'react';
import { Cores } from '../cores';
import { TeclaSecundaria, TeclaTexto } from './Tecla';

export function Janela({
  onFechar,
  largura = 520,
  children,
  rotulo,
}: {
  onFechar: () => void;
  largura?: number;
  children: ReactNode;
  rotulo?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  useEffect(() => {
    fechar.current = onFechar;
  });
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const primeiro = el?.querySelector<HTMLElement>('input, [data-foco-inicial]') ?? el?.querySelector<HTMLElement>('button');
    primeiro?.focus();
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        fechar.current();
      }
    };
    window.addEventListener('keydown', tecla, true);
    return () => {
      window.removeEventListener('keydown', tecla, true);
      anterior?.focus?.();
    };
  }, []);
  return (
    <div
      className="dialogo-fundo"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onFechar();
      }}
    >
      <div
        ref={ref}
        className="dialogo"
        role="dialog"
        aria-modal="true"
        aria-label={rotulo}
        style={{ '--dialogo-largura': `${largura}px` } as CSSProperties}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogoConfirmacao({
  titulo,
  texto,
  textoConfirmar,
  onConfirmar,
  onCancelar,
  perigoso = false,
}: {
  titulo: string;
  texto: string;
  textoConfirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
  perigoso?: boolean;
}) {
  return (
    <Janela onFechar={onCancelar} largura={480} rotulo={titulo}>
      <h2 className="t-hs" style={{ color: perigoso ? Cores.erro : Cores.tinta }}>
        {titulo}
      </h2>
      <p className="t-bl c-tinta" style={{ marginTop: 10 }}>
        {texto}
      </p>
      <div className="linha" style={{ marginTop: 24 }}>
        <div className="peso-1">
          <TeclaSecundaria texto="Cancelar" onClick={onCancelar} />
        </div>
        <div className="peso-1">
          <TeclaTexto texto={textoConfirmar} onClick={onConfirmar} cor={perigoso ? Cores.erro : Cores.verde} corConteudo="#FFFFFF" />
        </div>
      </div>
    </Janela>
  );
}

export function CampoTexto({
  valor,
  onMudar,
  rotulo,
  exemplo,
  erro,
  ajuda,
  maximo,
  modo,
  onEnter,
  autoFoco,
}: {
  valor: string;
  onMudar: (v: string) => void;
  rotulo: string;
  exemplo?: string;
  erro?: string | null;
  ajuda?: string | null;
  maximo?: number;
  modo?: 'text' | 'decimal' | 'numeric';
  onEnter?: () => void;
  autoFoco?: boolean;
}) {
  const id = useId();
  const texto = erro ?? ajuda;
  return (
    <div className={`campo ${erro ? 'com-erro' : ''}`}>
      <label htmlFor={id}>{rotulo}</label>
      <input
        id={id}
        value={valor}
        placeholder={exemplo}
        maxLength={maximo}
        inputMode={modo}
        autoComplete="off"
        autoCapitalize="sentences"
        spellCheck={false}
        autoFocus={autoFoco}
        aria-invalid={erro ? true : undefined}
        aria-describedby={texto ? `${id}-ajuda` : undefined}
        onChange={(e) => onMudar(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && onEnter) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
      {texto && (
        <span id={`${id}-ajuda`} className="ajuda">
          {texto}
        </span>
      )}
    </div>
  );
}

export function Chave({
  ligada,
  onMudar,
  children,
}: {
  ligada: boolean;
  onMudar: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button type="button" role="switch" aria-checked={ligada} className="chave" onClick={() => onMudar(!ligada)}>
      <span className="cresce" style={{ flex: 1, minWidth: 0 }}>
        {children}
      </span>
      <span className="chave-trilho" aria-hidden="true" />
    </button>
  );
}
