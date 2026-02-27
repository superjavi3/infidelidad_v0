import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

// Use anon key — RLS policies allow anon SELECT and INSERT on shared_analyses
export const supabaseAdmin = createClient(supabaseUrl, supabaseAnonKey);
