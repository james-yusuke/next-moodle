import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import { AppMotionProvider, ThemeProvider } from "@/components/ui";
import { readAppRuntimeConfig } from "@/lib/app-config";
import { THEME_BOOTSTRAP_SCRIPT } from "@/lib/theme";
import "./globals.css";

export function generateMetadata(): Metadata {
  const { appName } = readAppRuntimeConfig();
  return {
    applicationName: appName,
    title: { default: appName, template: `%s · ${appName}` },
    description: "Moodleの学習情報を整える、静かな学習コックピット。",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: appName,
    },
    formatDetection: { telephone: false },
  };
}

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
        <ThemeProvider><AppMotionProvider>{children}</AppMotionProvider></ThemeProvider>
      </body>
    </html>
  );
}
