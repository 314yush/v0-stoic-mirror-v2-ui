# Onboarding Habits Collection - UX Analysis

## The Question

**Should we ask users about their day-to-day habits during onboarding?**

This could help avoid fuzzy matching complexity and provide clearer routine data from the start.

---

## 🎯 Core Insight

**There's a fundamental difference between:**
- **Intent/Aspiration**: "I want to exercise" (what they say)
- **Commitment**: "I commit to exercising 3x this week" (what they actually do)
- **Reality**: "I actually exercised 2x this week" (what happened)

**Current system**: Discovers routines from actual commitments → More accurate, reflects reality

**Proposed system**: Users declare habits upfront → Might not match reality

---

## ✅ Pros of Asking for Habits

### 1. **Seed Initial Routines**
- Users can define their current routines
- System knows what to look for from day 1
- No waiting period to detect routines

### 2. **Reduce Fuzzy Matching**
- Users define canonical names: "Morning Routine", "Exercise"
- System can suggest these exact names when creating blocks
- Less variation = better grouping

### 3. **Better Suggestions**
- AI can suggest blocks based on declared habits
- "You mentioned you exercise - want to add it today?"
- More personalized from the start

### 4. **User Awareness**
- Makes users think about their routines
- Sets expectations: "These are the things I do regularly"
- Can motivate: "I said I exercise, let me commit to it"

### 5. **Faster Onboarding**
- Can pre-fill routines from declared habits
- Less manual setup needed

---

## ❌ Cons of Asking for Habits

### 1. **Onboarding Fatigue**
- Already asking: North star, lifestyle, preferences
- Adding habits = more questions = higher drop-off
- Users might skip or rush through

### 2. **Aspiration vs Reality**
- Users might say what they WANT to do, not what they DO
- "I exercise 5x/week" (aspiration) vs actual 2x/week (reality)
- Creates disconnect between declared vs actual

### 3. **Pressure to Perform**
- If they declare "Exercise 5x/week" but only do 2x
- Creates guilt/shame: "I said I'd do this"
- Might discourage honesty

### 4. **Habits Change**
- What they do now might not be what they do in 3 months
- Need to update habits manually
- Detection system adapts automatically

### 5. **Separate Systems**
- Would need to track:
  - Declared habits (what they said)
  - Detected routines (what they actually do)
  - Potential conflicts: "You said Exercise 5x/week but only committed 2x"
- Adds complexity

### 6. **Still Need Detection**
- Even with declared habits, still need to detect:
  - Are they actually doing it?
  - Are they doing it consistently?
  - What's the actual frequency?
- Detection is still necessary

---

## 🎨 Hybrid Approach (Recommended)

**Best of both worlds**: Ask for habits, but frame it correctly

### **Option A: "Current Routines" Question** (Recommended)

**Question**: "What routines do you currently have? (You can add more later)"

**Format**: 
- Multi-select with common options:
  - Morning Routine
  - Exercise / Workout
  - Reading
  - Deep Work
  - Evening Wind Down
  - [Custom] (text input)

**How it helps**:
- Provides canonical names for fuzzy matching
- Seeds initial suggestions
- Sets expectations
- Optional - not required

**Frame it as**: "Help us understand your current routines" (not "commit to these")

### **Option B: "Routine Preferences"**

**Question**: "What activities do you want to track? (Select all that apply)"

**Format**: Same as Option A

**Frame it as**: Preferences, not commitments

### **Option C: "Quick Setup"**

**Question**: "Want to set up your first routine now? (Skip to do it later)"

**Format**: 
- If yes: Show routine builder
- If no: Skip, detection handles it

**Frame it as**: Optional convenience, not requirement

---

## 💡 Recommended Implementation

### **Phase 1: Ask for Routine Names (Not Frequency)**

**Question**: "What routines do you currently have? (We'll help you track them)"

**Benefits**:
- ✅ Provides canonical names → Better fuzzy matching
- ✅ Low pressure → Just names, not commitments
- ✅ Quick → Multi-select, no details needed
- ✅ Optional → Can skip if unsure

**Example**:
```
[ ] Morning Routine
[ ] Exercise / Workout  
[ ] Reading
[ ] Deep Work
[ ] Evening Wind Down
[ ] Other: [text input]
```

**Behind the scenes**:
- Use these as preferred names for fuzzy matching
- When user creates "Workout", match to "Exercise / Workout"
- Still detect actual frequency/completion
- No pressure to commit to all of them

### **Phase 2: Detection Still Happens**

- System detects actual patterns from commits
- Compares to declared routines
- Shows: "You mentioned Exercise - you've committed 2x this week"
- Can suggest: "Make Exercise a routine?" (when threshold hit)

---

## 🎯 Key Insight

**The confusion isn't about detection - it's about naming.**

**Real problem**: Users name things inconsistently
- "Exercise" vs "Workout" vs "Gym"
- "Morning Routine" vs "morning routine"

**Solution**: Provide canonical names during onboarding
- When user types "Workout", suggest "Exercise" (from declared habits)
- Auto-correct/normalize based on declared names
- Still detect patterns, but with better naming

---

## ✅ Final Recommendation

**Add to onboarding** (as optional step):

**Question**: "What routines do you currently have? (Optional - helps us suggest better names)"

**Format**: Multi-select with common routines + custom option

**Benefits**:
- ✅ Helps with naming consistency
- ✅ Provides canonical names for matching
- ✅ Low pressure (just names, not commitments)
- ✅ Optional (can skip)
- ✅ Quick (multi-select)

**What it DOESN'T do**:
- ❌ Replace detection (still needed)
- ❌ Create pressure to commit
- ❌ Assume frequency

**What it DOES do**:
- ✅ Provides naming hints
- ✅ Improves fuzzy matching accuracy
- ✅ Seeds suggestions
- ✅ Sets expectations

---

## Implementation Strategy

1. **Onboarding**: Ask for routine names (optional, multi-select)
2. **Store**: Save as "preferred routine names" in settings
3. **Block Creation**: When user types, suggest from preferred names
4. **Fuzzy Matching**: Use preferred names as canonical forms
5. **Detection**: Still detect actual patterns (unchanged)
6. **UI**: Show "You mentioned [routine] - you've committed X times"

**Best of both worlds**: 
- Better naming consistency ✅
- Still discovers actual behavior ✅
- Low pressure ✅
- Adapts over time ✅

