/**
 * Identity-Based Activity Categories
 * 
 * Each identity has its own set of categories for grouping activities.
 * Used by the auto-habit detection system.
 */

// ============================================
// Types
// ============================================

export interface ActivityCategory {
  id: string
  name: string
  emoji: string
  keywords: string[]  // Fuzzy match keywords
}

export interface IdentityCategories {
  identity: string
  categories: ActivityCategory[]
}

// ============================================
// Category Definitions by Identity
// ============================================

export const IDENTITY_CATEGORIES: Record<string, ActivityCategory[]> = {
  // ATHLETE / FITNESS
  athlete: [
    {
      id: "cardio",
      name: "Cardio",
      emoji: "🏃",
      keywords: [
        "run", "running", "jog", "jogging", "walk", "walking", "hike", "hiking",
        "cycle", "cycling", "bike", "biking", "swim", "swimming", "sprint",
        "cardio", "hiit", "jump rope", "skipping", "rowing", "elliptical",
        "basketball", "football", "soccer", "tennis", "badminton", "squash",
        "volleyball", "cricket", "hockey", "rugby", "sports", "game", "match"
      ]
    },
    {
      id: "strength",
      name: "Strength",
      emoji: "💪",
      keywords: [
        "gym", "workout", "weights", "weightlifting", "lifting", "deadlift",
        "squat", "bench", "press", "curl", "pullup", "pushup", "calisthenics",
        "resistance", "strength", "muscle", "training", "exercise", "fitness",
        "crossfit", "bodyweight", "dumbbell", "barbell", "kettlebell"
      ]
    },
    {
      id: "wellness",
      name: "Wellness",
      emoji: "🧘",
      keywords: [
        "yoga", "stretch", "stretching", "meditation", "meditate", "mindfulness",
        "recovery", "rest", "mobility", "flexibility", "breathwork", "breathing",
        "pilates", "tai chi", "foam roll", "massage", "sauna", "cold plunge",
        "relaxation", "cooldown", "warmup"
      ]
    }
  ],

  // FOUNDER / ENTREPRENEUR / BUILDER
  founder: [
    {
      id: "deep_work",
      name: "Deep Work",
      emoji: "🎯",
      keywords: [
        "code", "coding", "programming", "develop", "development", "build",
        "building", "create", "creating", "design", "designing", "write",
        "writing", "draft", "focus", "deep work", "maker", "ship", "shipping",
        "product", "feature", "bug", "debug", "architecture", "system"
      ]
    },
    {
      id: "business",
      name: "Business",
      emoji: "💼",
      keywords: [
        "meeting", "call", "calls", "strategy", "planning", "plan", "review",
        "standup", "sync", "1:1", "one on one", "pitch", "investor", "funding",
        "sales", "customer", "client", "partner", "negotiate", "deal", "admin",
        "operations", "ops", "hiring", "interview", "team", "management"
      ]
    },
    {
      id: "learning",
      name: "Learning",
      emoji: "📚",
      keywords: [
        "read", "reading", "book", "article", "research", "study", "learn",
        "learning", "course", "tutorial", "workshop", "webinar", "podcast",
        "video", "education", "skill", "practice", "experiment"
      ]
    }
  ],

  // CREATOR / ARTIST / WRITER
  creator: [
    {
      id: "creating",
      name: "Creating",
      emoji: "✨",
      keywords: [
        "create", "creating", "make", "making", "draw", "drawing", "paint",
        "painting", "design", "designing", "illustrate", "art", "craft",
        "sculpt", "photography", "photo", "shoot", "film", "video", "edit",
        "editing", "produce", "production", "music", "compose", "record"
      ]
    },
    {
      id: "writing",
      name: "Writing",
      emoji: "✍️",
      keywords: [
        "write", "writing", "blog", "blogging", "article", "post", "draft",
        "content", "copy", "copywriting", "script", "story", "novel", "book",
        "journal", "journaling", "newsletter", "essay", "poem", "lyrics"
      ]
    },
    {
      id: "publishing",
      name: "Publishing",
      emoji: "📤",
      keywords: [
        "publish", "publishing", "post", "posting", "share", "sharing",
        "upload", "release", "launch", "distribute", "promote", "marketing",
        "social media", "twitter", "linkedin", "instagram", "youtube"
      ]
    }
  ],

  // LEARNER / STUDENT / RESEARCHER
  learner: [
    {
      id: "studying",
      name: "Studying",
      emoji: "📖",
      keywords: [
        "study", "studying", "read", "reading", "learn", "learning", "class",
        "lecture", "course", "lesson", "chapter", "textbook", "notes",
        "homework", "assignment", "exam", "test", "quiz", "review"
      ]
    },
    {
      id: "practice",
      name: "Practice",
      emoji: "🔬",
      keywords: [
        "practice", "practicing", "exercise", "problem", "project", "lab",
        "experiment", "apply", "application", "hands-on", "drill", "repetition",
        "flashcard", "memorize", "revision"
      ]
    },
    {
      id: "research",
      name: "Research",
      emoji: "🔍",
      keywords: [
        "research", "researching", "investigate", "explore", "discover",
        "analysis", "analyze", "data", "paper", "thesis", "dissertation",
        "literature", "survey", "interview", "fieldwork"
      ]
    }
  ],

  // HOMEMAKER / PARENT / CAREGIVER
  homemaker: [
    {
      id: "household",
      name: "Household",
      emoji: "🏠",
      keywords: [
        "clean", "cleaning", "tidy", "organize", "organizing", "declutter",
        "laundry", "dishes", "vacuum", "mop", "dust", "chores", "housework",
        "maintenance", "repair", "fix", "garden", "gardening", "yard"
      ]
    },
    {
      id: "cooking",
      name: "Cooking",
      emoji: "👨‍🍳",
      keywords: [
        "cook", "cooking", "meal", "prep", "recipe", "bake", "baking",
        "breakfast", "lunch", "dinner", "grocery", "shopping", "kitchen",
        "food", "nutrition", "diet", "healthy eating"
      ]
    },
    {
      id: "family",
      name: "Family",
      emoji: "👨‍👩‍👧‍👦",
      keywords: [
        "family", "kids", "children", "parenting", "play", "playtime",
        "homework help", "school", "pickup", "dropoff", "activity",
        "quality time", "bonding", "care", "caregiving", "eldercare"
      ]
    }
  ],

  // MINDFUL / SPIRITUAL
  mindful: [
    {
      id: "meditation",
      name: "Meditation",
      emoji: "🧘",
      keywords: [
        "meditate", "meditation", "mindfulness", "mindful", "breathe",
        "breathing", "breath", "calm", "peace", "quiet", "silence",
        "contemplation", "reflect", "reflection", "awareness"
      ]
    },
    {
      id: "spiritual",
      name: "Spiritual",
      emoji: "🙏",
      keywords: [
        "prayer", "pray", "worship", "church", "temple", "mosque",
        "spiritual", "devotion", "gratitude", "blessing", "faith",
        "scripture", "bible", "quran", "religious", "ritual"
      ]
    },
    {
      id: "journaling",
      name: "Journaling",
      emoji: "📓",
      keywords: [
        "journal", "journaling", "diary", "reflect", "reflection",
        "gratitude", "morning pages", "evening review", "introspection",
        "self-reflection", "thoughts", "feelings", "emotions"
      ]
    }
  ],

  // SOCIAL / CONNECTOR
  social: [
    {
      id: "relationships",
      name: "Relationships",
      emoji: "💝",
      keywords: [
        "date", "dating", "partner", "spouse", "relationship", "romance",
        "quality time", "together", "couple", "love", "anniversary",
        "valentine", "dinner date", "movie night"
      ]
    },
    {
      id: "friends",
      name: "Friends",
      emoji: "👥",
      keywords: [
        "friend", "friends", "hangout", "catch up", "coffee", "drinks",
        "party", "gathering", "social", "event", "meetup", "reunion",
        "birthday", "celebration", "game night"
      ]
    },
    {
      id: "networking",
      name: "Networking",
      emoji: "🤝",
      keywords: [
        "network", "networking", "connect", "connection", "introduce",
        "introduction", "conference", "event", "meetup", "community",
        "professional", "linkedin", "outreach"
      ]
    }
  ]
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get categories for an identity (case-insensitive)
 */
export function getCategoriesForIdentity(identity: string): ActivityCategory[] {
  const normalized = identity.toLowerCase().trim()
  
  // Direct match
  if (IDENTITY_CATEGORIES[normalized]) {
    return IDENTITY_CATEGORIES[normalized]
  }
  
  // Fuzzy match identity names
  const identityAliases: Record<string, string> = {
    "fitness": "athlete",
    "health": "athlete",
    "fit": "athlete",
    "entrepreneur": "founder",
    "builder": "founder",
    "ceo": "founder",
    "startup": "founder",
    "artist": "creator",
    "writer": "creator",
    "designer": "creator",
    "student": "learner",
    "researcher": "learner",
    "scholar": "learner",
    "parent": "homemaker",
    "caregiver": "homemaker",
    "mom": "homemaker",
    "dad": "homemaker",
    "spiritual": "mindful",
    "meditator": "mindful",
    "connector": "social",
    "networker": "social",
  }
  
  const aliasMatch = identityAliases[normalized]
  if (aliasMatch && IDENTITY_CATEGORIES[aliasMatch]) {
    return IDENTITY_CATEGORIES[aliasMatch]
  }
  
  // Default: return empty (will use LLM)
  return []
}

/**
 * Get all known identity names
 */
export function getKnownIdentities(): string[] {
  return Object.keys(IDENTITY_CATEGORIES)
}

/**
 * Check if an identity has predefined categories
 */
export function hasCategories(identity: string): boolean {
  return getCategoriesForIdentity(identity).length > 0
}




