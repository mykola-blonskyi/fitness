import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Fitness',
  description: 'fitness.blonskyi.dev',
};

// Locale list is a placeholder until next-intl lands (FITNESS-11).
export async function generateStaticParams() {
  return [{ locale: 'en' }];
}

// Without this, any single-segment path not otherwise routed (e.g. a
// browser's automatic /sw.js or /robots.txt probe) matches [locale]
// dynamically and renders the full page tree instead of 404ing - which
// crashes here since pages assume a real, authenticated locale.
export const dynamicParams = false;

export default async function RootLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
