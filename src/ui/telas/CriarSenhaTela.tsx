import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../data/db';
import { criarSenha } from '../../data/repositorios';
import { MAX_DIGITOS, formatoValido } from '../../domain/senha';
import { Cores } from '../cores';
import { Tela } from '../componentes/Estrutura';
import { TeclaTexto } from '../componentes/Tecla';
import { PontosSenha, TecladoNumerico, useTecladoSenha } from '../componentes/TecladoNumerico';
import { Logo } from '../componentes/Logo';

export function CriarSenhaTela() {
  const navegar = useNavigate();
  const [primeira, setPrimeira] = useState<string | null>(null);
  const [digitada, setDigitada] = useState('');
  const [erroDiferente, setErroDiferente] = useState(false);
  const [erroTick, setErroTick] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const confirmando = primeira != null;
  const pode = formatoValido(digitada) && !salvando;

  const digitar = (d: string) => {
    if (digitada.length < MAX_DIGITOS) {
      setDigitada(digitada + d);
      setErroDiferente(false);
    }
  };
  const apagar = () => setDigitada(digitada.slice(0, -1));
  const continuar = async () => {
    if (!pode) return;
    if (primeira == null) {
      setPrimeira(digitada);
      setDigitada('');
    } else if (primeira === digitada) {
      setSalvando(true);
      await criarSenha(db, digitada);
      navegar('/inicio', { replace: true });
    } else {
      setPrimeira(null);
      setDigitada('');
      setErroDiferente(true);
      setErroTick((t) => t + 1);
    }
  };
  useTecladoSenha({ onDigito: digitar, onApagar: apagar, onEnter: () => void continuar() });

  return (
    <Tela>
      <div className="rolagem">
        <div className="pilha centro" style={{ '--vao': '0px', paddingTop: 16 } as React.CSSProperties}>
          <Logo largura={520} />
          <h1 className="t-hl c-tinta" style={{ marginTop: 24 }}>
            {confirmando ? 'Digite de novo' : 'Senha do Organizador'}
          </h1>
          <p className="t-bl c-apoio" style={{ marginTop: 6 }}>
            {confirmando
              ? 'Para conferir, digite a mesma senha mais uma vez.'
              : 'Crie uma senha de 4 a 8 números. Só o professor deve saber.'}
          </p>
          <div style={{ marginTop: 20 }}>
            <PontosSenha quantidade={digitada.length} maximo={MAX_DIGITOS} erroTick={erroTick} />
          </div>
          <p className="t-bl c-erro" style={{ marginTop: 8, minHeight: 24 }} role="alert">
            {erroDiferente ? 'As senhas ficaram diferentes. Crie de novo.' : ' '}
          </p>
          <div style={{ marginTop: 12, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <TecladoNumerico onDigito={digitar} onApagar={apagar} />
          </div>
          <div style={{ marginTop: 20, width: '100%', maxWidth: 420 }}>
            <TeclaTexto
              texto={confirmando ? 'Salvar senha' : 'Continuar'}
              onClick={() => void continuar()}
              cor={Cores.azul}
              corConteudo="#FFFFFF"
              habilitada={pode}
              alturaMinima={72}
            />
          </div>
          <p className="dicas-teclado so-com-teclado" style={{ marginTop: 14 }}>
            Dá para digitar os números no teclado e confirmar com <kbd>Enter</kbd>.
          </p>
        </div>
      </div>
    </Tela>
  );
}
