import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

// Variables are safe to expose in Expo app since Supabase has 
// Row Level Security enabled on Database.
const supabaseUrl = 'https://lmvwvcopakqxbwqsdtwk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtdnd2Y29wYWtxeGJ3cXNkdHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTk5NTEsImV4cCI6MjA2MzQ5NTk1MX0.I_2ql0XL7WSHWZ8kdXt9ZJjtgKCVbJR1dG21NWt9GDo'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})