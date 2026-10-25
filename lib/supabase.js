/**
 * The Supabase client, or null when the app has not been given a project.
 *
 * Peques works fully without it: everything is kept in the browser instead.
 * That matters for the static build — if the keys are missing at build time,
 * the app degrades to local storage rather than breaking.
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      })
    : null;

export const hasBackend = Boolean(supabase);

/**
 * A user id without a login. Called the first time someone saves something,
 * never on page load — nobody gets an account just for looking.
 */
export async function ensureUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user;
  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return created.user;
}

/** Attach an email to the anonymous account, so the data survives this browser. */
export async function keepWithEmail(email) {
  if (!supabase) throw new Error("no backend");
  await ensureUser();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
}
