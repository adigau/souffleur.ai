import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _admin: SupabaseClient<any> | null = null;

function resolveServiceKey(): string {
  // New Supabase format: SUPABASE_SECRET_KEYS is a JSON dict {"default": "<key>"}
  const secretKeys = process.env.SUPABASE_SECRET_KEYS;
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      if (parsed?.default) return parsed.default as string;
    } catch {}
  }
  // Conventional Next.js env var name (set manually in .env.local / Vercel)
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (key) return key;
  throw new Error(
    "Missing service role key — set SUPABASE_SECRET_KEYS or SUPABASE_SERVICE_ROLE_KEY"
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): SupabaseClient<any> {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  _admin = createClient(url, resolveServiceKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _admin;
}
