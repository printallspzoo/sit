
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://ulcuucutfigdfpnqdiaa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1psJqRFFcU1XEO34B5jGiQ_NiaiBBoz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * --- ОБОВ'ЯЗКОВО ВИКОНАЙТЕ ЦЕ В SUPABASE SQL EDITOR ---
 * 
 * -- 1. Додавання колонки для прив'язки пристрою
 * ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS device_id TEXT;
 * 
 * -- 2. Політика: Адміни можуть бачити всіх
 * DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
 * CREATE POLICY "Admins can view all profiles" 
 * ON public.profiles FOR SELECT 
 * USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' OR auth.uid() = id );
 * 
 * -- 3. Політика: Адміни можуть редагувати всіх (ДЛЯ ПРИВ'ЯЗКИ ID)
 * DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
 * CREATE POLICY "Admins can update all profiles" 
 * ON public.profiles FOR UPDATE 
 * USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' );
 * 
 * -- 4. Політика: Користувачі можуть редагувати свій аватар
 * DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
 * CREATE POLICY "Users can update own profile" 
 * ON public.profiles FOR UPDATE 
 * USING ( auth.uid() = id );
 */
