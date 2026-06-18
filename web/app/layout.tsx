import type { Metadata } from "next";
import { Source_Serif_4, Inter_Tight, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const sourceSerif4 = Source_Serif_4({
  variable: "--loaded-display",
  subsets: ["latin"],
  axes: ["opsz"],
  weight: "variable",
  style: ["normal", "italic"],
  display: "swap",
});

const interTight = Inter_Tight({
  variable: "--loaded-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--loaded-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "souffleur.co — Know your lines, not just recognise them",
  description:
    "A digital prompter for stage actors. Import a script, cast AI scene partners, and drill your lines until you're truly off book.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sourceSerif4.variable} ${interTight.variable} ${jetbrainsMono.variable}`}
      style={
        {
          "--font-display": "var(--loaded-display), 'Source Serif 4', Georgia, serif",
          "--font-body": "var(--loaded-body), 'Inter Tight', system-ui, sans-serif",
          "--font-mono": "var(--loaded-mono), 'JetBrains Mono', monospace",
        } as React.CSSProperties
      }
    >
      <body suppressHydrationWarning>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
