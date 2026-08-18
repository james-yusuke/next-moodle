import type { MetadataRoute } from "next";

import { readAppRuntimeConfig } from "@/lib/app-config";

export default function manifest(): MetadataRoute.Manifest {
  const { appName } = readAppRuntimeConfig();
  return {
    name: appName,
    short_name: appName,
    description: "Moodleの学習情報を整える、静かな学習コックピット。",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#0d0d0c",
    theme_color: "#0d0d0c",
    lang: "ja",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
