import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import { nitro } from "nitro/vite";

const srcDir = fileURLToPath(new URL("./src", import.meta.url));
const securityHeaders = {
  "permissions-policy": "camera=(), geolocation=(), microphone=()",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "x-permitted-cross-domain-policies": "none",
};

export default defineConfig(({ command }) => ({
  css: { transformer: "lightningcss" },
  resolve: {
    tsconfigPaths: true,
    alias: { "@": srcDir },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  server: {
    host: true,
  },
  plugins: [
    tailwindcss(),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      server: { entry: "server" },
    }),
    // Nitro (the deploy adapter) only needs to run for production builds — it
    // targets Vercel's Build Output API (writes to .vercel/output).
    ...(command === "build"
      ? [
          nitro({
            preset: process.env.NITRO_PRESET ?? "vercel",
            routeRules: {
              "/**": { headers: securityHeaders },
              "/sw.js": {
                headers: { ...securityHeaders, "cache-control": "no-cache" },
              },
            },
          }),
        ]
      : []),
    viteReact(),
  ],
}));
