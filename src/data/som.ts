let audio: HTMLAudioElement | null = null;

function carregar(): HTMLAudioElement {
  if (!audio) {
    audio = new Audio(`${import.meta.env.BASE_URL}caixa_registradora.wav`);
    audio.preload = 'auto';
    audio.volume = 0.9;
  }
  return audio;
}

export function prepararSom(): void {
  try {
    carregar().load();
  } catch {}
}

export function tocarSom(): void {
  try {
    const a = carregar();
    a.currentTime = 0;
    void a.play().catch(() => undefined);
  } catch {}
}
