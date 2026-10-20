import tool0 from './img-convert.js';
import tool1 from './img-pdf.js';
import tool2 from './img-compress.js';
import tool3 from './pdf-jpg.js';
import pdfPng from './pdf-png.js';
import tool4 from './pdf-docx.js';
import tool5 from './pdf-pptx.js';
import tool6 from './pdf-xlsx.js';
import tool7 from './pdf-translate.js';
import tool8 from './pdf-unlock.js';
import tool9 from './pdf-protect.js';

export const TOOLS = [tool0, tool1, tool2, tool3, pdfPng, tool4, tool5, tool6, tool7, tool8, tool9];
export const BYID = Object.fromEntries(TOOLS.map(tool => [tool.id, tool]));
