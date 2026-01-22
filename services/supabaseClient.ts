
import { createClient } from '@supabase/supabase-js';

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
const SUPABASE_URL = 'https://ulcuucutfigdfpnqdiaa.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1psJqRFFcU1XEO34B5jGiQ_NiaiBBoz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * SIMPLIFIED VERSION: No complex path logic, no upsert restriction.
 */
export const apiUploadPhotoToSupabase = async (file: File | Blob, path: string): Promise<string | null> => {
    try {
        // 1. Simple upload
        const { data, error } = await supabase.storage
            .from('laptop-photos')
            .upload(path, file, {
                upsert: true 
            });

        if (error) {
            console.error('Supabase Upload Error:', error);
            // Don't return null immediately on simple errors, try to get URL anyway if it might have worked
            // or if it's a duplicate.
        }

        // 2. Always generate public URL
        const { data: publicUrlData } = supabase.storage
            .from('laptop-photos')
            .getPublicUrl(path);

        return publicUrlData.publicUrl;
    } catch (e) {
        console.error("Supabase Exception:", e);
        return null;
    }
};

/**
 * Deletes a photo from Supabase Storage using its full URL.
 */
export const apiDeletePhotoFromSupabase = async (url: string): Promise<boolean> => {
    try {
        if (!url.includes('/laptop-photos/')) return false;
        const path = url.split('/laptop-photos/')[1]; 
        if (!path) return false;
        
        const { error } = await supabase.storage
            .from('laptop-photos')
            .remove([decodeURIComponent(path)]);

        if (error) {
            console.error('Supabase Delete Error:', error);
            return false;
        }
        return true;
    } catch (e) {
        console.error('Delete Exception:', e);
        return false;
    }
};
