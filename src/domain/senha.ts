export const MIN_DIGITOS = 4;
export const MAX_DIGITOS = 8;
export const ITERACOES = 120_000;
const BITS = 256;

export function formatoValido(senha: string): boolean {
  return senha.length >= MIN_DIGITOS && senha.length <= MAX_DIGITOS && /^[0-9]+$/.test(senha);
}

function paraHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function deHex(hex: string): Uint8Array<ArrayBuffer> {
  const n = Math.floor(hex.length / 2);
  const r = new Uint8Array(n);
  for (let i = 0; i < n; i++) r[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  return r;
}

export function gerarSalt(): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  return paraHex(salt);
}

export async function hash(senha: string, saltHex: string, iteracoes = ITERACOES): Promise<string> {
  const chave = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: deHex(saltHex), iterations: iteracoes },
    chave,
    BITS,
  );
  return paraHex(new Uint8Array(bits));
}

export function iguaisTempoConstante(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let dif = x.length ^ y.length;
  const n = Math.max(x.length, y.length);
  for (let i = 0; i < n; i++) dif |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return dif === 0;
}

export async function confere(senha: string, saltHex: string, hashHex: string, iteracoes = ITERACOES): Promise<boolean> {
  if (!formatoValido(senha)) return false;
  return iguaisTempoConstante(await hash(senha, saltHex, iteracoes), hashHex);
}
