// Cupons e Happy Hour — persistidos em localStorage, sincronizados entre abas.
import { useCallback, useEffect, useState } from "react";

export type Coupon = { code: string; percentOff: number };
export type HappyHour = {
  enabled: boolean;
  startHour: number; // 0-23
  endHour: number;   // 0-23 (exclusivo)
  percentOff: number;
};
export type PromoConfig = { coupons: Coupon[]; happyHour: HappyHour };

const KEY = "fast-order:promos";
const CH = "fast-order:promos-channel";

const DEFAULT: PromoConfig = {
  coupons: [
    { code: "BURGUER10", percentOff: 10 },
    { code: "TOP15", percentOff: 15 },
  ],
  happyHour: { enabled: false, startHour: 15, endHour: 18, percentOff: 15 },
};

function read(): PromoConfig {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT;
    const p = JSON.parse(raw) as PromoConfig;
    return { coupons: p.coupons ?? [], happyHour: p.happyHour ?? DEFAULT.happyHour };
  } catch {
    return DEFAULT;
  }
}

function write(p: PromoConfig) {
  localStorage.setItem(KEY, JSON.stringify(p));
}

function bc(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  return new BroadcastChannel(CH);
}

export function isHappyHourActive(hh: HappyHour, now = new Date()): boolean {
  if (!hh.enabled) return false;
  const h = now.getHours();
  if (hh.startHour === hh.endHour) return false;
  if (hh.startHour < hh.endHour) return h >= hh.startHour && h < hh.endHour;
  // janela atravessa meia-noite
  return h >= hh.startHour || h < hh.endHour;
}

export function findCoupon(coupons: Coupon[], code: string): Coupon | null {
  const c = code.trim().toUpperCase();
  if (!c) return null;
  return coupons.find((x) => x.code.toUpperCase() === c) ?? null;
}

export function usePromos() {
  const [cfg, setCfg] = useState<PromoConfig>(DEFAULT);

  useEffect(() => {
    setCfg(read());
    const ch = bc();
    const onMsg = () => setCfg(read());
    ch?.addEventListener("message", onMsg);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setCfg(read());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      ch?.removeEventListener("message", onMsg);
      ch?.close();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const save = useCallback((next: PromoConfig) => {
    write(next);
    setCfg(next);
    const ch = bc();
    ch?.postMessage({ t: Date.now() });
    ch?.close();
  }, []);

  const addCoupon = useCallback(
    (c: Coupon) => {
      const cur = read();
      const code = c.code.trim().toUpperCase();
      if (!code) return;
      const exists = cur.coupons.some((x) => x.code.toUpperCase() === code);
      const next: PromoConfig = {
        ...cur,
        coupons: exists
          ? cur.coupons.map((x) => (x.code.toUpperCase() === code ? { code, percentOff: c.percentOff } : x))
          : [...cur.coupons, { code, percentOff: c.percentOff }],
      };
      save(next);
    },
    [save]
  );

  const removeCoupon = useCallback(
    (code: string) => {
      const cur = read();
      save({ ...cur, coupons: cur.coupons.filter((x) => x.code !== code) });
    },
    [save]
  );

  const setHappyHour = useCallback(
    (hh: HappyHour) => {
      const cur = read();
      save({ ...cur, happyHour: hh });
    },
    [save]
  );

  return { cfg, addCoupon, removeCoupon, setHappyHour, isHappyHourNow: isHappyHourActive(cfg.happyHour) };
}
