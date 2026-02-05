const XLSX = require('xlsx');

const files = [
    '/Users/tranvuhamy/Downloads/APP GIẤY/LIST HẠ DNL TÀU 298.xlsx',
    '/Users/tranvuhamy/Downloads/APP GIẤY/LIST CONT S30.xlsx'
];

files.forEach(file => {
    try {
        const workbook = XLSX.readFile(file);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        // Get headers (first row)
        const range = XLSX.utils.decode_range(sheet['!ref']);
        const headers = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r, c: C })];
            if (cell && cell.v) headers.push(cell.v);
        }
        console.log(`File: ${file}`);
        console.log('Headers:', headers);

        // Preview first row of data
        const firstRow = [];
        for (let C = range.s.c; C <= range.e.c; ++C) {
            const cell = sheet[XLSX.utils.encode_cell({ r: range.s.r + 1, c: C })];
            firstRow.push(cell ? cell.v : null);
        }
        console.log('First Row Data:', firstRow);
        console.log('---');
    } catch (err) {
        console.error(`Error reading ${file}:`, err.message);
    }
});
