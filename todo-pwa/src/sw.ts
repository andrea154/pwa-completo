/// <reference lib="webworker" />
// Service worker propio. vite-plugin-pwa lo compila y le inyecta self.__WB_MANIFEST.
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

declare let self: ServiceWorkerGlobalScope;

// 1) Precache del "app shell": HTML, JS, CSS e íconos generados por Vite
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// 2) SPA offline: cualquier navegación (/dashboard, /register…) responde con index.html
// let allowlist: RegExp[] | undefined;
if (import.meta.env.PROD){
  registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));
}


// 3) Google Fonts: se guardan en caché la primera vez para que funcionen offline
registerRoute(
  ({ url }) => url.origin === "https://fonts.googleapis.com" || url.origin === "https://fonts.gstatic.com",
  new CacheFirst({ cacheName: "google-fonts" })
);

// 4) Actualización: el aviso "Nueva versión" (PwaUpdater) manda este mensaje
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});

// 5) Notificaciones push: el backend manda { title, body, url, tag }
type PushPayload = { title?: string; body?: string; url?: string; tag?: string };

self.addEventListener("push", (event) => {
  let data: PushPayload = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? "To-Do PWA", {
      body: data.body ?? "",
      icon: "/icons/icon192x192.png",
      tag: data.tag, // misma tag = reemplaza la notificación anterior en vez de apilar
      data: { url: data.url ?? "/dashboard" },
    })
  );
});

// 6) Al tocar la notificación: enfocar la app si ya está abierta, o abrirla
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url ?? "/dashboard", self.location.origin).href;

  event.waitUntil(
    (async () => {
      const windows = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })) as WindowClient[];
      const existing = windows.find((w) => new URL(w.url).origin === self.location.origin);
      if (existing) {
        await existing.focus();
        if (existing.url !== url) await existing.navigate(url).catch(() => undefined);
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});