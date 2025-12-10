# Google OAuth Troubleshooting Guide

This document describes the Google OAuth authentication issues encountered during deployment to Vercel and their solutions.

## Environment

- **Frontend**: Next.js 14 deployed to Vercel (`myteacher-web.vercel.app`)
- **Backend**: Express.js API deployed to Vercel (`myteacher-api.vercel.app`)
- **Database**: Neon PostgreSQL
- **Session Store**: PostgreSQL via `connect-pg-simple`

---

## Issue 1: redirect_uri_mismatch

### Error
```
Error 400: redirect_uri_mismatch
The redirect URI in the request does not match the ones authorized for the OAuth client.
```

### Cause
The `GOOGLE_CLIENT_ID` configured in Vercel environment variables was different from the OAuth client that had the redirect URI registered in Google Cloud Console.

### Diagnosis
Added a debug endpoint to check the OAuth configuration:
```javascript
router.get('/debug-oauth', (req, res) => {
  res.json({
    googleConfigured: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL),
    callbackUrl: env.GOOGLE_CALLBACK_URL || 'NOT SET',
    clientIdPrefix: env.GOOGLE_CLIENT_ID ? env.GOOGLE_CLIENT_ID.substring(0, 20) + '...' : 'NOT SET',
  });
});
```

The `clientIdPrefix` showed a different OAuth client than expected.

### Solution
1. In Google Cloud Console → APIs & Services → Credentials
2. Find the OAuth 2.0 Client ID that matches the one in Vercel
3. Add the redirect URI: `https://myteacher-api.vercel.app/auth/google/callback`

**OR**

Update Vercel environment variables to use the correct `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` that match the OAuth client with the registered redirect URI.

---

## Issue 2: DATABASE_URL Format Error

### Error
```json
{
  "connected": false,
  "error": "error: Error validating datasource `db`: the URL must start with the protocol `postgresql://` or `postgres://`."
}
```

### Cause
The `DATABASE_URL` environment variable was copied with the `psql` command prefix:
```
psql 'postgresql://user:pass@host/db'
```

Instead of just the connection string:
```
postgresql://user:pass@host/db
```

### Diagnosis
Added URL prefix check to debug endpoint:
```javascript
router.get('/debug-db', async (req, res) => {
  const dbUrl = process.env.DATABASE_URL || '';
  const urlPrefix = dbUrl.substring(0, 15);
  // ... returns urlPrefix in response
});
```

The `urlPrefix` showed `psql 'postgresq` instead of `postgresql://`.

### Solution
In Vercel environment variables, update `DATABASE_URL` to contain only the connection string:
```
postgresql://neondb_owner:PASSWORD@ep-xxxxx.us-east-1.aws.neon.tech/neondb?sslmode=require
```

Remove:
- The `psql` command prefix
- The surrounding single quotes

---

## Issue 3: CORS Error - Trailing Slash Mismatch

### Error
```
Access to fetch at 'https://myteacher-api.vercel.app/auth/login' from origin 'https://myteacher-web.vercel.app' has been blocked by CORS policy:
The 'Access-Control-Allow-Origin' header has a value 'https://myteacher-web.vercel.app/' that is not equal to the supplied origin.
```

### Cause
The `FRONTEND_URL` environment variable had a trailing slash:
```
https://myteacher-web.vercel.app/
```

But the browser sends the origin without a trailing slash:
```
https://myteacher-web.vercel.app
```

### Solution
In Vercel API environment variables, update `FRONTEND_URL` to remove the trailing slash:
```
https://myteacher-web.vercel.app
```

---

## Issue 4: 500 Internal Server Error on OAuth Callback

### Error
```
GET https://myteacher-api.vercel.app/auth/google/callback?code=... 500 (Internal Server Error)
```

### Cause
Database connection failure during the OAuth callback when trying to find/create the user.

### Diagnosis
Added detailed logging to the passport Google strategy:
```javascript
console.log('Google OAuth callback - profile received:', profile.id);
console.log('Google OAuth - email:', email);
console.log('Google OAuth - searching for user by googleId:', profile.id);
console.log('Google OAuth - existing user found:', !!user);
```

Check Vercel function logs to see where the error occurs.

### Solution
Ensure `DATABASE_URL` is correctly formatted (see Issue 2) and the database is accessible.

---

## Issue 5: 401 Unauthorized on /auth/me After Successful OAuth

### Error
```
GET https://myteacher-api.vercel.app/auth/me 401 (Unauthorized)
```

OAuth callback succeeds (user found in database, 302 redirect), but subsequent API calls fail with 401.

### Cause
**Third-party cookie blocking**. When the frontend (`myteacher-web.vercel.app`) makes requests to the API (`myteacher-api.vercel.app`), modern browsers block cross-origin cookies even with `SameSite=None` and `Secure=true`.

### Diagnosis
Added a debug endpoint accessible directly in the browser:
```javascript
router.get('/debug-session', (req, res) => {
  res.json({
    hasSessionCookie: !!req.cookies['myteacher.sid'],
    cookieNames: Object.keys(req.cookies || {}),
    sessionId: req.sessionID ? req.sessionID.substring(0, 10) + '...' : 'none',
    isAuthenticated: req.isAuthenticated?.() || false,
    hasUser: !!req.user,
    userId: req.user?.id || null,
  });
});
```

When visiting `https://myteacher-api.vercel.app/auth/debug-session` directly in the browser after OAuth login:
- `isAuthenticated: true`
- `hasUser: true`

But when the frontend makes the same request, cookies aren't sent.

### Solution
Use Next.js rewrites to proxy API requests through the same origin.

**next.config.js** (already configured):
```javascript
const nextConfig = {
  async rewrites() {
    const apiUrl = process.env.API_URL || 'http://localhost:4000';
    return [
      {
        source: '/api/:path*',
        destination: `${apiUrl}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${apiUrl}/auth/:path*`,
      },
    ];
  },
};
```

**Vercel Environment Variables for Web Project:**

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_API_URL` | *(delete or leave empty)* |
| `API_URL` | `https://myteacher-api.vercel.app` |

This way:
- Client-side requests go to `/auth/me` (same origin as frontend)
- Next.js proxies them to `https://myteacher-api.vercel.app/auth/me`
- Cookies work because everything appears to be on the same origin

---

## Issue 6: Session Not Saved Before Redirect

### Symptom
OAuth callback succeeds but session is lost after redirect.

### Cause
In serverless environments with async session stores (like PostgreSQL), the redirect may happen before the session is fully persisted.

### Solution
Explicitly save the session before redirecting:

```javascript
router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${env.FRONTEND_URL}/login?error=auth_failed`,
  }),
  (req, res) => {
    // Save session explicitly before redirect (important for async stores)
    req.session.save((err) => {
      if (err) {
        console.error('Session save error after OAuth:', err);
        return res.redirect(`${env.FRONTEND_URL}/login?error=session_failed`);
      }
      if (req.user?.isOnboarded) {
        res.redirect(`${env.FRONTEND_URL}/dashboard`);
      } else {
        res.redirect(`${env.FRONTEND_URL}/onboarding`);
      }
    });
  }
);
```

---

## Required Environment Variables

### API Project (Vercel)

| Variable | Example Value |
|----------|---------------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` |
| `SESSION_SECRET` | `<random-string>` |
| `GOOGLE_CLIENT_ID` | `123456789-xxxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-xxxxx` |
| `GOOGLE_CALLBACK_URL` | `https://myteacher-api.vercel.app/auth/google/callback` |
| `FRONTEND_URL` | `https://myteacher-web.vercel.app` (no trailing slash!) |

### Web Project (Vercel)

| Variable | Value |
|----------|-------|
| `API_URL` | `https://myteacher-api.vercel.app` |
| `NEXT_PUBLIC_API_URL` | *(empty or not set)* |

---

## Google Cloud Console Configuration

1. Go to **APIs & Services** → **Credentials**
2. Select your OAuth 2.0 Client ID
3. Under **Authorized JavaScript origins**, add:
   - `https://myteacher-web.vercel.app`
   - `https://myteacher-api.vercel.app`
4. Under **Authorized redirect URIs**, add:
   - `https://myteacher-api.vercel.app/auth/google/callback`
5. Under **OAuth consent screen**:
   - If status is "Testing", add test users who can authenticate
   - Or publish the app to allow any Google user

---

## Debug Endpoints

These endpoints help diagnose issues in production:

| Endpoint | Purpose |
|----------|---------|
| `/auth/debug-oauth` | Check OAuth configuration (no secrets exposed) |
| `/auth/debug-db` | Check database connectivity |
| `/auth/debug-session` | Check session/cookie status |

**Note:** Consider removing or protecting these endpoints in a production environment.
