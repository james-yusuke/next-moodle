import Script from "next/script";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppMotionProvider, Starfield, ThemeProvider } from "@/components/ui";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import { VIEW_TRANSITION_BOOTSTRAP_SCRIPT } from "@/lib/view-transition";
import "./globals.css";

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const config = readAppRuntimeConfig();
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable}`}
      data-scroll-behavior="smooth"
      data-theme="dark"
      lang={config.locale}
      suppressHydrationWarning
    >
      <body>
        <Script id="theme-bootstrap" strategy="beforeInteractive">
          {THEME_BOOTSTRAP_SCRIPT}
        </Script>
        <Script id="view-transition-bootstrap" strategy="beforeInteractive">
          {VIEW_TRANSITION_BOOTSTRAP_SCRIPT}
        </Script>
        <Starfield />
        <ThemeProvider><AppMotionProvider>{children}</AppMotionProvider></ThemeProvider>
      </body>
    </html>
  );
}
