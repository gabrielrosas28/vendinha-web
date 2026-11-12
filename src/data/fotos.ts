export const LADO_MAX = 800;
export const ALVO_BYTES = 250_000;

export function recorteQuadrado(largura: number, altura: number): { sx: number; sy: number; lado: number; destino: number } {
  const lado = Math.min(largura, altura);
  return {
    sx: Math.floor((largura - lado) / 2),
    sy: Math.floor((altura - lado) / 2),
    lado,
    destino: Math.min(lado, LADO_MAX),
  };
}

function canvasParaBlob(canvas: HTMLCanvasElement, qualidade: number): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não gerou a imagem'))), 'image/jpeg', qualidade),
  );
}

export async function prepararFoto(fonte: CanvasImageSource, largura: number, altura: number): Promise<Blob> {
  if (largura <= 0 || altura <= 0) throw new Error('Imagem inválida');
  const r = recorteQuadrado(largura, altura);
  const canvas = document.createElement('canvas');
  canvas.width = r.destino;
  canvas.height = r.destino;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sem canvas');
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, r.destino, r.destino);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(fonte, r.sx, r.sy, r.lado, r.lado, 0, 0, r.destino, r.destino);
  let qualidade = 0.8;
  let blob = await canvasParaBlob(canvas, qualidade);
  while (blob.size > ALVO_BYTES && qualidade > 0.5) {
    qualidade -= 0.1;
    blob = await canvasParaBlob(canvas, qualidade);
  }
  return blob;
}

export async function prepararArquivo(arquivo: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' });
  try {
    return await prepararFoto(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}

export async function capturarVideo(video: HTMLVideoElement): Promise<Blob> {
  return prepararFoto(video, video.videoWidth, video.videoHeight);
}
