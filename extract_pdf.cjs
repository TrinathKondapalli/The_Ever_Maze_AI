const m = require('pdf-parse');
const pdfParse = m.PDFParse ? new m.PDFParse() : null;
const fs = require('fs');
const buf = fs.readFileSync('Lumina_CompleteBlueprintV1.pdf');

if (pdfParse && typeof pdfParse.parse === 'function') {
  pdfParse.parse(buf).then(data => {
    fs.writeFileSync('blueprint_extracted.txt', data.text, 'utf8');
    console.log('Pages:', data.numpages, 'Chars:', data.text.length);
  }).catch(e => console.error(e));
} else {
  // Try each exported function
  console.log('Available:', Object.keys(m));
  // Try direct function call patterns
  const keys = Object.keys(m);
  keys.forEach(k => console.log(k, typeof m[k]));
}
