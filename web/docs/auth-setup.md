# Auth setup — Google + Apple

We use [NextAuth.js v4](https://next-auth.js.org/) with the JWT session
strategy (no database). Two providers are configured in
[`src/lib/auth.ts`](../src/lib/auth.ts): Google and Apple. Providers without
credentials in env are skipped automatically, so you can ship with just one.

## 1. Core env

```bash
cp .env.local.example .env.local
```

Then in `.env.local`:

```bash
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET="$(openssl rand -base64 32)"
```

> In production, the server **refuses to boot** without `NEXTAUTH_SECRET`.

## 2. Google

1. https://console.cloud.google.com/ → APIs & Services → **Credentials**
2. **Create credentials → OAuth client ID**
   - Application type: **Web application**
   - Authorized JavaScript origin: `http://localhost:3000`
   - Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. Copy the client ID + secret into `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=…apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=…
   ```
4. Restart `next dev`. The button on `/login` lights up automatically.

For production add the production redirect URI
(`https://otune.ai/api/auth/callback/google`) to the same OAuth client.

## 3. Apple ("Sign in with Apple")

This one is fiddly. You need an Apple Developer account.

1. **Identifiers → App ID** (one-time): create or pick an App ID and enable
   *Sign in with Apple*.
2. **Identifiers → Services ID**: create a new Services ID, e.g.
   `ai.otune.web`. Enable *Sign in with Apple* and configure:
   - Primary App ID: the App ID from step 1
   - Domains: `localhost`, `otune.ai`
   - Return URLs:
     - `http://localhost:3000/api/auth/callback/apple`
     - `https://otune.ai/api/auth/callback/apple`
3. **Keys**: create a new key with *Sign in with Apple* enabled. Download
   the `.p8` file. Note the **Key ID** and your **Team ID**.
4. Generate the client secret JWT. NextAuth wants the secret pre-built,
   not the raw `.p8`. The easiest way is a tiny Node script:

   ```js
   // gen-apple-secret.mjs
   import jwt from "jsonwebtoken";
   import fs from "node:fs";
   const key = fs.readFileSync("./AuthKey_XXXXXX.p8");
   const token = jwt.sign({}, key, {
     algorithm: "ES256",
     expiresIn: "180d", // re-generate every 6 months
     audience: "https://appleid.apple.com",
     issuer: "YOUR_TEAM_ID",
     subject: "ai.otune.web", // your Services ID
     keyid: "YOUR_KEY_ID",
   });
   console.log(token);
   ```

   ```bash
   npm i -D jsonwebtoken && node gen-apple-secret.mjs
   ```

5. Put it in `.env.local`:
   ```bash
   APPLE_CLIENT_ID=ai.otune.web
   APPLE_CLIENT_SECRET=eyJraWQiOiJYWFhYWFgi... (the JWT from step 4)
   ```

The Apple secret JWT expires (max 6 months). Rotate it before then; the
sign-in button will start returning 401s if you don't.

## 4. Verify

```bash
npm run dev
```

Open `http://localhost:3000/login`, click either provider, complete the
flow, and confirm:

- You land on `/dashboard`.
- The sidebar bottom shows your name + avatar.
- `/dashboard/...` returns to `/login?callbackUrl=...` when signed out.
