import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method !== "GET") return json({ status: "error", message: "Method not allowed" }, 405);

  const started = performance.now();
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return json({ status: "error", checks: { config: false } }, 503);

    const supabase = createClient(url, key);
    const dbStarted = performance.now();
    const { error: dbError } = await supabase.from("profiles").select("id", { head: true, count: "exact" }).limit(1);
    const dbMs = Math.round(performance.now() - dbStarted);
    if (dbError) return json({ status: "error", checks: { database: false, queue: false, provider: false }, latency_ms: Math.round(performance.now() - started) }, 503);

    const [{ count: activeProviders }, { count: queuedJobs }, { count: stuckJobs }] = await Promise.all([
      supabase.from("providers").select("id", { head: true, count: "exact" }).eq("status", "ACTIVE"),
      supabase.from("order_queue").select("id", { head: true, count: "exact" }).in("status", ["QUEUED", "FAILED"]),
      supabase.from("order_queue").select("id", { head: true, count: "exact" }).eq("status", "PROCESSING").lt("locked_at", new Date(Date.now() - 10 * 60 * 1000).toISOString()),
    ]);

    const queueOk = (stuckJobs ?? 0) === 0;
    const providerOk = (activeProviders ?? 0) > 0;
    const ok = queueOk && providerOk;

    return json({
      status: ok ? "ok" : "degraded",
      checks: { database: true, queue: queueOk, provider: providerOk },
      latency_ms: Math.round(performance.now() - started),
      database_latency_ms: dbMs,
      queue: { pending: queuedJobs ?? 0, stuck: stuckJobs ?? 0 },
    }, ok ? 200 : 503);
  } catch {
    return json({ status: "error", checks: { database: false, queue: false, provider: false } }, 503);
  }
});
