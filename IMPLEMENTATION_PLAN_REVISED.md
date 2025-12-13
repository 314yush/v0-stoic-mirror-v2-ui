# Stoic Mirror - Revised Implementation Plan (With UX Best Practices)

## Key Changes from Original Plan

### ✅ What We're Keeping
- Google Calendar integration (Phase 1)
- AI connective layer (Phase 3)
- Identity-first approach

### 🔄 What We're Changing
- **Use FullCalendar.io** instead of custom calendar components
- **Two-pane layout** (tasks list + calendar grid)
- **Day view as default** (not week)
- **Drag-and-drop everywhere** (using @dnd-kit)
- **Natural language input** (using ChronoJS)
- **Local-first with optimistic UI**

---

## Updated Phase 2: Calendar UI (Best Practices Applied)

### Architecture

```
Calendar Tab
├── Two-Pane Layout
│   ├── Left Pane: Tasks/Events List
│   │   ├── Unscheduled tasks (draggable)
│   │   ├── Today's events
│   │   ├── Natural language input
│   │   └── Quick actions
│   │
│   └── Right Pane: Calendar Grid (FullCalendar)
│       ├── Day View (default)
│       ├── Week View
│       ├── Month View (planning only)
│       └── Custom event rendering
│
└── Today Strip (header/sidebar)
    └── Compressed today overview
```

### Component Structure

1. **CalendarContainer** - Main wrapper with two-pane layout
2. **TasksEventsList** - Left pane with draggable items
3. **FullCalendarWrapper** - Right pane with FullCalendar
4. **NaturalLanguageInput** - Quick add with ChronoJS
5. **TodayStrip** - Compressed today view
6. **CalendarEventRenderer** - Custom rendering for Stoic Mirror blocks

### Key Features

#### 1. Drag-and-Drop
- **Tasks → Calendar**: Time-blocking
- **Events → Calendar**: Reschedule
- **Blocks → Calendar**: Move between days
- **Optimistic UI**: Update immediately, sync in background

#### 2. Natural Language
- "Meeting tomorrow 2pm" → Event
- "Gym every weekday 6am" → Recurring event
- "Finish report Friday" → Task with due date

#### 3. Smart Defaults
- Auto-detect event length (30/60 mins)
- Auto-assign identity
- Auto-color by identity
- Suggest optimal times

#### 4. Visual Clarity
- Subtle colors (not rainbow)
- Show only: title, time, identity tag
- Collapse empty hours
- Clean, minimal design

#### 5. Performance
- Virtualize long lists
- Memoize calendar rendering
- Preload current week
- Optimistic updates

---

## Implementation Checklist (Revised)

### Phase 1: Foundation ✅
- [x] Google Calendar service
- [x] Calendar store
- [x] Database schema
- [ ] OAuth setup
- [ ] Settings UI
- [ ] Today tab integration

### Phase 2: Calendar UI (Revised)
- [ ] Install FullCalendar + @dnd-kit
- [ ] Create two-pane layout
- [ ] Integrate FullCalendar (day/week)
- [ ] Custom event rendering
- [ ] Drag-and-drop implementation
- [ ] Natural language input
- [ ] Today strip
- [ ] Undo system

### Phase 3: AI Features
- [ ] AI Routine Maker
- [ ] AI Schedule Optimizer
- [ ] AI Conflict Resolver
- [ ] Update AI context

### Phase 4: Integration
- [ ] Tasks ↔ Calendar linking
- [ ] Bi-directional sync
- [ ] Conflict detection
- [ ] Performance optimization

---

## Technical Decisions

### Libraries
- **FullCalendar.io**: Calendar rendering (proven, battle-tested)
- **@dnd-kit**: Drag-and-drop (modern, performant)
- **ChronoJS**: Natural language parsing
- **rrule**: Recurring events

### Data Flow
- **Local-first**: Optimistic UI updates
- **Background sync**: Sync to Supabase/Google Calendar
- **Conflict resolution**: Last writer wins + logs
- **Undo buffer**: Maintain change history

### Performance
- **Virtualization**: Long lists
- **Memoization**: Calendar rendering
- **Preloading**: Current week events
- **Lazy loading**: Past/future events

---

## Next Steps

1. **Set up Google OAuth** (required for testing)
2. **Create two-pane layout** (foundation)
3. **Integrate FullCalendar** (core calendar)
4. **Add drag-and-drop** (critical UX)
5. **Natural language input** (delightful feature)

---

**Ready to build a world-class calendar experience!** 🚀




