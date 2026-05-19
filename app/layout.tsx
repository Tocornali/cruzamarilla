import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Farmacia Cruz Amarilla - Catálogo',
  description: 'Catálogo de productos y medicamentos de Farmacia Cruz Amarilla.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-background text-foreground font-sans antialiased selection:bg-primary selection:text-primary-foreground">
        {children}
      </body>
    </html>
  );
}
