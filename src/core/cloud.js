import { createClient } from "@supabase/supabase-js";
const url = import.meta.env.VITE_SUPABASE_URL;
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;
export const cloudConfigured = Boolean(url && key);
let client;
export function cloudClient() {
  if (!cloudConfigured) return null;
  client ||= createClient(url, key, {
    auth: {
      flowType: "pkce",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}
export function progressService(userId) {
  const client = cloudClient();
  return {
    async load() {
      const { data, error } = await client
        .from("learning_progress")
        .select("progress,revision,updated_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (error)
        throw new Error("Cloud progress could not be loaded: " + error.message);
      return data;
    },
    async save(progress, revision) {
      const { data, error } = await client.rpc("save_learning_progress", {
        p_progress: progress,
        p_expected_revision: revision,
      });
      if (error) {
        const e = new Error(error.message);
        e.code = error.code === "40001" ? "conflict" : error.code;
        throw e;
      }
      if (!data?.[0]) throw new Error("The cloud did not confirm this save.");
      return data[0];
    },
  };
}
