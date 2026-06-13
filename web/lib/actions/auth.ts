"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const locale = (formData.get("locale") as string) || "en";
  const prefix = locale === "fr" ? "/fr" : "";

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return redirect(`${prefix}/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`${prefix}/app`);
}

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const locale = (formData.get("locale") as string) || "en";
  const prefix = locale === "fr" ? "/fr" : "";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });
  if (error) {
    return redirect(`${prefix}/signup?error=${encodeURIComponent(error.message)}`);
  }
  redirect(`${prefix}/app`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function signInWithGoogle(locale: string) {
  const supabase = await createClient();
  const prefix = locale === "fr" ? "/fr" : "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${prefix}/app`,
    },
  });
  if (error || !data.url) return;
  redirect(data.url);
}
