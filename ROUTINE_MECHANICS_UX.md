# Routine Mechanics - UX Design Analysis

## Core Principle: Keep It Simple, Show What Matters

---

## ✅ ESSENTIAL (Must Have)

### 1. **Fuzzy Identity Matching** ⭐⭐⭐
**Why**: Critical for accuracy - users WILL name things differently
**UX Impact**: High - Users won't understand why "Exercise" and "Workout" are separate
**Complexity**: Low - Behind the scenes, invisible to user
**Display**: Don't show normalization - just show the grouped routine

**Recommendation**: ✅ Implement (invisible to user)

---

### 2. **Completion Tracking** ⭐⭐⭐
**Why**: Commit vs Complete is THE core insight users need
**UX Impact**: High - Shows reality vs intention
**Complexity**: Medium - Need to explain clearly
**Display**: 
- Simple: "You commit 3x/week, complete 80%" (one line)
- Bad: Show detailed scoring formulas

**Recommendation**: ✅ Implement, but keep display simple

---

### 3. **Clear "Almost Routine" Status** ⭐⭐⭐
**Why**: Users need actionable next steps
**UX Impact**: High - Motivates action
**Complexity**: Low - Clear progress indicator
**Display**:
- Progress bar: "2/3 this week"
- Simple message: "Commit 1 more time to make it a routine"
- Bad: Multiple promotion paths, complex thresholds

**Recommendation**: ✅ Implement - Single clear path

---

## 🤔 HELPFUL (Nice to Have)

### 4. **Routine Status States** ⭐⭐
**Why**: Shows progression over time
**UX Impact**: Medium - Motivational, but can be confusing
**Complexity**: Medium - Need to explain states
**Display**:
- Good: "Established" (4+ weeks) vs "Emerging" (1 week)
- Bad: "Building" vs "Emerging" vs "Almost" - too many states
- Keep it to 3-4 max: Emerging, Established, Fading, Almost

**Recommendation**: ✅ Simplify to 3-4 states max

---

### 5. **Time Consistency** ⭐
**Why**: Interesting insight, but not critical
**UX Impact**: Low - Nice to know, not actionable
**Complexity**: Medium - Adds complexity
**Display**: If shown, make it subtle - "Usually at 6am"

**Recommendation**: ⚠️ Defer to Phase 2 - Add if users ask for it

---

## ❌ OVERWHELMING (Avoid)

### 6. **Complex Scoring Formulas** ❌
**Why**: Users don't need to understand algorithms
**UX Impact**: Negative - Confusing, reduces trust
**Complexity**: High - Hard to explain
**Display**: Never show formulas like "Score = (Commit × 0.4) + (Completion × 0.3)"

**Recommendation**: ❌ Hide behind the scenes, never show

---

### 7. **Multiple Promotion Paths** ❌
**Why**: Too many options = decision paralysis
**UX Impact**: Negative - Confusing which path to take
**Complexity**: High - Hard to understand
**Display**: 
- Bad: "Path A: Commit 3x OR Path B: Complete 2x OR Path C: Improve completion..."
- Good: "Commit 1 more time this week" (one clear path)

**Recommendation**: ❌ Single, simple promotion path

---

### 8. **Dual Tracking (Commit vs Completion Routines)** ❌
**Why**: Confusing - which one is "real"?
**UX Impact**: Negative - Creates confusion
**Complexity**: High - Two systems to understand
**Display**: 
- Bad: "Commit Routines" vs "Completion Routines" tabs
- Good: One routine list, show both metrics inline

**Recommendation**: ❌ Single unified view with both metrics

---

### 9. **Routine Suggestions** ⚠️
**Why**: Could be helpful, but adds noise
**UX Impact**: Medium - Can be annoying if too frequent
**Complexity**: Medium
**Display**: 
- Good: Subtle suggestions in insights panel
- Bad: Popups, constant notifications

**Recommendation**: ⚠️ Phase 2 - Subtle, opt-in

---

## 🎨 DESIGN RECOMMENDATIONS

### **Simplified Routine Detection**

**Core Rules (Behind the Scenes)**:
```
1. Normalize identities (case-insensitive, synonyms)
2. Count commits per week
3. Track completion rate
4. Determine status:
   - Established: 3+ times/week, 2+ weeks, 70%+ completion
   - Emerging: 3+ times/week, 1 week
   - Almost: 2 times/week
   - Fading: Was established, now below threshold
```

**What Users See**:
- Routine name (normalized)
- Frequency: "3x/week"
- Completion: "85% complete"
- Status badge: "Established" (green) / "Emerging" (blue) / "Almost" (yellow)
- For "Almost": Progress bar + "Commit 1 more time"

**What Users DON'T See**:
- Complex formulas
- Multiple promotion paths
- Technical details about normalization
- Separate "commit" vs "completion" lists

---

### **Visual Hierarchy**

**Priority 1: Identity Progress Rings** (Top)
- High-level: "How am I doing toward my north star?"
- Simple, visual, motivational

**Priority 2: Routine Detection** (Middle)
- Focused: "What routines am I building?"
- Clear status badges
- Actionable "Almost" cards

**Priority 3: Insights** (Bottom)
- Supportive: "Here's what I noticed..."
- No formulas, just observations

---

### **Progressive Disclosure**

**Default View**:
- Routine name
- Status badge
- Frequency + Completion (one line)

**On Hover/Click**:
- Show original variants: "Also seen as: Morning Routine, morning routine"
- Show weeks appeared: "4 weeks strong"
- Show time pattern: "Usually at 6am"

**Never Show**:
- Scoring formulas
- Complex algorithms
- Technical details

---

### **"Almost Routine" UX**

**Simple Approach**:
```
Card shows:
┌─────────────────────────────┐
│ Morning Routine             │
│ ⚠️ Almost Routine            │
│                             │
│ Progress: ████████░░ 2/3    │
│                             │
│ "Commit 1 more time this   │
│  week to make it a routine" │
└─────────────────────────────┘
```

**When threshold hit**:
- Auto-promote (no confirmation needed)
- Show subtle notification: "Morning Routine is now a routine! 🎉"
- Dismissible toast

**Bad UX**:
- Asking user to confirm
- Multiple paths to promotion
- Complex rules

---

### **Completion Display**

**Good**:
- "Morning Routine: 3x/week, 85% complete"
- Progress bar: Green (80%+), Yellow (50-79%), Red (<50%)
- Badge: "Strong" / "Moderate" / "Needs improvement"

**Bad**:
- "Commit Score: 40% + Completion Score: 30% + Consistency: 30% = 70%"
- Separate tabs for commit vs completion routines
- Complex formulas visible

---

## ✅ FINAL RECOMMENDATIONS

### **Phase 1: Essential (Ship Now)**
1. ✅ Fuzzy matching (invisible)
2. ✅ Completion tracking (simple display)
3. ✅ Single promotion path (clear, actionable)
4. ✅ Simplified states (3-4 max)

### **Phase 2: Enhanced (If Needed)**
5. ⚠️ Time consistency (subtle, optional)
6. ⚠️ Routine suggestions (subtle, opt-in)

### **Never Ship**
7. ❌ Complex formulas visible
8. ❌ Multiple promotion paths
9. ❌ Dual tracking systems
10. ❌ More than 4-5 status states

---

## Key Design Principles

1. **Invisible Complexity**: Do complex things behind the scenes
2. **Visible Simplicity**: Show only what users need to act
3. **One Clear Path**: Don't give too many options
4. **Progressive Disclosure**: Details on demand, not by default
5. **Trust Through Clarity**: If users don't understand, they won't trust it

---

## User Mental Model

**What Users Think**:
- "I do X often, is it a routine?"
- "How do I make this a routine?"
- "Am I making progress?"

**What They DON'T Think**:
- "What's my commit frequency score?"
- "Which promotion path should I take?"
- "What's the formula for routine status?"

**Design for what users think, not what algorithms calculate.**

