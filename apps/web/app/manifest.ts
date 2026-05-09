import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kumo — Pay when the signal disappears",
    short_name: "Kumo",
    description:
      "Offline-first companion for confidential USDC payments on Solana.",
    start_url: "/mobile",
    scope: "/mobile",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FAFCFF",
    theme_color: "#FAFCFF",
    icons: [
      {
        src: "/favicon-32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/state-00.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/state-00.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/state-00.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
