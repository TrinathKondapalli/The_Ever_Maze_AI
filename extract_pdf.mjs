import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
GlobalWorkerOptions.workerSrc = pathToFileURL(path.join(__dirname, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs')).href;


const data = new Uint8Array(fs.readFileSync('Lumina_CompleteBlueprintV1.pdf'));
const pdf = await getDocument({ data, disableWorker: true }).promise;

let fullText = '';
console.log('Total pages:', pdf.numPages);

for (let i = 1; i <= pdf.numPages; i++) {
  const page = await pdf.getPage(i);
  const content = await page.getTextContent();
  const pageText = content.items.map(item => item.str).join(' ');
  fullText += `\n--- PAGE ${i} ---\n${pageText}`;
}

fs.writeFileSync('blueprint_extracted.txt', fullText, 'utf8');
console.log('Extracted', fullText.length, 'characters');
console.log('DONE - saved to blueprint_extracted.txt');
