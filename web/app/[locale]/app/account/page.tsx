import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/lib/actions/auth";
import Button from "@/components/ui/Button";
import MonoTag from "@/components/ui/MonoTag";
import { Check, Chev } from "@/components/ui/Icons";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const t = await getTranslations("account");

  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "—";

  const initial = name.charAt(0).toUpperCase();

  const identities = user.identities ?? [];
  const hasGoogle = identities.some((id) => id.provider === "google");
  const hasEmail = identities.some((id) => id.provider === "email");

  const row = (label: string, value: string, chev = true) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "15px 22px",
      }}
    >
      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
      <span
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 12.5,
          color: "var(--ink-muted)",
        }}
      >
        {value}
        {chev && <Chev size={12} color="var(--ink-faint)" />}
      </span>
    </div>
  );

  return (
    <div
      style={{
        height: "100%",
        overflow: "auto",
        display: "flex",
        justifyContent: "center",
        paddingTop: 30,
        paddingBottom: 48,
        paddingInline: 16,
      }}
    >
      <div style={{ width: "100%", maxWidth: 620 }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 26,
            fontWeight: 500,
            letterSpacing: -0.5,
            marginBottom: 20,
          }}
        >
          {t("title")}
        </div>

        {/* Profile card */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            padding: "18px 22px",
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 999,
              background: "var(--ink)",
              color: "var(--bg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 600,
              fontFamily: "var(--font-body)",
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-muted)", marginTop: 2 }}>
              {user.email}
            </div>
          </div>
          <Button variant="secondary" size="sm">
            {t("editProfile")}
          </Button>
        </div>

        {/* Settings rows */}
        <div
          style={{
            background: "var(--surface)",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
            marginTop: 14,
            overflow: "hidden",
          }}
        >
          {row(t("language"), t("languageValue"))}
          <div style={{ borderTop: "1px solid var(--line)" }}>
            {row(t("password"), t("passwordValue"))}
          </div>
        </div>

        {/* Sign-in methods */}
        <div style={{ marginTop: 18 }}>
          <MonoTag>{t("signInMethods")}</MonoTag>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--rule)",
              borderRadius: "var(--radius-lg)",
              marginTop: 8,
              overflow: "hidden",
            }}
          >
            {/* Google */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 22px",
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t("google")}</span>
              <span
                style={{
                  fontSize: 12,
                  color: hasGoogle ? "var(--ink-muted)" : "var(--ink-faint)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {hasGoogle && <Check size={12} color="var(--moss)" />}
                {hasGoogle ? t("googleConnected") : t("googleNotConnected")}
              </span>
            </div>

            {/* Email & password */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 22px",
                borderTop: "1px solid var(--line)",
              }}
            >
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>{t("emailPassword")}</span>
              <span
                style={{
                  fontSize: 12,
                  color: hasEmail ? "var(--ink-muted)" : "var(--ink-faint)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                {hasEmail && <Check size={12} color="var(--moss)" />}
                {hasEmail ? t("emailPasswordSet") : "—"}
              </span>
            </div>
          </div>
        </div>

        {/* Danger zone */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 18,
            padding: "15px 22px",
            border: "1px solid var(--rule)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--rose)" }}>
              {t("deleteTitle")}
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 2 }}>
              {t("deleteSubtitle")}
            </div>
          </div>
          <button
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--rose)",
              background: "transparent",
              border: "1px solid color-mix(in oklch, var(--rose) 40%, var(--rule))",
              borderRadius: "var(--radius-md)",
              padding: "6px 14px",
              cursor: "pointer",
            }}
          >
            {t("deleteButton")}
          </button>
        </div>

        {/* Sign out */}
        <div style={{ marginTop: 24 }}>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              {t("signOut")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
