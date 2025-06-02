import { createClient, SupabaseClientOptions } from '@supabase/supabase-js'
import 'react-native-url-polyfill/auto'

// Variables are safe to expose in Expo app since Supabase has 
// Row Level Security enabled on Database.
const supabaseUrl = 'https://lmvwvcopakqxbwqsdtwk.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxtdnd2Y29wYWtxeGJ3cXNkdHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDc5MTk5NTEsImV4cCI6MjA2MzQ5NTk1MX0.I_2ql0XL7WSHWZ8kdXt9ZJjtgKCVbJR1dG21NWt9GDo'

const options: SupabaseClientOptions<'public'> = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
}

if (typeof window !== 'undefined') {
  options.auth!.storage = require('@react-native-async-storage/async-storage').default;}

export const supabase = createClient(supabaseUrl!, supabaseAnonKey!, options);
