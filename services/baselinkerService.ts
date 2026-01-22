
import { ApiResponse, TeardownPart } from '../types';

/**
 * BaseLinker API Configuration
 */
const BASELINKER_API_URL = 'https://api.baselinker.com/connector.php';
const BL_TOKEN = '5008583-5030574-IRDOR0WJKT725395GKFV0WSQAAV4097SKPM78AAYMM2YXALF5ZU8Z7GJCY1LS2ZZ';
const INVENTORY_ID = 39586;

/**
 * Список проксі-серверів для обходу CORS.
 */
const PROXY_PROVIDERS = [
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
    (url: string) => url
];

/**
 * Helper to flatten/ensure array from BaseLinker responses
 */
const ensureArray = (obj: any): any[] => {
    if (!obj) return [];
    if (Array.isArray(obj)) return obj;
    if (typeof obj === 'object') {
        return Object.entries(obj).map(([key, value]: [string, any]) => {
            if (typeof value === 'object' && value !== null) {
                return {
                    ...value,
                    product_id: value.product_id || value.id || parseInt(key)
                };
            }
            return value;
        });
    }
    return [];
};

/**
 * Основний метод комунікації з BaseLinker.
 */
async function callBaseLinker(method: string, parameters: any): Promise<any> {
    const bodyParams = new URLSearchParams();
    bodyParams.append('token', BL_TOKEN);
    bodyParams.append('method', method);
    bodyParams.append('parameters', JSON.stringify(parameters));

    let lastError: any = null;

    for (const getProxyUrl of PROXY_PROVIDERS) {
        const currentProxyUrl = getProxyUrl(BASELINKER_API_URL);
        
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 45000); 

            const response = await fetch(currentProxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: bodyParams.toString(),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status}`);
                continue;
            }

            const text = await response.text();
            
            if (!text || text.trim().startsWith('<!') || text.trim().startsWith('<html')) {
                lastError = new Error("Proxy returned HTML instead of JSON");
                continue;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                lastError = new Error("Invalid JSON response");
                continue;
            }
            
            if (data.status === 'ERROR') {
                const errMsg = data.error_message || 'BaseLinker API Error';
                if (errMsg.includes('Invalid category') || 
                    errMsg.includes('inventory') || 
                    errMsg.includes('Validation') || 
                    errMsg.includes('Missing') || 
                    errMsg.includes('Invalid data format')) {
                    const fatalError = new Error(errMsg);
                    (fatalError as any).isFatal = true;
                    throw fatalError;
                }
                throw new Error(errMsg);
            }
            
            return data; 
        } catch (error: any) {
            if (error.isFatal) throw error;
            lastError = error;
            await new Promise(r => setTimeout(r, 500)); 
            continue;
        }
    }

    throw new Error(`Помилка зв'язку з BaseLinker: ${lastError?.message || 'Connection Failed'}`);
}

export const apiSearchInventoryParts = async (query: string): Promise<ApiResponse<any[]>> => {
    try {
        const result = await callBaseLinker('getInventoryProductsList', {
            inventory_id: INVENTORY_ID,
            filter_name: query
        });

        const products = ensureArray(result.products);
        if (products.length === 0) return { success: true, data: [] };

        const productIds = products.map((p: any) => p.product_id).filter(id => id);
        const details = await callBaseLinker('getInventoryProductsData', {
            inventory_id: INVENTORY_ID,
            products: productIds
        });

        const productsData = ensureArray(details.products);
        const formattedData = productsData.map((p: any) => ({
            id: p.product_id,
            sku: p.sku,
            name: p.text_fields?.name || p.name || 'Unknown',
            stock: p.stock ? (Object.values(p.stock)[0] || 0) : 0,
            location: p.location || 'N/A'
        }));

        return { success: true, data: formattedData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const apiGetInventoryPage = async (page: number = 1): Promise<ApiResponse<any[]>> => {
    try {
        const listRes = await callBaseLinker('getInventoryProductsList', {
            inventory_id: INVENTORY_ID,
            page: page
        });

        const products = ensureArray(listRes.products);
        if (products.length === 0) return { success: true, data: [] };

        const ids = products.map((p: any) => p.product_id).filter(id => id);
        const dataRes = await callBaseLinker('getInventoryProductsData', {
            inventory_id: INVENTORY_ID,
            products: ids
        });

        const productsData = ensureArray(dataRes.products);
        return { success: true, data: productsData };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const apiGetBaseLinkerExtraFields = async (): Promise<ApiResponse<any[]>> => {
    try {
        const result = await callBaseLinker('getInventoryExtraFields', { inventory_id: INVENTORY_ID });
        return { success: true, data: ensureArray(result.extra_fields) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const apiGetBaseLinkerCategories = async (): Promise<ApiResponse<any[]>> => {
    try {
        const result = await callBaseLinker('getInventoryCategories', { inventory_id: INVENTORY_ID });
        return { success: true, data: ensureArray(result.categories) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const apiGetBaseLinkerManufacturers = async (): Promise<ApiResponse<any[]>> => {
    try {
        const result = await callBaseLinker('getInventoryManufacturers', { inventory_id: INVENTORY_ID });
        return { success: true, data: ensureArray(result.manufacturers) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
};

export const apiSyncPartToBaseLinker = async (
    part: TeardownPart, 
    forcedBaseLinkerCategoryId?: string
): Promise<ApiResponse<string>> => {
    try {
        const [fieldsRes, catsRes, mansRes] = await Promise.all([
            apiGetBaseLinkerExtraFields(),
            apiGetBaseLinkerCategories(),
            apiGetBaseLinkerManufacturers()
        ]);

        const blFields = fieldsRes.success ? fieldsRes.data || [] : [];
        const blCategories = catsRes.success ? catsRes.data || [] : [];
        const blManufacturers = mansRes.success ? mansRes.data || [] : [];

        let categoryId = 0;
        
        if (forcedBaseLinkerCategoryId) {
            const forcedId = parseInt(forcedBaseLinkerCategoryId);
            const isValid = blCategories.some(c => c.category_id === forcedId);
            if (isValid) categoryId = forcedId;
        } 
        
        if (!categoryId || categoryId === 0) {
            const matchedCat = blCategories.find(c => c.name.toLowerCase().trim() === part.category.toLowerCase().trim());
            if (matchedCat) categoryId = matchedCat.category_id;
        }

        if ((!categoryId || categoryId === 0) && blCategories.length > 0) {
             const fallback = blCategories.find(c => 
                ['sonstige', 'other', 'parts', 'teile', 'accessories', 'zubehör', 'components'].some(kw => c.name.toLowerCase().includes(kw))
             ) || blCategories[0];
             if (fallback) categoryId = fallback.category_id;
        }

        if (!categoryId || categoryId === 0) {
            return { success: false, error: "Не знайдено відповідну категорію в BaseLinker." };
        }

        let manufacturerId = 0;
        if (part.manufacturer) {
            const matchedMan = blManufacturers.find(m => m.name.toLowerCase().trim() === part.manufacturer?.toLowerCase().trim());
            if (matchedMan) manufacturerId = matchedMan.manufacturer_id;
        }

        const mappedParameters: Record<string, string> = {};
        const features: Record<string, string> = {};

        if (part.parameters) {
            Object.entries(part.parameters).forEach(([key, value]) => {
                if (!value) return;
                const field = blFields.find(f => f.name.toLowerCase().trim() === key.toLowerCase().trim());
                if (field && field.extra_field_id) {
                    mappedParameters[field.extra_field_id.toString()] = value.toString();
                }
                features[key] = value.toString();
            });
        }

        if (part.manufacturer) features["Hersteller"] = part.manufacturer;

        const descriptionHtml = `
            <p><strong>Hersteller:</strong> ${part.manufacturer || 'Generisch'}</p>
            <h3>Technische Spezifikationen:</h3>
            <ul>
                ${Object.entries(part.parameters || {})
                    .filter(([_, v]) => v)
                    .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
                    .join('')}
            </ul>
            ${part.seo?.description ? `<div style="margin-top: 20px;">${part.seo.description}</div>` : ''}
        `;

        // --- IMAGE HANDLING: URL FORMAT ---
        // Формуємо об'єкт images де ключ - індекс, значення - "url:..."
        const cleanImages = (part.images || [])
            .filter(url => typeof url === 'string' && url.startsWith('http') && url.length > 10)
            .slice(0, 16); 

        const imagesPayload: Record<string, string> = {};
        
        cleanImages.forEach((url, index) => {
            imagesPayload[index.toString()] = `url:${url}`;
        });

        const payload: any = {
            inventory_id: INVENTORY_ID,
            sku: part.sku?.toString() || '',
            ean: '',
            manufacturer_id: manufacturerId,
            category_id: categoryId,
            tax_id: 0,
            text_fields: {
                name: part.name,
                description: descriptionHtml,
                features: features
            },
            extra_fields: mappedParameters
        };

        if (Object.keys(imagesPayload).length > 0) {
            payload.images = imagesPayload;
        }

        const result = await callBaseLinker('addInventoryProduct', payload);

        if (result && result.product_id) {
            return { success: true, data: result.product_id.toString() };
        }
        
        return { success: false, error: 'Failed to retrieve product ID' };
    } catch (error: any) {
        console.error('BaseLinker sync failed:', error);
        return { success: false, error: error.message || 'Sync failed' };
    }
};
