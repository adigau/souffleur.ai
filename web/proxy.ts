import createMiddleware from "next-intl/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback"];

function isPublicPath(pathname: string): boolean {
  // Strip locale prefix
  const stripped = pathname.replace(/^\/(en|fr)/, "") || "/";
  return (
    stripped === "/" ||
    PUBLIC_PATHS.some(
      (p) => stripped === p || stripped.startsWith(p + "/")
    )
  );
}

function isAppPath(pathname: string): boolean {
  const stripped = pathname.replace(/^\/(en|fr)/, "") || "/";
  return stripped === "/app" || stripped.startsWith("/app/");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Auth callback — always pass through untouched
  if (pathname.startsWith("/auth/")) {
    return NextResponse.next();
  }

  // API routes — skip intl/redirect logic but still refresh the Supabase session
  // so that access tokens are renewed before Route Handlers check auth.
  if (pathname.startsWith("/api/")) {
    const response = NextResponse.next();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return request.cookies.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              response.cookies.set(name, value, options);
            });
          },
        },
      }
    );
    await supabase.auth.getUser(); // refreshes the session if the access token has expired
    return response;
  }

  // Let next-intl handle locale routing first
  const response = intlMiddleware(request);

  // Auth check for /app routes
  if (isAppPath(request.nextUrl.pathname) && !isPublicPath(request.nextUrl.pathname)) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value);
              if (response) response.cookies.set(name, value, options);
            });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const locale = request.nextUrl.pathname.startsWith("/fr") ? "/fr" : "";
      return NextResponse.redirect(new URL(`${locale}/login`, request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Match all paths except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
