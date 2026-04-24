import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Studio OS",
    short_name: "Studio OS",
    description:
      "The all-in-one workspace built for creative professionals. Manage projects, assets, clients, and your entire studio beautifully.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAFAF8",
    theme_color: "#3138AE",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
