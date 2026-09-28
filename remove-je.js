const fs = require('fs');
const path = 'c:\\Users\\johac\\OneDrive\\Desktop\\Carpetas varias\\SISFIN\\BACK-SISFIN\\src\\modules\\documents\\services\\financial-document.service.ts';
let content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Lines 100 to 203 (0-indexed are 99 to 202, but wait, let's just find the start and end indices)
const startIndex = lines.findIndex(l => l.includes('// Create Journal Entry if we have account lines (even if not petty cash)'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.trim() === '} catch (err) {') + 3;

if (startIndex !== -1 && endIndex !== -1) {
    const deleted = lines.splice(startIndex, (endIndex - startIndex) + 1);
    lines.splice(startIndex, 0, '    // Journal Entry creation for invoices is DISABLED for Cash-Basis Accounting');
    fs.writeFileSync(path, lines.join('\n'));
    console.log('Successfully disabled Journal Entry creation.');
} else {
    console.log('Could not find bounds: ', startIndex, endIndex);
}
