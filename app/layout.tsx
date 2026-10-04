import type { Metadata, Viewport } from 'next';
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google';
import { brand } from '@/lib/brand';
import './globals.css';

const ui = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '700'], variable: '--font-ui', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = { title: `${brand.name}`, description: 'Portafolio fotográfico de Ryōiki.', openGraph: { title: brand.name, description: 'Portafolio fotográfico.' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#050507', colorScheme: 'dark' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${ui.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
