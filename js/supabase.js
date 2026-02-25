// js/supabase.js
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://zottfjopkaismvatblqe.supabase.co";
const supabaseAnonKey = "sb_publishable_gDhyxTObj-ZYOaE-kLEd1w_TTCed0Ki";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
