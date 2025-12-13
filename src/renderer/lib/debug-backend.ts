/**
 * Debug utilities for testing backend actions
 * Run these functions in the browser console to test sync/load functionality
 */

import { useScheduleStore } from "./schedule-store"
import { useJournalStore } from "./journal-store"
import { useTasksStore } from "./tasks-store"
import { pullFromSupabase, processSyncQueue } from "./sync-service"
import { useAuthStore } from "./auth-store"
import { isSupabaseConfigured } from "./supabase"

/**
 * Test loading yesterday's schedule
 */
export async function testLoadYesterday(): Promise<void> {
  const store = useScheduleStore.getState()
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split("T")[0]
  
  console.log("🔍 Testing load yesterday:", yesterdayStr)
  
  const commit = store.getCommitByDate(yesterdayStr)
  console.log("📋 Yesterday's commit:", commit)
  
  if (commit) {
    console.log("✅ Found commit:", {
      date: commit.date,
      blocks: commit.blocks.length,
      committed: commit.committed,
      committed_at: commit.committed_at,
    })
  } else {
    console.log("❌ No commit found for yesterday")
    console.log("📊 All commits:", store.commits.map(c => ({
      date: c.date,
      blocks: c.blocks.length,
      committed: c.committed,
    })))
  }
  
  return commit || null
}

/**
 * Test syncing to Supabase
 */
export async function testSyncToSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.error("❌ Supabase not configured")
    return
  }
  
  console.log("🔄 Testing sync to Supabase...")
  const store = useScheduleStore.getState()
  const today = new Date().toISOString().split("T")[0]
  const todayCommit = store.getCommitByDate(today)
  
  if (!todayCommit) {
    console.log("⚠️ No commit for today - create one first")
    return
  }
  
  console.log("📤 Syncing commit:", todayCommit.date)
  
  try {
    // This will be handled by syncScheduleCommit internally
    // Just verify the commit is in the store
    console.log("✅ Commit is in local store")
    console.log("📊 Commit details:", {
      date: todayCommit.date,
      blocks: todayCommit.blocks.length,
      committed: todayCommit.committed,
    })
    
    // Process sync queue
    await processSyncQueue()
    console.log("✅ Sync queue processed")
  } catch (error) {
    console.error("❌ Sync error:", error)
  }
}

/**
 * Test pulling from Supabase
 */
export async function testPullFromSupabase(): Promise<void> {
  if (!isSupabaseConfigured()) {
    console.error("❌ Supabase not configured")
    return
  }
  
  console.log("⬇️ Testing pull from Supabase...")
  
  try {
    const { scheduleCommits, journalEntries, tasks } = await pullFromSupabase()
    
    console.log("✅ Pulled data:")
    console.log(`📅 Schedule commits: ${scheduleCommits.length}`)
    console.log(`📝 Journal entries: ${journalEntries.length}`)
    console.log(`✅ Tasks: ${tasks.length}`)
    
    console.log("📋 Schedule commits:", scheduleCommits.map(c => ({
      date: c.date,
      blocks: c.blocks.length,
      committed: c.committed,
    })))
    
    return { scheduleCommits, journalEntries, tasks }
  } catch (error) {
    console.error("❌ Pull error:", error)
    throw error
  }
}

/**
 * Test full sync cycle
 */
export async function testFullSync(): Promise<void> {
  console.log("🔄 Testing full sync cycle...")
  
  // 1. Pull from Supabase
  console.log("\n1️⃣ Pulling from Supabase...")
  await testPullFromSupabase()
  
  // 2. Process sync queue
  console.log("\n2️⃣ Processing sync queue...")
  await processSyncQueue()
  
  // 3. Pull again to verify
  console.log("\n3️⃣ Pulling again to verify...")
  await testPullFromSupabase()
  
  console.log("\n✅ Full sync cycle complete")
}

/**
 * Test merge logic
 */
export async function testMergeLogic(): Promise<void> {
  console.log("🔄 Testing merge logic...")
  
  const { pullAndMergeData } = useAuthStore.getState()
  
  const before = useScheduleStore.getState().commits.length
  console.log(`📊 Commits before merge: ${before}`)
  
  await pullAndMergeData()
  
  const after = useScheduleStore.getState().commits.length
  console.log(`📊 Commits after merge: ${after}`)
  
  if (after >= before) {
    console.log(`✅ Merge successful (${after - before} new commits)`)
  } else {
    console.log(`⚠️ Commits decreased (might be normal if local had duplicates)`)
  }
}

/**
 * Get debug info about current state
 */
export function getDebugInfo(): void {
  const scheduleStore = useScheduleStore.getState()
  const journalStore = useJournalStore.getState()
  const tasksStore = useTasksStore.getState()
  const authStore = useAuthStore.getState()
  
  console.log("📊 Current State:")
  console.log({
    supabaseConfigured: isSupabaseConfigured(),
    user: authStore.user?.email || "Not logged in",
    scheduleCommits: scheduleStore.commits.length,
    journalEntries: journalStore.entries.length,
    tasks: tasksStore.tasks.length,
  })
  
  console.log("\n📅 Recent commits:")
  scheduleStore.commits.slice(0, 5).forEach(c => {
    console.log(`  ${c.date}: ${c.blocks.length} blocks, committed: ${c.committed}`)
  })
}

// Make functions available globally for console testing
if (typeof window !== "undefined") {
  (window as any).testBackend = {
    loadYesterday: testLoadYesterday,
    syncToSupabase: testSyncToSupabase,
    pullFromSupabase: testPullFromSupabase,
    fullSync: testFullSync,
    mergeLogic: testMergeLogic,
    debugInfo: getDebugInfo,
  }
  
  console.log("🧪 Backend test utilities loaded!")
  console.log("Usage: window.testBackend.loadYesterday()")
  console.log("       window.testBackend.fullSync()")
  console.log("       window.testBackend.debugInfo()")
}

