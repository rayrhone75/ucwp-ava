import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Ava - AI Sales Rep | U Choose We Print',
  description: 'Meet Ava, your AI-powered DTF printing assistant. Get instant answers about file preparation, pricing, turnaround times, and more.',
  icons: { icon: '/fallback-avatar.svg' },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

