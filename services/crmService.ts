import { supabase } from './supabaseClient';
import { ApiResponse, CRMContact, CRMActivity, CRMStatus } from '../types';

export const apiGetCRMContacts = async (): Promise<ApiResponse<CRMContact[]>> => {
    const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .order('last_activity', { ascending: false });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CRMContact[] };
};

export const apiUpsertCRMContact = async (contact: Partial<CRMContact>): Promise<ApiResponse<CRMContact>> => {
    // If we have an email, we try to match existing contact to prevent duplicates
    if (contact.email && !contact.id) {
        const { data: existing } = await supabase
            .from('crm_contacts')
            .select('id')
            .eq('email', contact.email)
            .maybeSingle();
        
        if (existing) contact.id = existing.id;
    }

    // Removed .select() to avoid RLS read errors for public users
    const { error } = await supabase
        .from('crm_contacts')
        .upsert({
            ...contact,
            last_activity: new Date().toISOString()
        });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: contact as CRMContact };
};

export const apiUpdateCRMStatus = async (contactId: string, status: CRMStatus, userId: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase
        .from('crm_contacts')
        .update({ status, last_activity: new Date().toISOString() })
        .eq('id', contactId);
    
    if (error) return { success: false, error: error.message };

    // Log the status change
    await apiAddCRMActivity({
        contact_id: contactId,
        user_id: userId,
        type: 'status_change',
        content: `Status changed to: ${status.toUpperCase()}`
    });

    // Fix: Corrected return object property from 'true' to 'success' to match ApiResponse type
    return { success: true };
};

export const apiGetCRMActivities = async (contactId: string): Promise<ApiResponse<CRMActivity[]>> => {
    const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as CRMActivity[] };
};

export const apiAddCRMActivity = async (activity: Partial<CRMActivity>): Promise<ApiResponse<CRMActivity>> => {
    const { data, error } = await supabase
        .from('crm_activities')
        .insert(activity)
        .select()
        .single();
    
    if (error) return { success: false, error: error.message };
    
    // Update last activity on contact
    if (activity.contact_id) {
        await supabase
            .from('crm_contacts')
            .update({ last_activity: new Date().toISOString() })
            .eq('id', activity.contact_id);
    }

    return { success: true, data: data as CRMActivity };
};