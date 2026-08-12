import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);
    const limit = Math.min(Math.max(Number((await req.json().catch(() => ({}))).limit ?? 50), 1), 100);
    const { data: orders, error } = await supabase.rpc("claim_orders_for_status_sync", { p_limit: limit });
    if (error) return json({ success: false, message: error.message }, 500);
    const results = [];
    for (const order of orders ?? []) {
      try {
        if (!order.provider_order_id || !order.provider_id) throw new Error("Provider mapping missing");
        const resp = await fetch(`${url}/functions/v1/provider-api`, { method: "POST", headers: { "Content-Type": "application/json", "X-Internal-Key": key }, body: JSON.stringify({ action: "sync_order", providerId: order.provider_id, orderId: order.id, providerOrderId: order.provider_order_id }) });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok || !result.success) throw new Error(result.message ?? "Status sync failed");
        await supabase.rpc("complete_order_status_sync", { p_order_id: order.id, p_status: result.status });
        results.push({ orderId: order.id, status: result.status });
      } catch (err) {
        await supabase.rpc("fail_order_status_sync", { p_order_id: order.id, p_error: err instanceof Error ? err.message : "Unknown error" });
        results.push({ orderId: order.id, status: "retry_later", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }
    return json({ success: true, processed: results.length, results });
  } catch (err) { return json({ success: false, message: err instanceof Error ? err.message : "Internal server error" }, 500); }
});
