import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const APPROVED_ADMIN_EMAILS = [
  "huiata15323@go.docente.senai.br",
  "gisadora705@gmail.com",
  "samuel.silva307@aluno.educa.go.gov.",
  "samuel.silva307@aluno.educa.go.gov",
] as const;

export function normalizeAdminEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function isApprovedAdminEmail(email: string | null | undefined) {
  const normalized = normalizeAdminEmail(email);
  return APPROVED_ADMIN_EMAILS.some((approved) => approved === normalized);
}

export const ensureApprovedAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({}).parse(input ?? {}))
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error: userError } = await supabaseAdmin.auth.admin.getUserById(context.userId);

    if (userError || !data.user?.email) {
      throw new Error("Não foi possível validar sua conta. Saia e entre novamente.");
    }

    const email = normalizeAdminEmail(data.user.email);
    if (!isApprovedAdminEmail(email)) {
      throw new Error("Este email ainda não está liberado como administrador geral.");
    }

    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "admin" }, { onConflict: "user_id,role" });

    if (error) {
      throw new Error("Não foi possível liberar o administrador: " + error.message);
    }

    return { ok: true as const, email };
  });
