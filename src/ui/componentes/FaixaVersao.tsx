import { useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { Cores } from '../cores';
import { TeclaTexto } from './Tecla';

const CHECAR_A_CADA_MS = 30 * 60 * 1000;

export function FaixaVersao({ pedidoEmAndamento }: { pedidoEmAndamento: boolean }) {
  const [esperar, setEsperar] = useState(false);
  const registroRef = useRef<ServiceWorkerRegistration | null>(null);
  const {
    needRefresh: [temNova],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registro) {
      if (!registro) return;
      registroRef.current = registro;
      setInterval(() => {
        if (navigator.onLine) void registro.update().catch(() => undefined);
      }, CHECAR_A_CADA_MS);
    },
  });

  if (!temNova) return null;
  return (
    <div className="faixa-versao" role="status">
      <span className="t-tm">{esperar && pedidoEmAndamento ? 'Termine a venda antes de atualizar.' : 'Tem versão nova do Vendinha.'}</span>
      <TeclaTexto
        texto="Atualizar"
        onClick={() => {
          if (pedidoEmAndamento) setEsperar(true);
          else if (registroRef.current?.waiting) void updateServiceWorker(true);
          else window.location.reload();
        }}
        cor={Cores.verde}
        corConteudo="#FFFFFF"
        alturaMinima={52}
      />
    </div>
  );
}
