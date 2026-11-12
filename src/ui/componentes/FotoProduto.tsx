import { useEffect, useState, type CSSProperties } from 'react';
import { db } from '../../data/db';
import { corSobre } from '../cores';

const cache = new Map<number, string>();
const pendentes = new Map<number, Promise<string | null>>();

async function carregar(id: number): Promise<string | null> {
  const pronta = cache.get(id);
  if (pronta) return pronta;
  let p = pendentes.get(id);
  if (!p) {
    p = db.fotos.get(id).then((f) => {
      pendentes.delete(id);
      if (!f) return null;
      const url = URL.createObjectURL(f.blob);
      cache.set(id, url);
      return url;
    });
    pendentes.set(id, p);
  }
  return p;
}

export function esquecerFotos(): void {
  for (const url of cache.values()) URL.revokeObjectURL(url);
  cache.clear();
}

export function useFotoUrl(fotoId: number | null | undefined): string | null {
  const [estado, setEstado] = useState<{ id: number | null; url: string | null }>(() => ({
    id: fotoId ?? null,
    url: fotoId != null ? (cache.get(fotoId) ?? null) : null,
  }));
  useEffect(() => {
    if (fotoId == null) return;
    let vivo = true;
    void carregar(fotoId).then((url) => {
      if (vivo) setEstado({ id: fotoId, url });
    });
    return () => {
      vivo = false;
    };
  }, [fotoId]);
  if (fotoId == null) return null;
  if (estado.id === fotoId && estado.url) return estado.url;
  return cache.get(fotoId) ?? null;
}

export function inicialDe(nome: string): string {
  const primeira = [...nome.trim()][0];
  return primeira ? primeira.toLocaleUpperCase('pt-BR') : '?';
}

export function FotoProduto({
  fotoId,
  nome,
  corGrupo,
  tamanho,
  raio = 16,
  opacidade = 1,
  rotulo = true,
  estilo,
}: {
  fotoId: number | null;
  nome: string;
  corGrupo: string;
  tamanho?: number;
  raio?: number;
  opacidade?: number;
  rotulo?: boolean;
  estilo?: CSSProperties;
}) {
  const url = useFotoUrl(fotoId);
  const base: CSSProperties = {
    width: tamanho ?? '100%',
    borderRadius: raio,
    opacity: opacidade,
    ...estilo,
  };
  const descricao = rotulo ? `Foto de ${nome || 'produto'}` : undefined;
  if (url) {
    return (
      <div className="foto" style={base}>
        <img src={url} alt={descricao ?? ''} draggable={false} />
      </div>
    );
  }
  return (
    <div className="foto" style={{ ...base, background: corGrupo }} role={descricao ? 'img' : undefined} aria-label={descricao}>
      <div
        className="foto-inicial"
        aria-hidden="true"
        style={{ color: corSobre(corGrupo), fontSize: tamanho ? Math.round(tamanho * 0.5) : '50cqw' }}
      >
        {inicialDe(nome)}
      </div>
    </div>
  );
}
