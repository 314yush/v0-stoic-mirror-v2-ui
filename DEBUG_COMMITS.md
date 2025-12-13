// Debug utility to check commits in local storage
// Run this in the browser console:

// 1. Get all commits from store
const store = window.__ZUSTAND_STORES__?.schedule_commits_v1 || null;
if (store) {
  const commits = store.getState().commits;
  console.log('📋 All commits:', commits);
  console.log('📋 Commit count:', commits.length);
  
  // Check today's commit
  const today = new Date().toISOString().split('T')[0];
  const todayCommit = commits.find(c => c.date === today);
  console.log('📅 Today:', today);
  console.log('📅 Today commit:', todayCommit);
  
  // Check yesterday's commit (if committed at 1:30 AM, it might be yesterday's date)
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const yesterdayCommit = commits.find(c => c.date === yesterdayStr);
  console.log('📅 Yesterday:', yesterdayStr);
  console.log('📅 Yesterday commit:', yesterdayCommit);
  
  // Check all commits with their committed status
  commits.forEach(c => {
    console.log(`Date: ${c.date}, Committed: ${c.committed}, Blocks: ${c.blocks?.length || 0}, Committed_at: ${c.committed_at}`);
  });
} else {
  console.error('Store not found. Check if Zustand persist is working.');
}

// 2. Check raw local storage
const rawStorage = localStorage.getItem('schedule_commits_v1');
if (rawStorage) {
  const parsed = JSON.parse(rawStorage);
  console.log('💾 Raw storage structure:', parsed);
  console.log('💾 Commits in storage:', parsed.state?.commits);
} else {
  console.error('No raw storage found for schedule_commits_v1');
}

