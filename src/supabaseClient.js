import { createClient } from '@supabase/supabase-js'

// Reemplaza estos valores con los que te da Supabase en su panel de control
const supabaseUrl = 'https://oupsscmbijnkewvqjfsn.supabase.co' 
const supabaseKey = 'sb_publishable_vOYBwpn-KXKaC2qRC8uqSw_H1wF3IKI' 

export const supabase = createClient(supabaseUrl, supabaseKey)