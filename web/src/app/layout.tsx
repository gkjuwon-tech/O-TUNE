import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/Providers";

export const metadata: Metadata = {
  title: "O'TUNE — Fine-tune open-source models on your data",
  description:
    "We benchmark base models for your domain, generate the training dataset, run the fine-tune, and hand you a private model. Pay half on start, half when it works.",
  metadataBase: new URL("https://otune.ai"),
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="grain">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
