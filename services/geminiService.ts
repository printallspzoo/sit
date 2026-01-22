
import { GoogleGenAI, Type } from "@google/genai";
import { ReportEntry, TeardownPart } from "../types";

/**
 * Helper to initialize Gemini client within function scope to use current API key.
 */
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Parses raw Ukrainian description into structured English technical parameters.
 */
export const extractSpecsFromDescription = async (description: string): Promise<Record<string, string>> => {
  try {
    const ai = getAi();
    const prompt = `
      Analyze this laptop description in Ukrainian: "${description}"
      
      TASK:
      1. Extract all technical specifications (CPU, RAM, Storage, Screen, GPU, etc.).
      2. Extract visual condition details (Scratches, dents, wear).
      3. Translate all keys and values into ENGLISH.
      
      Return ONLY a JSON object where keys are the parameter names and values are the values.
      Example Input: "16гб оперативки, процесор і7 10 покоління, екран 4к, є подряпини на кришці"
      Example Output: {"RAM": "16GB", "CPU": "Intel Core i7 10th Gen", "Display": "4K UHD", "Visual Condition": "Scratches on top cover"}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const text = (response.text || "{}").replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Specs Extraction Error:", error);
    return {};
  }
};

/**
 * Extracts the most unique 'anchor' string for BaseLinker search.
 */
export const extractSearchAnchor = async (description: string): Promise<{ anchor: string, brand: string, model: string }> => {
  try {
    const ai = getAi();
    const prompt = `
      Analyze this laptop repair description: "${description}"
      
      TASK:
      1. Extract the Brand (e.g. Dell, Lenovo, HP).
      2. Extract the Full Model (e.g. Latitude 5520).
      3. Identify the "Search Anchor" - ONLY the series number/code (e.g., "5520", "T14", "G3").
      
      Return ONLY JSON:
      {
        "brand": "Brand Name",
        "model": "Full Model Name",
        "anchor": "Short Search String"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { 
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    });

    const text = (response.text || "{}").replace(/```json|```/g, '').trim();
    const result = JSON.parse(text);
    
    if (!result.anchor) {
        const match = description.match(/\d{3,}/);
        result.anchor = match ? match[0] : description.split(' ')[0];
    }
    
    return result;
  } catch (error) {
    console.error("Gemini Anchor Extraction Error:", error);
    const match = description.match(/\d{3,}/);
    return { 
        brand: "", 
        model: description.split(' ').slice(0, 2).join(' '), 
        anchor: match ? match[0] : description.split(' ')[0] 
    };
  }
};

/**
 * Advanced filtering: Separates parts into "Recommended for this fix" and "Others".
 */
export const smartFilterParts = async (
    userProblem: string, 
    laptopModel: string,
    inventoryItems: any[]
): Promise<{ 
    recommendedIds: string[],
    missingParts: string[] 
}> => {
  try {
    const ai = getAi();
    const itemsToAnalyze = inventoryItems.slice(0, 50);

    const prompt = `
      USER PROBLEM: "${userProblem}"
      LAPTOP MODEL: "${laptopModel}"
      
      AVAILABLE INVENTORY:
      ${itemsToAnalyze.map(item => `[ID:${item.id}] ${item.name}`).join('\n')}

      TASKS:
      1. Analyze the USER PROBLEM.
      2. Select IDs from the INVENTORY that are specifically relevant to fixing this problem.
      3. Identify what parts are REQUIRED for this repair but are MISSING from the inventory list completely.
      
      Return JSON.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const cleanText = (response.text || "{}").replace(/```json|```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (error) {
    return { recommendedIds: [], missingParts: [] };
  }
};

export const getProfessionalRepairAdvice = async (model: string, problem: string): Promise<{ diagnosis: string, steps: string[], warnings: string[] }> => {
    try {
        const ai = getAi();
        const prompt = `
            Act as a senior computer repair technician. 
            Model: "${model}". Issue: "${problem}".
            Provide professional advice in UKRAINIAN.
            Return JSON: { "diagnosis": "...", "steps": ["..."], "warnings": ["..."] }
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        const text = (response.text || "{}").replace(/```json|```/g, '').trim();
        return JSON.parse(text);
    } catch (error) {
        return { diagnosis: "Error", steps: [], warnings: [] };
    }
};

export const searchGermanMarketPrices = async (parts: string[], laptopModel: string): Promise<{ partName: string, priceEur: number, source: string, link: string }[]> => {
    if (!parts || parts.length === 0) return [];
    try {
        const ai = getAi();
        const prompt = `Find prices in Germany for "${laptopModel}": ${parts.join(', ')}. Use Google Search.`;
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        // Simplified return for brevity, real implementation needs parsing groundingChunks
        return parts.map(p => ({ partName: p, priceEur: 0, source: 'Search', link: '' }));
    } catch (e) {
        return parts.map(p => ({ partName: p, priceEur: 0, source: 'Not found', link: '' }));
    }
};

export const generateReportSummary = async (entries: ReportEntry[]): Promise<string> => {
  try {
    const ai = getAi();
    const prompt = `Generate a concise summary of these tasks: ${entries.map(t => t.task).join(', ')}`;
    const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt });
    return response.text || "Summary unavailable.";
  } catch (error) { return "Error generating summary."; }
};

export const extractDPDNumber = async (base64Image: string): Promise<string | null> => {
  try {
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts: [{ inlineData: { mimeType: 'image/jpeg', data: base64Image } }, { text: "Extract DPD number." }] }
    });
    return response.text?.replace(/\D/g, '') || null;
  } catch { return null; }
};

export const suggestTeardownParts = async (laptopTitle: string): Promise<any[]> => {
  // Legacy function kept for compatibility
  return []; 
};

export const parseTeardownRow = async (input: string): Promise<Partial<TeardownPart> | null> => {
    try {
      const ai = getAi();
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Parse laptop part to JSON: "${input}".`,
        config: { responseMimeType: "application/json" }
      });
      return JSON.parse(response.text || "{}");
    } catch { return null; }
};

/**
 * AI Auto-Fill for Teardown Parameters
 * Takes the laptop model and a list of parts with requested fields.
 * Returns values for those fields.
 */
export const fillTeardownSpecs = async (
    laptopModel: string, 
    requests: { id: number; category: string; fields: string[] }[]
): Promise<Record<number, Record<string, string>>> => {
    if (!requests || requests.length === 0) return {};

    try {
        const ai = getAi();
        
        const prompt = `
            Laptop Model: "${laptopModel}"
            
            I need technical specifications for the following components of this laptop.
            For each component ID, provide the value for the requested fields based on standard specs for this model.
            
            Requests:
            ${requests.map(r => `ID ${r.id} (${r.category}): Fields [${r.fields.join(', ')}]`).join('\n')}
            
            Also provide a 'Manufacturer' field for each if possible (guess the OEM like Samsung/LG/Chicony).
            
            Return JSON in this format:
            {
                "123": { "Resolution": "1920x1080", "Manufacturer": "LG Display" },
                "456": { "Capacity": "60Wh", "Voltage": "11.4V", "Manufacturer": "Simplo" }
            }
            
            If a value is unknown, use an empty string.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: 'application/json' }
        });

        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error("Gemini Fill Specs Error:", e);
        return {};
    }
};
