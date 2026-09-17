import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main style={{ maxWidth: 360, margin: "80px auto" }}>
      <h1>Ingresar</h1>
      <p style={{ color: "#555", fontSize: 14 }}>
        Sistema de Gestión de Droguería Comunal
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
