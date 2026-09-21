import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service role key (sección 4): solo para crear usuarios en
// auth.users desde una Route Handler. Nunca se expone al cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
