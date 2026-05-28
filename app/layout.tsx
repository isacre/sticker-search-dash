import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sticker Search",
  description: "Busca e navegação de stickers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex h-full min-h-0 flex-col bg-white text-zinc-900">
        {children}
      </body>
    </html>
  );
}
