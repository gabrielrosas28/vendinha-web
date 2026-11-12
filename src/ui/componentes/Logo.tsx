export const URL_LOGO = `${import.meta.env.BASE_URL}logo_feirinha.webp`;

export function Logo({ largura = 520 }: { largura?: number }) {
  return (
    <img
      src={URL_LOGO}
      alt="Feirinha do Empreendedorismo: poupar, empreender, investir"
      width={1417}
      height={287}
      style={{ width: '100%', maxWidth: largura, height: 'auto' }}
      draggable={false}
    />
  );
}
