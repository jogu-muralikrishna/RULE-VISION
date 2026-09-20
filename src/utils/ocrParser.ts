import { ExtractedPackageData, BoundingBox } from '../types';
import { isPlausibleEntityName, isPlausibleCommodityName } from '../rules/complianceEngine';

/**
 * Normalizes pixel bounding box to 0-1000 scale
 */
export function normalizeBBox(
  bbox: { x0: number; y0: number; x1: number; y1: number },
  imgWidth: number,
  imgHeight: number
): BoundingBox {
  const w = Math.max(imgWidth, 1);
  const h = Math.max(imgHeight, 1);
  return {
    ymin: Math.min(1000, Math.max(0, Math.round((bbox.y0 / h) * 1000))),
    xmin: Math.min(1000, Math.max(0, Math.round((bbox.x0 / w) * 1000))),
    ymax: Math.min(1000, Math.max(0, Math.round((bbox.y1 / h) * 1000))),
    xmax: Math.min(1000, Math.max(0, Math.round((bbox.x1 / w) * 1000)))
  };
}

/**
 * Parses raw OCR text and line coordinates into Legal Metrology statutory declarations.
 * Mandated under Rule 6(1) of Legal Metrology (Packaged Commodities) Rules, 2011.
 */
export function parseDeclarationsFromOcrText(
  text: string,
  lines: Array<{ text: string; bbox?: { x0: number; y0: number; x1: number; y1: number } }>,
  imgWidth: number = 1000,
  imgHeight: number = 1000,
  productName?: string
): ExtractedPackageData {
  const fallbackField = { value: null, confidence: 0, evidence: null, boundingBox: null };
  const extracted: ExtractedPackageData = {
    commodity_name: { ...fallbackField },
    net_quantity: { ...fallbackField },
    mrp: { ...fallbackField },
    manufacturing_or_packing_date: { ...fallbackField },
    expiry_or_best_before: { ...fallbackField },
    consumer_care_contact: { ...fallbackField },
    manufacturer_name: { ...fallbackField },
    manufacturer_address: { ...fallbackField },
    country_of_origin: { ...fallbackField },
    fssai_license: { ...fallbackField }
  };

  const findBBoxForLine = (matchedLineText: string): BoundingBox | null => {
    if (!matchedLineText || !lines.length) return null;
    const lower = matchedLineText.toLowerCase();
    const lineObj = lines.find((l) => l.text && l.text.toLowerCase().includes(lower));
    if (lineObj && lineObj.bbox) {
      return normalizeBBox(lineObj.bbox, imgWidth, imgHeight);
    }
    return null;
  };

  // 1. MRP (Maximum Retail Price) — Rule 6(1)(e)
  // Must include "inclusive of all taxes"
  const mrpRegex = /(?:m\.?r\.?p\.?|max(?:imum)?\s*retail\s*price|price|rs\.?|₹|inr)\s*[:.]?\s*(?:rs\.?|₹)?\s*([\d,]+\.?\d*)\s*(?:\/-)?/i;
  const mrpMatch = text.match(mrpRegex);
  if (mrpMatch) {
    const rawPrice = mrpMatch[1].replace(/,/g, '');
    const hasTaxes = /(?:incl(?:usive)?\.?|inclusive)\s*(?:of)?\s*(?:all)?\s*taxes/i.test(text);
    const mrpStr = hasTaxes ? `₹${rawPrice} (incl. of all taxes)` : `₹${rawPrice}`;
    extracted.mrp = {
      value: mrpStr,
      confidence: 0.92,
      evidence: mrpMatch[0] + (hasTaxes ? ' (incl. of all taxes)' : ''),
      boundingBox: findBBoxForLine(mrpMatch[0])
    };
  }

  // 2. Net Quantity — Rule 6(1)(c) & Rule 12 (SI metric units)
  // Includes resilience against OCR misspellings such as "Netcuantiy", "Netquantiy", "Netcty"
  const qtyRegex = /(?:net\s*(?:qty|quantity|cuantiy|cuantity|quantiy|quantty|guantity|cty|qnty|wt|weight|vol(?:ume)?|content)?|quantity|cuantiy|quantiy|weight)\s*[:.]?\s*(\d+(?:\.\d+)?\s*(?:kg|kilograms?|g|gm|gms|grams?|l|lt|ltr|litres?|ml|millilitres?|m|cm|mm|units?|pieces?|pcs?|nos?|n|sachets?|capsules?|tablets?))\b/i;
  const qtyMatch = text.match(qtyRegex);
  if (qtyMatch) {
    extracted.net_quantity = {
      value: qtyMatch[1].trim(),
      confidence: 0.90,
      evidence: qtyMatch[0],
      boundingBox: findBBoxForLine(qtyMatch[0])
    };
  } else {
    // Standalone unit match (e.g. "500g", "1 kg", "750 ml")
    const directQty = text.match(/\b(\d+(?:\.\d+)?\s*(?:kg|kilogram|g|gm|l|ml|ltr|litres?))\b/i);
    if (directQty) {
      extracted.net_quantity = {
        value: directQty[1].trim(),
        confidence: 0.85,
        evidence: directQty[0],
        boundingBox: findBBoxForLine(directQty[0])
      };
    }
  }

  // 3. Manufacturing / Packing Date — Rule 6(1)(d)
  // Must match explicit date pattern (month and year) with manufacturing/packing context
  const dateRegexWithPrefix = /(?:mfg|mfd|packed|pkd|pkg|manufactur(?:ed|ing)|packing)\s*(?:date|on|dt)?\s*[:.]?\s*(\b(?:0?[1-9]|[12]\d|3[01])[\s\/\-\.]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/\-\.]*(?:20\d{2}|\d{2})\b|\b\d{1,2}(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(?:20\d{2}|\d{2})\b|\b(?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})\b|\b(?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[\/\-\.]*\s*(?:20\d{2}|\d{2})\b)/i;
  const mfgMatch = text.match(dateRegexWithPrefix);

  if (mfgMatch && mfgMatch[1]) {
    extracted.manufacturing_or_packing_date = {
      value: mfgMatch[1].trim(),
      confidence: 0.88,
      evidence: mfgMatch[0],
      boundingBox: findBBoxForLine(mfgMatch[0])
    };
  } else {
    // Keywords present without verifiable month/year (e.g. "Manufactured Packad")
    const keywordOnlyMatch = text.match(/(?:mfg|mfd|packed|pkd|pkg|manufactur(?:ed|ing)|packing)\s*(?:date|on|dt)?\s*[:.]?\s*([a-zA-Z]{3,20})/i);
    if (keywordOnlyMatch) {
      extracted.manufacturing_or_packing_date = {
        value: keywordOnlyMatch[0].trim(),
        confidence: 0.40,
        evidence: keywordOnlyMatch[0],
        boundingBox: findBBoxForLine(keywordOnlyMatch[0])
      };
    }
  }

  // 4. Expiry / Best Before Date — Rule 6(1)(da)
  const expRegex = /(?:best\s*before|exp(?:iry)?(?:\s*date)?|use\s*by|use\s*before|expiry|bb\b)\s*[:.]?\s*([a-z0-9\/\-\.\s]{3,35})/i;
  const expMatch = text.match(expRegex);
  if (expMatch) {
    // Extract strictly the date token, stripping any trailing phone numbers or noise
    let cleanExp = expMatch[1].trim();
    cleanExp = cleanExp.replace(/(?:\|.*|1800.*|\+?91.*|tel:.*|phone:.*)/i, '').trim();
    const dateExtract = cleanExp.match(/\b(?:0?[1-9]|[12]\d|3[01])[\s\/\-\.]*(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/\-\.]*(?:20\d{2}|\d{2})\b|\b\d{1,2}(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(?:20\d{2}|\d{2})\b|\b(?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})\b|\b(?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[\/\-\.]*\s*(?:20\d{2}|\d{2})\b/i);
    const expValue = dateExtract ? dateExtract[0] : cleanExp;

    extracted.expiry_or_best_before = {
      value: expValue,
      confidence: 0.88,
      evidence: expMatch[0],
      boundingBox: findBBoxForLine(expMatch[0])
    };
  } else {
    // Check if there is an unclassified date on the package lacking clear mfg or exp context
    const anyDatePattern = /\b(?:(?:0?[1-9]|[12]\d|3[01])[\s\/\-\.]*)?(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/\-\.]*(?:20\d{2}|\d{2})\b|\b\d{1,2}(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*(?:20\d{2}|\d{2})\b|\b(?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})\b|\b(?:0?[1-9]|[12]\d|3[01])[\/\-\.](?:0?[1-9]|1[0-2])[\/\-\.](?:20\d{2}|\d{2})\b/gi;
    const datesFound = Array.from(text.matchAll(anyDatePattern)).map(m => m[0]);
    // If an isolated date was found that was NOT part of manufacturing date:
    const unclassified = datesFound.find(d => !mfgMatch || !mfgMatch[0].includes(d));
    if (unclassified) {
      // Preserve as raw OCR evidence with low confidence so it remains NEEDS_REVIEW and is not classified as expiry
      extracted.expiry_or_best_before = {
        value: unclassified,
        confidence: 0.35,
        evidence: `Unclassified date detected without explicit expiry keyword: "${unclassified}"`,
        boundingBox: findBBoxForLine(unclassified)
      };
    }
  }

  // 5. Consumer Care Contact Details — Rule 6(1)(f)
  // Field Integrity: Extract only genuine contact channels (phone, email, postal grievance cell).
  // Strictly filter out unrelated Best Before dates, Net Quantity text, and duplicated phones.
  const rawPhones = text.match(/\b(?:1800[-\s]?\d{3}[-\s]?\d{3,4}|\+?91[-\s]?[6-9]\d{9}|\b0\d{2,4}[-\s]?\d{6,8}\b|\b[6-9]\d{9}\b)/g) || [];
  const uniquePhones = Array.from(new Set(rawPhones.map(p => p.trim())));

  const rawEmails = text.match(/\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g) || [];
  const uniqueEmails = Array.from(new Set(rawEmails.map(e => e.trim().toLowerCase())));

  const careTokens: string[] = [];
  if (uniquePhones.length > 0) {
    careTokens.push(uniquePhones[0]);
  }
  if (uniqueEmails.length > 0) {
    careTokens.push(uniqueEmails[0]);
  }

  // Check for postal consumer cell or helpline text on relevant line
  const careLine = lines.find((l) => /(?:consumer\s*care|customer\s*care|grievance|feedback|helpline)/i.test(l.text));
  if (careLine) {
    let sanitizedCare = careLine.text
      .replace(/(?:consumer\s*care|customer\s*care|grievance|feedback|helpline)[\s\:\-\.]*/gi, '')
      .replace(/(?:best\s*before|exp(?:iry)?|use\s*by|use\s*before|pkd|mfg|mfd|date)[\s\:\-\.]*\S+/gi, '')
      .replace(/\b(?:\d{1,2}[\/\-\.]\d{2,4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\/\-\.]*\d{2,4})\b/gi, '')
      .replace(/(?:net\s*(?:qty|quantity|cuantiy|wt|weight)?|netcuantiy)[\s\:\-\.]*\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ml)\b/gi, '')
      .replace(/(?:mrp|rs\.?|₹)[\s\:\-\.]*\d+(?:\.\d+)?/gi, '')
      .replace(/[\|•]/g, ' ');

    uniquePhones.forEach((p) => { sanitizedCare = sanitizedCare.replace(p, ''); });
    uniqueEmails.forEach((e) => { sanitizedCare = sanitizedCare.replace(e, ''); });
    sanitizedCare = sanitizedCare.replace(/^[\|\•\-\:\s,;]+/g, '').replace(/[\|\•\-\:\s,;]+$/g, '').trim();

    if (sanitizedCare.length > 6 && !/^(?:tel|email|phone|contact|toll\s*free|care)$/i.test(sanitizedCare)) {
      if (careTokens.length === 0 || /(?:po\s*box|cell|executive|desk|portal|www|http)/i.test(sanitizedCare)) {
        careTokens.push(sanitizedCare.slice(0, 60));
      }
    }
  }

  if (careTokens.length > 0) {
    const val = careTokens.join(' | ');
    extracted.consumer_care_contact = {
      value: val,
      confidence: 0.92,
      evidence: val,
      boundingBox: findBBoxForLine(uniquePhones[0] || uniqueEmails[0] || val)
    };
  }

  // 6. Manufacturer Name & Address — Rule 6(1)(a)
  // Field Integrity: Separate entity name from address. Strip net quantity tokens, dates, and PIN codes from name.
  const cleanMName = (raw: string): string => {
    return raw
      .replace(/[{}()\[\]~^<>]/g, ' ')
      .replace(/(?:\|\s*)?(?:net\s*(?:qty|quantity|cuantiy|cuantity|quantiy|quantty|guantity|cty|wt|weight|vol(?:ume)?|content)?|quantity|cuantiy|quantiy|weight)[\s\:\-\.]*\d+(?:\.\d+)?\s*(?:kg|g|gm|gms|l|ml|lt|ltr|units?|pcs?|nos?|n)\b/gi, '')
      .replace(/\b\d+(?:\.\d+)?\s*(?:kg|kilogram|g|gm|gms|l|ml|ltr)\b/gi, '')
      .replace(/(?:•\s*)?pin[\s\:\-]*\d{6}\b/gi, '')
      .replace(/\b[1-9][0-9]{5}\b/g, '')
      .replace(/(?:mrp|rs\.?|₹)[\s\:\-\.]*[\d,.]+/gi, '')
      .replace(/(?:best\s*before|exp(?:iry)?|mfg|pkd)[\s\:\-\.]*\S+/gi, '')
      .replace(/(?:1800[-\s]?\d{3}[-\s]?\d{3,4}|\+?91[-\s]?[6-9]\d{9})/g, '')
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '')
      .replace(/^[\|\•\-\:\s,;]+/g, '')
      .replace(/[\|\•\-\:\s,;]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  let mfgNameCandidate: string | null = null;
  // Require explicit "by" or "and packed by" attribution so that packing dates (e.g. "Packed: 12 JAN 2025") are never mistaken for entity names
  const mfgPrefixMatch = text.match(/(?:manufactured|mfd|packed|marketed|imported|processed)\s*(?:and\s*packed\s*)?\s+by\s*[:.]?\s*([^\n,]+)/i);
  if (mfgPrefixMatch && mfgPrefixMatch[1]) {
    const cleaned = cleanMName(mfgPrefixMatch[1]);
    if (cleaned.length >= 3 && isPlausibleEntityName(cleaned)) {
      mfgNameCandidate = cleaned;
    }
  }

  // Also check for corporate suffixes if prefix match was absent or polluted
  if (!mfgNameCandidate) {
    // 1. First check explicit corporate entity forms (Private Limited, Limited, Pvt Ltd, Ltd, LLP)
    const corporateMatch = text.match(/([A-Z0-9][A-Za-z0-9&.',\s]{1,60}?\b(?:private\s*limited|pvt\.?\s*ltd\.?|limited|ltd\.?|llp|inc\.?|corporation|corp\.?))\b/i);
    if (corporateMatch && corporateMatch[1]) {
      const cleaned = cleanMName(corporateMatch[1]);
      if (cleaned.length >= 3 && isPlausibleEntityName(cleaned)) {
        mfgNameCandidate = cleaned;
      }
    }
  }

  if (!mfgNameCandidate) {
    // 2. Secondary check for generic business types if no explicit legal form was found
    const businessMatch = text.match(/([A-Z0-9][A-Za-z0-9&.',\s]{1,50}?\b(?:industries|foods|agro|beverages|products|works|enterprises))\b/i);
    if (businessMatch && businessMatch[1]) {
      const cleaned = cleanMName(businessMatch[1]);
      if (cleaned.length >= 3 && isPlausibleEntityName(cleaned)) {
        mfgNameCandidate = cleaned;
      }
    }
  }

  if (mfgNameCandidate) {
    extracted.manufacturer_name = {
      value: mfgNameCandidate,
      confidence: 0.90,
      evidence: mfgNameCandidate,
      boundingBox: findBBoxForLine(mfgNameCandidate)
    };
  }

  // Manufacturer Address: Identify postal premises and PIN code separately
  const pinMatch = text.match(/\b[1-9][0-9]{5}\b/);
  const addrMatch = text.match(/(?:address|addr|factory|works|premises|plant|facility|plot|sector|industrial|phase|road|nagar|village|dist|state|opp\.|near|floor|building|survey|taluk)[\s\:\-\.]*([^\n]+)/i);

  if (addrMatch) {
    let cleanAddr = (addrMatch[1] || addrMatch[0]).trim();
    if (mfgNameCandidate) {
      cleanAddr = cleanAddr.replace(mfgNameCandidate, '');
    }
    cleanAddr = cleanAddr
      .replace(/(?:\|\s*)?(?:net\s*(?:qty|quantity|cuantiy)?|netcuantiy)[\s\:\-\.]*\d+(?:\.\d+)?\s*(?:kg|g|gm|l|ml)\b/gi, '')
      .replace(/^[\|\•\-\:\s,;]+/g, '')
      .trim();

    if (cleanAddr.length >= 8) {
      const addrVal = `${cleanAddr}${pinMatch && !cleanAddr.includes(pinMatch[0]) ? ` - ${pinMatch[0]}` : ''}`;
      extracted.manufacturer_address = {
        value: addrVal.trim(),
        confidence: 0.86,
        evidence: addrVal,
        boundingBox: findBBoxForLine(addrVal.slice(0, 20))
      };
    } else if (pinMatch) {
      const addrVal = `PIN: ${pinMatch[0]}`;
      extracted.manufacturer_address = {
        value: addrVal,
        confidence: 0.40,
        evidence: addrVal,
        boundingBox: findBBoxForLine(pinMatch[0])
      };
    }
  } else if (pinMatch) {
    // Standalone PIN code without complete street/premises details
    const addrVal = `PIN: ${pinMatch[0]}`;
    extracted.manufacturer_address = {
      value: addrVal,
      confidence: 0.40,
      evidence: addrVal,
      boundingBox: findBBoxForLine(pinMatch[0])
    };
  }

  // 7. Country of Origin — Rule 6(1)(aa)
  // Field Integrity: Strictly require explicit origin statements. Never infer from PIN, phone, or address.
  const originPrefixMatch = text.match(/(?:country\s*of\s*origin|made\s*in|product\s*of)\s*[:.]?\s*([a-zA-Z]{3,20})\b/i);
  if (originPrefixMatch) {
    extracted.country_of_origin = {
      value: originPrefixMatch[1].trim(),
      confidence: 0.94,
      evidence: originPrefixMatch[0],
      boundingBox: findBBoxForLine(originPrefixMatch[0])
    };
  } else if (/made\s*in\s*india/i.test(text) || /product\s*of\s*india/i.test(text)) {
    extracted.country_of_origin = {
      value: 'India',
      confidence: 0.95,
      evidence: 'Made in India',
      boundingBox: findBBoxForLine('india')
    };
  } else {
    // If no explicit origin statement is present, leave as null. Never guess or infer from address!
    extracted.country_of_origin = {
      value: null,
      confidence: 0,
      evidence: null,
      boundingBox: null
    };
  }

  // 8. FSSAI License Number (Food Products)
  const fssaiMatch = text.match(/(?:fssai|lic(?:\.|\s*no)?)\s*[:.]?\s*(\d{13,14})/i);
  const general14 = text.match(/\b[12]\d{12,13}\b/);
  if (fssaiMatch) {
    extracted.fssai_license = {
      value: fssaiMatch[1],
      confidence: 0.95,
      evidence: fssaiMatch[0],
      boundingBox: findBBoxForLine(fssaiMatch[0])
    };
  } else if (general14) {
    extracted.fssai_license = {
      value: general14[0],
      confidence: 0.91,
      evidence: `FSSAI Lic. No. ${general14[0]}`,
      boundingBox: findBBoxForLine(general14[0])
    };
  }

  // 9. Commodity / Product Common Name — Rule 6(1)(b)
  let commodityVal: string | null = null;
  const commodityLine = lines.find((l) => /^(?:commodity|product(?:\s*name)?|item)\s*[:.]\s*(.+)/i.test(l.text));
  if (commodityLine) {
    const match = commodityLine.text.match(/^(?:commodity|product(?:\s*name)?|item)\s*[:.]\s*(.+)/i);
    if (match && match[1]) {
      const candidate = match[1].trim();
      if (isPlausibleCommodityName(candidate)) {
        commodityVal = candidate;
      }
    }
  }
  if (!commodityVal) {
    // Only pick a candidate line if it represents an authentic commodity name, never dates, numbers, or noise
    const candidateLine = lines.find((l) => {
      const t = (l.text || '').trim();
      return isPlausibleCommodityName(t);
    });
    if (candidateLine) {
      commodityVal = candidateLine.text.trim();
    }
  }

  // Never invent or default to "Packaged Commodity"!
  if (commodityVal && isPlausibleCommodityName(commodityVal)) {
    const commodityBBox = lines.find(
      (l) => commodityVal && l.text.toLowerCase().includes(commodityVal.toLowerCase().slice(0, 10))
    )?.bbox;

    extracted.commodity_name = {
      value: commodityVal,
      confidence: 0.85,
      evidence: `Commodity: ${commodityVal}`,
      boundingBox: commodityBBox
        ? normalizeBBox(commodityBBox, imgWidth, imgHeight)
        : { ymin: 150, xmin: 200, ymax: 220, xmax: 800 }
    };
  } else {
    extracted.commodity_name = {
      value: null,
      confidence: 0,
      evidence: null,
      boundingBox: null
    };
  }

  return extracted;
}
