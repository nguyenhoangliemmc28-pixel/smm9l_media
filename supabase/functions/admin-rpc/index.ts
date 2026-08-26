import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ALLOWED_RPCS = new Set([
  "admin_fetch_providers", "admin_create_provider", "admin_update_provider", "admin_delete_provider",
  "admin_fetch_withdrawals", "admin_process_withdrawal", "admin_fetch_announcements", "admin_save_announcement", "admin_delete_announcement",
  "admin_fetch_coupons", "admin_save_coupon", "admin_delete_coupon", "admin_fetch_logs", "admin_fetch_orders_all", "admin_update_order",
  "admin_fetch_deposits_all", "admin_reject_deposit", "process_deposit", "admin_fetch_wallet_all", "admin_adjust_balance",
  "admin_fetch_users_full", "admin_update_user", "admin_delete_user", "admin_reset_password", "admin_fetch_services_all", "admin_save_service",
  "admin_delete_service", "admin_duplicate_service", "admin_fetch_categories_all", "admin_save_category", "admin_delete_category",
  "admin_fetch_tickets_all", "admin_reply_ticket", "admin_fetch_ticket_replies", "admin_update_ticket_status", "admin_fetch_settings_all",
  "admin_update_setting", "admin_delete_setting", "admin_broadcast_notification", "admin_fetch_stats", "admin_dashboard_overview",
  "admin_fetch_revenue_chart", "admin_fetch_service_distribution", "admin_fetch_affiliates", "admin_update_affiliate_commission",
  "admin_fetch_all_api_keys", "admin_revoke_api_key", "admin_import_provider_services", "admin_sync_provider_prices",
]);

const json = (data: unknown, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...corsHeaders },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ success: false, message: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !serviceKey) return json({ success: false, message: "Service unavailable" }, 503);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ success: false, message: "Unauthorized" }, 401);

    const supabase = createClient(url, serviceKey);
    const { data: authData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authData.user) return json({ success: false, message: "Unauthorized" }, 401);

    const { data: profile } = await supabase.from("profiles").select("role").eq("id", authData.user.id).maybeSingle();
    if (!profile || !["ADMIN", "SUPER_ADMIN"].includes(profile.role)) {
      return json({ success: false, message: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const rpc = typeof body.rpc === "string" ? body.rpc : "";
    const args = body.args && typeof body.args === "object" && !Array.isArray(body.args) ? body.args : {};
    if (!ALLOWED_RPCS.has(rpc)) return json({ success: false, message: "Unsupported admin operation" }, 400);

    const { data, error } = await supabase.rpc(rpc, args);
    if (error) return json({ success: false, message: "Admin operation failed" }, 400);
    return json({ success: true, data });
  } catch {
    return json({ success: false, message: "Internal server error" }, 500);
  }
});
