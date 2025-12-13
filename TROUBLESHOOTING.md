# Troubleshooting Supabase Integration

## Common Issues and Solutions

### Issue: "Supabase not configured" warning

**Symptoms:**
- Warning in browser console about Supabase not being configured
- Login screen doesn't appear or doesn't work

**Solution:**

1. **Check `.env` file exists:**
   ```bash
   cat .env
   ```
   Should show:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

2. **Restart dev server:**
   - Stop the current server (Ctrl+C)
   - Run `npm run dev` again
   - **Important:** Vite only reads `.env` on startup!

3. **Hard refresh browser:**
   - Chrome/Edge: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
   - Firefox: `Cmd+Shift+R` (Mac) or `Ctrl+F5` (Windows)

### Issue: "Invalid API key" or authentication errors

**Symptoms:**
- Error when trying to sign up/sign in
- "Invalid API key" in console

**Solutions:**

1. **Verify API keys are correct:**
   - Go to Supabase Dashboard → Settings → API
   - Copy the **Project URL** and **anon/public key** again
   - Make sure there are no extra spaces or quotes in `.env`

2. **Check .env file format:**
   ```env
   # ✅ Correct:
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   
   # ❌ Wrong (with quotes):
   VITE_SUPABASE_URL="https://xxxxx.supabase.co"
   ```

3. **Verify variables are prefixed with `VITE_`:**
   - Vite only exposes variables starting with `VITE_`
   - Without this prefix, variables won't be available in the browser

### Issue: "Table doesn't exist" or database errors

**Symptoms:**
- Error when syncing data
- "relation does not exist" in console

**Solution:**

1. **Run the SQL schema:**
   - Go to Supabase Dashboard → SQL Editor
   - Copy entire contents of `SUPABASE_SETUP.sql`
   - Paste and click "Run" (or Cmd/Ctrl + Enter)
   - Verify tables exist in Table Editor

2. **Check table names:**
   - Should have: `journal_entries`, `schedule_commits`, `user_settings`

### Issue: Can't sign up (email confirmation required)

**Symptoms:**
- Sign up seems to work but user not logged in
- No error message

**Solution:**

1. **Disable email confirmation (for testing):**
   - Go to Supabase Dashboard → Authentication → Settings
   - Under "Email Auth", toggle "Enable email confirmations" OFF
   - Save

2. **Or check your email:**
   - Supabase sends a confirmation email
   - Click the link to verify your account
   - Then try signing in

### Issue: Data not syncing

**Symptoms:**
- Journal entries or schedules not appearing in Supabase
- No errors but nothing in database

**Solutions:**

1. **Check browser console:**
   - Open DevTools (F12)
   - Look for errors in Console tab
   - Check Network tab for failed requests

2. **Verify you're signed in:**
   - Check if your email appears in the header
   - If not, sign in first

3. **Check Row Level Security (RLS):**
   - Go to Supabase Dashboard → Table Editor
   - Verify RLS is enabled (should see lock icon)
   - If disabled, run `SUPABASE_SETUP.sql` again

4. **Manual sync test:**
   - Open browser console
   - Type: `localStorage.getItem('sync_queue')`
   - Should show queued items if sync is failing

### Issue: Port 5173 already in use

**Symptoms:**
- Can't start dev server
- "Port 5173 is already in use" error

**Solution:**

1. **Find and kill the process:**
   ```bash
   # Find process using port 5173
   lsof -ti:5173
   
   # Kill it
   kill -9 $(lsof -ti:5173)
   ```

2. **Or use a different port:**
   - Edit `vite.config.ts`
   - Change `port: 5173` to another port like `5174`

### Debug Checklist

Run through this checklist:

- [ ] `.env` file exists in project root (same level as `package.json`)
- [ ] `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- [ ] Variables start with `VITE_` prefix
- [ ] No quotes around values in `.env`
- [ ] Dev server restarted after adding `.env`
- [ ] Browser hard refreshed (Cmd+Shift+R)
- [ ] Supabase project exists and is active
- [ ] SQL schema (`SUPABASE_SETUP.sql`) has been run
- [ ] Tables exist in Supabase Table Editor
- [ ] RLS policies are enabled
- [ ] Browser console checked for errors

### Getting Help

If you're still stuck:

1. **Check browser console:**
   - Open DevTools (F12)
   - Look at Console and Network tabs
   - Copy any error messages

2. **Check Supabase dashboard:**
   - Go to Logs → API Logs
   - See if requests are being made
   - Check for errors

3. **Test Supabase connection:**
   ```javascript
   // In browser console:
   console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
   console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
   ```

4. **Share details:**
   - Error message from console
   - Screenshot of Supabase dashboard (API settings)
   - Output of debug commands above

