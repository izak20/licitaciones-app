import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "CORSABER Droguería",
  description: "Sistema de gestión de droguería comunal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
