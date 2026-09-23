import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "PMS-Panalbit",
  description: "PMS-Panalbit — Plataforma de gestión de droguería comunal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
