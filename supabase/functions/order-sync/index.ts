import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type ProviderOrder = Record<string, unknown>;

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

function mapStatus(status: unknown): string {
  const s = String(status ?? "").trim().toLowerCase();
  if (["completed", "complete", "done"].includes(s)) return "COMPLETED";
  if (["partial", "partially completed"].includes(s)) return "PARTIAL";
  if (["canceled", "cancelled", "cancel"].includes(s)) return "CANCELED";
  if (["failed", "fail", "error"].includes(s)) return "FAILED";
  if (["pending", "queued", "awaiting"].includes(s)) return "PENDING";
  return "PROCESSING";
}

function normalizeOrders(payload: unknown): ProviderOrder[] {
  if (Array.isArray(payload)) return payload.filter(v => v && typeof v === "object") as ProviderOrder[];
  if (!payload || typeof payload !== "object") return [];
  const p = payload as Record<string, unknown>;
  for (const key of ["orders", "data", "results", "items"]) {
    if (Array.isArray(p[key])) return p[key].filter(v => v && typeof v === "object") as ProviderOrder[];
  }
  return [];
}

async function callProvider(apiUrl: string, apiKey: string, action: string, params: Record<string, unknown> = {}) {
  const body = new URLSearchParams({
    key: apiKey,
    action,
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
  });
  const resp = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const text = await resp.text();
  let data: unknown;
  try { data = JSON.parse(text); } catch { data = { error: text || `Provider returned ${resp.status}` }; }
  return { ok: resp.ok, data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);

    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ success: false, message: "Unauthorized" }, 401);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ success: false, message: "Invalid session" }, 401);
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (!["ADMIN", "SUPER_ADMIN", "admin", "super_admin"].includes(profile?.role ?? "")) return json({ success: false, message: "Admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const providerId = String(body.providerId ?? "");
    const { data: providers, error: providerError } = providerId
      ? await supabase.from("providers").select("id,name,api_url,api_key,status").eq("id", providerId).eq("status", "ACTIVE").limit(1)
      : await supabase.from("providers").select("id,name,api_url,api_key,status").eq("status", "ACTIVE").limit(20);
    if (providerError) return json({ success: false, message: providerError.message }, 500);
    if (!providers?.length) return json({ success: false, message: "No active provider found" }, 404);

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const providerMessages: string[] = [];

    for (const provider of providers) {
      let providerImported = 0;
      let providerUpdated = 0;
      let totalPages = 0;

      for (let page = 1; page <= 20; page++) {
        const result = await callProvider(provider.api_url, provider.api_key, "orders", { page, limit: 100 });
        const orders = normalizeOrders(result.data);
        if (!result.ok || !orders.length) {
          if (page === 1) {
            const errorMessage = result.data && typeof result.data === "object" && "error" in result.data ? String((result.data as Record<string, unknown>).error) : "Provider did not return order history";
            providerMessages.push(`${provider.name}: ${errorMessage}`);
          }
          break;
        }
        totalPages = page;

        for (const item of orders) {
          const providerOrderId = String(item.order ?? item.order_id ?? item.id ?? "").trim();
          const providerServiceId = String(item.service ?? item.service_id ?? "").trim();
          if (!providerOrderId || !providerServiceId) { skipped++; continue; }

          const { data: service } = await supabase.from("services").select("id,provider_id,provider_service_id").eq("provider_id", provider.id).eq("provider_service_id", providerServiceId).maybeSingle();
          if (!service) { skipped++; continue; }

          const { data: existing } = await supabase.from("orders").select("id").eq("provider_id", provider.id).eq("provider_order_id", providerOrderId).maybeSingle();
          const status = mapStatus(item.status);
          const startCount = item.start_count == null ? null : Number(item.start_count);
          const currentCount = item.current_count == null ? null : Number(item.current_count);
          const remains = item.remains == null ? null : Number(item.remains);
          const quantity = Math.max(1, Number(item.quantity ?? item.qty ?? 1));
          const link = String(item.link ?? item.url ?? "");
          const providerCharge = Number(item.charge ?? item.cost ?? 0) || 0;
          const createdAt = item.created_at ? new Date(String(item.created_at)).toISOString() : undefined;

          if (existing) {
            await supabase.from("orders").update({ status, start_count: startCount, current_count: currentCount, remains, updated_at: new Date().toISOString() }).eq("id", existing.id);
            updated++; providerUpdated++;
          } else {
            const { data: adminProfile } = await supabase.from("profiles").select("id").in("role", ["SUPER_ADMIN", "ADMIN", "super_admin", "admin"]).limit(1).maybeSingle();
            const insertPayload: Record<string, unknown> = {
              user_id: adminProfile?.id ?? null,
              service_id: service.id,
              provider_id: provider.id,
              provider_order_id: providerOrderId,
              link,
              quantity,
              start_count: startCount,
              current_count: currentCount,
              remains,
              charge: providerCharge,
              cost: providerCharge,
              profit: 0,
              status,
              refill_status: "NONE",
              cancel_status: "NONE",
            };
            if (createdAt && !Number.isNaN(Date.parse(createdAt))) insertPayload.created_at = createdAt;
            const { error: insertError } = await supabase.from("orders").insert(insertPayload);
            if (insertError) { skipped++; continue; }
            imported++; providerImported++;
          }
        }

        if (orders.length < 100) break;
      }
      providerMessages.push(`${provider.name}: imported ${providerImported}, updated ${providerUpdated}, pages ${totalPages}`);
    }

    return json({ success: true, imported, updated, skipped, synced: imported + updated, message: providerMessages.join(" | ") });
  } catch (err) {
    return json({ success: false, message: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});