import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `context.supabase` is typed against the generated Database schema, which
 * this sandbox can't regenerate after adding new tables via migration (no
 * linked Supabase CLI / service-role DB access here). Cast to an untyped
 * client so `.from("some_new_table")` type-checks — RLS still enforces
 * access at runtime regardless of compile-time types.
 */
export function db(client: SupabaseClient<any>): SupabaseClient {
  return client as unknown as SupabaseClient;
}
