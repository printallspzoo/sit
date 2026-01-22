
import { supabase } from './supabaseClient';
import { ApiResponse } from '../types';

export const apiSendEmail = async (to: string, subject: string, html: string): Promise<ApiResponse<void>> => {
    try {
        const { data, error } = await supabase.functions.invoke('send-email', {
            body: { to, subject, html }
        });

        if (error) {
            console.error('Edge Function Error:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (e: any) {
        console.error('Mail Service Exception:', e);
        return { success: false, error: e.message || 'Failed to send email' };
    }
};
