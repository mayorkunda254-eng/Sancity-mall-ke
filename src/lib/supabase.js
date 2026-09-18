import { createClient } from '@supabase/supabase-js'

const defaultSupabaseUrl = 'https://aetxzqugccixmxygzmtn.supabase.co'
const defaultPublishableKey = 'sb_publishable_1vl9pWJnjXiseJJdHTPReQ_hXr6H0ta'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || defaultSupabaseUrl
const publishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  defaultPublishableKey

export const isSupabaseConfigured = Boolean(supabaseUrl && publishableKey)

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export const PRODUCT_IMAGE_BUCKET = 'product-images'
