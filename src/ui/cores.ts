import type { Denominacao } from '../domain/dinheiro';

export const Cores = {
  fundo: '#F4F7FB',
  superficie: '#FFFFFF',
  tinta: '#1B2340',
  apoio: '#5A6280',
  linha: '#DCE2EC',
  laranja: '#FF7A1A',
  azul: '#2B6FFF',
  verde: '#0F9D6B',
  alertaTexto: '#8A3C00',
  alertaFundo: '#FFF1E5',
  erro: '#B42318',
  erroFundo: '#FDECEA',
  verdeTexto: '#0A7A52',
  azulTexto: '#1F56D6',
  visor: '#1B2340',
  visorNumero: '#7CF2B0',
  visorFalta: '#FFB4A8',
  visorRotulo: '#B7C0DA',
  grupos: ['#FF7A1A', '#2B6FFF', '#0F9D6B', '#8A3FFC', '#D6336C'] as const,
} as const;

export const NOMES_CORES = ['Laranja', 'Azul', 'Verde', 'Roxo', 'Rosa'] as const;

export function corGrupo(corIndex: number): string {
  const n = Cores.grupos.length;
  return Cores.grupos[((corIndex % n) + n) % n];
}

export function corSobre(cor: string): string {
  return cor.toUpperCase() === Cores.laranja ? Cores.tinta : '#FFFFFF';
}

export function misturar(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const canal = (x: number, y: number) => Math.round(x + (y - x) * t);
  const r = canal((pa >> 16) & 255, (pb >> 16) & 255);
  const g = canal((pa >> 8) & 255, (pb >> 8) & 255);
  const bl = canal(pa & 255, pb & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1).toUpperCase()}`;
}

export const CoresDinheiro = {
  cedula(d: Denominacao): string {
    switch (d.id) {
      case 'R200': return '#8D8072';
      case 'R100': return '#1E88C7';
      case 'R50': return '#B8732F';
      case 'R20': return '#F2B01E';
      case 'R10': return '#C8423B';
      case 'R5': return '#8B5BA8';
      case 'R2': return '#5B87A9';
      default: return '#808080';
    }
  },
  textoCedula(d: Denominacao): string {
    return d.id === 'R20' ? '#3A2A00' : '#FFFFFF';
  },
  ouro: '#D9A92B',
  ouroBorda: '#A67A0E',
  prata: '#C7CCD3',
  prataBorda: '#8E959F',
  cobre: '#C07A44',
  cobreBorda: '#8C5226',
};
