import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { getMyRoles } from "@/lib/admin-access.functions";

export type AppRole = "admin" | "kitchen" | "cashier";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // CRITICAL: listener FIRST, then getSession (avoids race)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { session, user, loading };
}

export function useUserRoles(userId: string | null | undefined) {
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const loadMyRoles = useServerFn(getMyRoles);

  useEffect(() => {
    if (!userId) {
      setRoles([]);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    loadMyRoles()
      .then(({ roles: data }) => {
        if (!active) return;
        setRoles((data ?? []).map((role) => role as AppRole));
        setLoading(false);
      })
      .catch((error) => {
        if (!active) return;
        console.error("[roles] load failed", error);
        setRoles([]);
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadMyRoles, userId]);

  return {
    roles,
    loading,
    hasRole: (r: AppRole) => roles.includes(r),
    hasAnyRole: (rs: AppRole[]) => rs.some((r) => roles.includes(r)),
  };
}
