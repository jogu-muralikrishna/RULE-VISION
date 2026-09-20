import {
  InspectionRecord,
  ExtractedPackageData,
  FieldComplianceResult,
  PackageAngleImage,
  PackagingGeometry
} from '../types';
import {
  DEMO_INSPECTIONS,
  DEMO_COMPLIANT_INSPECTION,
  DEMO_NON_COMPLIANT_INSPECTION,
  DEMO_NEEDS_REVIEW_INSPECTION
} from '../data/demoData';
import { evaluatePackageCompliance } from '../rules/complianceEngine';
import { DEFAULT_LEGAL_RULES } from '../rules/defaultRules';
import { synthesizeDynamicPackageData } from '../utils/dynamicPackageIntelligence';
import { scanLabelInBrowser } from '../utils/browserOcrScanner';

export interface AnalyzeProductOptions {
  image: string;
  mimeType?: string;
  productName?: string;
  isDemo?: boolean;
  rawSvg?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  customRules?: any[] | null;
  barcodeNumber?: string | null;
  apiKey?: string;
  packagingGeometry?: PackagingGeometry;
  multiAngleImages?: PackageAngleImage[];
}

/**
 * Merges extracted declarations across multiple package angles (e.g. front, back, side)
 * without duplicating checks or overwriting high-confidence verified data.
 */
export function mergeExtractedPackageData(
  primary: ExtractedPackageData,
  secondary: ExtractedPackageData
): ExtractedPackageData {
  const merged: ExtractedPackageData = { ...primary };
  const keys: (keyof ExtractedPackageData)[] = [
    'commodity_name',
    'net_quantity',
    'mrp',
    'manufacturing_or_packing_date',
    'expiry_or_best_before',
    'consumer_care_contact',
    'manufacturer_name',
    'manufacturer_address',
    'country_of_origin',
    'fssai_license'
  ];

  for (const key of keys) {
    const pField = primary[key];
    const sField = secondary[key];

    // If secondary has a value and primary doesn't, take secondary
    if (!pField?.value && sField?.value) {
      merged[key] = { ...sField };
    } else if (pField?.value && sField?.value && (sField.confidence || 0) > (pField.confidence || 0)) {
      // If secondary has higher confidence, prefer secondary
      merged[key] = { ...sField };
    }
  }

  return merged;
}

/**
 * Matches input against known demo datasets
 */
function matchDemoData(content: string, productName?: string, isDemo?: boolean): ExtractedPackageData | null {
  if (!isDemo) {
    return null;
  }
  const combined = `${content} ${productName || ''}`.toLowerCase();
  if (
    combined.includes('heritage royale') ||
    combined.includes('basmati rice') ||
    combined.includes('heritage agro foods')
  ) {
    return DEMO_COMPLIANT_INSPECTION.extracted_data;
  }
  if (
    combined.includes('delite gold') ||
    combined.includes('butter cookies') ||
    combined.includes('delite confectioneries')
  ) {
    return DEMO_NON_COMPLIANT_INSPECTION.extracted_data;
  }
  if (
    combined.includes('sunpure') ||
    combined.includes('sunflower oil') ||
    combined.includes('mk agrotech')
  ) {
    return DEMO_NEEDS_REVIEW_INSPECTION.extracted_data;
  }
  return null;
}

/**
 * Parses SVG tags for declarations (client-side)
 */
function parseSvgDeclarations(svg: string): ExtractedPackageData {
  const fallback = { value: null, confidence: 0, evidence: null, boundingBox: null };
  const data: ExtractedPackageData = {
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

  const demoMatch = matchDemoData(svg);
  if (demoMatch) return demoMatch;

  const textMatches = Array.from(svg.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/gi)).map(m =>
    m[1].replace(/<[^>]+>/g, '').trim()
  );

  for (const line of textMatches) {
    const l = line.toLowerCase();
    if (l.includes('commodity:') || l.includes('product:')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.commodity_name = { value: val, confidence: 0.95, evidence: line, boundingBox: null };
    } else if (l.includes('net quantity:') || l.includes('net wt:') || l.includes('net vol:')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.net_quantity = { value: val, confidence: 0.95, evidence: line, boundingBox: null };
    } else if (l.includes('mrp') || l.includes('₹') || l.includes('rs.')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.mrp = { value: val, confidence: 0.95, evidence: line, boundingBox: null };
    } else if (l.includes('packed date') || l.includes('pkd') || l.includes('mfg date')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.manufacturing_or_packing_date = { value: val, confidence: 0.92, evidence: line, boundingBox: null };
    } else if (l.includes('best before') || l.includes('expiry') || l.includes('use by')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.expiry_or_best_before = { value: val, confidence: 0.92, evidence: line, boundingBox: null };
    } else if (l.includes('consumer care') || l.includes('care@') || l.includes('1800-') || l.includes('helpline')) {
      if (!line.includes('NOT DETECTED')) {
        const val = line.replace(/^[^:]+:\s*/i, '').trim();
        data.consumer_care_contact = { value: val, confidence: 0.92, evidence: line, boundingBox: null };
      }
    } else if (l.includes('manufacturer name:') || l.includes('manufactured by') || l.includes('mfg by:')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.manufacturer_name = { value: val, confidence: 0.92, evidence: line, boundingBox: null };
    } else if (l.includes('full address') || l.includes('address & pin') || l.includes('plot ') || l.includes('sector ')) {
      const val = line.replace(/^[^:]+:\s*/i, '').trim();
      data.manufacturer_address = { value: val, confidence: 0.90, evidence: line, boundingBox: null };
    } else if (l.includes('country of origin') || l.includes('made in ') || l.includes('product of ')) {
      if (!line.includes('NOT DECLARED')) {
        const val = line.replace(/^[^:]+:\s*/i, '').trim();
        data.country_of_origin = { value: val, confidence: 0.95, evidence: line, boundingBox: null };
      }
    } else if (l.includes('fssai') || l.includes('lic. no') || l.includes('license no') || /\b\d{14}\b/.test(l)) {
      const numMatch = line.match(/\d{14}/);
      if (numMatch) {
        data.fssai_license = { value: numMatch[0], confidence: 0.90, evidence: line, boundingBox: null };
      } else {
        const val = line.replace(/^[^:]+:\s*/i, '').trim();
        data.fssai_license = { value: val, confidence: 0.85, evidence: line, boundingBox: null };
      }
    }
  }

  return data;
}

/**
 * Direct browser-to-Gemini REST API caller:
 * Enables full Vision AI analysis even on Live Server / static environments when API key is provided.
 */
async function callGeminiDirectClient(
  apiKey: string,
  base64Data: string,
  mimeType: string,
  productName?: string
): Promise<ExtractedPackageData | null> {
  try {
    const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;
    const body = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType || 'image/jpeg',
                data: cleanBase64
              }
            },
            {
              text: `You are RuleVision's Packaged Commodity Multimodal Label Inspector for India's Legal Metrology (Packaged Commodities) Rules, 2011.
Inspect this packaged commodity label photograph and extract the statutory declarations required under Rule 6(1), plus the FSSAI license number for food products.

CRITICAL: ONLY extract visible information. If not visible, return value: null, confidence: 0. NEVER guess.
Return strictly a JSON object conforming to this structure:
{
  "commodity_name": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "net_quantity": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "mrp": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "manufacturing_or_packing_date": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "expiry_or_best_before": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "consumer_care_contact": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "manufacturer_name": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "manufacturer_address": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "country_of_origin": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null },
  "fssai_license": { "value": string | null, "confidence": number, "evidence": string | null, "boundingBox": { "ymin": number, "xmin": number, "ymax": number, "xmax": number } | null }
}`
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    };

    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
    for (const m of models) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) continue;
        const resData = await res.json();
        const text = resData?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return parsed as ExtractedPackageData;
        }
      } catch (err) {
        // try next model
      }
    }
  } catch (e) {
    console.warn('[RuleVision] Client-side Gemini call notice:', e);
  }
  return null;
}

/**
 * Client-Side Heuristic Fallback Inspector:
 * Operates when backend API is unreachable or Live Server returns 405 Method Not Allowed.
 */
async function runClientSideInspection(options: AnalyzeProductOptions): Promise<InspectionRecord> {
  const content = options.rawSvg || options.image;
  const isSvg = Boolean(
    options.rawSvg ||
    content.startsWith('data:image/svg') ||
    content.includes('<svg')
  );

  let extracted: ExtractedPackageData | null = null;

  // 1. Check if user configured Gemini API key in localStorage or options
  const apiKey = options.apiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('rulevision_gemini_api_key') : null);
  if (apiKey && !isSvg) {
    extracted = await callGeminiDirectClient(apiKey, content, options.mimeType || 'image/jpeg', options.productName);
  }

  if (!extracted) {
    if (isSvg) {
      extracted = parseSvgDeclarations(content);
    } else {
      const demo = matchDemoData(content, options.productName, options.isDemo);
      if (demo) {
        extracted = demo;
      } else {
        // Physical OCR scanning of package image pixels in browser:
        extracted = await scanLabelInBrowser(content, options.productName);
      }
    }
  }

  // 2. Multi-Angle Evidence Aggregation: If user uploaded multiple angles, scan them and merge evidence
  if (options.multiAngleImages && options.multiAngleImages.length > 1) {
    for (let i = 1; i < options.multiAngleImages.length; i++) {
      const angle = options.multiAngleImages[i];
      try {
        let angleExtracted: ExtractedPackageData | null = null;
        if (apiKey) {
          angleExtracted = await callGeminiDirectClient(apiKey, angle.dataUrl, 'image/jpeg', options.productName);
        }
        if (!angleExtracted) {
          angleExtracted = await scanLabelInBrowser(angle.dataUrl, options.productName);
        }
        if (angleExtracted && extracted) {
          extracted = mergeExtractedPackageData(extracted, angleExtracted);
        }
      } catch (err) {
        console.warn(`[RuleVision] Multi-angle scan skipped for angle ${angle.angleLabel}:`, err);
      }
    }
  }

  const rules = options.customRules || DEFAULT_LEGAL_RULES;
  const evaluation = evaluatePackageCompliance(extracted, rules, {
    packagingGeometry: options.packagingGeometry || 'flat',
    multiAngleCount: options.multiAngleImages ? options.multiAngleImages.length + 1 : 1
  });

  const authSession = typeof localStorage !== 'undefined'
    ? JSON.parse(localStorage.getItem('rulevision_auth_session_v1') || 'null')
    : null;

  let inspectorName = 'Not Provided';
  let inspectorEmail = 'Not Provided';
  if (authSession && authSession.email) {
    inspectorEmail = authSession.email;
    inspectorName = authSession.role === 'inspector'
      ? `Inspector ${authSession.email.split('@')[0]}`
      : authSession.email;
  }

  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    inspection_code: `RV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    product_name: extracted.commodity_name.value || 'Not Detected',
    commodity_name: extracted.commodity_name.value,
    net_quantity: extracted.net_quantity.value,
    mrp: extracted.mrp.value,
    manufacturing_or_packing_date: extracted.manufacturing_or_packing_date.value,
    expiry_or_best_before: extracted.expiry_or_best_before.value,
    consumer_care_contact: extracted.consumer_care_contact.value,
    manufacturer_name: extracted.manufacturer_name.value,
    manufacturer_address: extracted.manufacturer_address.value,
    country_of_origin: extracted.country_of_origin.value,
    fssai_license: extracted.fssai_license?.value || null,
    barcode_number: options.barcodeNumber || null,
    overall_status: evaluation.overallStatus,
    passed_count: evaluation.passedCount,
    failed_count: evaluation.failedCount,
    review_count: evaluation.reviewCount,
    not_applicable_count: evaluation.notApplicableCount ?? 0,
    packaging_geometry: options.packagingGeometry || 'flat',
    multi_angle_images: options.multiAngleImages || undefined,
    extracted_data: extracted,
    compliance_results: evaluation.complianceResults,
    violations: evaluation.violations,
    image_url: options.image,
    latitude: options.latitude ?? null,
    longitude: options.longitude ?? null,
    location_name: options.locationName || (options.latitude ? 'Verified Coordinates' : 'Not Provided'),
    created_at: new Date().toISOString(),
    is_demo: Boolean(options.isDemo),
    reviewed_by_inspector: false,
    inspector_name: inspectorName,
    inspector_email: inspectorEmail,
    notes: 'Evaluated using RuleVision Legal Metrology Compliance Engine.'
  };
}

/**
 * Shared inspection pipeline function used by Inspector Mode, Consumer Mode, and Batch Mode.
 * Tries server endpoint first, and automatically falls back to client-side compliance inspection
 * if running on Live Server (405 Method Not Allowed) or offline.
 */
export async function analyzeProductImage(options: AnalyzeProductOptions): Promise<InspectionRecord> {
  const activeKey = options.apiKey || (typeof localStorage !== 'undefined' ? localStorage.getItem('rulevision_gemini_api_key') : null) || undefined;

  const payload = JSON.stringify({
    image: options.image,
    mimeType: options.mimeType || 'image/jpeg',
    productName: options.productName || undefined,
    rawSvg: options.rawSvg || null,
    isDemo: Boolean(options.isDemo),
    latitude: options.latitude ?? null,
    longitude: options.longitude ?? null,
    locationName: options.locationName ?? null,
    customRules: options.customRules || null,
    barcodeNumber: options.barcodeNumber || null,
    packagingGeometry: options.packagingGeometry || 'flat',
    multiAngleImages: options.multiAngleImages || undefined,
    apiKey: activeKey
  });

  // Candidate API endpoints
  const candidateUrls: string[] = ['/api/inspect'];
  if (typeof window !== 'undefined' && window.location.port !== '3000') {
    candidateUrls.push('http://localhost:3000/api/inspect');
  }

  for (const url of candidateUrls) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeKey) {
        headers['x-gemini-api-key'] = activeKey;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: payload
      });

      // 405 Method Not Allowed (Live Server) or 404 Not Found -> skip to next or fallback
      if (response.status === 405 || response.status === 404) {
        console.warn(`[RuleVision] ${url} returned status ${response.status}. Trying next candidate or client-side fallback.`);
        continue;
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        continue;
      }

      const data = await response.json();
      if (response.ok && data.success && data.inspection) {
        return data.inspection;
      }
    } catch (err) {
      console.warn(`[RuleVision] Failed connecting to ${url}:`, err);
    }
  }

  // All server attempts failed or Live Server (405) active -> Run client-side inspection fallback!
  console.info('[RuleVision] Running client-side Legal Metrology inspection engine.');
  return runClientSideInspection({ ...options, apiKey: activeKey });
}
