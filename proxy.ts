import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getDbStatus } from "@/utils/db/status";

export const proxy = auth(async (request) => {
  const { pathname } = request.nextUrl;
  const isProtected = pathname.startsWith("/dashboard");
  const isLoginPage = pathname.startsWith("/login");

  if (pathname !== "/missing-db-config" && pathname !== "/setup") {
    const status = await getDbStatus();

    if (status === "missing-config") {
      const url = request.nextUrl.clone();
      url.pathname = "/missing-db-config";
      return NextResponse.redirect(url);
    }

    if (status === "missing-schema" && (isProtected || isLoginPage)) {
      const url = request.nextUrl.clone();
      url.pathname = "/setup";
      return NextResponse.redirect(url);
    }
  }

  const isLoggedIn = !!request.auth?.user;

  if (isProtected && !isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isLoginPage && isLoggedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
