import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Internal-Key",
};

interface ProviderResponse {
  order?: string;
  order_id?: string;
  id?: string;
  status?: string;
  start_count?: number;
  current_count?: number;
  remains?: number;
  charge?: number;
  services?: Array<Record<string, unknown>>;
  balance?: number;
  error?: string;
}

async function callProviderApi(apiUrl: string, apiKey: string, action: string, params: Record<string, unknown> = {}): Promise<ProviderResponse> {
  const body = new URLSearchParams({ key: apiKey, action, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const resp = await fetch(apiUrl, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() });
  if (!resp.ok) return { error: `Provider returned ${resp.status}` };
  const text = await resp.text();
  try { return JSON.parse(text) as ProviderResponse; } catch { return { error: "Invalid response from provider" }; }
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json", ...corsHeaders } });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    const internalKey = req.headers.get("X-Internal-Key");
    const isInternalWorker = !!internalKey && internalKey === serviceKey;
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();

    let userId: string | null = null;
    let isAdmin = false;
    if (isInternalWorker) {
      isAdmin = true;
    } else {
      if (!token) return json({ success: false, message: "Unauthorized" }, 401);
      const { data: authData, error: authError } = await supabase.auth.getUser(token);
      if (authError || !authData.user) return json({ success: false, message: "Invalid session" }, 401);
      userId = authData.user.id;
      const { data: profile } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
      isAdmin = ["ADMIN", "SUPER_ADMIN", "admin", "super_admin"].includes(profile?.role ?? "");
    }

    const body = await req.json();
    const action = String(body.action ?? "");
    const providerId = String(body.providerId ?? "");
    if (!providerId) return json({ success: false, message: "Provider ID is required" }, 400);

    const adminActions = new Set(["test", "import", "sync_prices"]);
    if (adminActions.has(action) && !isAdmin) return json({ success: false, message: "Admin access required" }, 403);

    const { data: provider, error: provErr } = await supabase.from("providers").select("*").eq("id", providerId).eq("status", "ACTIVE").single();
    if (provErr || !provider) return json({ success: false, message: "Provider not found or inactive" }, 404);

    switch (action) {
      case "test": {
        const result = await callProviderApi(provider.api_url, provider.api_key, "balance");
        if (result.error) return json({ success: false, message: result.error });
        return json({ success: true, balance: result.balance, message: `Kết nối thành công. Số dư: ${result.balance ?? "N/A"}` });
      }
      case "import": {
        const result = await callProviderApi(provider.api_url, provider.api_key, "services");
        if (result.error || !result.services) return json({ success: false, message: result.error ?? "No services returned" });
        const { data, error } = await supabase.rpc("admin_import_provider_services", { p_provider_id: providerId, p_services: result.services });
        if (error) return json({ success: false, message: error.message });
        return json(data);
      }
      case "sync_prices": {
        const result = await callProviderApi(provider.api_url, provider.api_key, "services");
        if (result.error || !result.services) return json({ success: false, message: result.error ?? "No services returned" });
        const { data, error } = await supabase.rpc("admin_sync_provider_prices", { p_provider_id: providerId, p_prices: result.services });
        if (error) return json({ success: false, message: error.message });
        return json(data);
      }
      case "place_order": {
        const serviceId = String(body.serviceId ?? "");
        const link = String(body.link ?? "");
        const quantity = Number(body.quantity);
        const orderId = String(body.orderId ?? "");
        if (!serviceId || !link || !Number.isInteger(quantity) || quantity <= 0 || !orderId) return json({ success: false, message: "Invalid order payload" }, 400);
        const orderQuery = supabase.from("orders").select("id, user_id, service_id, provider_order_id, status").eq("id", orderId).eq("service_id", serviceId);
        const { data: order } = userId ? await orderQuery.eq("user_id", userId).maybeSingle() : await orderQuery.maybeSingle();
        if (!order) return json({ success: false, message: "Order not found" }, 404);
        if (order.provider_order_id) return json({ success: true, providerOrderId: order.provider_order_id });
        const { data: service } = await supabase.from("services").select("provider_service_id, provider_id").eq("id", serviceId).single();
        if (!service || service.provider_id !== providerId || !service.provider_service_id) return json({ success: false, message: "Service/provider mapping is invalid" }, 400);
        const result = await callProviderApi(provider.api_url, provider.api_key, "add", { service: service.provider_service_id, link, quantity });
        if (result.error || (!result.order && !result.order_id)) {
          await supabase.rpc("update_order_from_provider", { p_order_id: orderId, p_status: "FAILED" });
          return json({ success: false, message: result.error ?? "Order failed" });
        }
        const providerOrderId = String(result.order ?? result.order_id);
        const cost = result.charge ? Number(result.charge) : 0;
        await supabase.rpc("set_order_provider_id", { p_order_id: orderId, p_provider_order_id: providerOrderId, p_cost: cost });
        return json({ success: true, providerOrderId });
      }
      case "sync_order": {
        const providerOrderId = String(body.providerOrderId ?? "");
        const orderId = String(body.orderId ?? "");
        if (!providerOrderId || !orderId) return json({ success: false, message: "Invalid sync payload" }, 400);
        const orderQuery = supabase.from("orders").select("id, user_id, service_id, provider_order_id").eq("id", orderId);
        const { data: order } = userId ? await orderQuery.eq("user_id", userId).maybeSingle() : await orderQuery.maybeSingle();
        if (!order || order.provider_order_id !== providerOrderId) return json({ success: false, message: "Order not found" }, 404);
        const result = await callProviderApi(provider.api_url, provider.api_key, "status", { order: providerOrderId });
        if (result.error) return json({ success: false, message: result.error });
        const statusMap: Record<string, string> = { Pending: "PENDING", "In progress": "PROCESSING", Processing: "PROCESSING", Completed: "COMPLETED", Partial: "PARTIAL", Canceled: "CANCELED", Cancelled: "CANCELED", Failed: "FAILED" };
        const mappedStatus = statusMap[result.status ?? ""] ?? "PROCESSING";
        await supabase.rpc("update_order_from_provider", { p_order_id: orderId, p_status: mappedStatus, p_start_count: result.start_count ?? null, p_current_count: result.current_count ?? null, p_remains: result.remains ?? null });
        return json({ success: true, status: mappedStatus });
      }
      case "refill":
      case "cancel": {
        const providerOrderId = String(body.providerOrderId ?? "");
        if (!providerOrderId) return json({ success: false, message: "Provider order ID is required" }, 400);
        const ordersQuery = supabase.from("orders").select("id").eq("provider_order_id", providerOrderId).limit(1);
        const { data: orders } = userId ? await ordersQuery.eq("user_id", userId) : await ordersQuery;
        if (!orders?.length) return json({ success: false, message: "Order not found" }, 404);
        const result = await callProviderApi(provider.api_url, provider.api_key, action, { order: providerOrderId });
        if (result.error) return json({ success: false, message: result.error });
        return json({ success: true });
      }
      default:
        return json({ success: false, message: "Unknown action" }, 400);
    }
  } catch (err) {
    return json({ success: false, message: err instanceof Error ? err.message : "Internal server error" }, 500);
  }
});
