# Google OAuth Setup Guide

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it: `Stoic Mirror`
4. Click **Create**

## Step 2: Enable Google Calendar API

1. Go to **APIs & Services** → **Library**
2. Search for "Google Calendar API"
3. Click on it → **Enable**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** (for testing with any Google account)
3. Click **Create**
4. Fill in:
   - **App name**: `Stoic Mirror`
   - **User support email**: Your email
   - **Developer contact email**: Your email
5. Click **Save and Continue**
6. **Scopes**: Click **Add or Remove Scopes**
   - Find and select:
     - `https://www.googleapis.com/auth/calendar.readonly`
     - `https://www.googleapis.com/auth/calendar.events`
   - Click **Update** → **Save and Continue**
7. **Test users**: Click **Add Users**
   - Add your Google email(s) for testing
   - Click **Save and Continue**
8. Click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Select **Desktop app**
4. Name it: `Stoic Mirror Desktop`
5. Click **Create**
6. **Copy** the Client ID and Client Secret

## Step 5: Add Credentials to Your App

1. Open your `.env` file in the project root
2. Add these lines:

```env
VITE_GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret-here
```

3. Restart the dev server

## Step 6: Test the Connection

1. Run `npm run dev:electron`
2. Go to **Settings** → **Calendar Integration**
3. Click **Connect Google Calendar**
4. Follow the OAuth flow
5. Verify events are imported

---

## Troubleshooting

### "Access blocked: This app's request is invalid"
- Make sure you added the correct redirect URI
- For desktop apps, Google uses loopback (`http://127.0.0.1` or `http://localhost`)

### "Error 403: access_denied"
- You're not added as a test user
- Go to OAuth consent screen → Test users → Add your email

### "Error 401: invalid_client"
- Client ID or Secret is wrong
- Double-check the credentials in `.env`

### "Token has been expired or revoked"
- Re-authenticate by clicking "Connect Google Calendar" again
- The refresh token might have expired (Google revokes after 7 days for unverified apps)

---

## Security Notes

- **Never commit** `.env` to git
- **Desktop apps** can't hide secrets (Client Secret is stored locally)
- For production, consider using **Proof Key for Code Exchange (PKCE)**
- Google tokens are stored in localStorage (will be encrypted in production)

---

## Publishing Checklist (For Production)

1. **Verify your app** with Google (removes "unverified app" warning)
2. **Add privacy policy** URL
3. **Add terms of service** URL
4. **Submit for verification** (takes 2-6 weeks)

Until verified, your app:
- Shows "Google hasn't verified this app" warning
- Has a 100 user limit
- Tokens expire after 7 days

---

## Quick Reference

| Setting | Value |
|---------|-------|
| App Type | Desktop app |
| Redirect URI | `http://127.0.0.1` (auto-handled) |
| Scopes | `calendar.readonly`, `calendar.events` |
| Environment Variables | `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_CLIENT_SECRET` |




