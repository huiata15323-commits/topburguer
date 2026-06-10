// Service worker mínimo para exibir notificações de pedido pronto
// mesmo com a aba em segundo plano ou tela bloqueada.
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("message", (event) => {
  const data = event.data || {};
  if (data.type === "notify-order-ready") {
    const title = data.title || "🎉 Seu pedido está pronto!";
    const body = data.body || "Vai lá retirar — fresquinho!";
    self.registration.showNotification(title, {
      body,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: data.tag || "order-ready",
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      data: { url: data.url || "/" },
    });
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
