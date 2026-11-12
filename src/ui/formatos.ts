const p2 = (n: number) => String(n).padStart(2, '0');

export function hora(millis: number): string {
  const d = new Date(millis);
  return `${p2(d.getHours())}:${p2(d.getMinutes())}`;
}

export function data(millis: number): string {
  const d = new Date(millis);
  return `${p2(d.getDate())}/${p2(d.getMonth() + 1)}/${d.getFullYear()}`;
}

export function dataHora(millis: number): string {
  return `${data(millis)} às ${hora(millis)}`;
}

export function arquivo(millis: number): string {
  const d = new Date(millis);
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}_${p2(d.getHours())}h${p2(d.getMinutes())}`;
}

export function plural(n: number, um: string, varios: string): string {
  return `${n} ${n === 1 ? um : varios}`;
}

export function bytesLegiveis(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1).replace('.', ',')} GB`;
}
