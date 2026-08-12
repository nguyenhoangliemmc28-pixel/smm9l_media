import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(url, key);
    const limit = Math.min(Math.max(Number((await req.json().catch(() => ({}))).limit ?? 10), 1), 50);
    const { data: jobs, error } = await supabase.rpc("claim_order_queue_jobs", { p_limit: limit });
    if (error) return json({ success: false, message: error.message }, 500);
    const results = [];
    for (const job of jobs ?? []) {
      try {
        const { data: order } = await supabase.from("orders").select("id,user_id,service_id,link,quantity,provider_order_id,provider_id,status").eq("id", job.order_id).maybeSingle();
        if (!order) throw new Error("Order not found");
        if (order.provider_order_id) {
          await supabase.rpc("complete_order_queue_job", { p_job_id: job.id, p_result: "already_dispatched" });
          results.push({ orderId: order.id, status: "already_dispatched" });
          continue;
        }
        const { data: service } = await supabase.from("services").select("provider_id").eq("id", order.service_id).single();
        if (!service?.provider_id) throw new Error("No provider configured for service");
        const { data: provider } = await supabase.from("providers").select("id,status").eq("id", service.provider_id).eq("status", "ACTIVE").single();
        if (!provider) throw new Error("Provider unavailable");
        const fn = `${url}/functions/v1/provider-api`;
        const resp = await fetch(fn, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` }, body: JSON.stringify({ action: "place_order", providerId: provider.id, serviceId: order.service_id, orderId: order.id, link: order.link, quantity: order.quantity }) });
        const result = await resp.json().catch(() => ({}));
        if (!resp.ok || !result.success) throw new Error(result.message ?? "Provider dispatch failed");
        await supabase.rpc("complete_order_queue_job", { p_job_id: job.id, p_result: String(result.providerOrderId ?? "dispatched") });
        results.push({ orderId: order.id, status: "dispatched", providerOrderId: result.providerOrderId });
      } catch (err) {
        await supabase.rpc("fail_order_queue_job", { p_job_id: job.id, p_error: err instanceof Error ? err.message : "Unknown error" });
        results.push({ orderId: job.order_id, status: "retry_scheduled", error: err instanceof Error ? err.message : "Unknown error" });
      }
    }
    return json({ success: true, processed: results.length, results });
  } catch (err) { return json({ success: false, message: err instanceof Error ? err.message : "Internal server error" }, 500); }
});
