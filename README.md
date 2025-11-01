# Stoic Mirror

A mindful productivity app for daily routines, journaling, and task management with AI-powered insights. Built with React, TypeScript, Electron, and Supabase.

## Features

- 📅 **Today Tab**: Plan and track your daily schedule with time blocks
- 📝 **Journal Tab**: AI-powered journaling with empathetic conversation
- ✅ **Tasks Tab**: Simple, clean to-do list with completion tracking
- 📊 **Weekly Tab**: Analytics and insights into your routines and habits
- 🔔 **Evening Nudge**: Reminder to set tomorrow's routine
- ⚡ **Menu Bar Widget**: Quick access via macOS menu bar (Electron)
- 🤖 **AI Integration**: Local Ollama (privacy-first) with Gemini fallback

## Tech Stack

- **Frontend**: React + TypeScript + TailwindCSS
- **State Management**: Zustand with persistence
- **Backend**: Supabase (PostgreSQL + Auth + Real-time)
- **AI**: Ollama (local) + Gemini API (cloud fallback)
- **Desktop**: Electron with menu bar integration

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- (Optional) Ollama installed locally for AI features

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/314yush/v0-stoic-mirror-v2-ui.git
cd v0-stoic-mirror-v2-ui
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Get your API keys from **Settings → API**:
   - Project URL
   - Anon/public key
3. Run the SQL schema in Supabase SQL Editor:
   - Copy contents of `SUPABASE_SETUP.sql`
   - Also run `SUPABASE_TASKS_UPDATE.sql` (adds tasks table)
   - Also run `SUPABASE_UPDATE_TITLE.sql` (adds title column to journal)

### 4. Configure Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
VITE_GEMINI_API_KEY=your-gemini-api-key  # Optional, for AI fallback
```

**Security Note**: These are safe to expose (anon key is RLS-protected). Never commit `.env` to git.

### 5. Run Development Server

**Web version:**
```bash
npm run dev
```

**Electron app:**
```bash
npm run dev:electron
```

## Keyboard Shortcuts

- `Cmd/Ctrl + J` - Jump to Journal tab
- `Cmd/Ctrl + T` - Jump to Today tab
- `Cmd/Ctrl + W` - Jump to Weekly tab
- `Cmd/Ctrl + K` - Jump to Tasks tab
- `Cmd/Ctrl + Enter` - Quick save (in journal widget)

## Project Structure

```
├── src/
│   ├── renderer/          # React app (frontend)
│   │   ├── components/    # UI components
│   │   ├── lib/           # State, stores, utilities
│   │   └── styles/        # CSS & Tailwind config
│   ├── main/              # Electron main process
│   └── preload/           # Electron preload script
├── assets/                # Icons and assets
└── dist/                  # Build output
```

## Architecture

### Offline-First
- All data stored locally first (localStorage/Zustand)
- Background sync to Supabase when online
- Works fully offline, syncs when connection restored

### AI Providers
- **Ollama** (default): Local, private, fast
- **Gemini** (fallback): Cloud-based, requires API key
- Automatic fallback if Ollama unavailable

### Security
- Supabase Row Level Security (RLS) enabled
- Ollama URL validation (localhost only, prevents SSRF)
- Environment variables for sensitive config
- No hardcoded secrets

## Building for Production

### Web Build
```bash
npm run build
```

### Electron App
```bash
npm run build:electron  # Build all Electron components
npm run build:app       # Create distributable app
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |
| `VITE_GEMINI_API_KEY` | Optional | For Gemini AI fallback |

## Database Schema

The app uses these Supabase tables:
- `journal_entries` - Journal entries with AI summaries
- `schedule_commits` - Daily routine commits
- `tasks` - Task list items
- `user_settings` - User preferences (optional)

See `SUPABASE_SETUP.sql` for full schema.

## Troubleshooting

### Supabase Not Configured
- Ensure `.env` file exists in project root
- Restart dev server after creating `.env` (Vite only reads `.env` on startup)
- Check browser console for configuration errors
- Verify variables are prefixed with `VITE_`

### Ollama Connection Issues
- Ensure Ollama is running: `ollama serve`
- Default URL: `http://localhost:11434`
- Test connectivity: `curl http://localhost:11434/api/tags`
- **Security**: Only localhost URLs are allowed (validated automatically)

### Widget Not Appearing (Electron)
- Check menu bar icon is visible
- Try right-clicking the icon
- Check console for errors
- Ensure `assets/tray-icon.png` exists

### Environment Variables
- See [Environment Variables](#environment-variables) section above
- `.env` file should be in project root (not committed to git)

For detailed troubleshooting, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) and [SECURITY.md](./SECURITY.md).

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

Private project - All rights reserved
