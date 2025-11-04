// DIAGNOSTIC SCRIPT: Run this in your browser console (F12) on your app
// This will check Supabase directly for ALL lessons, including ones with unusual IDs

console.log('🔍 DIAGNOSTIC: Checking Supabase for ALL lessons...\n')

async function checkAllLessons() {
  try {
    // Access Supabase client from window or try to create one
    const supabaseUrl = 'https://gkdzcdzgrlnkufqgfizj.supabase.co'
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrZHpjZHpncmxua3VmUWdmZXpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ2NDU5MDAsImV4cCI6MjA1MDIyMTkwMH0.8xKzZZaZLiyRZyCHxjxMM9FSUF7h5JcXCJKB2Kh6EQ8'
    
    // Try to use existing Supabase client from the app
    let supabase
    if (window.supabaseClient) {
      supabase = window.supabaseClient
    } else {
      // Import Supabase client
      const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')
      supabase = createClient(supabaseUrl, supabaseKey)
    }
    
    // Query ALL lessons from Supabase (no filters)
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('lesson_number', { ascending: true })
    
    if (error) {
      console.error('❌ Error querying Supabase:', error)
      return
    }
    
    console.log(`✅ Found ${data.length} total lessons in Supabase:\n`)
    
    // Group by custom_id pattern
    const lessonsByPattern = {
      'lesson-X': [],
      'other': [],
      'null-custom-id': []
    }
    
    data.forEach(lesson => {
      const customId = lesson.custom_id
      if (!customId) {
        lessonsByPattern['null-custom-id'].push(lesson)
      } else if (customId.match(/^lesson-\d+$/)) {
        lessonsByPattern['lesson-X'].push(lesson)
      } else {
        lessonsByPattern['other'].push(lesson)
      }
    })
    
    // Show all lessons
    console.log('📋 All Lessons:')
    data.forEach((lesson, index) => {
      console.log(`\n${index + 1}. ID: ${lesson.id}`)
      console.log(`   custom_id: ${lesson.custom_id || '(null)'}`)
      console.log(`   lesson_number: ${lesson.lesson_number}`)
      console.log(`   title: ${lesson.title || '(empty)'}`)
      console.log(`   subtitle: ${lesson.subtitle || '(empty)'}`)
      console.log(`   topic: ${lesson.topic || '(empty)'}`)
      console.log(`   description: ${lesson.description ? lesson.description.substring(0, 50) + '...' : '(empty)'}`)
      
      // Check if this might be "octaves" or "fifths"
      const searchText = `${lesson.title} ${lesson.subtitle} ${lesson.description} ${lesson.topic}`.toLowerCase()
      if (searchText.includes('octave') || searchText.includes('fifth')) {
        console.log(`   ⭐ THIS MIGHT BE YOUR MISSING LESSON!`)
      }
    })
    
    // Summary
    console.log('\n📊 Summary:')
    console.log(`   Standard format (lesson-X): ${lessonsByPattern['lesson-X'].length}`)
    console.log(`   Other custom_ids: ${lessonsByPattern['other'].length}`)
    console.log(`   Null custom_id: ${lessonsByPattern['null-custom-id'].length}`)
    
    if (lessonsByPattern['other'].length > 0) {
      console.log('\n⚠️ Found lessons with non-standard custom_ids:')
      lessonsByPattern['other'].forEach(lesson => {
        console.log(`   - ${lesson.custom_id}: "${lesson.title || lesson.subtitle || 'no title'}"`)
      })
    }
    
    if (lessonsByPattern['null-custom-id'].length > 0) {
      console.log('\n⚠️ Found lessons with null custom_id:')
      lessonsByPattern['null-custom-id'].forEach(lesson => {
        console.log(`   - Lesson ${lesson.lesson_number}: "${lesson.title || lesson.subtitle || 'no title'}"`)
      })
    }
    
    // Check for "octaves" or "fifths" in any field
    const octavesLessons = data.filter(l => {
      const text = `${l.title} ${l.subtitle} ${l.description} ${l.topic}`.toLowerCase()
      return text.includes('octave')
    })
    
    const fifthsLessons = data.filter(l => {
      const text = `${l.title} ${l.subtitle} ${l.description} ${l.topic}`.toLowerCase()
      return text.includes('fifth')
    })
    
    if (octavesLessons.length > 0) {
      console.log('\n🎵 Found "octaves" lessons:')
      octavesLessons.forEach(l => console.log(`   - ${l.custom_id || `lesson-${l.lesson_number}`}: "${l.title || l.subtitle}"`))
    } else {
      console.log('\n❌ No lessons found containing "octaves"')
    }
    
    if (fifthsLessons.length > 0) {
      console.log('\n🎵 Found "fifths" lessons:')
      fifthsLessons.forEach(l => console.log(`   - ${l.custom_id || `lesson-${l.lesson_number}`}: "${l.title || l.subtitle}"`))
    } else {
      console.log('\n❌ No lessons found containing "fifths"')
    }
    
    return data
  } catch (err) {
    console.error('❌ Error:', err)
    console.log('\n💡 Try this instead:')
    console.log('1. Open your app in the browser')
    console.log('2. Open Developer Tools (F12)')
    console.log('3. Go to the Network tab')
    console.log('4. Look for requests to Supabase')
    console.log('5. Check the response for lessons data')
  }
}

// Run the check
checkAllLessons().then(lessons => {
  if (lessons) {
    console.log('\n✅ Diagnostic complete!')
    console.log('\n💡 If you found your missing lessons:')
    console.log('   - They might have different custom_ids')
    console.log('   - They might need to be synced from localStorage')
    console.log('   - They might be in a different user account')
  }
})

