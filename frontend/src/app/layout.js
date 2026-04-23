import './globals.css';

export const metadata = {
  title: 'Clínica Veterinaria — BDA Corte 3',
  description: 'Sistema con RLS, hardening SQL y caché Redis',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}