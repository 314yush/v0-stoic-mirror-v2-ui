# Download & Install Stoic Mirror

## Quick Install (3 Steps)

### 1. Download
Choose the right file for your Mac:
- **Apple Silicon (M1/M2/M3)**: Download `Stoic Mirror-0.1.0-arm64.dmg`
- **Intel Mac**: Download `Stoic Mirror-0.1.0.dmg`

### 2. Install
1. Double-click the downloaded `.dmg` file
2. Drag "Stoic Mirror" to your Applications folder
3. Eject the disk image

### 3. Open
1. Open Applications folder
2. Find "Stoic Mirror"
3. Right-click → Open (first time only - macOS security)
4. Click "Open" in the dialog

## First-Time Setup

After opening the app:

1. **Create Account**
   - Sign up with your email
   - Create a password (6+ characters)

2. **Set Up Backend (Supabase)**
   - Go to [supabase.com](https://supabase.com)
   - Create a free account
   - Create a new project
   - Get your Project URL and Anon Key from Settings → API
   - Copy the SQL from `SUPABASE_SETUP.sql` and run it in SQL Editor
   - Also run `SUPABASE_TASKS_UPDATE.sql` and `SUPABASE_UPDATE_TITLE.sql`
   - Enter your Supabase credentials in the app Settings

3. **Set Up AI (Optional)**
   - **Option A - Local (Privacy-First):**
     - Install [Ollama](https://ollama.ai)
     - Download a model: `ollama pull llama3.2:1b`
     - App will detect it automatically
   - **Option B - Cloud (Easy):**
     - Get Gemini API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
     - Enter in app Settings

4. **Start Using!**
   - Today: Plan your daily schedule
   - Journal: Reflect with AI
   - Tasks: Track your to-dos
   - Weekly: See your progress

## Troubleshooting

**"App cannot be opened" warning:**
- This is normal for unsigned apps
- Right-click → Open → Click "Open" in dialog

**"App is damaged" error:**
- Open Terminal
- Run: `xattr -cr "/Applications/Stoic Mirror.app"`
- Try opening again

**AI not working:**
- Check Ollama is running: `ollama list`
- Or verify Gemini API key in Settings

**Sync errors:**
- Check Supabase credentials
- Check internet connection
- Verify SQL scripts were run correctly

## System Requirements

- macOS 10.13 (High Sierra) or later
- Internet connection (for Supabase sync)
- ~200 MB disk space

## Need Help?

Check the [README.md](./README.md) for detailed setup instructions, or contact the developer.
