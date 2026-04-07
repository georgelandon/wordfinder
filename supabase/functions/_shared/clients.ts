import { createClient } from "npm:@supabase/supabase-js@2";

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing environment variable ${name}`);
  }
  return value;
}

const supabaseUrl = requireEnv("SUPABASE_URL");
const supabaseAnonKey =
  Deno.env.get("SUPABASE_ANON_KEY") ??
  Deno.env.get("ANON_KEY") ??
  requireEnv("SUPABASE_ANON_KEY");
const supabaseServiceRoleKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
  Deno.env.get("SERVICE_ROLE_KEY") ??
  requireEnv("SUPABASE_SERVICE_ROLE_KEY");

export function createUserClient(authHeader: string | null) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: authHeader ? { Authorization: authHeader } : {}
    }
  });
}

export function createAdminClient() {
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}
