export { default } from "next-auth/middleware";

export const config = {
  // Protect every dashboard route. Anything else (landing, /login, /api/auth, /docs…)
  // stays public.
  matcher: ["/dashboard/:path*"],
};
