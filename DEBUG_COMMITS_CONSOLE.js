// Emergency Fix Script for Missing Commit
// Run this in the browser console to check and fix your commit

(async function fixCommit() {
  console.log('🔍 Checking for missing commits...\n');
  
  // Access the store directly
  const { useScheduleStore } = await import('/src/renderer/lib/schedule-store.ts');
  const store = useScheduleStore.getState();
  
  console.log('📋 All commits:', store.commits);
  console.log('📋 Total commits:', store.commits.length);
  
  // Check today and yesterday
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  
  console.log('\n📅 Today:', today);
  console.log('📅 Yesterday:', yesterdayStr);
  
  const todayCommit = store.commits.find(c => c.date === today);
  const yesterdayCommit = store.commits.find(c => c.date === yesterdayStr);
  
  console.log('\n📅 Today commit:', todayCommit);
  console.log('📅 Yesterday commit:', yesterdayCommit);
  
  // Find commits that have blocks but aren't marked as committed
  const uncommittedCommits = store.commits.filter(c => 
    c.blocks && c.blocks.length > 0 && !c.committed
  );
  
  if (uncommittedCommits.length > 0) {
    console.log('\n⚠️ Found commits with blocks but not marked as committed:');
    uncommittedCommits.forEach(c => {
      console.log(`  Date: ${c.date}, Blocks: ${c.blocks.length}, Committed: ${c.committed}`);
    });
    
    console.log('\n💡 To fix: You can manually re-commit these by:');
    console.log('  1. Navigate to the date in the calendar');
    console.log('  2. Click "Commit Day" button');
  }
  
  // Find commits that might be for today but saved with wrong date
  const recentCommits = store.commits
    .filter(c => {
      const commitDate = new Date(c.date);
      const daysDiff = Math.abs((new Date() - commitDate) / (1000 * 60 * 60 * 24));
      return daysDiff <= 1;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  
  console.log('\n📅 Recent commits (last 24 hours):');
  recentCommits.forEach(c => {
    console.log(`  Date: ${c.date}, Committed: ${c.committed}, Blocks: ${c.blocks?.length || 0}, Time: ${c.committed_at}`);
  });
  
  // Check if there's a commit for today that should be visible
  if (todayCommit && todayCommit.committed && todayCommit.blocks.length > 0) {
    console.log('\n✅ Found committed commit for today!');
    console.log('   If it\'s not showing, try refreshing the page.');
  } else if (yesterdayCommit && yesterdayCommit.committed && yesterdayCommit.blocks.length > 0) {
    console.log('\n✅ Found committed commit for yesterday!');
    console.log('   If you committed at 1:30 AM, it might be for yesterday\'s date.');
    console.log('   Navigate to yesterday in the calendar to see it.');
  } else {
    console.log('\n❌ No committed commits found for today or yesterday.');
    console.log('   The commit might have been lost or saved with a different date.');
  }
  
  return {
    allCommits: store.commits,
    todayCommit,
    yesterdayCommit,
    uncommittedCommits,
    recentCommits,
  };
})();

