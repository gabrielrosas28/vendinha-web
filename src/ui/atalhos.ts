import { useEffect, useRef } from 'react';

function dialogoAberto(): boolean {
  return document.querySelector('.dialogo-fundo') != null;
}

function digitandoEmCampo(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof HTMLElement)) return false;
  return alvo.isContentEditable || alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT';
}

export function useAtalhos(tratar: (e: KeyboardEvent) => boolean, ativo = true): void {
  const ref = useRef(tratar);
  useEffect(() => {
    ref.current = tratar;
  });
  useEffect(() => {
    if (!ativo) return;
    const ouvir = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey) return;
      if (e.repeat && (e.key === 'Enter' || e.key === 'Escape')) return;
      if (digitandoEmCampo(e.target) || dialogoAberto()) return;
      if (ref.current(e)) e.preventDefault();
    };
    window.addEventListener('keydown', ouvir);
    return () => window.removeEventListener('keydown', ouvir);
  }, [ativo]);
}

export function numeroDaTecla(e: KeyboardEvent): number | null {
  if (/^[0-9]$/.test(e.key)) return Number(e.key);
  const m = /^(?:Digit|Numpad)([0-9])$/.exec(e.code);
  return m ? Number(m[1]) : null;
}
