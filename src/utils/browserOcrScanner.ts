import { ExtractedPackageData } from '../types';
import { parseDeclarationsFromOcrText } from './ocrParser';
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

let clientWorkerPromise: Promise<any> | null = null;

async function getClientWorker() {
  if (!clientWorkerPromise) {
    clientWorkerPromise = (async () => {
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng');
      return worker;
    })();
  }
  return clientWorkerPromise;
}

/**
 * In-browser Optical Character Recognition scanner:
 * Enables physical OCR scanning directly inside the client browser when backend is unreachable.
 * Never invents declarations or injects synthetic catalog data.
 */
export async function scanLabelInBrowser(
  imageDataUrl: string,
  productName?: string
): Promise<ExtractedPackageData> {
  const ocrWork = async (): Promise<ExtractedPackageData> => {
    try {
      const worker = await getClientWorker();
      const ret = await worker.recognize(imageDataUrl);
      const text = ret.data.text || '';
      const lines = ret.data.lines || [];
      const imgWidth = ret.data.imageWidth || 1000;
      const imgHeight = ret.data.imageHeight || 1000;

      if (!text || text.trim().length < 3) {
        return getEmptyPackageData();
      }

      return parseDeclarationsFromOcrText(text, lines, imgWidth, imgHeight, productName);
    } catch (err) {
      console.warn('[RuleVision Browser OCR] Notice:', err);
      return getEmptyPackageData();
    }
  };

  const timeoutFallback = new Promise<ExtractedPackageData>((resolve) => {
    setTimeout(() => {
      resolve(getEmptyPackageData());
    }, 6000);
  });

  return Promise.race([ocrWork(), timeoutFallback]);
}

