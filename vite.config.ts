import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, loadEnv, type Plugin } from "vite";
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

/**
 * Development-only: serves the gitignored Gym visual cache (.local-media/gymvisual) at /local-media/*
 * when VITE_LOCAL_MEDIA=gymvisual. `apply: "serve"` means this plugin does not exist in a build, and
 * nothing is ever copied into public/ or the output. The media is not licensed for distribution.
 */
function localMedia(env: Record<string, string>): Plugin {
  const cache = resolve(".local-media/gymvisual");
  const types: Record<string, string> = {
    ".gif": "image/gif",
    ".jpg": "image/jpeg",
    ".json": "application/json",
  };
  return {
    name: "vayvor-local-media",
    apply: "serve",
    configureServer(server) {
      if (env.VITE_LOCAL_MEDIA !== "gymvisual") return;
      server.middlewares.use("/local-media", (req, res, next) => {
        const url = decodeURIComponent((req.url ?? "/").split("?")[0]!);
        const file =
          url === "/index.json"
            ? resolve("catalogue/local-media-index.json")
            : url.startsWith("/gymvisual/")
              ? normalize(join(cache, url.slice("/gymvisual/".length)))
              : null;
        const inside =
          file &&
          (file === resolve("catalogue/local-media-index.json") || file.startsWith(cache + "/"));
        if (!file || !inside || !existsSync(file) || !statSync(file).isFile()) return next();
        res.setHeader("content-type", types[extname(file)] ?? "application/octet-stream");
        res.setHeader("cache-control", "no-store");
        createReadStream(file).pipe(res);
      });
    },
  };
}

export default defineConfig(({ command, mode }) => ({
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
    localMedia(loadEnv(mode, process.cwd(), "VITE_")),
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
