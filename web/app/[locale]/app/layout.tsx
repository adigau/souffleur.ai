import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const initial = (user.user_metadata?.full_name as string | undefined)
    ?.charAt(0)
    ?.toUpperCase() ??
    user.email?.charAt(0)?.toUpperCase() ??
    "?";

  return (
    <AppShell userInitial={initial}>
      {children}
    </AppShell>
  );
}
