// Utilitário client-only para notificações automáticas do pedido pronto.
// Usa Notification API + service worker (público /notify-sw.js) para que
// a notificação dispare mesmo com a aba em segundo plano / tela bloqueada.

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

export function getPermission(): PermissionState {
  if (typeof window === "undefined" || typeof Notification === "undefined") return "unsupported";
  return Notification.permission as PermissionState;
}

let swRegPromise: Promise<ServiceWorkerRegistration | null> | null = null;

export async function ensureServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return null;
  if (!swRegPromise) {
    swRegPromise = navigator.serviceWorker
      .register("/notify-sw.js", { scope: "/" })
      .then(async (reg) => {
        // Garante que está ativo antes de tentar postar mensagens
        if (reg.active) return reg;
        await new Promise<void>((resolve) => {
          const w = reg.installing || reg.waiting;
          if (!w) return resolve();
          w.addEventListener("statechange", () => {
            if (w.state === "activated") resolve();
          });
        });
        return reg;
      })
      .catch(() => null);
  }
  return swRegPromise;
}

export async function requestPermission(): Promise<PermissionState> {
  if (getPermission() === "unsupported") return "unsupported";
  try {
    const res = await Notification.requestPermission();
    if (res === "granted") await ensureServiceWorker();
    return res as PermissionState;
  } catch {
    return "denied";
  }
}

export async function notifyOrderReady(orderNumber: number) {
  if (getPermission() !== "granted") return false;
  const reg = await ensureServiceWorker();
  const payload = {
    type: "notify-order-ready",
    title: "🎉 Pedido pronto para retirada!",
    body: `Seu pedido #${orderNumber} já está fresquinho no balcão.`,
    tag: `order-${orderNumber}`,
    url: `/status?n=${orderNumber}`,
  };
  try {
    if (reg && reg.active) {
      reg.active.postMessage(payload);
    } else if (reg) {
      await reg.showNotification(payload.title, {
        body: payload.body,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        tag: payload.tag,
        requireInteraction: true,
      });
    } else {
      new Notification(payload.title, { body: payload.body, tag: payload.tag });
    }
    // Vibração extra no celular se a aba estiver visível
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate([200, 100, 200, 100, 200]); } catch { /* noop */ }
    }
    return true;
  } catch {
    return false;
  }
}
