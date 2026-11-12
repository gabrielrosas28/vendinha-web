import { Fragment, useId } from 'react';
import { Denominacoes as D, formatar, type Denominacao, type Pecas } from '../../domain/dinheiro';
import { CoresDinheiro, Cores, misturar } from '../cores';

const PROPORCAO_CEDULA = 2.15;
const LARG = 215;
const ALT = LARG / PROPORCAO_CEDULA;

function numero(d: Denominacao): string {
  return d.centavos >= 100 ? String(d.centavos / 100) : String(d.centavos);
}

export function descricaoPeca(d: Denominacao): string {
  return `${d.tipo === 'CEDULA' ? 'Nota' : 'Moeda'} de ${formatar(d.centavos)}`;
}

export function Cedula({ d, largura }: { d: Denominacao; largura?: number }) {
  const cor = CoresDinheiro.cedula(d);
  const texto = CoresDinheiro.textoCedula(d);
  const raio = LARG * 0.07;
  const m = ALT * 0.07;
  const medalhao = ALT * 0.62;
  const cx = m + ALT * 0.08 + medalhao / 2;
  return (
    <svg
      viewBox={`0 0 ${LARG} ${ALT}`}
      width={largura}
      height={largura ? largura / PROPORCAO_CEDULA : undefined}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width={LARG} height={ALT} rx={raio} fill={cor} />
      <rect
        x={m}
        y={m}
        width={LARG - 2 * m}
        height={ALT - 2 * m}
        rx={raio * 0.7}
        fill="none"
        stroke="rgb(255 255 255 / 0.45)"
        strokeWidth="1.5"
      />
      <circle cx={cx} cy={ALT / 2} r={medalhao / 2} fill={misturar(cor, '#FFFFFF', 0.32)} />
      <text
        x={cx}
        y={ALT / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="Nunito, sans-serif"
        fontWeight="900"
        fontSize={ALT * 0.2}
        fill={misturar(cor, '#000000', 0.45)}
      >
        R$
      </text>
      <text
        x={LARG - m - ALT * 0.1}
        y={ALT * 0.56}
        textAnchor="end"
        fontFamily="Nunito, sans-serif"
        fontWeight="900"
        fontSize={ALT * 0.5}
        fill={texto}
      >
        {numero(d)}
      </text>
      <text
        x={LARG - m - ALT * 0.1}
        y={ALT * 0.78}
        textAnchor="end"
        fontFamily="Nunito, sans-serif"
        fontWeight="800"
        fontSize={ALT * 0.13}
        fill={texto}
        fillOpacity="0.9"
      >
        REAIS
      </text>
    </svg>
  );
}

export function Moeda({ d, diametro }: { d: Denominacao; diametro?: number }) {
  const [anel, miolo, borda] =
    d.id === D.M1.id
      ? [CoresDinheiro.ouro, CoresDinheiro.prata, CoresDinheiro.ouroBorda]
      : d.id === D.M050.id
        ? [CoresDinheiro.prata, CoresDinheiro.prata, CoresDinheiro.prataBorda]
        : d.id === D.M005.id
          ? [CoresDinheiro.cobre, CoresDinheiro.cobre, CoresDinheiro.cobreBorda]
          : [CoresDinheiro.ouro, CoresDinheiro.ouro, CoresDinheiro.ouroBorda];
  const tinta = '#2A1E05';
  return (
    <svg viewBox="0 0 100 100" width={diametro} height={diametro} aria-hidden="true" focusable="false">
      <circle cx="50" cy="50" r="50" fill={anel} />
      <circle cx="50" cy="50" r="48" fill="none" stroke={borda} strokeWidth="3" />
      <circle cx="50" cy="50" r="35" fill={miolo} />
      <circle cx="50" cy="50" r="35" fill="none" stroke={borda} strokeOpacity="0.5" strokeWidth="2" />
      <text x="50" y="54" textAnchor="middle" fontFamily="Nunito, sans-serif" fontWeight="900" fontSize="36" fill={tinta}>
        {numero(d)}
      </text>
      <text
        x="50"
        y="68"
        textAnchor="middle"
        fontFamily="Nunito, sans-serif"
        fontWeight="800"
        fontSize="10"
        fill={tinta}
        fillOpacity="0.85"
      >
        {d.id === D.M1.id ? 'REAL' : 'CENTAVOS'}
      </text>
    </svg>
  );
}

export function Peca({ d, tamanho }: { d: Denominacao; tamanho?: number }) {
  return d.tipo === 'CEDULA' ? <Cedula d={d} largura={tamanho} /> : <Moeda d={d} diametro={tamanho ? tamanho * 0.5 : undefined} />;
}

const ORDEM_CEDULAS = [D.R2, D.R5, D.R10, D.R20, D.R50, D.R100, D.R200];
const ORDEM_MOEDAS = [D.M005, D.M010, D.M025, D.M050, D.M1];

export function TecladoDinheiro({ onToque }: { onToque: (d: Denominacao) => void }) {
  return (
    <div className="teclado-dinheiro">
      <div className="teclado-cedulas">
        {ORDEM_CEDULAS.map((d) => (
          <button key={d.id} type="button" className="peca-tocavel" aria-label={descricaoPeca(d)} title={descricaoPeca(d)} onClick={() => onToque(d)}>
            <Cedula d={d} />
          </button>
        ))}
      </div>
      <div className="teclado-moedas">
        {ORDEM_MOEDAS.map((d) => (
          <button key={d.id} type="button" className="peca-tocavel" aria-label={descricaoPeca(d)} title={descricaoPeca(d)} onClick={() => onToque(d)}>
            <Moeda d={d} />
          </button>
        ))}
      </div>
    </div>
  );
}

export function BandejaPecas({
  pecas,
  tamanho = 92,
  textoVazio,
  corTexto = Cores.tinta,
  centralizar = false,
  onTirar,
}: {
  pecas: Pecas[];
  tamanho?: number;
  textoVazio?: string;
  corTexto?: string;
  centralizar?: boolean;
  onTirar?: (d: Denominacao) => void;
}) {
  const id = useId();
  if (pecas.length === 0) {
    return textoVazio ? <div className="bandeja-vazia t-bl">{textoVazio}</div> : null;
  }
  return (
    <div className={`bandeja ${centralizar ? 'centralizar' : ''}`} id={id}>
      {pecas.map((p) => {
        const descricao = `${p.quantidade} × ${descricaoPeca(p.denominacao)}`;
        const visiveis = Math.min(p.quantidade, 3);
        const ehCedula = p.denominacao.tipo === 'CEDULA';
        const largura = ehCedula ? tamanho : tamanho * 0.5;
        const altura = ehCedula ? tamanho / PROPORCAO_CEDULA : tamanho * 0.5;
        const conteudo = (
          <Fragment>
            <span
              className="empilhado"
              style={{ width: largura + (visiveis - 1) * 5, height: altura + (visiveis - 1) * 4, display: 'block' }}
            >
              {Array.from({ length: visiveis }, (_, i) => (
                <span key={i} style={{ position: 'absolute', left: i * 5, top: i * 4, display: 'block' }}>
                  <Peca d={p.denominacao} tamanho={tamanho} />
                </span>
              ))}
            </span>
            {p.quantidade > 1 && (
              <span className="t-hs numeros" style={{ color: corTexto, marginLeft: 10 }} aria-hidden="true">
                ×{p.quantidade}
              </span>
            )}
          </Fragment>
        );
        return onTirar ? (
          <button
            key={p.denominacao.id}
            type="button"
            className="pilha-pecas"
            aria-label={`${descricao}. Clique para tirar uma.`}
            title="Tirar uma"
            onClick={() => onTirar(p.denominacao)}
          >
            {conteudo}
          </button>
        ) : (
          <div key={p.denominacao.id} className="pilha-pecas" role="img" aria-label={descricao}>
            {conteudo}
          </div>
        );
      })}
    </div>
  );
}
