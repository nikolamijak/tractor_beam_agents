import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ClientWrapper } from '@/components/ClientWrapper';
import { Navigation } from '@/components/Navigation';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Tractor Beam - AI Agent Orchestration',
  description: 'AI-powered SDLC management with DBOS orchestration',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Suppress Firefox + React 19 DevTools errors before React loads */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window !== 'undefined') {
                  const originalError = console.error;
                  console.error = function(...args) {
                    const errorStr = String(args[0] || '');
                    if (
                      errorStr.includes('__reactContextDevtoolDebugId') ||
                      errorStr.includes("can't access property") ||
                      errorStr.includes('_context is undefined')
                    ) {
                      return;
                    }
                    originalError.apply(console, args);
                  };
                }
              })();
            `,
          }}
        />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <Navigation />
        <ClientWrapper>{children}</ClientWrapper>
      </body>
    </html>
  );
}
