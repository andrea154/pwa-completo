import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Escribimos nuestro propio service worker (src/sw.ts) para poder manejar
      // notificaciones push. Workbox solo inyecta la lista de archivos a precachear.
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      // "prompt": cuando hay versión nueva mostramos un aviso (PwaUpdater.tsx)
      registerType: "prompt",
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        globIgnores: ["**/screenshots/**"], // no precachear capturas pesadas
      },
      manifest: {
        id: "/",
        name: "To-Do PWA",
        short_name: "To-Do",
        description: "Organiza tus tareas, con o sin conexión, y recibe recordatorios.",
        lang: "es-MX",
        start_url: "/",
        scope: "/",
        display: "standalone",
        // Igual al fondo de la app: evita el destello blanco al abrirla instalada
        background_color: "#121a2e",
        theme_color: "#121a2e",
        icons: [
          { src: "/icons/icon192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon512x512.png", sizes: "512x512", type: "image/png" },
          // Recomendado: genera un ícono "maskable" en https://maskable.app y descomenta:
          // { src: "/icons/maskable512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          {
            src: "/screenshots/captura2.png",
            sizes: "1280x720",
            type: "image/png",
            form_factor: "wide",
            label: "Lista de tareas en escritorio",
          },
          // Agrega una captura vertical (p. ej. 720x1280) con form_factor "narrow"
          // para que Android muestre el diálogo de instalación enriquecido.
        ],
      },
      devOptions: {
        enabled: true,
        type: "module", // necesario con injectManifest en desarrollo
      },
    }),
  ],
});