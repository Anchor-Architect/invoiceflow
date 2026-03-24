export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - /login
     * - /api/auth (next-auth)
     * - /_next (static)
     * - /favicon.ico
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)",
  ],
};
