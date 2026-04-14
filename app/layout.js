// app/layout.js
export const metadata = {
  title: "Ungrowth — Analizador de Perfiles",
  description: "Identifica oportunidades de crecimiento en perfiles de redes sociales",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body style={{ margin: 0, padding: 0, background: "#0a0a0a" }}>
        {children}
      </body>
    </html>
  );
}
