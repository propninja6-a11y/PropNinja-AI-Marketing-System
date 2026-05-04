import { NextResponse, type NextRequest } from "next/server";

const protectedPrefixes = [
  "/dashboard",
  "/uploads",
  "/leads",
  "/campaigns",
  "/assignment",
  "/sales",
  "/notifications",
  "/settings"
];

export function resolveAuthRedirect(pathname: string, hasSessionCookie: boolean) {
  const isLogin = pathname === "/login";
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !hasSessionCookie) return "/login";
  if (isLogin && hasSessionCookie) return "/dashboard";
  return null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const hasSessionCookie = request.cookies.get("pn_session")?.value === "1";
  const redirectPath = resolveAuthRedirect(pathname, hasSessionCookie);

  if (!redirectPath) return NextResponse.next();

  const url = request.nextUrl.clone();
  url.pathname = redirectPath;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    "/uploads/:path*",
    "/leads/:path*",
    "/campaigns/:path*",
    "/assignment/:path*",
    "/sales/:path*",
    "/notifications/:path*",
    "/settings/:path*"
  ]
};
