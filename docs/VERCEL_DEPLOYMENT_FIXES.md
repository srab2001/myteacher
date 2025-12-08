# MyTeacher Vercel Deployment Errors & Fixes

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

**File:** `apps/web/next.config.js`

**Fix:** Use Next.js rewrites to proxy API calls through same domain:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async rewrites() {
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
- **Remove:** `NEXT_PUBLIC_API_URL`
- **Add:** `API_URL=https://myteacher-api.vercel.app`

---

## 9. Invalid DATABASE_URL

**Error:**
```
Login failed: user not found (connecting to wrong database)
```

**Fix:** Set correct Neon connection string in Vercel environment variables:
```
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-polished-snow-a4osv2nl-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

---

## Environment Variables Summary

### myteacher-api (API Server)
| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `SESSION_SECRET` | Random secure string |
| `NODE_ENV` | `production` |
| `FRONTEND_URL` | `https://myteacher-web.vercel.app` |

### myteacher-web (Frontend)
| Variable | Value |
|----------|-------|
| `API_URL` | `https://myteacher-api.vercel.app` |
| `NEXT_PUBLIC_API_URL` | **DO NOT SET** (leave empty) |

---

## Admin Login Credentials
- **Username:** `stuadmin`
- **Password:** `stuteacher1125`
