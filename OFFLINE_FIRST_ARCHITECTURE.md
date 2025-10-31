# Offline-First Architecture Design

## Challenge
- App must work **fully offline** (local-first)
- Ollama is **optional** (only if user installs locally)
- Other users won't have Ollama
- Need AI features to work for everyone

## Solution: **Hybrid AI with Smart Fallback**

### Architecture Flow

```
User chats → Try Ollama (if available) → Fallback to Cloud AI → Cache response locally
                    ↓
              If offline & no Ollama → Use cached responses or basic local model
```

---

## Implementation Strategy

### 1. **AI Provider Priority**

**Priority Order:**
1. **Ollama (local)** - If detected and running
2. **Cloud AI (Supabase Edge Function)** - If online, Ollama not available
3. **Cached responses** - If offline, use previous similar responses
4. **Local fallback** - Basic rule-based responses (last resort)

### 2. **Ollama Detection**

```typescript
async function detectOllama(): Promise<boolean> {
  try {
    const response = await fetch('http://localhost:11434/api/tags', {
      timeout: 1000 // Quick check
    })
    return response.ok
  } catch {
    return false
  }
}
```

### 3. **Smart Fallback Logic**

```
On chat request:
1. Check if Ollama is available → Use it
2. If not, check if online → Use cloud AI
3. If offline + no Ollama → Use cached responses or basic fallback
4. Cache all responses locally (for offline use)
```

### 4. **Cloud AI Options**

**Option A: Supabase Edge Functions** (Recommended)
- Serverless functions
- Can proxy to OpenAI/Anthropic
- Free tier: 500K invocations/month
- API keys stored server-side (secure)

**Option B: Direct API with API keys**
- User provides their own API keys
- More control, but keys in client (less secure)
- Free tiers: OpenAI ($5), Anthropic (trial)

**Recommendation: Supabase Edge Functions**
- Keys stay on server
- Easy to switch providers
- Built-in auth integration

---

## Offline-First Data Strategy

### All Data Stored Locally First

**Pattern:**
```
User Action → Local Storage (immediate) → Queue for Sync → Supabase (when online)
```

**Benefits:**
- Works offline
- Fast (no network delay)
- Can sync later
- Never lose data

### Sync Strategy

1. **Queue local changes**
2. **Sync in background** when online
3. **Handle conflicts** (last write wins, or merge)
4. **Retry on failure**

---

## AI Response Caching

### Cache Recent Responses Locally

**Why:**
- Works offline
- Faster (no API calls)
- Saves API costs

**Storage:**
```typescript
// Cache last 50 AI responses locally
// Key: hash of user message → AI response
// Expire after 24 hours
```

**Use case:**
- User asks similar question offline
- Use cached response if similar
- Fallback to basic rule-based if no match

---

## Implementation Plan

### Phase 1: Ollama Detection + Fallback
1. Auto-detect Ollama on startup
2. Try Ollama first, fallback to cloud
3. Show user which provider is active
4. Cache all responses locally

### Phase 2: Cloud AI Integration
1. Set up Supabase Edge Function
2. Proxy to OpenAI/Anthropic
3. Add API key management (admin)
4. Fallback chain: Ollama → Cloud → Cache → Basic

### Phase 3: Offline Optimization
1. Pre-cache common responses
2. Rule-based fallback for offline
3. Queue requests when offline, sync when online

---

## User Experience

### UI Indicators

**AI Status Badge:**
- 🟢 "Ollama (Local)" - Using local Ollama
- 🔵 "Cloud AI" - Using Supabase/Cloud
- ⚠️ "Offline Mode" - Using cached/basic responses
- 🔄 "Syncing..." - Syncing data

**Settings:**
- Toggle: "Prefer Ollama" (if available)
- Toggle: "Use Cloud AI" (as fallback)
- Toggle: "Offline mode only"

---

## Privacy Tiers

### Tier 1: Fully Private (Ollama)
- Everything local
- No data leaves device
- Requires Ollama installed

### Tier 2: Hybrid (Ollama + Cloud Sync)
- AI responses: Ollama (local)
- Data sync: Supabase (encrypted)
- Best of both worlds

### Tier 3: Cloud Only
- AI: Cloud API
- Data: Supabase
- Works for everyone
- Requires internet

---

## Next Steps

Want me to implement:
1. ✅ Ollama auto-detection
2. ✅ Fallback to cloud AI when Ollama unavailable
3. ✅ Response caching for offline
4. ✅ UI indicators for AI provider status
5. ✅ Settings to choose preference

