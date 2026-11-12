import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MAX_DIGITOS, MIN_DIGITOS } from '../../domain/senha';
import { Cores } from '../cores';
import { Janela } from './Dialogos';
import { Icone } from './Icone';
import { Tecla, TeclaSecundaria, TeclaTexto } from './Tecla';

export function TecladoNumerico({
  onDigito,
  onApagar,
  alturaTecla = 64,
  extra,
}: {
  onDigito: (d: string) => void;
  onApagar: () => void;
  alturaTecla?: number;
  extra?: ReactNode;
}) {
  const digito = (d: string) => (
    <Tecla key={d} onClick={() => onDigito(d)} cor={Cores.superficie} corConteudo={Cores.tinta} borda={Cores.linha} alturaMinima={alturaTecla}>
      <span className="t-hl">{d}</span>
    </Tecla>
  );
  return (
    <div className="teclado-numerico">
      {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map(digito)}
      {extra ?? <span />}
      {digito('0')}
      <Tecla onClick={onApagar} cor={Cores.superficie} corConteudo={Cores.tinta} borda={Cores.linha} alturaMinima={alturaTecla} descricao="Apagar número">
        <Icone nome="apagarTecla" tamanho={30} />
      </Tecla>
    </div>
  );
}

export function PontosSenha({ quantidade, maximo, erroTick }: { quantidade: number; maximo: number; erroTick: number }) {
  return (
    <div key={erroTick} className={`pontos-senha ${erroTick > 0 ? 'tremer' : ''}`} role="status" aria-label={`${quantidade} números digitados`}>
      {Array.from({ length: maximo }, (_, i) => (
        <span key={i} className={i < quantidade ? 'cheio' : ''} />
      ))}
    </div>
  );
}

export function useTecladoSenha(opcoes: { onDigito: (d: string) => void; onApagar: () => void; onEnter: () => void; ativo?: boolean }) {
  const ref = useRef(opcoes);
  useEffect(() => {
    ref.current = opcoes;
  });
  const ativo = opcoes.ativo ?? true;
  useEffect(() => {
    if (!ativo) return;
    const tecla = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        ref.current.onDigito(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        ref.current.onApagar();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        ref.current.onEnter();
      }
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [ativo]);
}

export function DialogoSenha({
  titulo,
  explicacao,
  onCancelar,
  verificar,
  onSucesso,
}: {
  titulo: string;
  explicacao?: string;
  onCancelar: () => void;
  verificar: (senha: string) => Promise<boolean>;
  onSucesso: () => void;
}) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState(false);
  const [erroTick, setErroTick] = useState(0);
  const [conferindo, setConferindo] = useState(false);
  const pode = senha.length >= MIN_DIGITOS && !conferindo;

  const digitar = (d: string) => {
    if (senha.length < MAX_DIGITOS) {
      setSenha(senha + d);
      setErro(false);
    }
  };
  const apagar = () => {
    setSenha(senha.slice(0, -1));
    setErro(false);
  };
  const entrar = async () => {
    if (!pode) return;
    setConferindo(true);
    const ok = await verificar(senha);
    setConferindo(false);
    if (ok) onSucesso();
    else {
      setErro(true);
      setErroTick((t) => t + 1);
      setSenha('');
    }
  };
  useTecladoSenha({ onDigito: digitar, onApagar: apagar, onEnter: () => void entrar() });

  return (
    <Janela onFechar={onCancelar} largura={460} rotulo={titulo}>
      <div className="pilha centro" style={{ '--vao': '0px' } as React.CSSProperties}>
        <Icone nome="cadeado" tamanho={36} cor={Cores.azul} />
        <h2 className="t-hs c-tinta" style={{ marginTop: 8 }}>
          {titulo}
        </h2>
        {explicacao && (
          <p className="t-bl c-apoio" style={{ marginTop: 4 }}>
            {explicacao}
          </p>
        )}
        <div style={{ marginTop: 16 }}>
          <PontosSenha quantidade={senha.length} maximo={MAX_DIGITOS} erroTick={erroTick} />
        </div>
        <p className="t-bl c-erro" style={{ marginTop: 8, minHeight: 24 }} role="alert">
          {erro ? 'Senha errada. Tente de novo.' : ' '}
        </p>
        <div style={{ marginTop: 8, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <TecladoNumerico onDigito={digitar} onApagar={apagar} alturaTecla={window.innerHeight < 720 ? 52 : 60} />
        </div>
        <div className="linha" style={{ marginTop: 16, width: '100%' }}>
          <div className="peso-1">
            <TeclaSecundaria texto="Cancelar" onClick={onCancelar} />
          </div>
          <div className="peso-1">
            <TeclaTexto texto="Entrar" onClick={() => void entrar()} cor={Cores.azul} corConteudo="#FFFFFF" habilitada={pode} />
          </div>
        </div>
      </div>
    </Janela>
  );
}
