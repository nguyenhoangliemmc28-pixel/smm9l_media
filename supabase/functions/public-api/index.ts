import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/public-api/, "").replace(/^\/?/, "");
    const segments = path.split("/").filter(Boolean);

    // Extract API key from header
    const apiKey = req.headers.get("X-Api-Key") ?? req.headers.get("Authorization")?.replace("Bearer ", "");

    // Rate limiting: check API key validity
    let userId: string | null = null;
    if (apiKey) {
      const { data } = await supabase.rpc("validate_api_key", { p_key: apiKey });
      userId = data as string;
      if (!userId) {
        return new Response(JSON.stringify({ success: false, message: "Invalid or revoked API key" }), {
          status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Route: /services - list all active services (public, no auth needed)
    if (segments[0] === "services" && req.method === "GET") {
      const { data, error } = await supabase
        .from("services")
        .select("id, name, type, price, minimum, maximum, refill, cancel, average_time, estimated_time, category:categories(name)")
        .eq("status", true)
        .eq("visibility", true)
        .is("deleted_at", null)
        .order("sort_order");

      if (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // All remaining routes require authentication
    if (!userId) {
      return new Response(JSON.stringify({ success: false, message: "API key required. Pass via X-Api-Key header." }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Route: /balance - get user balance
    if (segments[0] === "balance" && req.method === "GET") {
      const { data, error } = await supabase
        .from("profiles")
        .select("balance")
        .eq("id", userId)
        .single();

      if (error) {
        return new Response(JSON.stringify({ success: false, message: error.message }), {
          status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      return new Response(JSON.stringify({ success: true, balance: data.balance }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Route: /orders - GET: list user orders, POST: create order
    if (segments[0] === "orders") {
      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("orders")
          .select("id, service_id, link, quantity, charge, status, start_count, current_count, remains, created_at, completed_at, service:services(name)")
          .eq("user_id", userId)
          .is("deleted_at", null)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) {
          return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (req.method === "POST") {
        const body = await req.json();
        const { service_id, link, quantity } = body;

        if (!service_id || !link || !quantity) {
          return new Response(JSON.stringify({ success: false, message: "Missing required fields: service_id, link, quantity" }), {
            status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        // Create order as this user
        const supabaseUser = createClient(supabaseUrl, serviceKey, {
          global: { headers: { Authorization: `Bearer ${req.headers.get("Authorization")}` } },
        });

        const { data, error } = await supabase.rpc("create_order", {
          p_service_id: service_id,
          p_link: link,
          p_quantity: quantity,
        });

        if (error) {
          return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    // Route: /orders/:id - GET: order detail, POST: refill/cancel
    if (segments[0] === "orders" && segments[1]) {
      const orderId = segments[1];

      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("orders")
          .select("*")
          .eq("id", orderId)
          .eq("user_id", userId)
          .single();

        if (error || !data) {
          return new Response(JSON.stringify({ success: false, message: "Order not found" }), {
            status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        return new Response(JSON.stringify({ success: true, data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (req.method === "POST" && segments[2] === "refill") {
        const { data, error } = await supabase.rpc("refill_order", { p_order_id: orderId });
        if (error) {
          return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      if (req.method === "POST" && segments[2] === "cancel") {
        const { data, error } = await supabase.rpc("cancel_order", { p_order_id: orderId });
        if (error) {
          return new Response(JSON.stringify({ success: false, message: error.message }), {
            status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }
        return new Response(JSON.stringify(data), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    return new Response(JSON.stringify({ success: false, message: "Endpoint not found" }), {
      status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
