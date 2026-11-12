import type { ReactNode } from 'react';
import { formatar } from '../../domain/dinheiro';
import { Cores } from '../cores';

export function Visor({ children, className = '', estilo }: { children: ReactNode; className?: string; estilo?: React.CSSProperties }) {
  return (
    <div className={`visor ${className}`} style={estilo}>
      {children}
    </div>
  );
}

export function LinhaVisor({
  rotulo,
  centavos,
  cor = Cores.visorNumero,
  grande = false,
  animar = grande,
}: {
  rotulo: string;
  centavos: number;
  cor?: string;
  grande?: boolean;
  animar?: boolean;
}) {
  const valor = formatar(centavos);
  return (
    <div className="linha-visor" aria-live={grande ? 'polite' : undefined} aria-label={`${rotulo}: ${valor}`} role={grande ? 'status' : undefined}>
      <span className={`rotulo ${grande ? 't-tl' : 't-bl'}`} aria-hidden="true">
        {rotulo}
      </span>
      <span className={`valor numeros ${grande ? 't-dm' : 't-tl'}`} style={{ color: cor }} aria-hidden="true">
        {animar ? (
          <span key={valor} className="valor-animado">
            {valor}
          </span>
        ) : (
          valor
        )}
      </span>
    </div>
  );
}

export function SeparadorVisor() {
  return <div className="visor-separador" />;
}
