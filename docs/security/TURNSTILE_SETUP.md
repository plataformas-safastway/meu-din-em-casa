# Cloudflare WAF + Turnstile Security Integration

This document describes the security layers implemented to protect authentication endpoints from bots and brute force attacks.

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    Cloudflare Edge (WAF)                         │
│  • Rate Limiting: /login, /signup, /auth/* endpoints             │
│  • Managed Challenge for suspicious traffic                      │
│  • Geo-blocking and IP reputation (optional)                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (React)                              │
│  • Invisible Turnstile widget                                    │
│  • Progressive challenge (only when risk detected)               │
│  • Failed attempt tracking (localStorage)                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│              Edge Function (verify-turnstile)                    │
│  • Server-side token validation via siteverify API               │
│  • Audit logging of security events                              │
│  • Fail-open if not configured (development)                     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Supabase Auth                                 │
│  • Standard authentication flow                                  │
│  • Only called after Turnstile verification                      │
└──────────────────────────────────────────────────────────────────┘
```

## Setup Instructions

### 1. Cloudflare Dashboard Setup

1. **Add your domain to Cloudflare** (if not already)
2. **Configure Rate Limiting Rules:**
   - Go to Security → WAF → Rate limiting rules
   - Create rules for:
     - `/login*`: 10 requests per minute per IP
     - `/signup*`: 5 requests per minute per IP
     - `/auth/*`: 10 requests per minute per IP
     - `/reset-password*`: 3 requests per minute per IP
   - Action: Managed Challenge or Block

3. **Get Turnstile Keys:**
   - Go to Turnstile in Cloudflare dashboard
   - Create a new site widget
   - Choose "Invisible" or "Managed" mode
   - Copy the **Site Key** and **Secret Key**

### 2. Environment Configuration

#### Frontend (Vite env)
Add to your `.env` or environment configuration:
```
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

#### Backend (Supabase Secrets)
The `TURNSTILE_SECRET_KEY` is already configured in Supabase secrets.

### 3. Verification

Test the integration:
1. Normal login should work without visible challenge
2. After 3+ failed attempts, security indicator appears
3. Check edge function logs for `TURNSTILE_VERIFIED` events

## Progressive Security Logic

The system uses risk-based authentication:

| Failed Attempts | Risk Level | Challenge Required |
|-----------------|------------|-------------------|
| 0-2             | Low        | No (invisible)    |
| 3-5             | Medium     | Yes (soft)        |
| 6+              | High       | Yes (strict)      |

Failed attempts are tracked in localStorage with a 30-minute TTL.

## Security Events Logged

| Event | Description |
|-------|-------------|
| `TURNSTILE_REQUIRED` | Challenge was required due to risk |
| `TURNSTILE_VERIFIED` | Token verified successfully |
| `TURNSTILE_FAILED` | Token verification failed |
| `RATE_LIMIT_TRIGGERED` | Cloudflare rate limit hit |
| `LOGIN_FAILED` | Authentication failed |
| `LOGIN_SUCCESS` | Authentication succeeded |

## Files

- `src/lib/turnstile/` - Turnstile client utilities
- `src/hooks/useTurnstile.ts` - React hook for Turnstile widget
- `supabase/functions/verify-turnstile/` - Server-side verification
- `src/pages/LoginPage.tsx` - Integration in login form

## Fail-Open Behavior

If Turnstile is not configured (no `TURNSTILE_SECRET_KEY`), the system:
- Logs a warning but allows login to proceed
- This enables development without Cloudflare setup
- In production, ensure the secret is configured!

## Troubleshooting

### "Verificação de segurança falhou"
- Token expired (user took too long)
- Network issue with Cloudflare
- Invalid site key configuration

### Widget not loading
- Check browser console for script errors
- Verify `VITE_TURNSTILE_SITE_KEY` is set
- Check Content-Security-Policy headers

### Always requiring challenge
- Clear localStorage (`oik_login_risk` key)
- Check if failed attempts were recorded
