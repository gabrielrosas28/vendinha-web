import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import opentype from 'opentype.js';
import sharp from 'sharp';

const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pasta = path.join(raiz, 'public', 'icones');
await mkdir(pasta, { recursive: true });

const fonte = opentype.parse((await readFile(path.join(raiz, 'public', 'fontes', 'nunito_black.ttf'))).buffer);

function caminhoTexto(texto, x, y, tamanho) {
  const escala = tamanho / fonte.unitsPerEm;
  const total = new opentype.Path();
  let cx = x;
  let anterior = null;
  for (const letra of texto) {
    const glifo = fonte.charToGlyph(letra);
    if (anterior) cx += fonte.getKerningValue(anterior, glifo) * escala;
    total.extend(glifo.getPath(cx, y, tamanho));
    cx += glifo.advanceWidth * escala;
    anterior = glifo;
  }
  return total;
}

function svg({ cheio = false, escala = 1 } = {}) {
  const tamanhoTexto = 150;
  const caminho = caminhoTexto('R$', 0, 0, tamanhoTexto);
  const caixa = caminho.getBoundingBox();
  const largura = caixa.x2 - caixa.x1;
  const altura = caixa.y2 - caixa.y1;
  const tx = 256 - largura / 2 - caixa.x1;
  const ty = 268 - altura / 2 - caixa.y1;
  const texto = caminhoTexto('R$', tx, ty, tamanhoTexto).toPathData(2);
  const miolo = `
    <g transform="translate(256 256) scale(${escala}) translate(-256 -256)">
      <rect x="86" y="164" width="340" height="230" rx="44" fill="#121831"/>
      <rect x="86" y="150" width="340" height="230" rx="44" fill="#1B2340"/>
      <path d="${texto}" fill="#7CF2B0"/>
      <circle cx="404" cy="150" r="58" fill="#D9A92B" stroke="#A67A0E" stroke-width="9"/>
      <circle cx="404" cy="150" r="36" fill="none" stroke="#A67A0E" stroke-opacity="0.5" stroke-width="5"/>
    </g>`;
  const fundo = cheio
    ? '<rect width="512" height="512" fill="#FF7A1A"/>'
    : '<rect width="512" height="512" rx="112" fill="#FF7A1A"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">${fundo}${miolo}</svg>`;
}

const normal = svg();
const maskable = svg({ cheio: true, escala: 0.78 });
await writeFile(path.join(pasta, 'icone.svg'), normal);
await sharp(Buffer.from(normal)).resize(192, 192).png().toFile(path.join(pasta, 'icone-192.png'));
await sharp(Buffer.from(normal)).resize(512, 512).png().toFile(path.join(pasta, 'icone-512.png'));
await sharp(Buffer.from(maskable)).resize(512, 512).png().toFile(path.join(pasta, 'icone-maskable-512.png'));
console.log('Ícones gerados em', pasta);
