import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xbirikzsrwmgqxlazglm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhiaXJpa3pzcndtZ3F4bGF6Z2xtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1NTQzNDQsImV4cCI6MjA5MTEzMDM0NH0.FGNU8Myke7Pwqkv-8vr37zvRNhzELB95bmOYaxAFR14';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
