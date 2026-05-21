import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import Apple from "next-auth/providers/apple";

/**
 * Real OAuth — Google + Apple. No mocks.
 *
 * Required env vars (see .env.local.example):
 *  - NEXTAUTH_URL                e.g. http://localhost:3000
 *  - NEXTAUTH_SECRET             openssl rand -base64 32
 *  - GOOGLE_CLIENT_ID            from Google Cloud Console (OAuth 2.0 Client)
 *  - GOOGLE_CLIENT_SECRET
 *  - APPLE_CLIENT_ID             your Apple "Services ID" (e.g. ai.otune.web)
 *  - APPLE_CLIENT_SECRET         the JWT you generate with your Apple key
 *                                (see docs/auth-setup.md)
 *
 * Notes:
 *  - JWT session strategy → no database needed for MVP.
 *  - Apple requires `response_mode=form_post`, which next-auth handles
 *    so long as the redirect URI exactly matches your Services ID config:
 *      http://localhost:3000/api/auth/callback/apple
 */

const providers: NextAuthOptions["providers"] = [];

if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
  );
}

if (process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET) {
  providers.push(
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
  );
}

/**
 * Resolve the NextAuth secret lazily so that `next build` doesn't crash
 * just because the build host doesn't have it in its shell — only the
 * running server actually needs it.
 *
 *   - dev:   fall back to a fixed insecure string so `next dev` works
 *            out of the box.
 *   - prod:  require NEXTAUTH_SECRET at request time; if absent we surface
 *            a clear 500 with a hint rather than booting with a known key.
 */
function resolveSecret(): string {
  const env = process.env.NEXTAUTH_SECRET;
  if (env) return env;
  if (process.env.NODE_ENV !== "production") {
    return "dev-only-insecure-secret-replace-me-with-openssl-rand-base64-32";
  }
  throw new Error(
    "[auth] NEXTAUTH_SECRET is required in production. " +
      "Generate one with: openssl rand -base64 32",
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: { strategy: "jwt" },
  // NextAuth reads `secret` lazily at request time, so this getter only
  // runs when a sign-in/session call actually arrives.
  get secret() {
    return resolveSecret();
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async jwt({ token, account, profile }) {
      // First sign-in: carry the provider name onto the token so we can show it later.
      if (account) {
        token.provider = account.provider;
      }
      if (profile && (profile as { picture?: string }).picture && !token.picture) {
        token.picture = (profile as { picture?: string }).picture;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { provider?: string }).provider =
          (token.provider as string | undefined) ?? undefined;
      }
      return session;
    },
  },
};

export const hasAnyProvider = providers.length > 0;
