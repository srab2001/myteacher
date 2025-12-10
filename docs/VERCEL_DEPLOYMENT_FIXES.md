# MyTeacher Vercel Deployment Errors & Fixes

This document contains all errors encountered during deployment to Vercel/Neon and their solutions.

---

## 1. Prisma JSON Type Errors

**Error:**
```
Type 'Record<string, unknown>' is not assignable to type 'InputJsonValue'
```

**Files:** `apps/api/src/routes/goals.ts`

**Fix:** Added `Prisma` to imports and cast values:
```typescript
import { Prisma } from '@prisma/client';
// ...
baselineJson: (data.baselineJson || {}) as Prisma.InputJsonValue
```

---

## 2. pdf-parse TypeScript Error

**Error:**
```
This expression is not callable
```

**File:** `apps/api/src/services/ingestion.ts`

**Fix:** Double type assertion:
```typescript
const pdfParse = pdf as unknown as (buffer: Buffer) => Promise<{ text: string }>;
```

---

## 3. Serverless Filesystem ENOENT

**Error:**
```
ENOENT: no such file or directory, mkdir './uploads'
```

**Files:** `worksamples.ts`, `priorplans.ts`, `admin.ts`

**Cause:** Vercel serverless functions have a read-only filesystem except for `/tmp`.

**Fix:** Use `/tmp/uploads` in serverless and wrap in try-catch:
```typescript
const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
const uploadDir = isServerless ? '/tmp/uploads' : './uploads';
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch (error) {
  console.warn('Could not create upload directory:', error);
}
```

---

## 4. Invalid Serverless Function Export

**Error:**
```
Vercel couldn't find serverless function entry point
```

**File:** `apps/api/vercel.json`

**Fix:** Explicit builds and routes configuration:
```json
{
  "version": 2,
  "builds": [{ "src": "api/index.ts", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "/api/index.ts" }]
}
```

---

## 5. Session Not Persisting in Serverless

**Error:**
```
Login returns 200 but /auth/me returns 401
```

**Cause:** Default in-memory session store doesn't persist across serverless function invocations.

**File:** `apps/api/src/app.ts`

**Fix:** Added PostgreSQL session store:
```typescript
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';

const PgSession = connectPgSimple(session);
const pgPool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// In session config:
store: new PgSession({
  pool: pgPool,
  tableName: 'session',
  createTableIfMissing: true,
}),
```

---

## 6. Session Cookies Not Saved Before Response

**Error:**
```
Session not written to store before response sent
```

**Cause:** Async session stores may not complete writes before response is sent.

**File:** `apps/api/src/routes/auth.ts`

**Fix:** Explicit `session.save()` before responding:
```typescript
req.logIn(user, (err) => {
  if (err) return next(err);
  req.session.save((saveErr) => {
    if (saveErr) {
      console.error('Session save error:', saveErr);
      return next(saveErr);
    }
    return res.json({ user: {...} });
  });
});
```

---

## 7. Proxy/Trust Issues Behind Vercel

**Error:**
```
Secure cookies not working behind reverse proxy
```

**Cause:** Express doesn't trust proxy headers by default, so secure cookies fail.

**File:** `apps/api/src/app.ts`

**Fix:** Added trust proxy settings:
```typescript
app.set('trust proxy', 1);

// In session config:
proxy: true,
cookie: {
  secure: env.NODE_ENV === 'production',
  sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
}
```

---

## 8. Cross-Origin Cookie Blocking

**Error:**
```
Browser blocks third-party cookies between myteacher-web.vercel.app and myteacher-api.vercel.app
GET https://myteacher-api.vercel.app/auth/me 401 (Unauthorized)
```

**Cause:** Modern browsers block third-party cookies. When frontend (myteacher-web.vercel.app) makes requests to API (myteacher-api.vercel.app), cookies are considered third-party and blocked.

**File:** `apps/web/next.config.js`

**Fix:** Use Next.js rewrites to proxy API calls through same domain:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
    // Use API_URL (server-side only) for rewrites
    // NEXT_PUBLIC_API_URL should NOT be set - client uses relative URLs
    const apiUrl = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
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

module.exports = nextConfig;
```

**Vercel Environment Variables (myteacher-web):**
- **Remove:** `NEXT_PUBLIC_API_URL` (critical - this gets bundled into client JS)
- **Add:** `API_URL=https://myteacher-api.vercel.app` (server-side only)

**Why this works:**
1. Client makes request to `/auth/login` (relative URL, same domain)
2. Next.js rewrites it to `https://myteacher-api.vercel.app/auth/login`
3. Response cookies are set on `myteacher-web.vercel.app` (same origin)
4. No third-party cookie blocking

---

## 9. Invalid DATABASE_URL

**Error:**
```
Login failed: user not found (connecting to wrong database)
```

**Cause:** DATABASE_URL environment variable was misconfigured or pointing to wrong database.

**Fix:** Set correct Neon connection string in Vercel environment variables:
```
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-polished-snow-a4osv2nl-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## 10. Password Hash Mismatch After Seeding

**Error:**
```
Login failed: invalid password
```

**Cause:** Password hash in database doesn't match due to seed issues or different bcrypt versions.

**File:** `apps/api/src/routes/auth.ts`

**Fix:** Added password reset endpoint protected by SESSION_SECRET:
```typescript
// Password reset endpoint (protected by reset key)
router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword, resetKey } = req.body;

    // Verify reset key (use SESSION_SECRET as the reset key)
    const expectedKey = env.SESSION_SECRET;
    if (!resetKey || resetKey !== expectedKey) {
      return res.status(403).json({ error: 'Invalid reset key' });
    }

    if (!username || !newPassword) {
      return res.status(400).json({ error: 'Username and new password are required' });
    }

    const user = await prisma.appUser.findUnique({
      where: { username },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.appUser.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    return res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to reset password' });
  }
});
```

**Usage:**
```bash
curl -X POST https://myteacher-api.vercel.app/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "username": "stuadmin",
    "newPassword": "stuteacher1125",
    "resetKey": "YOUR_SESSION_SECRET"
  }'
```

---

## Environment Variables Summary

### myteacher-api (API Server)

| Variable | Value | Required |
|----------|-------|----------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Random secure string (32+ chars) | Yes |
| `NODE_ENV` | `production` | Yes |
| `FRONTEND_URL` | `https://myteacher-web.vercel.app` | Yes |

### myteacher-web (Frontend)

| Variable | Value | Required |
|----------|-------|----------|
| `API_URL` | `https://myteacher-api.vercel.app` | Yes |
| `NEXT_PUBLIC_API_URL` | **DO NOT SET** (must be empty/removed) | No |

---

## Deployment Checklist

### Before Deploying

- [ ] Remove `NEXT_PUBLIC_API_URL` from myteacher-web environment
- [ ] Add `API_URL` to myteacher-web environment
- [ ] Verify `DATABASE_URL` points to correct Neon database
- [ ] Verify `SESSION_SECRET` is set in myteacher-api

### After Deploying

- [ ] Redeploy myteacher-web **without** build cache after env var changes
- [ ] Run database seed if needed: `DATABASE_URL="..." pnpm seed`
- [ ] Reset admin password if login fails (use curl command above)
- [ ] Test login at https://myteacher-web.vercel.app/login

---

## Admin Login Credentials

- **Username:** `stuadmin`
- **Password:** `stuteacher1125`

---

## Troubleshooting

### Login returns 200 but dashboard shows 401
- Check that `NEXT_PUBLIC_API_URL` is **not set** in myteacher-web
- Redeploy myteacher-web without build cache

### "Invalid password" after successful seed
- Use the password reset endpoint with your SESSION_SECRET
- Verify bcryptjs is used in both seed.ts and passport.ts

### Session not persisting
- Check PostgreSQL session table exists (`session` table)
- Verify `trust proxy` is set in app.ts
- Verify `proxy: true` in session config

### CORS errors
- Check `FRONTEND_URL` is set correctly in myteacher-api
- Verify CORS middleware allows the frontend origin
