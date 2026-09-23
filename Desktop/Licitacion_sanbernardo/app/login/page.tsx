import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "80px auto" }}>
      <img
        src="/logo.jpeg"
        alt="PMS-Panalbit"
        width={64}
        height={64}
        style={{ borderRadius: 8, marginBottom: 12 }}
      />
      <h1>PMS-Panalbit</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        Plataforma de gestión de droguería comunal
      </p>
      <form action={login}>
        <div>
          <label htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" required autoFocus />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" required />
        </div>
        <button type="submit">Ingresar</button>
      </form>
      {params.error && <p className="error">{params.error}</p>}
    </main>
  );
}
