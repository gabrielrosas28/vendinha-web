import type { CSSProperties, ReactNode } from 'react';
import { Cores, corSobre } from '../cores';
import { Icone, type NomeIcone } from './Icone';

export interface TeclaProps {
  onClick?: () => void;
  cor?: string;
  corConteudo?: string;
  habilitada?: boolean;
  alturaMinima?: number;
  raio?: number;
  borda?: string | null;
  beico?: number;
  descricao?: string;
  recheio?: string;
  className?: string;
  estiloFace?: CSSProperties;
  estilo?: CSSProperties;
  selecionada?: boolean;
  children?: ReactNode;
  tipo?: 'button' | 'submit';
  titulo?: string;
}

export function Tecla({
  onClick,
  cor = Cores.laranja,
  corConteudo,
  habilitada = true,
  alturaMinima = 64,
  raio = 20,
  borda = null,
  beico = 5,
  descricao,
  recheio,
  className = '',
  estiloFace,
  estilo,
  selecionada,
  children,
  tipo = 'button',
  titulo,
}: TeclaProps) {
  const cores: Record<string, string> = habilitada
    ? { '--cor': cor, '--texto': corConteudo ?? corSobre(cor), ...(borda ? { '--borda-cor': borda } : {}) }
    : { '--cor': '#E3E7EF', '--texto': '#6B7391', '--beico-cor': '#CDD3DE' };
  const vars = {
    ...cores,
    '--alt': `${alturaMinima}px`,
    '--raio': `${raio}px`,
    '--beico': `${beico}px`,
    ...estilo,
  } as CSSProperties;
  return (
    <button
      type={tipo}
      className={`tecla ${borda && habilitada ? 'com-borda' : ''} ${className}`}
      style={vars}
      onClick={onClick}
      disabled={!habilitada}
      aria-label={descricao}
      aria-pressed={selecionada}
      title={titulo}
    >
      <span className="tecla-face" style={{ ...(recheio ? { padding: recheio } : {}), ...estiloFace }}>
        {children}
      </span>
    </button>
  );
}

interface TeclaTextoProps extends Omit<TeclaProps, 'children'> {
  texto: string;
  icone?: NomeIcone;
  classeTexto?: string;
  extra?: ReactNode;
}

export function TeclaTexto({ texto, icone, classeTexto, extra, ...resto }: TeclaTextoProps) {
  return (
    <Tecla {...resto}>
      {icone && <Icone nome={icone} tamanho={28} />}
      <span className={classeTexto}>{texto}</span>
      {extra}
    </Tecla>
  );
}

export function TeclaSecundaria({ corTexto = Cores.tinta, ...resto }: TeclaTextoProps & { corTexto?: string }) {
  return <TeclaTexto {...resto} cor={Cores.superficie} corConteudo={corTexto} borda={Cores.linha} />;
}

export function TeclaIcone({
  icone,
  descricao,
  onClick,
  cor = Cores.superficie,
  corIcone = Cores.tinta,
  tamanho = 56,
  habilitada = true,
  titulo,
}: {
  icone: NomeIcone;
  descricao: string;
  onClick: () => void;
  cor?: string;
  corIcone?: string;
  tamanho?: number;
  habilitada?: boolean;
  titulo?: string;
}) {
  return (
    <Tecla
      onClick={onClick}
      cor={cor}
      corConteudo={corIcone}
      habilitada={habilitada}
      alturaMinima={tamanho - 4}
      raio={999}
      borda={cor === Cores.superficie ? Cores.linha : null}
      beico={4}
      descricao={descricao}
      titulo={titulo ?? descricao}
      className="tecla-redonda"
      estilo={{ '--tamanho': `${tamanho}px` } as CSSProperties}
    >
      <Icone nome={icone} tamanho={26} />
    </Tecla>
  );
}
