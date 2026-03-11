import type { Metadata } from 'next';
import { Geist, Playfair_Display } from 'next/font/google';
import { Header } from '@/components/Header';
import './globals.css';

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const playfairDisplay = Playfair_Display({
  variable: '--font-playfair-display',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TTB Label Verifier',
  description: 'Label verification interface for ongoing design iteration.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${playfairDisplay.variable} overflow-x-hidden font-sans`}>
        <Header />
        {children}
      </body>
    </html>
  );
}
