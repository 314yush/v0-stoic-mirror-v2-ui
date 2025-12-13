# Security & Privacy Documentation

## Overview

Stoic Mirror is designed with security and privacy as core principles. This document outlines the security measures implemented in the application.

## Security Features

### 1. Row Level Security (RLS)

All Supabase tables have Row Level Security enabled. Users can only access their own data.

#### Tables with RLS:
- `journal_entries` - Users can only view/insert/update/delete their own entries
- `schedule_commits` - Users can only access their own schedule commits
- `tasks` - Users can only access their own tasks
- `user_settings` - Users can only access their own settings

#### RLS Policy Structure:
```sql
CREATE POLICY "Users can [action] own [resource]"
  ON [table] FOR [SELECT|INSERT|UPDATE|DELETE]
  USING (auth.uid() = user_id);
```

This ensures that:
- `auth.uid()` must match `user_id` for any operation
- Users cannot see or modify other users' data
- All policies use `WITH CHECK` for INSERT/UPDATE operations

### 2. URL Validation (SSRF Prevention)

#### Ollama URL Validation
Ollama URLs are strictly validated to prevent SSRF (Server-Side Request Forgery) attacks:

- ✅ Only `http://` protocol allowed (not `https://`, `file://`, etc.)
- ✅ Only `localhost`, `127.0.0.1`, or `::1` hostnames allowed
- ✅ No path allowed (prevents path traversal)
- ✅ No query parameters or hash fragments
- ✅ Port validation (1-65535)

**Implementation**: See `src/renderer/lib/url-validation.ts`

#### HTTPS Validation
All external API URLs (Supabase, Gemini) must use HTTPS:

- ✅ Protocol check: only `https://` allowed
- ✅ URL format validation
- ✅ Automatic fallback to placeholder if invalid

**Implementation**: `validateHttpsUrl()` in `url-validation.ts`

### 3. Environment Variables

#### Required Variables:
- `VITE_SUPABASE_URL` - Supabase project URL (HTTPS)
- `VITE_SUPABASE_ANON_KEY` - Supabase anon/public key (safe to expose)

#### Optional Variables:
- `VITE_GEMINI_API_KEY` - Gemini API key (user can also input in settings)

#### Security Notes:
- ✅ `.env` files are in `.gitignore` (never committed)
- ✅ Supabase anon key is RLS-protected (safe for frontend)
- ✅ No secrets are hardcoded in the codebase
- ✅ Environment variables validated on startup

### 4. Data Storage

#### Local Storage:
- All data stored locally first (offline-first architecture)
- Uses browser localStorage (persisted across sessions)
- Zustand with persistence middleware

#### Cloud Storage (Supabase):
- Data synced to Supabase when online
- All data encrypted in transit (HTTPS)
- All data encrypted at rest (Supabase default)
- RLS policies enforce user isolation

#### Sensitive Journal Entries:
- `is_sensitive` flag available for sensitive entries
- Sensitive entries excluded from analytics/aggregations
- Can be blurred in UI with `Cmd/Ctrl + L` shortcut

### 5. Authentication

#### Supabase Auth:
- Email/password authentication
- Sessions managed by Supabase
- Auto token refresh enabled
- Session persisted locally
- Secure logout clears all session data

#### Session Management:
- Tokens stored securely by Supabase client
- Automatic token refresh on expiry
- Logout properly clears sessions

### 6. Network Security

#### All API Calls:
- ✅ Supabase: HTTPS only
- ✅ Gemini API: HTTPS only  
- ✅ Ollama: HTTP localhost only (validated)

#### CORS:
- Handled by Supabase (automatic for authenticated requests)
- Gemini API: No CORS issues (server-side proxy not needed)

### 7. Input Validation

#### User Settings:
- Ollama URL validated before saving
- Gemini API key validated (non-empty if using Gemini)
- Theme values validated (dark/light only)

#### Forms:
- Email format validation
- Password minimum length (6 characters)
- Required fields enforced

### 8. Error Handling

#### User-Facing Errors:
- Generic error messages (no sensitive data exposed)
- Network errors distinguished from other failures
- Error boundary catches React errors gracefully
- Toast notifications for user feedback

#### Developer Logging:
- Console warnings for security issues (dev mode only)
- Error logs don't expose sensitive data

## Privacy Features

### 1. Offline-First
- App works fully offline
- Data only synced when online (user choice)
- No forced cloud sync

### 2. Local-First
- All data stored locally first
- Cloud sync is optional enhancement
- Users can clear localStorage to remove all local data

### 3. No Analytics
- No third-party analytics
- No tracking
- No telemetry

### 4. AI Privacy
- **Ollama (Recommended)**: Fully local, no data sent anywhere
- **Gemini (Fallback)**: Data sent to Google (user aware, optional)

## Security Checklist

Before deploying to production:

- [x] RLS enabled on all tables
- [x] URL validation implemented
- [x] HTTPS enforced for external APIs
- [x] Environment variables documented
- [x] No hardcoded secrets
- [x] Error handling doesn't expose sensitive data
- [ ] Security audit completed
- [ ] Penetration testing (optional, recommended)

## Reporting Security Issues

If you discover a security vulnerability, please:
1. Do not open a public issue
2. Contact the maintainer privately
3. Provide detailed information about the vulnerability

## Compliance

### Data Protection:
- User data encrypted in transit (HTTPS)
- User data encrypted at rest (Supabase)
- RLS policies enforce data isolation
- Users can export/delete their data

### Best Practices:
- Principle of least privilege (RLS policies)
- Input validation on all user inputs
- Secure defaults (Ollama local, HTTPS required)
- Defense in depth (multiple validation layers)

