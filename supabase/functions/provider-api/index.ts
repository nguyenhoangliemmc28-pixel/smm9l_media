import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

  if (!resp.ok) {
    return { error: `Provider returned ${resp.status}` };
  }

  const text = await resp.text();
  try {
    return JSON.parse(text) as ProviderResponse;
  } catch {
    return { error: "Invalid response from provider" };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const supabase = createClient(supabaseUrl, serviceKey);

    const { action, providerId } = await req.json();

    // Fetch provider details
    const { data: provider, error: provErr } = await supabase
      .from("providers")
      .select("*")
      .eq("id", providerId)
      .single();

    if (provErr || !provider) {
      return new Response(JSON.stringify({ success: false, message: "Provider not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    switch (action) {
      case "test": {
        const result = await callProviderApi(provider.api_url, provider.api_key, "balance");
        if (result.error) {
          return new Response(JSON.stringify({ success: false, message: result.error }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        return new Response(JSON.stringify({
          success: true,
          balance: result.balance,
          message: `Kết nối thành công. Số dư: ${result.balance ?? "N/A"}`,
        }), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      case "import": {
        const result = await callProviderApi(provider.api_url, provider.api_key, "services");
        if (result.error || !result.services) {
          return new Response(JSON.stringify({ success: false, message: result.error ?? "No services returned" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { data, error } = await supabase.rpc("admin_import_provider_services", {
          p_provider_id: providerId,
          p_services: result.services,
        });

        if (error) {
          return new Response(JSON.stringify({ success: false, message: error.message }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "sync_prices": {
        const result = await callProviderApi(provider.api_url, provider.api_key, "services");
        if (result.error || !result.services) {
          return new Response(JSON.stringify({ success: false, message: result.error ?? "No services returned" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const { data, error } = await supabase.rpc("admin_sync_provider_prices", {
          p_provider_id: providerId,
          p_prices: result.services,
        });

        if (error) {
          return new Response(JSON.stringify({ success: false, message: error.message }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "place_order": {
        const { serviceId, link, quantity, orderId } = await req.json();

        // Get the service to find provider_service_id
        const { data: service } = await supabase
          .from("services")
          .select("provider_service_id")
          .eq("id", serviceId)
          .single();

        if (!service) {
          return new Response(JSON.stringify({ success: false, message: "Service not found" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const result = await callProviderApi(provider.api_url, provider.api_key, "add", {
          service: service.provider_service_id,
          link,
          quantity,
        });

        if (result.error || (!result.order && !result.order_id)) {
          // Mark order as failed and refund
          await supabase.rpc("update_order_from_provider", {
            p_order_id: orderId,
            p_status: "FAILED",
          });
          return new Response(JSON.stringify({ success: false, message: result.error ?? "Order failed" }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const providerOrderId = result.order ?? result.order_id ?? "";
        const cost = result.charge ? Number(result.charge) : 0;

        await supabase.rpc("set_order_provider_id", {
          p_order_id: orderId,
          p_provider_order_id: providerOrderId,
          p_cost: cost,
        });

        return new Response(JSON.stringify({ success: true, providerOrderId }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "sync_order": {
        const { providerOrderId, orderId } = await req.json();
        const result = await callProviderApi(provider.api_url, provider.api_key, "status", {
          order: providerOrderId,
        });

        if (result.error) {
          return new Response(JSON.stringify({ success: false, message: result.error }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Map provider status to our status
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

        const mappedStatus = statusMap[result.status ?? ""] ?? "PROCESSING";

        await supabase.rpc("update_order_from_provider", {
          p_order_id: orderId,
          p_status: mappedStatus,
          p_start_count: result.start_count ?? null,
          p_current_count: result.current_count ?? null,
          p_remains: result.remains ?? null,
        });

        return new Response(JSON.stringify({ success: true, status: mappedStatus }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "refill": {
        const { providerOrderId } = await req.json();
        const result = await callProviderApi(provider.api_url, provider.api_key, "refill", {
          order: providerOrderId,
        });

        if (result.error) {
          return new Response(JSON.stringify({ success: false, message: result.error }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "cancel": {
        const { providerOrderId } = await req.json();
        const result = await callProviderApi(provider.api_url, provider.api_key, "cancel", {
          order: providerOrderId,
        });

        if (result.error) {
          return new Response(JSON.stringify({ success: false, message: result.error }), {
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        return new Response(JSON.stringify({ success: false, message: "Unknown action" }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
