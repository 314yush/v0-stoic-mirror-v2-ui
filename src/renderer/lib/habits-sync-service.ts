/**
 * Habits Sync Service
 * Syncs habits and completions to Supabase
 */

import { supabase, isSupabaseConfigured } from "./supabase"
import type { Habit, HabitCompletion } from "./habits-store"

// ============================================
// Sync Habits
// ============================================

export async function syncHabitToSupabase(
  habit: Habit,
  operation: "insert" | "update" | "delete"
): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.log("[Habits Sync] Supabase not configured, skipping sync")
    return
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log("[Habits Sync] No authenticated user, skipping sync")
    return
  }

  try {
    if (operation === "delete") {
      const { error } = await supabase
        .from("user_habits")
        .delete()
        .eq("id", habit.id)
        .eq("user_id", user.id)

      if (error) throw error
      console.log("[Habits Sync] Deleted habit:", habit.name)
    } else if (operation === "insert") {
      const { error } = await supabase
        .from("user_habits")
        .insert({
          id: habit.id,
          user_id: user.id,
          name: habit.name,
          identity: habit.identity,
          target_frequency: habit.targetFrequency,
          target_duration_minutes: habit.targetDurationMinutes,
          preferred_time: habit.preferredTime,
          emoji: habit.emoji,
          color: habit.color,
          sort_order: habit.sortOrder,
          is_active: habit.isActive,
          created_at: habit.createdAt,
          updated_at: habit.updatedAt,
        })

      if (error) throw error
      console.log("[Habits Sync] Inserted habit:", habit.name)
    } else {
      const { error } = await supabase
        .from("user_habits")
        .update({
          name: habit.name,
          identity: habit.identity,
          target_frequency: habit.targetFrequency,
          target_duration_minutes: habit.targetDurationMinutes,
          preferred_time: habit.preferredTime,
          emoji: habit.emoji,
          color: habit.color,
          sort_order: habit.sortOrder,
          is_active: habit.isActive,
          updated_at: habit.updatedAt,
        })
        .eq("id", habit.id)
        .eq("user_id", user.id)

      if (error) throw error
      console.log("[Habits Sync] Updated habit:", habit.name)
    }
  } catch (error) {
    console.error("[Habits Sync] Error syncing habit:", error)
  }
}

// ============================================
// Sync Completions
// ============================================

export async function syncCompletionToSupabase(
  completion: HabitCompletion,
  operation: "upsert" | "delete"
): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    if (operation === "delete") {
      const { error } = await supabase
        .from("habit_completions")
        .delete()
        .eq("id", completion.id)
        .eq("user_id", user.id)

      if (error) throw error
    } else {
      const { error } = await supabase
        .from("habit_completions")
        .upsert({
          id: completion.id,
          user_id: user.id,
          habit_id: completion.habitId,
          date: completion.date,
          completed: completion.completed,
          block_id: completion.blockId,
          actual_start_time: completion.actualStartTime,
          actual_duration_minutes: completion.actualDurationMinutes,
          note: completion.note,
          skipped_reason: completion.skippedReason,
          completed_at: completion.completedAt,
          created_at: completion.createdAt,
        }, {
          onConflict: "user_id,habit_id,date"
        })

      if (error) throw error
    }
  } catch (error) {
    console.error("[Habits Sync] Error syncing completion:", error)
  }
}

// ============================================
// Fetch from Supabase
// ============================================

export async function fetchHabitsFromSupabase(): Promise<Habit[]> {
  if (!isSupabaseConfigured()) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  try {
    const { data, error } = await supabase
      .from("user_habits")
      .select("*")
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true })

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      identity: row.identity,
      targetFrequency: row.target_frequency,
      targetDurationMinutes: row.target_duration_minutes,
      preferredTime: row.preferred_time,
      emoji: row.emoji,
      color: row.color,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  } catch (error) {
    console.error("[Habits Sync] Error fetching habits:", error)
    return []
  }
}

export async function fetchCompletionsFromSupabase(
  startDate?: string,
  endDate?: string
): Promise<HabitCompletion[]> {
  if (!isSupabaseConfigured()) return []

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  try {
    let query = supabase
      .from("habit_completions")
      .select("*")
      .eq("user_id", user.id)

    if (startDate) {
      query = query.gte("date", startDate)
    }
    if (endDate) {
      query = query.lte("date", endDate)
    }

    const { data, error } = await query.order("date", { ascending: false })

    if (error) throw error

    return (data || []).map(row => ({
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      completed: row.completed,
      blockId: row.block_id,
      actualStartTime: row.actual_start_time,
      actualDurationMinutes: row.actual_duration_minutes,
      note: row.note,
      skippedReason: row.skipped_reason,
      completedAt: row.completed_at,
      createdAt: row.created_at,
    }))
  } catch (error) {
    console.error("[Habits Sync] Error fetching completions:", error)
    return []
  }
}

// ============================================
// Bulk Sync (for initial load)
// ============================================

export async function syncAllHabitsToSupabase(habits: Habit[]): Promise<void> {
  if (!isSupabaseConfigured()) return

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  try {
    // Get existing habits from Supabase
    const { data: existing } = await supabase
      .from("user_habits")
      .select("id")
      .eq("user_id", user.id)

    const existingIds = new Set((existing || []).map(h => h.id))

    // Separate into insert and update
    const toInsert = habits.filter(h => !existingIds.has(h.id))
    const toUpdate = habits.filter(h => existingIds.has(h.id))

    // Bulk insert new habits
    if (toInsert.length > 0) {
      const { error } = await supabase
        .from("user_habits")
        .insert(toInsert.map(h => ({
          id: h.id,
          user_id: user.id,
          name: h.name,
          identity: h.identity,
          target_frequency: h.targetFrequency,
          target_duration_minutes: h.targetDurationMinutes,
          preferred_time: h.preferredTime,
          emoji: h.emoji,
          color: h.color,
          sort_order: h.sortOrder,
          is_active: h.isActive,
          created_at: h.createdAt,
          updated_at: h.updatedAt,
        })))

      if (error) console.error("[Habits Sync] Bulk insert error:", error)
    }

    // Update existing habits one by one (Supabase doesn't support bulk update easily)
    for (const habit of toUpdate) {
      await syncHabitToSupabase(habit, "update")
    }

    console.log(`[Habits Sync] Synced ${toInsert.length} new, ${toUpdate.length} updated habits`)
  } catch (error) {
    console.error("[Habits Sync] Error in bulk sync:", error)
  }
}






