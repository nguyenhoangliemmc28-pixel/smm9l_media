import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch all orders that are PENDING or PROCESSING and have a provider_order_id
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select("id, provider_order_id, service_id")
      .in("status", ["PENDING", "PROCESSING"])
      .not("provider_order_id", "is", null)
      .is("deleted_at", null)
      .limit(100);

    if (ordersErr || !orders) {
      return new Response(JSON.stringify({ success: false, message: ordersErr?.message }), {
        status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (orders.length === 0) {
      return new Response(JSON.stringify({ success: true, synced: 0, message: "No orders to sync" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Group orders by provider
    const providerOrderMap: Record<string, Array<{ orderId: string; providerOrderId: string }>> = {};

    for (const order of orders) {
      const { data: service } = await supabase
        .from("services")
        .select("provider_id")
        .eq("id", order.service_id)
        .single();

      if (service?.provider_id) {
        if (!providerOrderMap[service.provider_id]) {
          providerOrderMap[service.provider_id] = [];
        }
        providerOrderMap[service.provider_id].push({
          orderId: order.id,
          providerOrderId: order.provider_order_id,
        });
      }
    }

    let syncedCount = 0;

    for (const [providerId, providerOrders] of Object.entries(providerOrderMap)) {
      // Fetch provider details
      const { data: provider } = await supabase
        .from("providers")
        .select("api_url, api_key, status")
        .eq("id", providerId)
        .single();

      if (!provider || provider.status !== "ACTIVE") continue;

      for (const { orderId, providerOrderId } of providerOrders) {
        try {
          // Call provider status API
          const body = new URLSearchParams({
            key: provider.api_key,
            action: "status",
            order: providerOrderId,
          });

          const resp = await fetch(provider.api_url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: body.toString(),
          });

          if (!resp.ok) continue;

          const result = await resp.json();

          const statusMap: Record<string, string> = {
            "Pending": "PENDING",
            "In progress": "PROCESSING",
            "Processing": "PROCESSING",
            "Completed": "COMPLETED",
            "Partial": "PARTIAL",
            "Canceled": "CANCELED",
            "Cancelled": "CANCELED",
            "Failed": "FAILED",
          };

          const mappedStatus = statusMap[result.status] ?? "PROCESSING";

          await supabase.rpc("update_order_from_provider", {
            p_order_id: orderId,
            p_status: mappedStatus,
            p_start_count: result.start_count ?? null,
            p_current_count: result.current_count ?? null,
            p_remains: result.remains ?? null,
          });

          syncedCount++;
        } catch {
          // Skip failed individual order sync
        }
      }
    }

    return new Response(JSON.stringify({ success: true, synced: syncedCount }), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
