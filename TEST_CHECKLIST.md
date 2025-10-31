# Test Checklist - täglich OS Web App

## ✅ What's Ready to Test

### Journal Tab

1. **Core Writing Experience**
   - [x] Big "What's on your mind?" textarea with placeholder text
   - [x] Mood selector (5 emojis: 😌 🙂 😐 😣 😡)
   - [x] Tags with preset chips + custom tag input
   - [x] Sensitive entry toggle
   - [x] Visibility selector (Private/Shared)
   - [x] Save entry (Cmd/Ctrl+S shortcut works)
   - [x] Content persists in localStorage

2. **AI Assistant Panel**
   - [x] "Write with AI" button opens side panel
   - [x] 4 modes: Reflect, Unstick, Reframe, Gratitude
   - [x] Micro-prompts (can cycle through them)
   - [x] Generate button creates compassionate bullets
   - [x] Suggested tags extraction
   - [x] Apply to entry button

3. **Content Privacy**
   - [x] Cmd/Ctrl+L toggles content lock (blurs entries)
   - [x] Sensitive entries are excluded from analytics
   - [x] All data stored locally (check DevTools > Application > Local Storage)

4. **Discovery & Search**
   - [x] Search bar (full-text search)
   - [x] Filter by mood
   - [x] Filter by tags
   - [x] List view shows all entries

5. **Timeline View**
   - [x] Mood dots organized by month
   - [x] Hover tooltips show entry preview
   - [x] Visual timeline of all entries

6. **Weekly Snapshot**
   - [x] Most frequent feelings (top 3 moods from last 7 days)
   - [x] Top themes (most used tags)
   - [x] Kind suggestion for next week
   - [x] 3 representative recent entries
   - [x] Excludes sensitive entries from stats

7. **Integrations**
   - [x] Today tab has "Add Journal" quick capture button
   - [x] Weekly tab shows journal snapshot panel

### Today Tab
- [x] Schedule blocks
- [x] Routine presets (weekday/weekend)
- [x] Quick journal button

### Weekly Tab
- [x] Heatmap grid
- [x] Journal snapshot panel integrated

## ⚠️ What's Partially Implemented

1. **Nudges**
   - ✅ Basic midday (12pm) and evening (8pm) toast notifications
   - ❌ No "Snooze 20m" functionality on nudge toasts yet

2. **AI Panel**
   - ✅ Mock responses work
   - ⚠️ Uses placeholder data (real AI integration pending)

## 🔍 How to Test

### Basic Flow
1. Open http://localhost:5173
2. Click "Journal" tab
3. Write an entry, add mood/tags, save
4. Verify it appears in list view
5. Try search/filter
6. Switch to Timeline view - see mood dots
7. Switch to Weekly view - see snapshot

### Keyboard Shortcuts
- `Cmd/Ctrl + Shift + J` → Journal tab
- `Cmd/Ctrl + Shift + T` → Today tab  
- `Cmd/Ctrl + Shift + W` → Weekly tab
- `Cmd/Ctrl + S` → Save journal entry
- `Cmd/Ctrl + L` → Lock/unlock journal content

### Privacy Testing
1. Create entry, mark as "Sensitive"
2. Go to Weekly tab → Journal Snapshot
3. Verify sensitive entry doesn't appear in stats

### Quick Capture
1. Go to Today tab
2. Click "Add Journal" button
3. Quick modal opens, type entry, save
4. Go to Journal tab, verify entry appears

### AI Panel
1. Write some content
2. Click "Write with AI"
3. Select a mode (Reflect/Unstick/Reframe/Gratitude)
4. Click "Generate Response"
5. Review bullets and suggested tags
6. Click "Apply to Entry"

## 🐛 Known Issues / Missing

1. **Nudge Snooze** - Toasts show but can't snooze yet
2. **Real AI** - Currently mock responses (needs API integration)
3. **Entry Editing** - Can't edit existing entries (only create/delete)
4. **Entry Detail View** - Clicking entry doesn't open full view

## 💾 Data Persistence

All data is stored in browser localStorage:
- Key: `journal_entries_v1`
- Data persists across browser refreshes
- Clear data: DevTools > Application > Local Storage > Delete key

---

**Ready to test!** The core MVP features are working. Try creating a few entries and exploring the different views.

