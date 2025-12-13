# Routine Detection Mechanics - Analysis & Proposals

## Current Implementation Issues

### 1. **Exact String Matching Problem**
Currently uses exact string comparison:
- "Morning Routine" ≠ "morning routine" ≠ "Morning Workout"
- "Exercise" ≠ "Workout" ≠ "Gym"
- User inconsistency breaks routine detection

### 2. **Commit vs Completion**
Currently only counts COMMITS (scheduled blocks), not COMPLETIONS:
- User commits to "Exercise" 3x/week but never completes = Routine?
- User commits 1x/week but completes 5x/week = Not routine?

### 3. **"Almost Routine" Promotion**
Currently just shows "2x this week" with no clear mechanism:
- When does it become a routine?
- What if user commits one more time?
- No tracking of progression

### 4. **No Time Consistency**
- "Morning Routine" at 6am vs 10am treated the same
- No pattern recognition for time-based routines

---

## Proposed Mechanics

### **Mechanic 1: Fuzzy Identity Matching**

**Problem**: Users name blocks inconsistently

**Solution**: Normalize and group similar identities

```typescript
function normalizeIdentity(identity: string): string {
  // 1. Lowercase
  // 2. Remove common prefixes/suffixes
  // 3. Stemming (basic)
  // 4. Synonyms mapping
}

// Example mappings:
"Morning Routine" → "morning routine"
"morning routine" → "morning routine"
"Morning Workout" → "morning routine" (if similar context)
"Exercise" → "exercise"
"Workout" → "exercise"
"Gym" → "exercise"
```

**Implementation Options:**
- **Simple**: Normalize case, strip extra spaces, basic synonyms
- **Advanced**: Levenshtein distance, semantic similarity (AI)

### **Mechanic 2: Routine Qualification Criteria**

**Current**: Just frequency (3+ times/week)

**Proposed Multi-Factor System**:

1. **Commitment Score** (How often you commit)
   - 3+ times/week = Routine threshold
   - 2 times/week = Almost routine
   - 1 time/week = One-off

2. **Completion Score** (How often you complete)
   - Completion rate matters!
   - 80%+ completion = Strong routine
   - 50-79% = Moderate routine
   - <50% = Weak routine (commits but doesn't follow through)

3. **Consistency Score** (How many weeks it appears)
   - 1 week = Emerging
   - 2-3 weeks = Building
   - 4+ weeks = Established

4. **Time Consistency** (Optional - if same time slot)
   - Same time ±1 hour = High consistency
   - Variable times = Lower consistency

**Routine Status Formula**:
```
Routine Score = (Commit Frequency × 0.4) + (Completion Rate × 0.3) + (Consistency × 0.3)

Status:
- Established: Score > 70 AND consistency >= 2 weeks
- Emerging: Score > 60 AND consistency = 1 week  
- Almost: Score 40-60 (commit 2x/week OR low completion)
- Fading: Was Established, now Score < 50
- One-off: Score < 40
```

### **Mechanic 3: "Almost Routine" Promotion**

**Problem**: No clear path to become routine

**Proposed Behavior**:

**Option A: Automatic Promotion**
- User commits 3rd time in a week → Automatically becomes "Emerging Routine"
- Shows celebration/notification
- Can be dismissed if not intentional

**Option B: User Confirmation**
- When threshold hit (3x/week), show prompt:
  - "You've committed to '[Activity]' 3 times this week. Make it a routine?"
  - User can confirm or dismiss
  - If confirmed, becomes "Emerging Routine"
  - If dismissed, stays as "Almost"

**Option C: Smart Promotion**
- Combines commit + completion:
  - If commits 2x AND completes both → Show "Almost" with completion boost
  - If commits 3x but completes <50% → Show "Almost" with completion warning
  - If commits 3x AND completes >80% → Auto-promote to "Emerging"

**Recommendation**: Option C (Smart Promotion)

### **Mechanic 4: Completion-Based Detection**

**Current**: Only counts commits

**Proposed**: Dual-tracking system

1. **Commit-Based Routines** (Intent)
   - "You intend to do X 3x/week"
   - Shows commitment patterns
   - Useful for planning

2. **Completion-Based Routines** (Reality)
   - "You actually do X 3x/week"
   - Shows actual behavior
   - More accurate for progress tracking

3. **Hybrid Scoring**
   - Best routines: High commit + High completion
   - Aspirational: High commit, Low completion
   - Spontaneous: Low commit, High completion (unplanned but consistent)

**Visualization**:
- Show both metrics side-by-side
- Color-code: Green (high commit + completion), Yellow (high commit/low completion), Blue (low commit/high completion)

### **Mechanic 5: Routine Lifecycle**

**Proposed States**:

1. **One-off** → Single occurrence
2. **Emerging** → 3+ times in one week, first time
3. **Building** → 2+ weeks, maintaining frequency
4. **Established** → 4+ weeks, consistent pattern
5. **Fading** → Was established, frequency declining
6. **Almost** → 2x/week or low completion, needs push

**Transitions**:
- One-off → Emerging: Hit 3x/week threshold
- Emerging → Building: Maintain 2+ weeks
- Building → Established: Maintain 4+ weeks
- Established → Fading: Frequency drops below threshold
- Almost → Emerging: Complete threshold (3x commit OR improve completion)

### **Mechanic 6: Routine Suggestions**

**Based on Patterns**:

1. **Time-based**: "You always do X at 6am - set as routine?"
2. **Day-based**: "You do X every Monday - make it weekly?"
3. **Context-based**: "After Y, you often do X - link them?"
4. **Completion-based**: "You complete X consistently - commit more?"

---

## Implementation Priority

### **Phase 1: Critical Fixes**
1. ✅ Fuzzy identity matching (normalize case, basic synonyms)
2. ✅ Completion-based detection (track completion rate)
3. ✅ Smart "Almost → Routine" promotion (3x commit OR 2x with high completion)

### **Phase 2: Enhanced Features**
4. Time consistency tracking
5. Routine lifecycle states
6. User confirmation prompts

### **Phase 3: Advanced**
7. AI-powered semantic matching
8. Pattern recognition (time/day patterns)
9. Routine suggestions

---

## Data Structure Changes

```typescript
interface RoutineAnalysis {
  identity: string // Normalized identity
  originalVariants: string[] // All variations seen
  frequency: number // Times per week (commits)
  completionRate: number // % of commits completed
  consistency: number // Number of weeks appeared
  lastWeekFrequency: number
  lastWeekCompletionRate: number
  averageTime?: string // Most common time slot
  status: "established" | "emerging" | "building" | "fading" | "almost" | "one-off"
  promotionThreshold?: {
    type: "commit" | "completion"
    remaining: number // How many more needed
    deadline: string // By when
  }
}
```

---

## UI Changes Needed

1. **"Almost Routine" Card**:
   - Show progress bar: "2/3 commits this week"
   - Show completion status: "You completed both! 🎉"
   - Show promotion trigger: "Commit 1 more time OR improve completion to 80%"
   - Action button: "Make it a routine" (when threshold hit)

2. **Routine Status Badges**:
   - Show completion rate: "Established (85% completion)"
   - Show consistency: "4 weeks strong"

3. **Routine Insights**:
   - "You commit to Exercise 3x/week but only complete 60% - focus on follow-through"
   - "Morning Routine is consistent at 6am - well done!"

