import {
  ExtractedPackageData,
  ExtractedField,
  LegalRuleDefinition,
  FieldComplianceResult,
  OverallComplianceStatus,
  ComplianceStatus,
  PackagingGeometry,
  ImageQualityReport
} from '../types';
import { DEFAULT_LEGAL_RULES } from './defaultRules';
import { getPenaltyForViolation } from './penaltyCalculator';

export interface InspectionEvaluationContext {
  packagingGeometry?: PackagingGeometry;
  imageQualityReport?: ImageQualityReport | null;
  multiAngleCount?: number;
  isFullLabelInspected?: boolean; // true ONLY when verified all panels / 360-degree inspection confirmed
}

/**
 * Normalizes raw extracted text into clean, comparable representation
 */
export function normalizeText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Standard legal metrology metric unit verification (Rule 12 & Second Schedule)
 */
const VALID_METRIC_UNITS = [
  'kg', 'kilogram', 'kilograms',
  'g', 'gm', 'gram', 'grams',
  'l', 'lt', 'ltr', 'litre', 'litres', 'liter', 'liters',
  'ml', 'millilitre', 'millilitres', 'milliliter',
  'm', 'metre', 'metres', 'meter',
  'cm', 'centimetre', 'centimetres',
  'mm', 'millimetre', 'millimetres',
  'u', 'unit', 'units', 'n', 'no', 'nos', 'number', 'numbers', 'piece', 'pieces', 'pc', 'pcs'
];

/**
 * Evaluates whether an unextracted field should be marked NEEDS REVIEW
 * rather than a confirmed statutory violation (FAIL).
 * Per Legal Metrology Inspection Guidelines:
 * An undetected declaration is NOT a confirmed legal violation if:
 * 1. The inspection covers only a single photo or partial label panel (not all 360°/all panels verified).
 * 2. The packaging is curved/cylindrical and only a single viewing angle was provided.
 * 3. The image suffers from specular glare, edge blur, low resolution, or distortion.
 */
function shouldFallbackToNeedsReview(
  context?: InspectionEvaluationContext
): { shouldFallback: boolean; fallbackReason: string; action: string } {
  const isCurved = Boolean(context?.packagingGeometry && context.packagingGeometry !== 'flat');
  const quality = context?.imageQualityReport;
  const hasQualityIssues = Boolean(
    quality &&
    (quality.glareDetected ||
      quality.isBlurry ||
      quality.severePerspective ||
      quality.isLowResolution ||
      quality.isTooDark ||
      quality.isTooBright)
  );

  // Case 1: Curved/cylindrical packaging with single viewing angle
  if (isCurved && (context?.multiAngleCount || 1) <= 1) {
    return {
      shouldFallback: true,
      fallbackReason: `Declaration not detected in the submitted single view of a ${context?.packagingGeometry} package. For curved surfaces, statutory declarations frequently wrap around the rear or side panels. Capture an additional viewing angle before concluding non-compliance.`,
      action: 'Rotate the container to align the missing declaration panel and submit a secondary viewing angle.'
    };
  }

  // Case 2: Visual quality defects (glare, blur, dark, overexposed)
  if (hasQualityIssues && quality) {
    const issues: string[] = [];
    if (quality.glareDetected) issues.push('specular glare');
    if (quality.isBlurry) issues.push('motion/lens blur');
    if (quality.severePerspective) issues.push('severe perspective distortion');
    if (quality.isTooDark) issues.push('underexposure');
    if (quality.isTooBright) issues.push('overexposure');
    if (quality.isLowResolution) issues.push('low resolution');

    return {
      shouldFallback: true,
      fallbackReason: `Declaration not detected, but package photograph exhibits ${issues.join(', ')}. Statutory text may be obscured or unreadable. Please capture a clearer photograph before concluding non-compliance.`,
      action: 'Capture a well-lit, non-reflective photograph of the packaging declaration panel.'
    };
  }

  // Case 3: Single-panel or uncertified label inspection (not certified full-package 360° inspection)
  // Legal Metrology Rule: Non-detection on a single panel photo does NOT prove statutory violation.
  if (!context?.isFullLabelInspected) {
    return {
      shouldFallback: true,
      fallbackReason: 'Declaration was not detected on the captured label panel. Since the inspection does not cover all packaging panels (PDP, rear, sides), physical review is required before confirming legal non-compliance.',
      action: 'Check other packaging panels or capture additional label angles to verify declaration presence.'
    };
  }

  return { shouldFallback: false, fallbackReason: '', action: '' };
}

/**
 * Validates Generic Commodity Name against Rule 6(1)(b)
 * Rule 6(1)(b): Every package shall bear the common or generic name of the commodity.
 * 
 * Strict Integrity Guards:
 * - "Packaged Commodity" is a placeholder, NOT a verified commodity name.
 * - File names (e.g. .jpg, .png, IMG_, capture_) are NOT commodity names.
 * - Gibberish, single characters, or random tokens must NOT receive PASS.
 */
function evaluateCommodityName(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Generic commodity name was not detected on the visible package label.',
      action: 'Locate mandatory common or generic commodity name on physical package.'
    };
  }

  const raw = field.value.trim();

  // Strict Field-Specific Integrity Validation: Reject date-like, numeric, noise, or placeholder strings
  if (!isPlausibleCommodityName(raw)) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Detected text ("${raw}") resembles date, numeric, or unverified OCR text rather than an authentic generic commodity name under Rule 6(1)(b).`,
      action: 'Check package label for authentic generic or common commodity name.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in commodity name extraction. Text may be stylized, curved, or partially cropped.`,
      action: 'Manually confirm commodity name on physical package.'
    };
  }

  return {
    status: 'PASS',
    reason: 'Generic commodity name clearly declared under Rule 6(1)(b).',
    action: 'Compliant declaration.'
  };
}

/**
 * Strict Field Integrity Validator for Generic Commodity Name under Rule 6(1)(b).
 * Rejects values that primarily contain dates, PIN codes, phone numbers, MRP, net quantity,
 * generic OCR noise, image filenames, or generic placeholder text.
 */
export function isPlausibleCommodityName(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const clean = candidate.trim();
  if (clean.length < 3 || clean.length > 80) return false;

  // 1. Rejection of date-like strings (e.g. "12 JAN 2025 {f", "11JUL 2025")
  const hasMonthName = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(clean);
  const hasYear = /\b(?:19|20)\d{2}\b/.test(clean);
  if (hasMonthName || (hasYear && /\d{1,2}[\/\-\.]\d{1,2}/.test(clean))) {
    return false;
  }
  if (
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(clean) ||
    /\b\d{1,2}[a-z]{3}\s*\d{2,4}\b/i.test(clean) ||
    /\b(?:0?[1-9]|[12]\d|3[01])\s+[\w]+\s+\d{2,4}\b/i.test(clean)
  ) {
    return false;
  }

  // 2. Rejection of strings starting with digits or dominated by digits
  if (/^\d/.test(clean)) return false;
  const digitsCount = (clean.match(/\d/g) || []).length;
  if (digitsCount >= 3) return false;

  // 3. Rejection of OCR noise symbols
  if (/[{}\[\]~^<>]/.test(clean)) return false;

  // 4. Rejection of PIN codes, phone numbers, MRP, net quantity, or FSSAI
  if (/^pin[\s\:\-]*\d+/i.test(clean) || /\b[1-9][0-9]{5}\b/.test(clean)) return false;
  if (/^(?:\+?91|1800|\d{10})/i.test(clean) || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(clean)) return false;
  if (/^(?:mrp|rs\.?|₹|\d+\s*(?:kg|g|gm|l|ml|units?|pcs?))/i.test(clean)) return false;
  if (/\b(?:fssai|lic\.?\s*no)\b/i.test(clean)) return false;

  // 5. Rejection of declaration prefixes/keywords without authentic commodity name
  const declarationKeywords = [
    'manufactured', 'mfd', 'packed', 'pkd', 'pkg', 'marketed', 'imported',
    'expiry', 'exp', 'best before', 'use by', 'net quantity', 'net qty',
    'consumer care', 'customer care', 'grievance', 'batch', 'lot'
  ];
  const lower = clean.toLowerCase();
  if (declarationKeywords.includes(lower)) return false;

  // 6. Generic placeholder terms
  const placeholderTerms = [
    'packaged commodity',
    'pre-packaged commodity',
    'commodity',
    'product',
    'item',
    'unknown',
    'commodity name not identified',
    'unidentified'
  ];
  if (placeholderTerms.includes(lower)) return false;

  // 7. Image filenames
  if (
    /\.(jpe?g|png|webp|svg|bmp|tiff)$/i.test(clean) ||
    lower.includes('img_') ||
    lower.includes('dsc_') ||
    lower.includes('capture_') ||
    lower.includes('whatsapp')
  ) {
    return false;
  }

  // 8. Must contain at least 3 alphabetic characters and reasonable letter ratio
  const letters = clean.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) return false;
  if (letters.length / clean.length < 0.55) return false;

  return true;
}

/**
 * Validates Net Quantity against Rule 6(1)(c) & Rule 12 (Standard Metric Units)
 */
function evaluateNetQuantity(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Net quantity declaration was not detected on the package label.',
      action: 'Locate mandatory net weight, volume, or piece count on physical package.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low AI detection confidence (${Math.round(field.confidence * 100)}%). Quantity text may be obscured, curved, or partially cropped.`,
      action: 'Inspect package visually to confirm accurate weight/count declaration.'
    };
  }

  const clean = field.value.toLowerCase();
  const hasNumber = /\d+/.test(clean);
  const hasRecognizedUnit = VALID_METRIC_UNITS.some(unit => 
    new RegExp(`\\b${unit}\\b`, 'i').test(clean) || clean.includes(unit)
  );

  if (!hasNumber) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'Quantity string does not contain a discernible numeric value.',
      action: 'Verify numeric quantity on package.'
    };
  }

  if (!hasRecognizedUnit) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'Quantity unit could not be confirmed as a standard Legal Metrology SI metric unit (kg, g, l, ml, m, or count/N).',
      action: 'Check if non-standard symbols (e.g. non-metric pounds/ounces) were used without SI equivalents.'
    };
  }

  return {
    status: 'PASS',
    reason: 'Standard net quantity declaration detected with valid metric unit.',
    action: 'Compliant declaration.'
  };
}

/**
 * Validates Maximum Retail Price against Rule 6(1)(e)
 * Mandatory requirements:
 * 1. Retail price statement with currency (₹ / Rs. / INR)
 * 2. Numeric price
 * 3. Statutory statement: "inclusive of all taxes" or "(incl. of all taxes)"
 * 
 * Note: A price alone without "inclusive of all taxes" does NOT satisfy all statutory requirements.
 */
function evaluateMrp(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Maximum Retail Price (MRP) declaration was not detected on the package.',
      action: 'Locate mandatory MRP print or sticker on physical package.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in price text extraction. Characters may be faint or dot-matrix printed.`,
      action: 'Verify printed retail price on package.'
    };
  }

  const clean = field.value.toLowerCase();
  const hasDigit = /\d+/.test(clean);

  if (!hasDigit) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'Detected price text does not contain numeric digits.',
      action: 'Verify numerical price printed on package.'
    };
  }

  // Check if taxes statement exists in evidence or value
  const evidenceClean = (field.evidence || '').toLowerCase();
  const combined = `${clean} ${evidenceClean}`;
  const mentionsTaxes = combined.includes('tax') || combined.includes('all taxes') || combined.includes('incl');

  if (!mentionsTaxes) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Retail price detected ("${field.value}"), but statutory "inclusive of all taxes" statement was not verified in visible label text under Rule 6(1)(e).`,
      action: 'Confirm whether "(incl. of all taxes)" or "inclusive of all taxes" is printed alongside MRP.'
    };
  }

  return {
    status: 'PASS',
    reason: 'MRP declared in compliant format with currency and tax inclusion statement.',
    action: 'Compliant declaration.'
  };
}

/**
 * Validates Date of Manufacture / Packing against Rule 6(1)(d)
 * Mandatory requirements:
 * The month and year of manufacture or pre-packing must be declared (MM/YYYY or Month YYYY).
 * 
 * Strict Integrity Guard:
 * "Manufactured Packad" or isolated keywords without an actual month/year do NOT satisfy Rule 6(1)(d).
 */
function evaluateMfgDate(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Month and year of manufacture or pre-packing was not detected.',
      action: 'Check package batch stamp or seal crimp for packing date.'
    };
  }

  const clean = field.value.toLowerCase();
  const evidenceClean = (field.evidence || '').toLowerCase();
  const combined = `${clean} ${evidenceClean}`;

  // Strict date verification: must find actual month/year structure
  const hasDatePattern =
    /\b(0?[1-9]|1[0-2])[\/\-\.](20\d{2}|\d{2})\b/.test(combined) ||
    /\b(0?[1-9]|[12]\d|3[01])[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](20\d{2}|\d{2})\b/.test(combined) ||
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/\-\.]+(20\d{2}|\d{2})\b/i.test(combined) ||
    /\b\d{1,2}(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(?:20\d{2}|\d{2})\b/i.test(combined) ||
    /\b(20\d{2})[\/\-\.](0?[1-9]|1[0-2])\b/.test(combined);

  if (!hasDatePattern) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Detected text ("${field.value}") mentions manufacturing keywords but lacks a verifiable month and year format (MM/YYYY) required by Rule 6(1)(d).`,
      action: 'Inspect package seal crimp or container base for month and year stamp.'
    };
  }

  // Must have manufacturing or packing context keywords
  const mentionsMfg = /(?:mfg|mfd|packed|pkd|pkg|manufactur|packing|date\s*of)/i.test(combined);
  if (!mentionsMfg) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Date detected ("${field.value}") lacks explicit manufacturing or packing keywords ("Mfg", "Packed", "PKD") under Rule 6(1)(d). Verification required to confirm date designation.`,
      action: 'Confirm whether date corresponds to manufacturing or packing on physical package.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in date reading. Dot-matrix or inkjet stamp may be smudged.`,
      action: 'Manually inspect packing date stamp on physical package.'
    };
  }

  return {
    status: 'PASS',
    reason: 'Month and year of manufacturing/packing clearly declared.',
    action: 'Compliant declaration.'
  };
}

/**
 * Validates Consumer Care Contact against Rule 6(1)(f)
 */
function evaluateConsumerCare(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Mandatory consumer care / grievance redressal contact was not detected.',
      action: 'Verify if customer care telephone, email, or postal grievance cell is printed.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in consumer care contact extraction.`,
      action: 'Check contact details on package back panel.'
    };
  }

  const clean = field.value.toLowerCase();
  const hasPhone = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,5}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/.test(clean) || 
    clean.includes('toll free') || clean.includes('tel') || clean.includes('phone') || clean.includes('1800') || clean.includes('contact');
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(clean) || clean.includes('@') || clean.includes('email');
  const hasAddress = clean.includes('executive') || clean.includes('cell') || clean.includes('feedback') || clean.includes('care');

  if (!hasPhone && !hasEmail && !hasAddress) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'Consumer care declaration lacks recognizable phone number, email address, or grievance cell details.',
      action: 'Check physical package for full consumer care contact information.'
    };
  }

  return {
    status: 'PASS',
    reason: 'Consumer grievance redressal channel (phone/email/address) detected.',
    action: 'Compliant declaration.'
  };
}

/**
 * Strict Field Integrity Validator for Manufacturer / Packer Entity Name under Rule 6(1)(a).
 * Rejects values that primarily contain dates, PIN codes, phone numbers, MRP, net quantity,
 * generic OCR noise, or packaging/statutory keywords.
 */
export function isPlausibleEntityName(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  const clean = candidate.trim();
  if (clean.length < 3) return false;

  // 1. Rejection of date-like strings (e.g., "12 JAN 2025 {f", "11JUL 2025", "12/05/2024", "2025/08")
  const hasMonthName = /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(clean);
  const hasYear = /\b(?:19|20)\d{2}\b/.test(clean);
  if (hasMonthName || (hasYear && /\d{1,2}[\/\-\.]\d{1,2}/.test(clean))) {
    return false;
  }
  if (
    /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/.test(clean) ||
    /\b\d{1,2}[a-z]{3}\s*\d{2,4}\b/i.test(clean) ||
    /\b(?:0?[1-9]|[12]\d|3[01])\s+[\w]+\s+\d{2,4}\b/i.test(clean)
  ) {
    return false;
  }

  // 2. Rejection of strings starting with or dominated by digits
  if (/^\d/.test(clean)) {
    return false;
  }
  const digitsCount = (clean.match(/\d/g) || []).length;
  if (digitsCount >= 3) {
    return false;
  }

  // 3. Rejection of OCR noise symbols (e.g., "{f", "[x", "}", "~", "^", "<", ">")
  if (/[{}\[\]~^<>]/.test(clean)) {
    return false;
  }

  // 4. Rejection of PIN codes, phone numbers, MRP, net quantity, or FSSAI
  if (/^pin[\s\:\-]*\d+/i.test(clean) || /\b[1-9][0-9]{5}\b/.test(clean)) {
    return false;
  }
  if (/^(?:\+?91|1800|\d{10})/i.test(clean) || /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(clean)) {
    return false;
  }
  if (/^(?:mrp|rs\.?|₹|\d+\s*(?:kg|g|gm|l|ml|units?|pcs?))/i.test(clean)) {
    return false;
  }
  if (/\b(?:fssai|lic\.?\s*no)\b/i.test(clean)) {
    return false;
  }

  // 5. Rejection of declaration prefixes/keywords without authentic entity name
  const declarationKeywords = [
    'manufactured', 'mfd', 'packed', 'pkd', 'pkg', 'marketed', 'imported',
    'expiry', 'exp', 'best before', 'use by', 'net quantity', 'net qty',
    'consumer care', 'customer care', 'grievance', 'commodity', 'batch', 'lot'
  ];
  const lower = clean.toLowerCase();
  if (declarationKeywords.includes(lower)) {
    return false;
  }

  // 6. Must contain at least 3 alphabetic characters
  const letters = clean.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 3) {
    return false;
  }

  // 7. Ratio of letters to total length must be >= 55%
  if (letters.length / clean.length < 0.55) {
    return false;
  }

  return true;
}

/**
 * Validates Manufacturer / Packer Entity Name against Rule 6(1)(a)
 */
function evaluateManufacturerName(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Manufacturer or packer legal entity name was not detected on the package.',
      action: 'Check physical package for manufacturer / packer entity name.'
    };
  }

  const clean = field.value.trim();

  // Strict Field-Specific Integrity Validation: Reject date-like, numeric, or noisy strings
  if (!isPlausibleEntityName(clean)) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Detected text ("${clean}") resembles date, numeric, or OCR noise text rather than an authentic manufacturer or packer entity name under Rule 6(1)(a).`,
      action: 'Locate mandatory manufacturer or packer entity name on physical package.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in manufacturer name extraction.`,
      action: 'Manually confirm manufacturer name.'
    };
  }

  return {
    status: 'PASS',
    reason: 'Manufacturer / packer entity name clearly declared under Rule 6(1)(a).',
    action: 'Compliant declaration.'
  };
}

/**
 * Validates Manufacturer / Packer Address against Rule 6(1)(a)
 * Mandatory requirements:
 * Complete address with premises details (street, road, industrial area, etc.), city/town/state, and PIN code.
 * 
 * Strict Integrity Guard:
 * "PIN: 462011" alone is NOT a complete address.
 */
function evaluateManufacturerAddress(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Manufacturer or packer address was not detected on the package.',
      action: 'Check physical package for manufacturer / packer address.'
    };
  }

  const clean = field.value.trim();
  const lower = clean.toLowerCase();

  // 1. Guard against PIN code alone (e.g. "PIN: 462011", "PIN: 560072", "462011")
  const isPinOnly = /^pin[\s\:\-]*\d{6}$/i.test(clean) || (clean.replace(/\D/g, '').length === 6 && clean.length <= 15);
  if (isPinOnly) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Postal PIN code detected ("${clean}"), but complete premises details, street/area, and city/state are missing under Rule 6(1)(a).`,
      action: 'Verify complete geographic postal address of manufacturer on package.'
    };
  }

  // 2. Guard against isolated city or state without premises or street
  const hasPremisesOrStreet = /(?:plot|shed|gala|survey|building|flat|unit|phase|sector|road|marg|nagar|estate|industrial|village|post|street|lane)/i.test(lower);
  if (!hasPremisesOrStreet && clean.length < 25) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Detected address ("${clean}") appears incomplete or lacks specific premises and street identification under Rule 6(1)(a).`,
      action: 'Confirm full manufacturer address with premises details and PIN code.'
    };
  }

  // 3. Guard against truncated address lacking geographic details
  const hasGeographicDetail =
    clean.length >= 20 &&
    /(?:plot|sector|industrial|phase|road|nagar|village|dist|state|opp|near|floor|building|survey|gala|estate|lane|street|mumbai|delhi|bengaluru|bangalore|hyderabad|chennai|pune|kolkata|ahmedabad|karnal|surat|jaipur|lucknow|kanpur|indore|bhopal|gujarat|maharashtra|karnataka|haryana|tamil nadu|telangana|uttar pradesh|rajasthan|punjab|kerala|west bengal)/i.test(lower);

  if (!hasGeographicDetail) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'Detected address appears truncated or lacks complete geographic identifiers under Rule 6(1)(a).',
      action: 'Verify complete address with premises details and PIN code on package.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in address extraction. Address block may be curved or multi-column.`,
      action: 'Confirm full manufacturer address manually.'
    };
  }

  return {
    status: 'PASS',
    reason: 'Manufacturer geographic address detected with sufficient detail.',
    action: 'Compliant declaration.'
  };
}

/**
 * Validates Country of Origin against Rule 6(1)(aa)
 * Strict Integrity Guard:
 * "India Hy wo tn so" or random text containing a country name does NOT automatically receive PASS.
 * Origin statement must be verifiable and non-noisy.
 */
function evaluateCountryOfOrigin(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Country of Origin declaration was not detected on the package label.',
      action: 'Verify explicit Country of Origin or "Made in" declaration on physical package.'
    };
  }

  const clean = field.value.trim();
  const lower = clean.toLowerCase();

  // 1. Guard against noisy/unrelated OCR text (e.g. "India Hy wo tn so")
  const tokens = clean.split(/\s+/);
  if (tokens.length > 3 && !/^(?:country\s+of\s+origin|made\s+in|product\s+of)/i.test(clean)) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Country name appears in ambiguous or noisy text ("${clean}"). Statutory origin declaration statement ("Made in" or "Country of Origin") could not be verified under Rule 6(1)(aa).`,
      action: 'Verify explicit "Country of Origin" or "Made in" statement on package.'
    };
  }

  // 2. Guard against country name extracted solely from manufacturer address string
  if (lower.includes('pin') || lower.includes('plot') || lower.includes('sector') || lower.includes('estate')) {
    return {
      status: 'NEEDS_REVIEW',
      reason: 'Country name detected in address context, but a dedicated statutory Country of Origin declaration was not confirmed under Rule 6(1)(aa).',
      action: 'Check for separate Country of Origin declaration.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in country of origin reading.`,
      action: 'Confirm origin declaration on physical package.'
    };
  }

  return {
    status: 'PASS',
    reason: `Country of Origin declared (${clean}) under Rule 6(1)(aa).`,
    action: 'Compliant declaration.'
  };
}

/**
 * Validates FSSAI License Number (Food Commodities)
 */
function evaluateFssaiLicense(
  field: ExtractedField,
  rule: LegalRuleDefinition,
  context?: InspectionEvaluationContext
): { status: ComplianceStatus; reason: string; action: string } {
  if (!field.value || field.value.trim() === '') {
    const fallback = shouldFallbackToNeedsReview(context);
    if (fallback.shouldFallback) {
      return {
        status: 'NEEDS_REVIEW',
        reason: fallback.fallbackReason,
        action: fallback.action
      };
    }
    return {
      status: 'FAIL',
      reason: 'Mandatory 14-digit FSSAI license number was not detected on food package under FSS (Packaging & Labelling) Regulations, 2011.',
      action: 'Check physical package for FSSAI logo and 14-digit license number.'
    };
  }

  if (field.confidence < 0.60) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Low confidence (${Math.round(field.confidence * 100)}%) in FSSAI license number extraction.`,
      action: 'Verify FSSAI license number on physical package.'
    };
  }

  const clean = field.value.replace(/[\s\-\.]/g, '');
  const fssaiMatch = clean.match(/\d{13,14}/);

  if (fssaiMatch) {
    const num = fssaiMatch[0];
    if (/^[12]\d{12,13}$/.test(num)) {
      return {
        status: 'PASS',
        reason: `Valid ${num.length}-digit FSSAI license number detected: ${num.slice(0, 4)}...${num.slice(-4)}.`,
        action: 'Compliant declaration.'
      };
    }
    return {
      status: 'NEEDS_REVIEW',
      reason: `${num.length}-digit number detected (${num.slice(0, 4)}...) but does not match standard FSSAI prefix pattern.`,
      action: 'Verify FSSAI license number validity on FSSAI portal (foscos.fssai.gov.in).'
    };
  }

  const shortMatch = clean.match(/\d{5,}/);
  if (shortMatch) {
    return {
      status: 'NEEDS_REVIEW',
      reason: `Numeric code detected (${shortMatch[0].length} digits) but does not match standard 14-digit FSSAI format.`,
      action: 'Determine if this is a FSSAI Registration (5-digit) or License (14-digit) number.'
    };
  }

  return {
    status: 'NEEDS_REVIEW',
    reason: 'Text detected but could not identify a valid FSSAI license number pattern.',
    action: 'Manually verify FSSAI license presence on physical package.'
  };
}

/**
 * Helper to check if a commodity is explicitly non-food
 */
function isNonFoodCommodity(commodityText: string | null): boolean {
  if (!commodityText) return false;
  const lower = commodityText.toLowerCase();
  const nonFoodKeywords = [
    'shampoo', 'soap', 'detergent', 'cleaner', 'lotion', 'cream', 'paste', 'cosmetic',
    'oil lubricant', 'engine oil', 'electronic', 'battery', 'cable', 'textile', 'cloth',
    'garment', 'pen', 'paper', 'stationery', 'toy', 'hardware', 'tool', 'sanitizer',
    'adhesive', 'glue', 'paint', 'cement', 'pipe', 'plastic container', 'bottle only',
    'bulb', 'led', 'wire', 'shoe', 'footwear', 'apparel', 'gear'
  ];
  return nonFoodKeywords.some(kw => lower.includes(kw));
}

/**
 * Helper to check if a commodity is a recognized food item
 */
function isRecognizedFoodCommodity(commodityText: string | null): boolean {
  if (!commodityText) return false;
  const lower = commodityText.toLowerCase();
  const foodKeywords = [
    'atta', 'flour', 'rice', 'wheat', 'dal', 'pulse', 'oil', 'ghee', 'butter', 'cookie',
    'biscuit', 'snack', 'chips', 'namkeen', 'spice', 'masala', 'salt', 'sugar', 'tea',
    'coffee', 'milk', 'curd', 'paneer', 'cheese', 'bread', 'noodle', 'pasta', 'sauce',
    'ketchup', 'jam', 'pickle', 'chocolate', 'sweet', 'cereal', 'oats', 'beverage', 'juice',
    'water', 'drink', 'honey', 'food', 'edible', 'grain', 'corn'
  ];
  return foodKeywords.some(kw => lower.includes(kw));
}

/**
 * Deterministic Legal Metrology Compliance Engine
 * Evaluates extracted package data against configured statutory rules.
 * Uses a single normalized result as the source of truth.
 */
export function evaluatePackageCompliance(
  extractedData: ExtractedPackageData,
  configuredRules: LegalRuleDefinition[] = DEFAULT_LEGAL_RULES,
  context?: InspectionEvaluationContext
): {
  overallStatus: OverallComplianceStatus;
  passedCount: number;
  failedCount: number;
  reviewCount: number;
  notApplicableCount: number;
  complianceResults: FieldComplianceResult[];
  violations: FieldComplianceResult[];
} {
  const complianceResults: FieldComplianceResult[] = [];
  const violations: FieldComplianceResult[] = [];

  let passedCount = 0;
  let failedCount = 0;
  let reviewCount = 0;
  let notApplicableCount = 0;

  const rawCommodity = extractedData.commodity_name?.value || null;
  const commodityName = rawCommodity && rawCommodity.toLowerCase() !== 'packaged commodity' ? rawCommodity : null;
  const isNonFood = isNonFoodCommodity(commodityName);
  const isKnownFood = isRecognizedFoodCommodity(commodityName);

  for (const rule of configuredRules) {
    if (!rule.active) continue;

    const field: ExtractedField = extractedData[rule.fieldKey] || {
      value: null,
      confidence: 0,
      evidence: null,
      boundingBox: null
    };

    let evalResult: { status: ComplianceStatus; reason: string; action: string };

    switch (rule.fieldKey) {
      case 'commodity_name':
        evalResult = evaluateCommodityName(field, rule, context);
        break;

      case 'net_quantity':
        evalResult = evaluateNetQuantity(field, rule, context);
        break;

      case 'mrp':
        evalResult = evaluateMrp(field, rule, context);
        break;

      case 'manufacturing_or_packing_date':
        evalResult = evaluateMfgDate(field, rule, context);
        break;

      case 'consumer_care_contact':
        evalResult = evaluateConsumerCare(field, rule, context);
        break;

      case 'manufacturer_name':
        evalResult = evaluateManufacturerName(field, rule, context);
        break;

      case 'manufacturer_address':
        evalResult = evaluateManufacturerAddress(field, rule, context);
        break;

      case 'country_of_origin':
        evalResult = evaluateCountryOfOrigin(field, rule, context);
        break;

      case 'fssai_license':
        if (isNonFood) {
          evalResult = {
            status: 'NOT_APPLICABLE',
            reason: 'FSSAI License registration applies specifically to food commodities under FSS Act, 2006. Not applicable for non-food commodities.',
            action: 'No action required for non-food packages.'
          };
        } else if (isKnownFood) {
          evalResult = evaluateFssaiLicense(field, rule, context);
        } else {
          // Category cannot be established from reliable evidence
          if (field.value && /^[12]\d{13}$/.test(field.value.replace(/[\s\-\.]/g, ''))) {
            evalResult = evaluateFssaiLicense(field, rule, context);
          } else {
            evalResult = {
              status: 'NEEDS_REVIEW',
              reason: 'Product commodity category cannot be established from available label evidence. FSSAI License registration applies exclusively to food commodities under the Food Safety & Standards Act, 2006.',
              action: 'Confirm product category on package. If this is a food item, locate the 14-digit FSSAI license number.'
            };
          }
        }
        break;

      case 'expiry_or_best_before':
        if (isNonFood) {
          evalResult = {
            status: 'NOT_APPLICABLE',
            reason: 'Expiry / Best Before date is mandatory for perishable foodstuffs. Discretionary or Not Applicable for durable non-food goods.',
            action: 'Check commodity category.'
          };
        } else if (!field.value || field.value.trim() === '') {
          const fallback = shouldFallbackToNeedsReview(context);
          if (fallback.shouldFallback) {
            evalResult = {
              status: 'NEEDS_REVIEW',
              reason: fallback.fallbackReason,
              action: fallback.action
            };
          } else {
            evalResult = {
              status: isKnownFood ? 'FAIL' : 'NEEDS_REVIEW',
              reason: isKnownFood
                ? 'Mandatory Expiry / Best Before date was not detected on verified food package under Rule 6(1)(da).'
                : 'Best before / Expiry date was not detected. Required for food and perishable commodities; confirm if printed on seal crimp or batch stamp.',
              action: 'Inspect package seal crimp or container base for packing/expiry stamp.'
            };
          }
        } else {
          // Check if there is explicit expiry context in the value or evidence
          const cleanVal = (field.value || '').toLowerCase();
          const evidenceStr = (field.evidence || '').toLowerCase();
          const combined = `${cleanVal} ${evidenceStr}`;
          const hasExplicitExpiryKeyword = /(?:best\s*before|exp(?:iry)?|use\s*by|use\s*before|bb\b)/i.test(combined);

          if (!hasExplicitExpiryKeyword) {
            evalResult = {
              status: 'NEEDS_REVIEW',
              reason: `Date detected ("${field.value}") lacks explicit statutory prefix ("Best Before", "Expiry Date", "Use By") required by Rule 6(1)(da). Verification required to confirm whether this corresponds to an expiry date or manufacturing date.`,
              action: 'Verify printed date designation on physical package.'
            };
          } else if (field.confidence < 0.60) {
            evalResult = {
              status: 'NEEDS_REVIEW',
              reason: `Low confidence (${Math.round(field.confidence * 100)}%) in expiry date extraction. Text may be curved or faint.`,
              action: 'Check physical expiry date printed on package.'
            };
          } else {
            evalResult = {
              status: 'PASS',
              reason: 'Expiry or Best Before declaration detected with verified statutory context.',
              action: 'Compliant declaration.'
            };
          }
        }
        break;

      default:
        if (!field.value || field.value.trim() === '') {
          const fallback = shouldFallbackToNeedsReview(context);
          if (fallback.shouldFallback) {
            evalResult = {
              status: 'NEEDS_REVIEW',
              reason: fallback.fallbackReason,
              action: fallback.action
            };
          } else {
            evalResult = {
              status: 'FAIL',
              reason: `Mandatory declaration for "${rule.fieldLabel}" was not detected on the package label.`,
              action: `Locate ${rule.fieldLabel} on physical package.`
            };
          }
        } else if (field.confidence < 0.60) {
          evalResult = {
            status: 'NEEDS_REVIEW',
            reason: `Low confidence (${Math.round(field.confidence * 100)}%) in text detection. Text may be blurred or stylized.`,
            action: `Verify ${rule.fieldLabel} on physical package.`
          };
        } else {
          evalResult = {
            status: 'PASS',
            reason: `${rule.fieldLabel} detected and verified.`,
            action: 'Compliant declaration.'
          };
        }
        break;
    }

    // Attach penalty advisory for screening violations
    const penaltyInfo = getPenaltyForViolation(rule.fieldKey, evalResult.status);

    const resultItem: FieldComplianceResult = {
      ruleId: rule.id,
      fieldKey: rule.fieldKey,
      fieldLabel: rule.fieldLabel,
      ruleNumber: rule.ruleNumber,
      status: evalResult.status,
      detectedValue: field.value,
      confidence: field.confidence,
      evidence: field.evidence,
      reason: evalResult.reason,
      ruleReference: rule.statutoryReference,
      recommendedAction: evalResult.action,
      boundingBox: field.boundingBox || null,
      penaltyInfo: penaltyInfo,
      isApplicable: evalResult.status !== 'NOT_APPLICABLE'
    };

    complianceResults.push(resultItem);

    if (evalResult.status === 'PASS') {
      passedCount++;
    } else if (evalResult.status === 'FAIL') {
      failedCount++;
      violations.push(resultItem); // Only strict FAIL items in violations
    } else if (evalResult.status === 'NEEDS_REVIEW') {
      reviewCount++;
    } else if (evalResult.status === 'NOT_APPLICABLE') {
      notApplicableCount++;
    }
  }

  let overallStatus: OverallComplianceStatus;
  if (failedCount > 0) {
    overallStatus = 'NON_COMPLIANT';
  } else if (reviewCount > 0) {
    overallStatus = 'NEEDS_REVIEW';
  } else {
    overallStatus = 'COMPLIANT';
  }

  return {
    overallStatus,
    passedCount,
    failedCount,
    reviewCount,
    notApplicableCount,
    complianceResults,
    violations
  };
}
