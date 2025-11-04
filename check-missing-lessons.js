// QUICK DIAGNOSTIC - Copy and paste this into your browser console (F12) on your app

(async function() {
  console.log('🔍 Checking for "octaves" and "fifths" lessons...\n')
  
  // Use Supabase URL and key from your app
  const supabaseUrl = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
  const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmQWdmZXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NDU5MDAsImV4cCI6MjA1MDIyMTkwMH0.8xKzZZaZLiyRZyCHxjxMM9FSUF7h5JcXCJKB2Kh6EQ8'
  
  // Create Supabase client
  const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
  const supabase = createClient(supabaseUrl, supabaseKey)
  
  // Get ALL lessons
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .order('lesson_number', { ascending: true })
  
  if (error) {
    console.error('❌ Error:', error)
    return
  }
  
  console.log(`✅ Found ${data.length} total lessons in Supabase\n`)
  
  // Search for "octaves" or "fifths" in any field
  const octaves = data.filter(l => {
    const text = `${l.title || ''} ${l.subtitle || ''} ${l.description || ''} ${l.topic || ''}`.toLowerCase()
    return text.includes('octave')
  })
  
  const fifths = data.filter(l => {
    const text = `${l.title || ''} ${l.subtitle || ''} ${l.description || ''} ${l.topic || ''}`.toLowerCase()
    return text.includes('fifth')
  })
  
  console.log('🎵 Searching for "octaves"...')
  if (octaves.length > 0) {
    octaves.forEach(l => {
      console.log(`   ✅ Found: "${l.title || l.subtitle || 'no title'}"`)
      console.log(`      ID: ${l.id}, custom_id: ${l.custom_id || '(null)'}`)
      console.log(`      subtitle: ${l.subtitle || '(empty)'}`)
      console.log(`      topic: ${l.topic || '(empty)'}`)
    })
  } else {
    console.log('   ❌ No lessons found containing "octaves"')
  }
  
  console.log('\n🎵 Searching for "fifths"...')
  if (fifths.length > 0) {
    fifths.forEach(l => {
      console.log(`   ✅ Found: "${l.title || l.subtitle || 'no title'}"`)
      console.log(`      ID: ${l.id}, custom_id: ${l.custom_id || '(null)'}`)
      console.log(`      subtitle: ${l.subtitle || '(empty)'}`)
      console.log(`      topic: ${l.topic || '(empty)'}`)
    })
  } else {
    console.log('   ❌ No lessons found containing "fifths"')
  }
  
  // Show all lesson titles/subtitles
  console.log('\n📋 All lessons in Supabase:')
  data.forEach((l, i) => {
    console.log(`${i + 1}. Lesson ${l.lesson_number}: "${l.title || l.subtitle || 'no title'}" (custom_id: ${l.custom_id || 'null'})`)
  })
  
  // Check deleted IDs
  const deletedIds = JSON.parse(localStorage.getItem('deleted-lesson-ids') || '[]')
  console.log(`\n🗑️ Deleted lesson IDs in localStorage: ${deletedIds.length > 0 ? deletedIds.join(', ') : 'None'}`)
  
  if (octaves.length === 0 && fifths.length === 0) {
    console.log('\n💡 Your "octaves" and "fifths" lessons are not in Supabase.')
    console.log('   They might have been:')
    console.log('   1. Never saved to Supabase')
    console.log('   2. Deleted from Supabase')
    console.log('   3. Saved with different titles/IDs')
    console.log('\n   💡 Solution: You may need to re-add them through the Composer.')
  }
})()

