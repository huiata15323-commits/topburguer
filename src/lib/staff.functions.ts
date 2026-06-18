// Operações de equipe (cozinha/admin) que precisam burlar restrições do anon.
// Usam o cliente admin (service role) dentro do handler para nunca vazar a chave.
// Em produção real, troque o STAFF_PIN por Supabase Auth + tabela user_roles.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PIN_BY_ROLE: Record<string, string> = {
  admin: "9999",
  cozinha: "2113",
  caixa: "4554",
};

function assertStaff(pin: string, allowed: ReadonlyArray<keyof typeof PIN_BY_ROLE>) {
  const role = (Object.keys(PIN_BY_ROLE) as Array<keyof typeof PIN_BY_ROLE>).find(
    (r) => PIN_BY_ROLE[r] === pin
  );
  if (!role || !allowed.includes(role)) {
    throw new Error("Acesso negado: PIN inválido.");
  }
  return role;
}

const StatusInput = z.object({
  pin: z.string().min(1).max(16),
  id: z.string().uuid(),
  status: z.enum(["pending", "preparing", "done"]),
});

export const staffUpdateStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data }) => {
    assertStaff(data.pin, ["admin", "cozinha", "caixa"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: { status: string; done_at?: string | null } = { status: data.status };
    if (data.status === "done") patch.done_at = new Date().toISOString();
    if (data.status !== "done") patch.done_at = null;
    const { error } = await supabaseAdmin.from("orders").update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

const ClearInput = z.object({
  pin: z.string().min(1).max(16),
  scope: z.enum(["done", "all"]),
});

export const staffClearOrders = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ClearInput.parse(input))
  .handler(async ({ data }) => {
    assertStaff(data.pin, data.scope === "all" ? ["admin"] : ["admin", "cozinha", "caixa"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = supabaseAdmin.from("orders").delete();
    const { error } =
      data.scope === "done"
        ? await q.eq("status", "done")
        : await q.neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });
