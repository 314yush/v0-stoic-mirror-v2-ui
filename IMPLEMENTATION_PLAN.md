# Stoic Mirror - Cohesive Architecture Implementation Plan

## Overview
Transform Stoic Mirror into a cohesive identity-first calendar app with AI as the connective tissue.

---

## Phase 1: Google Calendar Integration (Foundation)

### Goal
Make Stoic Mirror work with Google Calendar so users can import existing events and use it as their primary calendar.

### Technical Requirements

#### 1. Dependencies
```bash
npm install googleapis @google-cloud/local-auth
npm install --save-dev @types/googleapis
```

#### 2. Google Cloud Setup
1. Create Google Cloud Project
2. Enable Google Calendar API
3. Create OAuth 2.0 credentials (Desktop app)
4. Add redirect URI: `http://localhost` (for Electron)

#### 3. Environment Variables
Add to `.env`:
```env
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your-client-secret
```

### Implementation Steps

#### Step 1.1: Create Google Calendar Service
**File:** `src/renderer/lib/google-calendar-service.ts`

```typescript
import { google } from 'googleapis'
import type { TimeBlock } from './schedule-store'

export interface GoogleCalendarEvent {
  id: string
  summary: string
  start: { dateTime: string; timeZone: string }
  end: { dateTime: string; timeZone: string }
  description?: string
  location?: string
}

export class GoogleCalendarService {
  private oauth2Client: any
  private calendar: any

  constructor() {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
    const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET
    
    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      'http://localhost' // Redirect URI for Electron
    )
  }

  async authenticate(): Promise<boolean> {
    // OAuth flow for Electron
    // Store tokens securely
  }

  async importEvents(startDate: Date, endDate: Date): Promise<GoogleCalendarEvent[]> {
    // Fetch events from Google Calendar
  }

  async exportBlock(block: TimeBlock, date: string): Promise<void> {
    // Create event in Google Calendar
  }

  async syncEvents(blocks: TimeBlock[], date: string): Promise<void> {
    // Two-way sync (optional)
  }
}
```

#### Step 1.2: Add Calendar Store
**File:** `src/renderer/lib/calendar-store.ts`

```typescript
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { GoogleCalendarService } from './google-calendar-service'

interface CalendarState {
  isConnected: boolean
  googleCalendarService: GoogleCalendarService | null
  importedEvents: Map<string, any[]> // date -> events
  connectGoogleCalendar: () => Promise<void>
  disconnectGoogleCalendar: () => void
  importEvents: (startDate: Date, endDate: Date) => Promise<void>
  exportBlock: (block: TimeBlock, date: string) => Promise<void>
}

export const useCalendarStore = create<CalendarState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      googleCalendarService: null,
      importedEvents: new Map(),
      connectGoogleCalendar: async () => {
        const service = new GoogleCalendarService()
        const connected = await service.authenticate()
        set({ isConnected: connected, googleCalendarService: service })
      },
      // ... other methods
    }),
    { name: 'calendar_state' }
  )
)
```

#### Step 1.3: Update Settings Modal
Add Google Calendar connection UI in `settings-modal.tsx`:
- "Connect Google Calendar" button
- Show connection status
- Import events button
- Sync preferences

#### Step 1.4: Update Today Tab
- Show imported Google Calendar events alongside Stoic Mirror blocks
- Visual distinction (different color/border)
- Allow merging/conflict resolution

### Database Schema Changes
**File:** `SUPABASE_GOOGLE_CALENDAR.sql`

```sql
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS imported_calendar_events (
  id TEXT PRIMARY KEY, -- Google Calendar event ID
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_event_id TEXT NOT NULL,
  summary TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, google_event_id)
);

-- RLS policies
ALTER TABLE google_calendar_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE imported_calendar_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own calendar connections"
  ON google_calendar_connections FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own imported events"
  ON imported_calendar_events FOR ALL
  USING (auth.uid() = user_id);
```

---

## Phase 2: Calendar UI Improvements (Revised with Best Practices)

### Goal
Make the Today tab a professional calendar app using proven libraries and UX patterns.

### Key Principles
- **Day & Week views are primary** (90% of productivity happens here)
- **Two-pane layout**: Left = tasks/events list, Right = calendar grid
- **Drag-and-drop everywhere** (non-negotiable)
- **Use FullCalendar.io** (don't reinvent the wheel)
- **Natural language input** (ChronoJS)
- **Local-first with optimistic UI**

### Technical Requirements

#### Dependencies (Already Installed)
```bash
npm install @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction
npm install chrono-node rrule
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### Implementation Steps

#### Step 2.1: Create Two-Pane Layout Container
**File:** `src/renderer/components/today/calendar-container.tsx`

```typescript
export function CalendarContainer() {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day')
  
  return (
    <div className="flex h-full">
      {/* Left Pane: Tasks/Events List */}
      <TasksEventsList />
      
      {/* Right Pane: Calendar Grid */}
      <FullCalendarWrapper viewMode={viewMode} />
    </div>
  )
}
```

#### Step 2.2: Create Tasks/Events List (Left Pane)
**File:** `src/renderer/components/today/tasks-events-list.tsx`

```typescript
export function TasksEventsList() {
  // Show:
  // - Unscheduled tasks (draggable)
  // - Today's events (from Google Calendar)
  // - Quick actions
  // - Natural language input
}
```

#### Step 2.3: Create FullCalendar Wrapper
**File:** `src/renderer/components/today/fullcalendar-wrapper.tsx`

```typescript
import FullCalendar from '@fullcalendar/react'
import timeGridDay from '@fullcalendar/timegrid'
import timeGridWeek from '@fullcalendar/timegrid'
import dayGridMonth from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'

export function FullCalendarWrapper({ viewMode }: Props) {
  // Custom event rendering for Stoic Mirror blocks
  // Show Google Calendar events
  // Handle drag-and-drop
  // Snap to 15/30min grid
}
```

#### Step 2.4: Add Natural Language Input
**File:** `src/renderer/components/today/natural-language-input.tsx`

```typescript
import * as chrono from 'chrono-node'

export function NaturalLanguageInput() {
  // Parse: "Meeting tomorrow 2pm"
  // Create event/task automatically
  // Use ChronoJS for parsing
}
```

#### Step 2.5: Implement Drag-and-Drop
**File:** `src/renderer/components/today/calendar-dnd.tsx`

```typescript
import { DndContext, DragOverlay } from '@dnd-kit/core'
import { SortableContext } from '@dnd-kit/sortable'

// Tasks → Calendar (time-blocking)
// Events → Reschedule
// Blocks → Move between days
// Optimistic UI updates
```

#### Step 2.6: Create Today Strip
**File:** `src/renderer/components/today/today-strip.tsx`

```typescript
export function TodayStrip() {
  // Compressed today view
  // Shows: tasks + events + blocked time
  // Quick overview in header/sidebar
}
```

#### Step 2.7: Update Today Tab
- Replace current timeline with FullCalendar
- Add two-pane layout
- Default to **day view** (not week)
- Add view toggle (Day/Week/Month)
- Integrate drag-and-drop
- Add natural language input

---

## Phase 3: AI Connective Layer

### Goal
Build AI features that connect Calendar → Journal → Weekly → Tasks

### Implementation Steps

#### Step 3.1: AI Routine Maker
**File:** `src/renderer/lib/ai-routine-maker.ts`

```typescript
export interface RoutineSuggestion {
  identity: string
  startTime: string
  endTime: string
  reasoning: string
  confidence: number
}

export async function suggestRoutinePlacement(
  habits: string[],
  context: AIContext
): Promise<RoutineSuggestion[]> {
  // AI analyzes:
  // - Historical schedule patterns
  // - Completion rates by time
  // - North star alignment
  // - Energy levels
  // - Current schedule gaps
  
  const prompt = `
    User wants to add: ${habits.join(', ')}
    North Star: ${context.userProfile?.northStar}
    Current schedule patterns: ${formatSchedulePatterns(context)}
    Historical completion rates: ${formatCompletionRates(context)}
    
    Suggest optimal times for each habit with reasoning.
  `
  
  // Call AI (Ollama/Gemini)
  // Parse response into RoutineSuggestion[]
}
```

**File:** `src/renderer/components/today/ai-routine-maker-modal.tsx`

```typescript
export function AIRoutineMakerModal({ 
  isOpen, 
  onClose, 
  onApply 
}: AIRoutineMakerModalProps) {
  const [habits, setHabits] = useState<string[]>([])
  const [suggestions, setSuggestions] = useState<RoutineSuggestion[]>([])
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    const context = buildAIContext({ /* ... */ })
    const suggestions = await suggestRoutinePlacement(habits, context)
    setSuggestions(suggestions)
    setLoading(false)
  }

  // UI: Input habits, show AI suggestions, apply to calendar
}
```

#### Step 3.2: AI Schedule Optimizer
**File:** `src/renderer/lib/ai-schedule-optimizer.ts`

```typescript
export interface ScheduleOptimization {
  originalBlocks: TimeBlock[]
  optimizedBlocks: TimeBlock[]
  changes: {
    moved: { block: TimeBlock; from: string; to: string }[]
    added: TimeBlock[]
    removed: TimeBlock[]
  }
  reasoning: string
  expectedImprovement: string
}

export async function optimizeSchedule(
  weekCommits: DayCommit[],
  context: AIContext
): Promise<ScheduleOptimization> {
  // AI analyzes:
  // - Current week's schedule
  // - Historical patterns
  // - Identity balance
  // - Energy/productivity patterns
  // - Conflicts
  
  // Returns optimized schedule with reasoning
}
```

#### Step 3.3: AI Conflict Resolver
**File:** `src/renderer/lib/ai-conflict-resolver.ts`

```typescript
export async function resolveConflict(
  newBlock: TimeBlock,
  conflictingEvents: (TimeBlock | GoogleCalendarEvent)[],
  context: AIContext
): Promise<{
  suggestion: 'move' | 'make-optional' | 'reschedule' | 'skip'
  newTime?: { start: string; end: string }
  reasoning: string
}> {
  // AI suggests best resolution based on:
  // - Block importance (identity alignment)
  // - Historical patterns
  // - User preferences
}
```

#### Step 3.4: AI Habit Suggestion Engine
**File:** `src/renderer/lib/ai-habit-suggestions.ts`

```typescript
export interface HabitSuggestion {
  habit: string
  identity: string
  reasoning: string
  suggestedTime?: string
  priority: 'high' | 'medium' | 'low'
}

export async function suggestHabits(
  context: AIContext
): Promise<HabitSuggestion[]> {
  // AI analyzes:
  // - North star goals
  // - Current identity distribution
  // - Journal themes (stress, energy, etc.)
  // - Missed routines
  
  // Returns personalized habit suggestions
}
```

#### Step 3.5: Update AI Context Builder
**File:** `src/renderer/lib/ai-context-builder.ts`

Add Google Calendar events to context:
```typescript
export interface AIContext {
  // ... existing fields
  googleCalendarEvents?: GoogleCalendarEvent[]
  calendarConflicts?: Conflict[]
  identityBalance?: {
    current: Record<string, number> // identity -> hours
    goal: Record<string, number>
    gap: Record<string, number>
  }
}
```

---

## Phase 4: Enhanced AI Features

### Goal
Connect Journal → Calendar, Weekly → Calendar, etc.

### Implementation Steps

#### Step 4.1: Journal → Calendar Connection
**File:** `src/renderer/lib/ai-journal-calendar-bridge.ts`

```typescript
export async function extractCalendarActions(
  journalEntry: JournalEntry,
  context: AIContext
): Promise<{
  suggestions: TimeBlock[]
  insights: string[]
}> {
  // AI analyzes journal entry:
  // - Mentions of stress → suggest meditation/breathing
  // - Mentions of energy → suggest exercise
  // - Mentions of goals → suggest relevant blocks
  // - Mentions of time constraints → optimize schedule
}
```

**Update:** `src/renderer/components/journal/journal-tab.tsx`
- After journal entry, show AI suggestions: "Based on your journal, consider adding..."
- Button to apply suggestions to calendar

#### Step 4.2: Weekly → Calendar Connection
**File:** `src/renderer/lib/ai-weekly-calendar-bridge.ts`

```typescript
export async function generateCalendarRecommendations(
  weeklyInsights: WeeklyInsights,
  context: AIContext
): Promise<{
  recommendations: string[]
  suggestedBlocks: TimeBlock[]
  identityAdjustments: { identity: string; change: number }[]
}> {
  // AI analyzes weekly insights:
  // - Identity imbalance → suggest rebalancing
  // - Fading routines → suggest reinforcement
  // - Emerging routines → suggest promotion
  // - Missed blocks → suggest alternatives
}
```

**Update:** `src/renderer/components/weekly/weekly-tab.tsx`
- Show "AI Recommendations" section
- "Apply to Calendar" button

#### Step 4.3: AI Productivity Coach
**File:** `src/renderer/lib/ai-productivity-coach.ts`

```typescript
export async function generateCoachingReport(
  context: AIContext
): Promise<{
  insights: string[]
  recommendations: string[]
  progress: {
    identity: string
    trend: 'improving' | 'stable' | 'declining'
    action: string
  }[]
}> {
  // Weekly coaching report:
  // - What's working
  // - What needs attention
  // - Identity progress
  // - Personalized recommendations
}
```

**File:** `src/renderer/components/weekly/ai-coaching-panel.tsx`
- Show weekly coaching report
- Actionable recommendations
- Progress tracking

---

## Phase 5: Full Cohesion

### Goal
Make all tabs work together seamlessly with AI

### Implementation Steps

#### Step 5.1: Unified AI Context
- Ensure all AI features use the same context builder
- Consistent data flow across tabs
- Real-time context updates

#### Step 5.2: Cross-Tab Navigation
- "Add to Calendar" from Journal
- "Reflect on this" from Calendar
- "See insights" from Tasks
- Seamless flow between tabs

#### Step 5.3: AI Suggestions Everywhere
- Calendar: AI suggests blocks, optimizes schedule
- Journal: AI prompts based on schedule
- Weekly: AI generates insights
- Tasks: AI creates tasks from missed blocks

#### Step 5.4: Identity-First Throughout
- All blocks tagged with identity
- All analytics show identity progress
- All AI suggestions align with north star
- Visual identity indicators everywhere

---

## Implementation Order (Recommended)

### Week 1: Foundation
1. ✅ Google Calendar OAuth setup
2. ✅ Google Calendar service (import events)
3. ✅ Calendar store
4. ✅ Settings UI for connection

### Week 2: Calendar UI (Revised)
1. ✅ Install FullCalendar + dependencies
2. ✅ Two-pane layout (tasks list + calendar)
3. ✅ FullCalendar integration (day/week views)
4. ✅ Drag-and-drop implementation
5. ✅ Natural language input
6. ✅ Today strip component

### Week 3: AI Core Features
1. ✅ AI Routine Maker
2. ✅ AI Schedule Optimizer
3. ✅ AI Conflict Resolver
4. ✅ Update AI context builder

### Week 4: AI Connections
1. ✅ Journal → Calendar bridge
2. ✅ Weekly → Calendar bridge
3. ✅ AI Habit Suggestions
4. ✅ AI Productivity Coach

### Week 5: Polish & Integration
1. ✅ Cross-tab navigation
2. ✅ Unified AI context
3. ✅ Identity-first throughout
4. ✅ Testing & refinement

---

## Technical Considerations

### Security
- Google OAuth tokens stored encrypted
- Refresh tokens handled securely
- API keys in environment variables
- No tokens in code

### Performance
- Lazy load Google Calendar events
- Cache AI responses
- Optimize calendar rendering
- Background sync

### Error Handling
- Graceful degradation if Google Calendar unavailable
- Fallback to local-only mode
- Clear error messages
- Retry logic for API calls

### Testing
- Unit tests for AI functions
- Integration tests for calendar sync
- E2E tests for user flows
- Manual testing for AI quality

---

## Success Metrics

1. **Calendar Usage**: 80%+ users connect Google Calendar
2. **AI Engagement**: 50%+ users use AI suggestions weekly
3. **Cohesion**: 60%+ users use multiple tabs in same session
4. **Identity Progress**: Users see measurable progress toward north star
5. **Retention**: 70%+ weekly active users

---

## Next Steps

1. **Review this plan** - Get feedback, adjust priorities
2. **Set up Google Cloud** - Create project, enable APIs
3. **Start Phase 1** - Google Calendar integration
4. **Iterate** - Build, test, refine

---

## Questions to Resolve

1. **OAuth Flow**: How to handle OAuth in Electron? (popup window vs. system browser)
2. **Token Storage**: Where to store Google tokens securely? (encrypted in Supabase?)
3. **Sync Frequency**: How often to sync with Google Calendar? (real-time vs. periodic)
4. **Conflict Resolution**: Auto-resolve or always ask user?
5. **AI Model**: Use Ollama for all features or mix with Gemini?

---

Ready to start? Let's begin with Phase 1: Google Calendar Integration! 🚀

