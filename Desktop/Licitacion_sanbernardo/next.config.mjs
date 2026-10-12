/** @type {import('next').NextConfig} */
const nextConfig = {
  // sistema.html es el frontend real completo, servido como estático
  // desde /public y actualizado seguido. Next.js lo sirve con
  // Cache-Control: public, max-age=0 por defecto, que depende de que
  // el navegador revalide con ETag en cada carga — en la práctica,
  // algunos navegadores/proxies igual sirven una copia vieja en un
  // refresh normal. Se fuerza no-store para que cada carga traiga
  // siempre la versión real, sin tener que depender de un hard
  // refresh después de cada despliegue.
  async headers() {
    return [
      {
        source: "/sistema.html",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
