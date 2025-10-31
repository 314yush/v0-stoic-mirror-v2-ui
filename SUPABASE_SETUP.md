# Supabase Setup Guide

This guide walks you through setting up Supabase for authentication and backend sync in Mindful OS.

## Prerequisites

1. A Supabase account (sign up at https://supabase.com)
2. Node.js and npm installed
3. Your Mindful OS project set up

## Step 1: Create a Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - **Name**: `mindful-os` (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to you
4. Click "Create new project" and wait for setup (~2 minutes)

## Step 2: Get Your API Keys

1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)
3. Copy both values

## Step 3: Set Up Environment Variables

1. Create a `.env` file in the project root (copy from `.env.example` if it exists)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Important**: These are safe to expose in frontend code (hence `VITE_` prefix). The anon key is restricted by Row Level Security policies.

## Step 4: Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of `SUPABASE_SETUP.sql` from this project
4. Paste into the SQL Editor
5. Click "Run" (or press Cmd/Ctrl + Enter)

This creates:
- `journal_entries` table
- `schedule_commits` table
- `user_settings` table (for future use)
- Row Level Security (RLS) policies
- Indexes for performance

## Step 5: Verify Setup

1. In Supabase dashboard, go to **Table Editor**
2. You should see three tables:
   - `journal_entries`
   - `schedule_commits`
   - `user_settings`

## Step 6: Test Authentication

1. Restart your dev server: `npm run dev`
2. You should see a login screen
3. Click "Sign up" and create an account
4. After signing up/signing in, you should see the main app

## How It Works

### Local-First Architecture

- **All data is stored locally first** (localStorage)
- Changes sync to Supabase in the background
- App works fully offline
- No data loss if sync fails (queued for retry)

### Sync Strategy

1. **On Sign In**: Pulls all data from Supabase and merges with local data
2. **On Change**: Immediately saves locally, queues for Supabase sync
3. **Background Sync**: Runs every 30 seconds when online
4. **Conflict Resolution**: Local data takes precedence (merge strategy)

### Authentication

- Email/password authentication
- Sessions persist across browser restarts
- Secure token refresh handled automatically
- Row Level Security ensures users only see their own data

## Troubleshooting

### "Supabase not configured" warning

- Check that `.env` file exists with correct variables
- Restart dev server after adding `.env`
- Verify variable names start with `VITE_`

### Can't sign up / Sign up but stays on login screen

**This is usually caused by email confirmation being enabled.**

1. **Disable email confirmation (recommended for testing):**
   - Go to Supabase Dashboard → Authentication → Settings
   - Scroll to "Email Auth" section
   - Toggle "Enable email confirmations" **OFF**
   - Click "Save"
   - Try signing up again

2. **OR keep email confirmation enabled:**
   - After signing up, check your email
   - Click the confirmation link
   - Then sign in with your credentials
   - You'll see a message: "Please check your email to confirm your account"

3. **Check browser console for errors:**
   - Open DevTools (F12) → Console tab
   - Look for "Auth initialize" and "Auth state change" logs
   - These help debug session issues

### Data not syncing

- Check browser console for errors
- Verify RLS policies are enabled (in Supabase dashboard → Authentication → Policies)
- Check network tab to see if requests are being made
- Verify you're signed in (check user email in header)

### Schema errors

- Make sure you ran `SUPABASE_SETUP.sql` completely
- Check Supabase dashboard → Table Editor to see if tables exist
- Verify column types match (especially `tags` should be array)

## Next Steps

- Customize RLS policies if needed
- Set up email templates in Supabase dashboard
- Configure password reset flows
- Add OAuth providers (Google, GitHub, etc.) if desired

## Security Notes

- The `anon` key is safe for frontend use (protected by RLS)
- Never commit your `.env` file to git (it's in `.gitignore`)
- Each user can only access their own data (enforced by RLS)
- Sensitive entries (`is_sensitive: true`) are excluded from summaries

