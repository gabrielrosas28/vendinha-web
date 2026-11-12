export interface InfoArmazenamento {
  suportado: boolean;
  protegido: boolean;
  usado: number | null;
  cota: number | null;
}

export async function lerArmazenamento(): Promise<InfoArmazenamento> {
  const s = navigator.storage;
  if (!s) return { suportado: false, protegido: false, usado: null, cota: null };
  const [protegido, estimativa] = await Promise.all([
    s.persisted ? s.persisted().catch(() => false) : Promise.resolve(false),
    s.estimate ? s.estimate().catch(() => null) : Promise.resolve(null),
  ]);
  return {
    suportado: typeof s.persist === 'function',
    protegido,
    usado: estimativa?.usage ?? null,
    cota: estimativa?.quota ?? null,
  };
}

export async function pedirArmazenamentoPersistente(): Promise<InfoArmazenamento> {
  try {
    if (navigator.storage?.persisted && !(await navigator.storage.persisted())) await navigator.storage.persist?.();
  } catch {}
  return lerArmazenamento();
}
