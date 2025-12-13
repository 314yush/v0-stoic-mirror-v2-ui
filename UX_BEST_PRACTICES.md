# Calendar Integration - UX/UI Best Practices

## Core Principles Applied to Stoic Mirror

### 1. Embedded Calendar Experience
- **Two-pane layout**: Left = tasks/events list, Right = calendar grid
- Keep calendar inline with workflow (not separate page)
- Seamless integration with existing tabs

### 2. Day & Week View Primary
- Default to **current day** when app opens
- Week view as secondary (90% of productivity happens here)
- Month view for planning only (not primary interaction)

### 3. Drag-and-Drop Everywhere
- Reorder tasks in list
- Drag tasks onto time slots to time-block
- Drag events to reschedule
- Drag blocks between days in week view

### 4. Visual Clarity > Density
- Subtle background colors (not rainbow clutter)
- Show only: title, time, identity tag
- Clean, minimal design
- Collapse empty hours for busy schedules

### 5. Lightweight Task-Calendar Interaction
- Drag task → time slot = time-block
- Quick action: "Schedule for 4pm"
- No modal popups for simple changes
- Natural language: "Call John tomorrow at 4pm"

### 6. Smooth Micro-Interactions
- Snap to 15/30min grid
- Hover previews (show end time when dragging)
- Natural animations
- Optimistic UI updates

### 7. Smart Defaults
- Auto-set event length (30 or 60 mins)
- Auto-assign identity based on context
- Auto-color coding by identity
- Smart time suggestions

### 8. Clean "Today" Strip
- Compressed list of today's schedule
- Includes: tasks + events + blocked time
- Quick overview without opening full calendar

### 9. Natural Language Input
- "Call John tomorrow at 4pm" → event
- "Finish proposal next Friday" → task with due date
- Use ChronoJS for parsing

### 10. Performance Optimizations
- Virtualize long lists
- Memoize rendering
- Preload current week
- Local-first with optimistic UI

---

## Technical Architecture Updates

### Use Existing Libraries (Don't Reinvent)
- **FullCalendar.io** - Calendar rendering
- **ChronoJS** - Natural language parsing
- **rrule** - Recurring events
- **React DnD** or **@dnd-kit** - Drag and drop

### Data Architecture
- **Events**: Time-bound (calendar)
- **Tasks**: State-bound (optional due date)
- **Separate tables**, connected via relational IDs
- **Single source of truth**: Calendar controls time, Tasks control state

### Sync Strategy
- **Incremental sync** with sync tokens
- **Conflict resolver**: Last writer wins + logs
- **Webhooks/push** for external updates
- **Local-first**: Optimistic UI, sync in background

### Timezone Handling
- Store in UTC
- Convert on render
- Handle DST explicitly
- Test edge cases

### Undo System
- Maintain change buffer
- Support: delete, resize, move, create
- Critical for time-blocking mistakes

---

## Implementation Adjustments

### Phase 2: Calendar UI (Revised)

#### Use FullCalendar Instead of Custom Components
- Day view: FullCalendar timeGridDay
- Week view: FullCalendar timeGridWeek
- Month view: FullCalendar dayGridMonth
- Custom event rendering for identity-based blocks

#### Two-Pane Layout
```
┌─────────────────────────────────────────┐
│  [Calendar] Tab                         │
├──────────────┬──────────────────────────┤
│              │                          │
│  Tasks/      │   Calendar Grid          │
│  Events      │   (FullCalendar)         │
│  List        │                          │
│              │                          │
│  - Task 1    │   [Time blocks]          │
│  - Task 2    │   [Google events]        │
│  - Event 1   │                          │
│              │                          │
└──────────────┴──────────────────────────┘
```

#### Drag-and-Drop Integration
- Tasks list: Draggable items
- Calendar: Drop zones
- Use @dnd-kit for React drag-and-drop
- Optimistic updates

#### Natural Language Input
- Quick add: "Meeting with Sarah tomorrow 2pm"
- Parse with ChronoJS
- Create event/task automatically

---

## Updated Component Structure

### New Components Needed

1. **CalendarContainer** (`calendar-container.tsx`)
   - Two-pane layout wrapper
   - Manages view state (day/week/month)
   - Handles drag-and-drop context

2. **TasksEventsList** (`tasks-events-list.tsx`)
   - Left pane: Tasks + Events
   - Draggable items
   - Quick actions

3. **FullCalendarWrapper** (`fullcalendar-wrapper.tsx`)
   - Wraps FullCalendar component
   - Custom event rendering
   - Handles Stoic Mirror blocks + Google events

4. **NaturalLanguageInput** (`natural-language-input.tsx`)
   - Quick add input
   - ChronoJS parsing
   - Creates events/tasks

5. **TodayStrip** (`today-strip.tsx`)
   - Compressed today view
   - Shows in header or sidebar
   - Quick access

---

## Key Features to Implement

### 1. Drag-and-Drop
- Tasks → Calendar (time-blocking)
- Events → Reschedule
- Blocks → Move between days
- Optimistic UI updates

### 2. Natural Language
- "Meeting tomorrow 2pm"
- "Gym every weekday 6am"
- "Finish report Friday"

### 3. Smart Defaults
- Auto-detect event length
- Auto-assign identity
- Auto-color by identity
- Suggest optimal times

### 4. Conflict Detection
- Visual indicators (red outline)
- Prevent double-booking
- Show conflicts clearly

### 5. Undo System
- Change buffer
- Undo/redo for all actions
- Critical for scheduling mistakes

### 6. Performance
- Virtualize long lists
- Memoize calendar rendering
- Preload current week
- Optimistic updates

---

## Updated Implementation Order

### Phase 1: Foundation (Current)
- ✅ Google Calendar service
- ✅ Calendar store
- ✅ Database schema

### Phase 2: Calendar UI (Revised)
1. Install FullCalendar + dependencies
2. Create two-pane layout
3. Integrate FullCalendar (day/week views)
4. Add drag-and-drop
5. Natural language input
6. Today strip

### Phase 3: Integration
1. Connect tasks to calendar
2. Bi-directional linking
3. Conflict detection
4. Undo system

### Phase 4: AI Features
1. AI Routine Maker
2. AI Schedule Optimizer
3. Smart suggestions

---

## Critical Tests

1. **DST Edge Cases**: Events moving across timezone changes
2. **All-Day Events**: Handling across timezones
3. **Recurring Rules**: "First Monday", "Every weekday"
4. **Drag → Reload**: State persists correctly
5. **Conflict Resolution**: Multiple calendars, overlapping events
6. **Natural Language**: Various input formats
7. **Undo/Redo**: All action types

---

## Design Decisions

### Color Scheme
- **Identity-based colors**: Subtle, not rainbow
- **Google events**: Different shade (read-only)
- **Conflicts**: Red outline
- **Completed**: Faded/grayed

### Interaction Patterns
- **Click**: Select/view details
- **Drag**: Move/reschedule
- **Double-click**: Quick edit
- **Right-click**: Context menu

### Defaults
- **Event length**: 30 mins (tasks), 60 mins (meetings)
- **Time grid**: 15 min intervals
- **View**: Day (default), Week (secondary)
- **Timezone**: User's local timezone

---

This document will guide all calendar UI/UX implementation! 🎯




