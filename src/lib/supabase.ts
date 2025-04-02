import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.SUPABASE_URL || 'https://ptbwuqaqkqntmgmaqboq.supabase.co';
const supabaseAnonKey = import.meta.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB0Ynd1cWFxa3FudG1nbWFxYm9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDk2MDIsImV4cCI6MjA1OTA4NTYwMn0.zHklpHnOAQ1IvdKjoRnUTFIiPmSMiFiIN9_P0NNuqrg';

export const supabase = createClient(supabaseUrl, supabaseAnonKey); 