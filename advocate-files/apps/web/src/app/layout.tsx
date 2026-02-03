import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Advocate - IEP Meeting Preparation Tool',
  description: 'Prepare for your IEP meetings with AI-powered meeting preparation materials',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
