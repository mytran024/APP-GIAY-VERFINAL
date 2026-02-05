
import html2pdf from 'html2pdf.js';

interface PDFOptions {
    filename?: string;
    orientation?: 'portrait' | 'landscape';
    margin?: number | [number, number] | [number, number, number, number];
}

export const generatePDF = async (element: HTMLElement, options: PDFOptions = {}) => {
    const { filename = 'document.pdf', orientation = 'portrait', margin = 10 } = options;

    const config = {
        margin: margin,
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: orientation }
    };

    try {
        await html2pdf().set(config).from(element).save();
        return true;
    } catch (error) {
        console.error('Error generating PDF:', error);
        return false;
    }
};
