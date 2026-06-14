import { createFileRoute, Navigate } from "@tanstack/react-router";
import { z } from "zod";

const search = z.object({
  n: z.coerce.number().int().positive().max(999).optional().catch(undefined),
});

export const Route = createFileRoute("/m")({
  validateSearch: search,
  component: MesaRedirectPage,
});

function MesaRedirectPage() {
  const { n } = Route.useSearch();
  return <Navigate to="/order" search={n ? { mesa: n } : {}} replace />;
}
