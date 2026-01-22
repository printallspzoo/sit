
import { supabase } from './supabaseClient';
import { ApiResponse } from '../types';

/**
 * Локальний пошук по базі Supabase
 */
export const searchInventoryLocal = async (query: string): Promise<any[]> => {
    const cleanQuery = query.trim();
    if (!cleanQuery) return [];

    const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .or(`name.ilike.%${cleanQuery}%,sku.ilike.%${cleanQuery}%,location.ilike.%${cleanQuery}%`)
        .order('stock', { ascending: false })
        .limit(50);

    if (error) {
        console.error("Local search error:", error);
        return [];
    }
    return data || [];
};

/**
 * Визначає роздільник CSV (;, ,, \t) на основі першого рядка
 */
const detectDelimiter = (headerLine: string): string => {
    const commas = (headerLine.match(/,/g) || []).length;
    const semicolons = (headerLine.match(/;/g) || []).length;
    const tabs = (headerLine.match(/\t/g) || []).length;

    if (semicolons > commas && semicolons > tabs) return ';';
    if (tabs > commas && tabs > semicolons) return '\t';
    return ',';
};

/**
 * Парсер CSV рядка з динамічним роздільником
 */
const parseCSVLine = (line: string, delimiter: string): string[] => {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === delimiter && !inQuotes) {
            result.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim()); 
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
    return result;
};

/**
 * Завантаження та обробка CSV файлу (Feed)
 */
export const uploadInventoryCSV = async (file: File, onProgress?: (percent: number, message: string) => void): Promise<ApiResponse<any>> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        
        reader.onload = async (e) => {
            let text = e.target?.result as string;
            if (!text) return resolve({ success: false, error: "Файл порожній" });

            try {
                // 1. Видаляємо BOM та зайві пробіли
                text = text.replace(/^\uFEFF/, '').trim();

                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                if (lines.length < 2) return resolve({ success: false, error: "Невірний формат CSV (немає даних)" });

                // 2. Визначаємо роздільник
                const delimiter = detectDelimiter(lines[0]);
                console.log(`Detected CSV delimiter: "${delimiter}"`);

                // 3. Обробка заголовків
                const rawHeaders = parseCSVLine(lines[0], delimiter);
                const headers = rawHeaders.map(h => h.replace(/^['"]+|['"]+$/g, '').trim().toLowerCase());
                
                console.log("Parsed Headers:", headers);

                const headerMap: Record<string, number> = {};
                headers.forEach((h, i) => { headerMap[h] = i; });

                // ПЕРЕВІРКА: Чи знайшли ми SKU?
                const skuPossibleNames = ["sku", "id", "product_id", "nummer", "mpn"];
                const skuIndexName = skuPossibleNames.find(name => headerMap[name] !== undefined);

                if (!skuIndexName) {
                    return resolve({ 
                        success: false, 
                        error: `ПОМИЛКА: Не знайдено колонку SKU. \nРоздільник: "${delimiter}". \nЗнайдені колонки: [${headers.join(', ')}]` 
                    });
                }

                const totalRows = lines.length - 1;
                const BATCH_SIZE = 50; // Менший розмір пакету для стабільності
                
                let processedCount = 0;
                let skippedCount = 0;
                let errorMessages: string[] = [];
                let batchData: any[] = [];

                // Поля для JSON специфікацій
                const specFields = [
                    "festplattenkapazität", "marke", "bildschirmdiagonale", "modell", 
                    "gpu-modell", "cpu-model", "grafikspeichergröß", "betriebssystem", 
                    "konnektivität", "prozessor", "auflösung", "tastaturlayout", 
                    "arbeitsspeichergröße", "besonderheiten", "artikelzustand", 
                    "grafikprozessortyp", "grafikspeichertyp", "festplattentyp", 
                    "produktart", "prozessorgeschwindigkeit", "ean", "herstellernummer"
                ];

                for (let i = 1; i < lines.length; i++) {
                    const row = parseCSVLine(lines[i], delimiter);
                    
                    // Хелпер
                    const getVal = (possibleNames: string[]) => {
                        for (const name of possibleNames) {
                            const idx = headerMap[name.toLowerCase()];
                            if (idx !== undefined && row[idx]) return row[idx];
                        }
                        return null;
                    };

                    const sku = getVal(skuPossibleNames);
                    
                    if (!sku) {
                        skippedCount++;
                        if (skippedCount <= 3) console.warn(`Row ${i} skipped: Empty SKU. Content:`, row);
                        continue;
                    }

                    // Збір зображень
                    const images = [];
                    const mainImg = getVal(["zdjecie", "image", "photo", "bild"]);
                    if (mainImg) images.push(mainImg);
                    for (let j = 1; j <= 14; j++) {
                        const extraImg = getVal([`zdjecie_dodatkowe_${j}`, `image_${j}`, `bild_${j}`]);
                        if (extraImg) images.push(extraImg);
                    }

                    // Збір специфікацій
                    const specs: Record<string, any> = {};
                    specFields.forEach(field => {
                        const val = getVal([field]);
                        if (val) specs[field] = val;
                    });

                    // Чистка ціни
                    let priceStr = getVal(["price", "preis", "brutto"]) || "0";
                    priceStr = priceStr.replace(/\./g, '').replace(',', '.');
                    const price = parseFloat(priceStr);

                    const inventoryItem = {
                        sku: sku,
                        name: getVal(["name", "product_name", "title", "titel"]) || "Unknown Product",
                        stock: parseInt(getVal(["quantity", "stock", "bestand"]) || "0"),
                        price: isNaN(price) ? 0 : price,
                        location: getVal(["lokalizacja", "location", "lager"]),
                        category: getVal(["product_category", "category", "kategorie"]),
                        description_en: getVal(["opis_en", "description_en", "beschreibung_en"]),
                        description_de: getVal(["opis_de", "description_de", "beschreibung"]),
                        specifications: specs,
                        images: images,
                        last_updated: new Date().toISOString()
                    };

                    batchData.push(inventoryItem);

                    // Batch Upsert
                    if (batchData.length >= BATCH_SIZE || i === lines.length - 1) {
                        if (batchData.length > 0) {
                            // !!! IMPORTANT FIX FOR ERROR 21000 !!!
                            // Deduplicate batchData by SKU. If the CSV has duplicate SKUs in the same batch,
                            // Postgres throws "ON CONFLICT command cannot affect row a second time".
                            // We keep the LAST occurrence in the batch as the latest update.
                            const uniqueBatchMap = new Map();
                            batchData.forEach(item => {
                                uniqueBatchMap.set(item.sku, item);
                            });
                            const uniqueBatch = Array.from(uniqueBatchMap.values());

                            const { error } = await supabase
                                .from('inventory')
                                .upsert(uniqueBatch, { onConflict: 'sku' });

                            if (error) {
                                console.error("Batch upload error:", JSON.stringify(error, null, 2)); // Detailed logging
                                
                                // КРИТИЧНА ПЕРЕВІРКА: ID Not Null (23502)
                                if (error.code === '23502' && error.message.includes('id')) {
                                     return resolve({
                                        success: false,
                                        error: "SCHEMA_ERROR: Колонка 'id' не налаштована на авто-генерацію. Будь ласка, запустіть оновлений SQL скрипт."
                                    });
                                }
                                // КРИТИЧНА ПЕРЕВІРКА: Duplicate in Batch (21000)
                                if (error.code === '21000') {
                                     // Should be fixed by uniqueBatchMap above, but just in case
                                     return resolve({
                                        success: false,
                                        error: "DATA_ERROR: Знайдено дублікати SKU в одному пакеті. (Error 21000). Ми спробували це виправити, але помилка лишилась."
                                    });
                                }
                                // КРИТИЧНА ПЕРЕВІРКА: Схема (42703)
                                if (error.message?.includes("column") || error.code === '42703') {
                                    return resolve({
                                        success: false,
                                        error: "SCHEMA_ERROR: Схоже, в базі даних відсутні необхідні колонки. Будь ласка, запустіть SQL скрипт оновлення."
                                    });
                                }
                                // КРИТИЧНА ПЕРЕВІРКА: UNIQUE constraint (42P10)
                                if (error.code === '42P10') {
                                     return resolve({
                                        success: false,
                                        error: "CONSTRAINT_ERROR: Колонка 'sku' не є унікальною (UNIQUE). Потрібно додати обмеження в базу даних."
                                    });
                                }
                                // КРИТИЧНА ПЕРЕВІРКА: Доступи (42501)
                                if (error.code === '42501') {
                                     return resolve({
                                        success: false,
                                        error: "PERMISSION_ERROR: Немає прав на запис (RLS). Запустіть SQL скрипт для оновлення політик."
                                    });
                                }

                                errorMessages.push(`Batch error at row ${i}: ${error.message || JSON.stringify(error)}`);
                            } else {
                                processedCount += batchData.length;
                            }
                        }
                        
                        batchData = []; 
                        
                        if (onProgress) {
                            const percent = Math.round((i / totalRows) * 100);
                            onProgress(percent, `Оброблено ${processedCount}/${totalRows}...`);
                        }
                    }
                }

                resolve({ 
                    success: true, 
                    data: {
                        processed: processedCount,
                        skipped: skippedCount,
                        errors: errorMessages,
                        delimiterUsed: delimiter
                    } 
                });

            } catch (err: any) {
                console.error("CSV Processing Exception:", err);
                resolve({ success: false, error: "Виключення при обробці: " + err.message });
            }
        };

        reader.onerror = () => resolve({ success: false, error: "Не вдалося прочитати файл" });
        reader.readAsText(file, 'UTF-8'); 
    });
};

export const getLastSyncTime = async (): Promise<string | null> => {
    const { data, error } = await supabase
        .from('inventory')
        .select('last_updated')
        .order('last_updated', { ascending: false })
        .limit(1)
        .maybeSingle();
    
    if (error) {
        console.warn("Sync time check warning:", error.message);
        return null;
    }
    return data?.last_updated || null;
};
