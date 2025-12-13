# Goal Setting Feature - Scoping Document

## Overview
Add a goal-setting questionnaire during onboarding to personalize AI conversations and provide better context-aware guidance.

---

## 🎯 Proposed Questions

### Question 1: North Star / Identity Vision
**Question:** "Who do you want to become? Describe your north star - the person you're striving to be."

**Format:** Free-form text area (multi-line input)

**Prompt/Placeholder text:**
"e.g., 'I want to become a person that's a world-class athlete, a startup employee, and passionate reader/researcher'

Think about the identities and roles you want to embody. What kind of person are you becoming?"

**Why this helps:**
- Provides clear identity direction - aligns with the app's identity-based scheduling
- AI understands the "why" behind routines and blocks
- More aspirational and motivating than checkbox goals
- AI can reference specific identities when suggesting blocks (e.g., "world-class athlete" → suggests training blocks)
- Creates a narrative that connects daily actions to bigger vision

**Example AI improvements:**
- Instead of generic advice, AI says: "I see you're becoming a world-class athlete - let's structure your training blocks to align with that identity"
- When suggesting routines: "As someone becoming a passionate reader/researcher, have you considered dedicated reading blocks?"
- Identity-aware blocks: "This 'world-class athlete' identity you're building - how can we design your schedule to support that?"
- Connecting actions to vision: "You're working toward being a startup employee - how are your blocks today serving that north star?"

---

### Question 2: Lifestyle & Constraints
**Question:** "Tell me about your typical day - what constraints or patterns shape your schedule?"

**Options/Multi-select:**
- [ ] Fixed work hours (9-5)
- [ ] Flexible/remote work
- [ ] Shift work / irregular hours
- [ ] Student schedule
- [ ] Parent/caregiver responsibilities
- [ ] Early bird (morning energy)
- [ ] Night owl (evening energy)
- [ ] Limited free time (< 2 hours/day)
- [ ] Lots of interruptions/unpredictable schedule
- [ ] Other: [text input]

**Why this helps:**
- AI understands time constraints and suggests realistic routines
- Recommendations respect their energy patterns (morning vs evening)
- Schedule suggestions align with their actual lifestyle (e.g., "I know you have limited free time - let's focus on 2-3 high-impact blocks")

**Example AI improvements:**
- "Since you're a morning person, let's schedule your most important work in those early hours"
- "I see you have parent responsibilities - how can we create flexible routines that adapt to unpredictable days?"
- "Given your shift work schedule, let's focus on routines that work regardless of time of day"

---

### Question 3: Preferences & Motivations
**Question:** "What motivates you and how do you like to work?"

**Options/Multi-select:**
- [ ] Structured routines (same time daily)
- [ ] Flexible approach (adapt as needed)
- [ ] Visual progress tracking
- [ ] Accountability & checking in
- [ ] Minimal/low-friction systems
- [ ] Detailed planning
- [ ] Focus on habits over goals
- [ ] Goal-oriented (clear targets)
- [ ] Prefer gentle nudges
- [ ] Prefer direct accountability
- [ ] Other: [text input]

**Why this helps:**
- AI adjusts tone and approach based on preferences
- Suggestions match their working style (structured vs flexible)
- Feedback style aligns (gentle vs direct accountability)

**Example AI improvements:**
- For "flexible approach": "Let's create a loose framework you can adapt day-to-day"
- For "structured routines": "Consistency is key - let's build a fixed morning routine you can commit to"
- For "gentle nudges": "No pressure - just checking in on how your blocks are going"
- For "direct accountability": "You committed to 3 blocks today - you've completed 1. What's getting in the way?"

---

## 🤖 How This Improves AI Conversations

### Current State
- AI has access to: schedule patterns, journal entries, mood trends, routines
- AI lacks: user's deeper motivations, constraints, preferences
- Result: Generic advice that doesn't account for personal context

### With Goal Setting
- AI knows: Their north star identity vision, their lifestyle constraints, how they prefer to work
- AI can: Reference their identity vision in conversations, suggest routines aligned with their north star, connect daily blocks to their aspirational identity, respect constraints, adjust tone/style

### Specific Improvements

#### 1. **Personalized Greetings**
- Current: "Hey. What's on your mind today?"
- With north star: "Hey. I see you're becoming a world-class athlete and passionate researcher - how's that journey going today?"

#### 2. **Identity-Aware Routine Suggestions**
- Current: Generic routine suggestions
- With north star: "Since you're becoming a world-class athlete, here's a training routine that aligns with that identity..."
- Connects blocks to identity: "Your 'athlete' identity - let's schedule training blocks that support that vision"

#### 3. **Constraint-Aware Scheduling**
- Current: Suggests blocks without considering user's schedule
- With goals: "I know you have limited free time - let's focus on 2 high-impact blocks rather than trying to do everything"

#### 4. **Identity-Aligned Reflection Prompts**
- Current: Generic journal prompts
- With north star: "You're becoming a world-class athlete - how did today's blocks move you toward that identity?"
- Connects daily actions to vision: "How are your actions today serving your north star of being a startup employee?"

#### 5. **Tone & Style Adaptation**
- Current: One-size-fits-all stoic mirror approach
- With preferences: Adjusts based on preferences (gentle nudges vs direct accountability)

#### 6. **Identity-Aware Suggestions**
- Current: Generic follow-up actions
- With north star: "You're becoming a passionate reader/researcher - want to schedule dedicated reading blocks?"
- Identity-specific: "Your 'world-class athlete' identity - let's design a training routine"

---

## 📋 Implementation Plan

### Phase 1: Data Model & Storage
1. **Add to `UserSettings` interface** (`settings-store.ts`)
   ```typescript
   userGoals?: {
     northStar?: string // Free-form text: "I want to become a person that's..."
     lifestyle: string[] // Selected lifestyle patterns
     preferences: string[] // Selected preferences
     otherLifestyle?: string // Free text for "Other"
     otherPreferences?: string
   }
   ```

2. **Update `AIContext` interface** (`ai-context-builder.ts`)
   ```typescript
   userProfile?: {
     northStar?: string // Identity vision
     lifestyle: string[]
     preferences: string[]
   }
   ```

### Phase 2: Onboarding Integration
1. **Add new step to onboarding** (`onboarding-modal.tsx`)
   - Insert as step 2 (after "Welcome", before "Setup & Configuration")
   - Question 1: Large text area for north star (multi-line, ~4-6 lines)
   - Questions 2-3: Multi-select checkboxes with optional "Other" text inputs
   - Store answers in `settings-store`

2. **Update onboarding flow**
   - Skip option still available
   - If skipped, user can fill later in Settings
   - Mark as completed when all 3 questions answered (north star can be empty if skipped)

### Phase 3: Settings UI
1. **Add "Goals & Preferences" section** (`settings-modal.tsx`)
   - Editable form matching onboarding questions
   - Show current selections
   - Allow updates anytime
   - Clear, organized layout

### Phase 4: AI Integration
1. **Update `buildAIContext`** (`ai-context-builder.ts`)
   - Include user goals/lifestyle/preferences from settings
   - Add to context object

2. **Update `formatContextForAI`** (`ai-context-builder.ts`)
   - Format user profile section:
     ```
     USER'S NORTH STAR / IDENTITY VISION:
     [north star text]
     
     USER PROFILE:
     - Lifestyle: [list]
     - Preferences: [list]
     ```
   - Include north star prominently at top of context

3. **Update system prompt** (`chat-personalities.ts`)
   - Add instructions to use north star naturally
   - Reference identity vision when suggesting blocks/routines
   - Connect daily actions to their north star identity
   - Respect constraints and preferences

### Phase 5: Enhanced AI Responses
1. **Update `initializeNewConversation`** (`chat-interface.tsx`)
   - Use north star in personalized greeting
   - Reference identity vision when building context
   - Connect greeting to their aspirational identity

2. **Update suggested actions**
   - Generate suggestions based on north star identities
   - E.g., "Schedule a training routine" for users with "athlete" in north star
   - Extract key identities from north star text to suggest relevant blocks

---

## 🎨 UI/UX Considerations

### Onboarding Flow
- **Step placement:** After welcome, before setup (step 2 of 6)
- **Visual design:** 
  - Question 1: Large text area (textarea) for north star, ~4-6 visible lines
  - Questions 2-3: Clean checkboxes with multi-select
- **Skip option:** Always available
- **Progress:** Clear indication (3 questions, progress dots)
- **Validation:** 
  - North star can be empty (optional)
  - Questions 2-3: At least one selection per question (or skip entirely)
- **Placeholder/Example:** Show example north star text to inspire users

### Settings UI
- **Section:** "Goals & Preferences" tab or section
- **Layout:** Same 3-question format as onboarding
- **Visual:** Show current selections clearly
- **Save:** Immediate save on change (like other settings)

### AI Integration
- **Subtle:** Goals referenced naturally, not forced
- **Contextual:** Only mention when relevant to conversation
- **Helpful:** Use to provide better suggestions, not to lecture

---

## 📊 Data Structure

```typescript
interface UserGoals {
  northStar?: string // Free-form identity vision
  lifestyle: string[] // Selected lifestyle patterns
  preferences: string[] // Selected preferences
  otherLifestyle?: string // Free text if "Other" selected
  otherPreferences?: string
}
```

**Example stored data:**
```json
{
  "northStar": "I want to become a person that's a world-class athlete, a startup employee, and passionate reader/researcher",
  "lifestyle": ["Fixed work hours (9-5)", "Early bird"],
  "preferences": ["Structured routines", "Visual progress tracking", "Direct accountability"],
  "otherLifestyle": null,
  "otherPreferences": null
}
```

**Alternative example:**
```json
{
  "northStar": "I'm becoming someone who balances deep creative work with being present for my family, while maintaining physical health and continuous learning",
  "lifestyle": ["Flexible/remote work", "Parent/caregiver responsibilities"],
  "preferences": ["Flexible approach", "Focus on habits over goals", "Prefer gentle nudges"]
}
```

---

## ✅ Success Metrics

- **Onboarding completion:** % of users who complete goal questionnaire
- **AI improvement:** More relevant suggestions and personalized responses
- **User engagement:** Increased routine creation aligned with goals
- **Settings usage:** Users updating goals over time

---

## 🚀 Next Steps

1. **Review & refine questions** - Get feedback on question clarity and options
2. **Finalize data model** - Confirm structure matches needs
3. **Build onboarding step** - Create UI component
4. **Add to settings** - Create editable form
5. **Integrate with AI** - Update context builder and prompts
6. **Test & iterate** - Verify AI responses are more personalized

---

## 💡 Future Enhancements

- **Goal tracking:** Progress bars/metrics for each goal
- **Goal-specific insights:** Weekly reports on goal progress
- **Dynamic suggestions:** AI proactively suggests routines based on goals
- **Goal evolution:** Track how goals change over time
- **Goal reminders:** Periodic check-ins on goal progress

