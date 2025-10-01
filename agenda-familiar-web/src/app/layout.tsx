'use client';

import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import dynamic from 'next/dynamic';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Dynamically import AuthProvider to avoid SSR issues
const AuthProvider = dynamic(
  () => import("@/shared/contexts/AuthContext").then(mod => ({ default: mod.AuthProvider })),
  {
    ssr: false,
    loading: () => <div>Loading...</div>
  }
);

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <title>Agenda Familiar</title>
        <meta name="description" content="Aplicativo web para gerenciamento de tarefas familiares" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
