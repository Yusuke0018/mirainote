import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ミライノート",
    short_name: "ミライノート",
    description: "タスクと時間の約束を一つにまとめる計画アプリ",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f7fb",
    theme_color: "#0f172a",
    icons: [
      {
        src: "/mirainote-icon.svg",
        sizes: "512x512",
        type: "image/svg+xml",
      },
    ],
  };
}
