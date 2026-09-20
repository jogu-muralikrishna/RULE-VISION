import { createWorker } from 'tesseract.js';
import { ExtractedPackageData } from '../../src/types';
import { parseDeclarationsFromOcrText } from '../../src/utils/ocrParser';

let tesseractWorkerPromise: Promise<any> | null = null;

function getEmptyPackageData(): ExtractedPackageData {
  const fallback = { value: null, confidence: 0, evidence: null, boundingBox: null };
  return {
    commodity_name: { ...fallback },
    net_quantity: { ...fallback },
    mrp: { ...fallback },
    manufacturing_or_packing_date: { ...fallback },
    expiry_or_best_before: { ...fallback },
    consumer_care_contact: { ...fallback },
    manufacturer_name: { ...fallback },
    manufacturer_address: { ...fallback },
    country_of_origin: { ...fallback },
    fssai_license: { ...fallback }
  };
}

async function getWorker() {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return tesseractWorkerPromise;
}

/**
 * Real Optical Character Recognition (OCR) scanner for packaging labels.
 * Inspects image pixels, reads visible text, and semantically maps statutory declarations.
 * Strictly adheres to verified OCR text without synthesizing artificial values.
 */
export async function scanLabelWithOCR(
  imageBufferOrBase64: string | Buffer,
  productName?: string
): Promise<ExtractedPackageData> {
  try {
    const worker = await getWorker();

    let imageInput: Buffer;
    if (Buffer.isBuffer(imageBufferOrBase64)) {
      imageInput = imageBufferOrBase64;
    } else if (typeof imageBufferOrBase64 === 'string') {
      const commaIndex = imageBufferOrBase64.indexOf(',');
      const base64Str = commaIndex !== -1 ? imageBufferOrBase64.slice(commaIndex + 1) : imageBufferOrBase64;
      imageInput = Buffer.from(base64Str.replace(/\s+/g, ''), 'base64');
    } else {
      throw new Error('Unsupported image input format for OCR.');
    }

    const ret = await worker.recognize(imageInput);
    const text = ret.data.text || '';
    const lines = ret.data.lines || [];
    const imgWidth = ret.data.imageWidth || 1000;
    const imgHeight = ret.data.imageHeight || 1000;

    console.log(`[RuleVision OCR] Recognized ${lines.length} lines from image (${text.length} chars).`);

    // If OCR yielded minimal text, return honest unextracted data rather than fabricating values
    if (!text || text.trim().length < 3) {
      console.log('[RuleVision OCR] Minimal text detected. Returning unextracted declarations.');
      return getEmptyPackageData();
    }

    // Parse statutory declarations using Legal Metrology PCR 2011 rule rules
    return parseDeclarationsFromOcrText(text, lines, imgWidth, imgHeight, productName);
  } catch (err: any) {
    console.warn('[RuleVision OCR] OCR engine exception:', err?.message || err);
    return getEmptyPackageData();
  }
}

