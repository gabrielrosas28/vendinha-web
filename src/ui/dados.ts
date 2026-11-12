import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../data/db';

export function useConsulta<T>(consulta: () => Promise<T>, deps: unknown[] = []): { carregado: boolean; valor: T | undefined } {
  const r = useLiveQuery(async () => ({ v: await consulta() }), deps);
  return { carregado: r !== undefined, valor: r?.v };
}

export { db };
