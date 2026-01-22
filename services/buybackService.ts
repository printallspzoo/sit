
import { supabase } from './supabaseClient';
import { ApiResponse, BuybackRequest } from '../types';
import { apiUpsertCRMContact } from './crmService';

export interface BuybackPriceRow {
    id?: string;
    brand: string;
    model_series: string;
    processor_gen?: string;
    ram_gb: number;
    storage_gb: number;
    price_perfect: number;
    price_good: number;
    price_defective: number;
    price_broken: number;
    is_active: boolean;
}

export const apiGetBuybackPrices = async (): Promise<ApiResponse<BuybackPriceRow[]>> => {
    const { data, error } = await supabase
        .from('ankauf_pricing')
        .select('*')
        .order('brand', { ascending: true })
        .order('model_series', { ascending: true });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as BuybackPriceRow[] };
};

export const apiGetModelsByBrand = async (brand: string): Promise<ApiResponse<string[]>> => {
    const { data, error } = await supabase
        .from('ankauf_pricing')
        .select('model_series')
        .eq('brand', brand)
        .eq('is_active', true);
    
    if (error) return { success: false, error: error.message };
    const uniqueModels: string[] = Array.from(new Set((data as any[] || []).map((item: any) => String(item.model_series))));
    return { success: true, data: uniqueModels };
};

export const apiGetSpecsForModel = async (brand: string, model: string): Promise<ApiResponse<Partial<BuybackPriceRow>[]>> => {
    const { data, error } = await supabase
        .from('ankauf_pricing')
        .select('processor_gen, ram_gb, storage_gb')
        .eq('brand', brand)
        .eq('model_series', model)
        .eq('is_active', true);
        
    if (error) return { success: false, error: error.message };
    return { success: true, data: data || [] };
};

export const apiUpdateBuybackPrice = async (row: BuybackPriceRow): Promise<ApiResponse<BuybackPriceRow>> => {
    const payload: any = { ...row };
    if (!payload.id) delete payload.id;
    const conflictColumns = payload.id ? 'id' : 'brand,model_series,ram_gb,storage_gb';

    const { data, error } = await supabase
        .from('ankauf_pricing')
        .upsert(payload, { onConflict: conflictColumns })
        .select()
        .single();
    
    if (error) return { success: false, error: error.message };
    return { success: true, data: data as BuybackPriceRow };
};

export const apiDeleteBuybackPrice = async (id: string): Promise<ApiResponse<any>> => {
    const { error } = await supabase.from('ankauf_pricing').delete().eq('id', id);
    return error ? { success: false, error: error.message } : { success: true };
};

// --- BUYBACK REQUESTS ---

export const apiSubmitBuybackRequest = async (request: Omit<BuybackRequest, 'id' | 'status' | 'created_at'>): Promise<ApiResponse<void>> => {
    // 1. Submit Request (Removed .select() because public users don't have read access)
    const { error } = await supabase
        .from('buyback_requests')
        .insert({
            ...request,
            status: 'pending'
        });
    
    if (error) return { success: false, error: error.message };

    // 2. AUTOMATICALLY ADD TO CRM
    await apiUpsertCRMContact({
        name: request.name || 'Anonymous',
        email: request.email,
        phone: (request as any).phone || '', 
        company_name: (request as any).companyName || '',
        source: (request as any).companyName ? 'buyback_business' : 'buyback_private',
        status: 'new',
        notes: `Interest in selling: ${request.brand} ${request.model}. Offered price: €${request.offered_price}. ${request.description}`
    });

    return { success: true };
};

export const apiGetBuybackRequests = async (): Promise<ApiResponse<BuybackRequest[]>> => {
    const { data, error } = await supabase
        .from('buyback_requests')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) return { success: false, error: error.message };
    return { success: true, data };
};

export const apiUpdateBuybackRequestStatus = async (id: string, status: string): Promise<ApiResponse<void>> => {
    const { error } = await supabase
        .from('buyback_requests')
        .update({ status })
        .eq('id', id);
    
    if (error) return { success: false, error: error.message };
    return { success: true };
};

export const calculateBuybackOffer = async (
    brand: string, 
    model: string, 
    condition: string,
    specs?: { ram: number, disk: number, cpu: string }
): Promise<{ price: number, matchedModel: string, matchedSpecs: string } | null> => {
    let query = supabase
        .from('ankauf_pricing')
        .select('*')
        .eq('brand', brand)
        .eq('model_series', model)
        .eq('is_active', true);

    if (specs && specs.ram > 0) {
        query = query.eq('ram_gb', specs.ram);
    }
    
    const { data: matches } = await query.limit(1);
    
    if (!matches || matches.length === 0) return null;

    const match = matches[0];
    let price = 0;
    switch(condition) {
        case 'perfect': price = match.price_perfect; break;
        case 'good': price = match.price_good; break;
        case 'defective': price = match.price_defective; break;
        case 'broken': price = match.price_broken; break;
    }

    return { 
        price, 
        matchedModel: match.model_series,
        matchedSpecs: specs && specs.ram > 0 ? `${match.processor_gen || ''} / ${match.ram_gb}GB RAM / ${match.storage_gb}GB SSD` : 'Standard config'
    };
};