import type { DadosRelatorio } from '../data/relatorio';
import { resultado } from '../domain/contaCaixa';
import { formatar } from '../domain/dinheiro';
import { turmaGrupo } from '../domain/grupos';
import { Cores } from './cores';
import { dataHora, plural } from './formatos';
import { textoEstornadas } from './telas/FechamentoTelas';

const LARGURA = 640;
const ESCALA = 2;
const MARGEM = 24;
const INTERNA = LARGURA - 2 * MARGEM;
const ESTRELA = new Path2D('M12,17.27L18.18,21l-1.64,-7.03L22,9.24l-7.19,-0.61L12,2 9.19,8.63 2,9.24l5.46,4.73L5.82,21z');

function fonte(tamanho: number, peso: number): string {
  return `${peso} ${tamanho}px Nunito, "Segoe UI", sans-serif`;
}

function retanguloRedondo(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function quebrar(ctx: CanvasRenderingContext2D, texto: string, largura: number): string[] {
  const palavras = texto.split(/\s+/).filter(Boolean);
  const linhas: string[] = [];
  let atual = '';
  for (const p of palavras) {
    const teste = atual ? `${atual} ${p}` : p;
    if (ctx.measureText(teste).width <= largura || !atual) atual = teste;
    else {
      linhas.push(atual);
      atual = p;
    }
  }
  if (atual) linhas.push(atual);
  return linhas.length ? linhas : [''];
}

function paragrafo(
  ctx: CanvasRenderingContext2D,
  texto: string,
  x: number,
  y: number,
  largura: number,
  tamanho: number,
  peso: number,
  cor: string,
  alinhar: CanvasTextAlign = 'left',
): number {
  ctx.font = fonte(tamanho, peso);
  ctx.fillStyle = cor;
  ctx.textAlign = alinhar;
  ctx.textBaseline = 'alphabetic';
  const altura = Math.round(tamanho * 1.22);
  let yy = y;
  for (const linha of quebrar(ctx, texto, largura)) {
    const xx = alinhar === 'center' ? x + largura / 2 : alinhar === 'right' ? x + largura : x;
    ctx.fillText(linha, xx, yy + tamanho * 0.95);
    yy += altura;
  }
  return yy;
}

function desenhar(ctx: CanvasRenderingContext2D, d: DadosRelatorio, logo: HTMLImageElement | null): number {
  const f = d.fechamento;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, LARGURA, ctx.canvas.height / ESCALA);
  let y = MARGEM;
  const x = MARGEM;

  if (logo && logo.naturalWidth > 0) {
    const h = (INTERNA * logo.naturalHeight) / logo.naturalWidth;
    ctx.drawImage(logo, x, y, INTERNA, h);
    y += h + 14;
  }

  y = paragrafo(ctx, 'Relatório do caixa', x, y, INTERNA, 18, 700, Cores.apoio);
  y = paragrafo(ctx, f.nomeGrupo, x, y, INTERNA, 32, 900, Cores.tinta);
  y = paragrafo(ctx, turmaGrupo(f.turma, f.numeroGrupo), x, y, INTERNA, 20, 800, Cores.apoio);
  y = paragrafo(ctx, dataHora(f.data), x, y, INTERNA, 18, 700, Cores.apoio);
  y += 14;

  const alturaVisor = 14 + 25 + 54 + 23 + 14;
  ctx.fillStyle = Cores.visor;
  retanguloRedondo(ctx, x, y, INTERNA, alturaVisor, 20);
  ctx.fill();
  let yv = y + 14;
  yv = paragrafo(ctx, 'Total ganho', x + 20, yv, INTERNA - 40, 20, 800, Cores.visorRotulo);
  yv = paragrafo(ctx, formatar(f.totalCentavos), x + 20, yv, INTERNA - 40, 44, 900, Cores.visorNumero);
  paragrafo(ctx, plural(f.numVendas, 'venda', 'vendas'), x + 20, yv, INTERNA - 40, 18, 700, Cores.visorRotulo);
  y += alturaVisor + 14;

  if (d.campeao) {
    ctx.fillStyle = Cores.laranja;
    ctx.beginPath();
    ctx.arc(x + 22, y + 22, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(x + 22 - 13, y + 22 - 13);
    ctx.scale(26 / 24, 26 / 24);
    ctx.fillStyle = Cores.tinta;
    ctx.fill(ESTRELA);
    ctx.restore();
    const fim = paragrafo(ctx, `Campeão: ${d.campeao.nome} (${d.campeao.quantidade})`, x + 56, y + 10, INTERNA - 56, 20, 800, Cores.tinta);
    y = Math.max(y + 44, fim) + 14;
  }

  if (d.itens.length > 0) {
    const topo = y;
    const linhas: { y: number; h: number }[] = [];
    let yt = topo + 8;
    ctx.font = fonte(20, 800);
    for (const it of d.itens) {
      const nomes = quebrar(ctx, it.nome, INTERNA - 32 - 64 - 128 - 8);
      const h = 20 + nomes.length * 24;
      linhas.push({ y: yt, h });
      yt += h;
    }
    const alturaTabela = yt + 8 - topo;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = Cores.linha;
    ctx.lineWidth = 2;
    retanguloRedondo(ctx, x, topo, INTERNA, alturaTabela, 20);
    ctx.fill();
    ctx.stroke();
    d.itens.forEach((it, i) => {
      const l = linhas[i];
      if (i > 0) {
        ctx.fillStyle = Cores.linha;
        ctx.fillRect(x + 16, l.y, INTERNA - 32, 1);
      }
      paragrafo(ctx, it.nome, x + 16, l.y + 10, INTERNA - 32 - 64 - 128 - 8, 20, 800, Cores.tinta);
      paragrafo(ctx, `${it.quantidade}×`, x + INTERNA - 16 - 128 - 64, l.y + 10, 64, 20, 800, Cores.apoio, 'right');
      paragrafo(ctx, formatar(it.totalCentavos), x + INTERNA - 16 - 128, l.y + 10, 128, 20, 800, Cores.tinta, 'right');
    });
    y = topo + alturaTabela + 14;
  }

  const linhasConta: [string, string][] = [
    ['Troco inicial', formatar(f.trocoInicialCentavos)],
    ['Dinheiro esperado', formatar(d.esperadoCentavos)],
    ['Contado', f.contadoCentavos == null ? 'não contado' : formatar(f.contadoCentavos)],
  ];
  let resultadoTxt: [string, string] | null = null;
  if (f.contadoCentavos != null) {
    const dif = d.diferencaCentavos ?? 0;
    const r = resultado(dif);
    resultadoTxt =
      r === 'BATEU'
        ? ['Bateu certinho!', Cores.verdeTexto]
        : r === 'SOBROU'
          ? [`Sobrou ${formatar(dif)}`, Cores.azulTexto]
          : [`Faltou ${formatar(-dif)}`, Cores.erro];
  }
  const alturaConta = 16 + linhasConta.length * 26 + (resultadoTxt ? 28 : 0) + (d.numeroEstornadas > 0 ? 24 : 0) + 16;
  ctx.fillStyle = Cores.fundo;
  retanguloRedondo(ctx, x, y, INTERNA, alturaConta, 20);
  ctx.fill();
  let yc = y + 16;
  for (const [rot, val] of linhasConta) {
    paragrafo(ctx, rot, x + 16, yc, INTERNA - 32, 18, 700, Cores.apoio);
    paragrafo(ctx, val, x + 16, yc, INTERNA - 32, 20, 800, Cores.tinta, 'right');
    yc += 26;
  }
  if (resultadoTxt) {
    paragrafo(ctx, resultadoTxt[0], x + 16, yc + 2, INTERNA - 32, 20, 800, resultadoTxt[1]);
    yc += 28;
  }
  if (d.numeroEstornadas > 0) paragrafo(ctx, textoEstornadas(d.numeroEstornadas), x + 16, yc + 2, INTERNA - 32, 16, 700, Cores.apoio);
  y += alturaConta + 14;

  y = paragrafo(ctx, 'Vendinha · Colégio Santa Chiara · Aracaju-SE', x, y, INTERNA, 14, 700, Cores.apoio, 'center');
  y += MARGEM;

  ctx.strokeStyle = Cores.linha;
  ctx.lineWidth = 2;
  retanguloRedondo(ctx, 1, 1, LARGURA - 2, y - 2, 28);
  ctx.stroke();
  return y;
}

function carregarLogo(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export async function gerarPngRelatorio(d: DadosRelatorio, urlLogo: string): Promise<Blob> {
  await document.fonts?.ready;
  await Promise.all([document.fonts?.load(fonte(20, 700)), document.fonts?.load(fonte(20, 800)), document.fonts?.load(fonte(20, 900))]).catch(
    () => undefined,
  );
  const logo = await carregarLogo(urlLogo);

  const rascunho = document.createElement('canvas');
  rascunho.width = LARGURA * ESCALA;
  rascunho.height = 4000 * ESCALA;
  const r = rascunho.getContext('2d');
  if (!r) throw new Error('Sem canvas');
  r.scale(ESCALA, ESCALA);
  const altura = Math.ceil(desenhar(r, d, logo));

  const canvas = document.createElement('canvas');
  canvas.width = LARGURA * ESCALA;
  canvas.height = altura * ESCALA;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Sem canvas');
  ctx.scale(ESCALA, ESCALA);
  desenhar(ctx, d, logo);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não gerou a imagem'))), 'image/png'));
}
