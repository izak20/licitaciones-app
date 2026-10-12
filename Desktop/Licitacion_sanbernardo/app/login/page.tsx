import { login } from "./actions";

// Antes esta pantalla era HTML sin ningún estilo (logo de 64×64,
// formulario crudo): el usuario pidió un logo más grande y claro, un
// fondo con la foto real del edificio municipal (difuminada, para que
// siga leyéndose todo encima) y una explicación de qué significa
// "PMS" junto al nombre de la plataforma.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "#2D3E4F",
      }}
    >
      <img
        src="/fondo-municipalidad.jpeg"
        alt=""
        style={{
          position: "absolute",
          inset: -16,
          width: "calc(100% + 32px)",
          height: "calc(100% + 32px)",
          objectFit: "cover",
          filter: "blur(7px)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(158deg, rgba(45,62,79,0.90) 0%, rgba(63,84,104,0.86) 62%, rgba(10,59,101,0.92) 100%)",
          zIndex: 1,
        }}
      />
      <main
        style={{
          position: "relative",
          zIndex: 2,
          width: "100%",
          maxWidth: 380,
          background: "#fff",
          borderRadius: 12,
          padding: "36px 32px",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28 }}>
          <img
            src="/logo-sanbernardo.jpg"
            alt="Ilustre Municipalidad de San Bernardo"
            style={{ height: 52, width: "auto", objectFit: "contain", flexShrink: 0 }}
          />
          <div style={{ width: 1, height: 38, background: "#e2e5ea" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.01em", color: "#1a1a1a" }}>
              PMS <span style={{ fontWeight: 400, color: "#5b6572" }}>· Panalbit</span>
            </div>
            <div style={{ fontSize: 11.5, color: "#7a8492", marginTop: 2 }}>
              Pharmacy Management System
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.01em", margin: "0 0 6px" }}>
          Ingresar
        </h1>
        <p style={{ color: "#5b6572", fontSize: 13.5, margin: "0 0 24px", lineHeight: 1.5 }}>
          Plataforma de gestión de droguería comunal — Salud San Bernardo
        </p>

        <form action={login} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label htmlFor="email" style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>
              Correo
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoFocus
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                border: "1px solid #d0d3d9",
                borderRadius: 6,
                fontSize: 14,
              }}
            />
          </div>
          <div>
            <label htmlFor="password" style={{ fontSize: 13, fontWeight: 600, display: "block", marginBottom: 5 }}>
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              style={{
                width: "100%",
                height: 40,
                padding: "0 12px",
                border: "1px solid #d0d3d9",
                borderRadius: 6,
                fontSize: 14,
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              height: 42,
              border: "none",
              borderRadius: 6,
              background: "#115B99",
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              marginTop: 4,
            }}
          >
            Ingresar
          </button>
        </form>

        {params.error && (
          <p
            style={{
              color: "#b91c1c",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              borderRadius: 6,
              padding: "10px 12px",
              fontSize: 13.5,
              marginTop: 18,
              marginBottom: 0,
            }}
          >
            {params.error}
          </p>
        )}
      </main>
    </div>
  );
}
