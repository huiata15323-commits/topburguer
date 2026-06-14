import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import { z } from "zod";

const search = z.object({
  n: z.coerce.number().int().positive().max(999).optional().catch(undefined),
});

export const Route = createFileRoute("/m")({
  validateSearch: search,
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const raw = url.searchParams.get("n");
        const n = Number(raw);
        const target = Number.isInteger(n) && n > 0 && n <= 999 ? `/order?mesa=${n}` : "/order";
        return Response.redirect(target, 302);
      },
    },
  },
  component: MesaRedirectPage,
});

function MesaRedirectPage() {
  const navigate = useNavigate({ from: "/m" });
  const { n } = useSearch({ from: "/m" });

  useEffect(() => {
    void navigate({
      to: "/order",
      search: n ? { mesa: n } : {},
      replace: true,
    });
  }, [navigate, n]);

  return null;
}