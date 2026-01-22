
import { ApiResponse, IncomingLaptop } from '../types';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

const PRINTNODE_API_KEY = 'q43GfEKwIHsT7utSG9HEZ1ZdEPMoRzTWn39xOpokMH8';
const PRINTNODE_API_URL = 'https://api.printnode.com/printjobs';

// Printer Definitions
export const PRINTERS = [
    { id: 75095507, name: '4BARCODE 4B-2054L', size: '50x30mm', mmW: 50, mmH: 30, w: 500, h: 300 },
    { id: 75079908, name: '70x25 Barcode', size: '70x25mm', mmW: 70, mmH: 25, w: 700, h: 250 },
];

/**
 * Generates label image MATCHING the HP Pavilion reference photo.
 * Uses JsBarcode for correct CODE128 encoding.
 */
export const generateLabelDataUrl = (laptop: IncomingLaptop, width: number, height: number): string => {
    const scale = 3; 
    const canvas = document.createElement('canvas');
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    const cw = canvas.width;
    const ch = canvas.height;

    // Background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, cw, ch);

    ctx.fillStyle = 'black';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    // 1. SKU (Top) - Bold, Proportional
    const skuSize = Math.floor(ch * 0.15); // Трохи збільшив
    ctx.font = `bold ${skuSize}px Arial, sans-serif`;
    ctx.fillText(laptop.sku, cw / 2, ch * 0.03);

    // 2. Barcode (Center) - Using JsBarcode library for standard compliance
    const barcodeCanvas = document.createElement('canvas');
    try {
        JsBarcode(barcodeCanvas, laptop.sku, {
            format: "CODE128", // Автоматичний вибір (найкраще для цифр)
            width: 4,          // Ширина штриха (жирніше для кращого зчитування)
            height: 100,
            displayValue: false, // Ми малюємо SKU вручну зверху
            margin: 0,
            background: "#ffffff",
            lineColor: "#000000"
        });

        // Малюємо згенерований штрих-код на головний канвас
        // Розраховуємо розміри, щоб він був широким і високим
        const barcodeW = cw * 0.95;
        const barcodeH = ch * 0.40;
        const barcodeX = (cw - barcodeW) / 2;
        const barcodeY = ch * 0.20;

        ctx.drawImage(barcodeCanvas, barcodeX, barcodeY, barcodeW, barcodeH);

    } catch (e) {
        console.error("Barcode generation failed", e);
        ctx.font = "20px Arial";
        ctx.fillText("Barcode Error", cw / 2, ch / 2);
    }

    // 3. Name (Below Barcode) - 2 lines max, smaller font
    const nameSize = Math.floor(ch * 0.08);
    ctx.font = `${nameSize}px Arial, sans-serif`;
    
    const rawName = (laptop.name || '').substring(0, 100).toUpperCase();
    const words = rawName.split(' ');
    let lines: string[] = [];
    let currentLine = '';
    const maxWidth = cw * 0.96;

    for (let n = 0; n < words.length; n++) {
        let testLine = currentLine + words[n] + ' ';
        let metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    if (currentLine) lines.push(currentLine.trim());

    // Обмежуємо до 2 рядків, щоб не налізло на локацію
    let currentY = ch * 0.62;
    lines.slice(0, 2).forEach((txtLine) => {
        ctx.fillText(txtLine, cw / 2, currentY);
        currentY += nameSize * 1.1;
    });

    // 4. Location (Bottom) - Bold & centered
    const locSize = Math.floor(ch * 0.12);
    ctx.font = `bold ${locSize}px Arial, sans-serif`;
    const locText = laptop.location ? laptop.location.toUpperCase() : "";
    ctx.fillText(locText, cw / 2, ch * 0.84);

    return canvas.toDataURL('image/png');
};

export const apiPrintLaptopLabel = async (printerId: number, laptop: IncomingLaptop): Promise<ApiResponse<number>> => {
    try {
        const printer = PRINTERS.find(p => p.id === printerId) || PRINTERS[0];
        const pngDataUrl = generateLabelDataUrl(laptop, printer.w, printer.h);

        // Для принтера 4BARCODE (75095507) використовуємо альбомну орієнтацію ('l')
        // Для інших (особливо Dymo) залишаємо портретну ('p')
        const isRotated = printer.id === 75095507;

        const pdf = new jsPDF({
            orientation: isRotated ? 'l' : 'p', 
            unit: 'mm',
            format: [printer.mmW, printer.mmH], 
            putOnlyUsedFonts: true,
            compress: true
        });

        // Малюємо зображення без жодних відступів
        pdf.addImage(pngDataUrl, 'PNG', 0, 0, printer.mmW, printer.mmH, undefined, 'FAST');

        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        
        const payload = {
            printerId: printerId,
            title: `Sitrem ${laptop.sku}`,
            contentType: 'pdf_base64', 
            content: pdfBase64,
            source: 'Sitrem Portal'
        };

        const response = await fetch(PRINTNODE_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(PRINTNODE_API_KEY + ':'),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`PrintNode API Error: ${errBody}`);
        }

        const jobId = await response.json();
        return { success: true, data: jobId };
    } catch (e: any) {
        console.error('[PrintNode] Fail:', e);
        return { success: false, error: e.message };
    }
};
