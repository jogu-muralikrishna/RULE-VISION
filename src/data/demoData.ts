import { InspectionRecord, ExtractedPackageData } from '../types';
import { evaluatePackageCompliance } from '../rules/complianceEngine';

// Realistic SVG Mock Labels encoded as clean Data URLs for offline/demo inspection
function createDemoSvgLabel(title: string, brand: string, items: { [key: string]: string }, statusColor: string): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1000" width="800" height="1000">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f8fafc"/>
      <stop offset="100%" stop-color="#e2e8f0"/>
    </linearGradient>
  </defs>
  <!-- Package Pouch Background -->
  <rect width="800" height="1000" rx="30" fill="url(#bg)" stroke="#cbd5e1" stroke-width="4"/>
  <rect x="25" y="25" width="750" height="70" rx="10" fill="#0f172a"/>
  <text x="400" y="70" font-family="'Segoe UI', Roboto, sans-serif" font-size="28" font-weight="bold" fill="#ffffff" text-anchor="middle" letter-spacing="2">RULEVISION SAMPLE LABEL - ${brand.toUpperCase()}</text>
  
  <!-- Product Brand Header -->
  <rect x="50" y="120" width="700" height="180" rx="18" fill="#ffffff" stroke="${statusColor}" stroke-width="3"/>
  <text x="400" y="180" font-family="'Segoe UI', Roboto, sans-serif" font-size="38" font-weight="900" fill="#0f172a" text-anchor="middle">${brand}</text>
  <text x="400" y="230" font-family="'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#475569" text-anchor="middle">${title}</text>
  <line x1="100" y1="260" x2="700" y2="260" stroke="#e2e8f0" stroke-width="2"/>
  <text x="400" y="282" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#64748b" text-anchor="middle">PRE-PACKAGED COMMODITY SPECIFICATION LABEL</text>

  <!-- Mandatory Declarations Grid -->
  <g transform="translate(50, 320)">
    <rect width="700" height="520" rx="16" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>
    <text x="350" y="40" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="bold" fill="#1e293b" text-anchor="middle">STATUTORY DECLARATIONS (PCR 2011 RULE 6)</text>
    <line x1="30" y1="60" x2="670" y2="60" stroke="#cbd5e1" stroke-width="1.5"/>

    <text x="40" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">1. Commodity:</text>
    <text x="240" y="95" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#0f172a">${items.commodity || '---'}</text>

    <text x="40" y="140" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">2. Net Quantity:</text>
    <text x="240" y="140" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${items.netQty || '---'}</text>

    <text x="40" y="185" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">3. MRP (incl. of taxes):</text>
    <text x="240" y="185" font-family="'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="bold" fill="#0f172a">${items.mrp || '---'}</text>

    <text x="40" y="230" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">4. Packed Date (Pkd):</text>
    <text x="240" y="230" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#0f172a">${items.pkd || '---'}</text>

    <text x="40" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">5. Best Before / Expiry:</text>
    <text x="240" y="275" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" fill="#0f172a">${items.expiry || '---'}</text>

    <text x="40" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">6. Consumer Care:</text>
    <text x="240" y="325" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" fill="#0f172a">${items.consumerCare || '---'}</text>

    <text x="40" y="375" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">7. Manufacturer Name:</text>
    <text x="240" y="375" font-family="'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#0f172a">${items.mfgName || '---'}</text>

    <text x="40" y="420" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">8. Full Address & PIN:</text>
    <text x="240" y="420" font-family="'Segoe UI', Roboto, sans-serif" font-size="13" fill="#334155">${items.mfgAddress || '---'}</text>

    <text x="40" y="470" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#334155">9. Country of Origin:</text>
    <text x="240" y="470" font-family="'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="bold" fill="#0f172a">${items.origin || '---'}</text>
  </g>

  <!-- Barcode Footer -->
  <g transform="translate(100, 870)">
    <rect width="600" height="90" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5"/>
    <line x1="40" y1="15" x2="40" y2="75" stroke="#000" stroke-width="5"/>
    <line x1="55" y1="15" x2="55" y2="75" stroke="#000" stroke-width="2"/>
    <line x1="70" y1="15" x2="70" y2="75" stroke="#000" stroke-width="4"/>
    <line x1="90" y1="15" x2="90" y2="75" stroke="#000" stroke-width="6"/>
    <line x1="110" y1="15" x2="110" y2="75" stroke="#000" stroke-width="3"/>
    <line x1="130" y1="15" x2="130" y2="75" stroke="#000" stroke-width="5"/>
    <line x1="150" y1="15" x2="150" y2="75" stroke="#000" stroke-width="2"/>
    <line x1="170" y1="15" x2="170" y2="75" stroke="#000" stroke-width="7"/>
    <line x1="200" y1="15" x2="200" y2="75" stroke="#000" stroke-width="3"/>
    <text x="320" y="55" font-family="'JetBrains Mono', monospace" font-size="18" fill="#0f172a" letter-spacing="4">8901030994125</text>
    <text x="500" y="55" font-family="'Segoe UI', sans-serif" font-size="14" font-weight="bold" fill="#64748b">FSSAI Lic. No. 10012011000188</text>
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 1. Fully Compliant Demo: Heritage Royale Basmati Rice 5kg
const compliantData: ExtractedPackageData = {
  commodity_name: {
    value: 'Traditional Aged Basmati Rice',
    confidence: 0.98,
    evidence: 'Heritage Royale Traditional Aged Basmati Rice',
    boundingBox: { ymin: 150, xmin: 100, ymax: 220, xmax: 900 }
  },
  net_quantity: {
    value: '5 kg',
    confidence: 0.96,
    evidence: 'Net Qty: 5 kg (5000 g)',
    boundingBox: { ymin: 440, xmin: 240, ymax: 470, xmax: 550 }
  },
  mrp: {
    value: '₹540.00',
    confidence: 0.97,
    evidence: 'MRP ₹540.00 (inclusive of all taxes)',
    boundingBox: { ymin: 485, xmin: 240, ymax: 520, xmax: 680 }
  },
  manufacturing_or_packing_date: {
    value: '02/2026',
    confidence: 0.94,
    evidence: 'Packed on: 12/02/2026 Batch: HR-994',
    boundingBox: { ymin: 530, xmin: 240, ymax: 560, xmax: 650 }
  },
  expiry_or_best_before: {
    value: '24 months from date of packaging',
    confidence: 0.93,
    evidence: 'Best before 24 months from packaging when stored in cool dry place',
    boundingBox: { ymin: 575, xmin: 240, ymax: 605, xmax: 850 }
  },
  consumer_care_contact: {
    value: 'Toll Free: 1800-200-4848, care@heritagerice.com',
    confidence: 0.95,
    evidence: 'For complaints/feedback, contact Consumer Care Executive: 1800-200-4848 or email care@heritagerice.com',
    boundingBox: { ymin: 625, xmin: 240, ymax: 660, xmax: 900 }
  },
  manufacturer_name: {
    value: 'Heritage Agro Foods Private Limited',
    confidence: 0.96,
    evidence: 'Manufactured & Packed by: Heritage Agro Foods Private Limited',
    boundingBox: { ymin: 675, xmin: 240, ymax: 710, xmax: 820 }
  },
  manufacturer_address: {
    value: 'Plot 42, Sector 8, Industrial Estate, Karnal, Haryana - 132001, India',
    confidence: 0.95,
    evidence: 'Factory Address: Plot 42, Sector 8, Industrial Estate, Karnal, Haryana - 132001',
    boundingBox: { ymin: 720, xmin: 240, ymax: 760, xmax: 950 }
  },
  country_of_origin: {
    value: 'India',
    confidence: 0.99,
    evidence: 'Country of Origin: India / Made in India',
    boundingBox: { ymin: 770, xmin: 240, ymax: 805, xmax: 550 }
  },
  fssai_license: {
    value: '10012011000188',
    confidence: 0.96,
    evidence: 'FSSAI Lic. No. 10012011000188',
    boundingBox: { ymin: 870, xmin: 400, ymax: 910, xmax: 700 }
  }
};

const compliantEval = evaluatePackageCompliance(compliantData);

export const DEMO_COMPLIANT_INSPECTION: InspectionRecord = {
  id: 'demo-compliant-01',
  inspection_code: 'RV-2026-9041-DEMO',
  product_name: 'Heritage Royale Basmati Rice 5kg',
  commodity_name: compliantData.commodity_name.value,
  mrp: compliantData.mrp.value,
  net_quantity: compliantData.net_quantity.value,
  manufacturing_or_packing_date: compliantData.manufacturing_or_packing_date.value,
  expiry_or_best_before: compliantData.expiry_or_best_before.value,
  consumer_care_contact: compliantData.consumer_care_contact.value,
  manufacturer_name: compliantData.manufacturer_name.value,
  manufacturer_address: compliantData.manufacturer_address.value,
  country_of_origin: compliantData.country_of_origin.value,
  fssai_license: compliantData.fssai_license.value,
  barcode_number: '8901030994125',
  overall_status: compliantEval.overallStatus,
  passed_count: compliantEval.passedCount,
  failed_count: compliantEval.failedCount,
  review_count: compliantEval.reviewCount,
  extracted_data: compliantData,
  compliance_results: compliantEval.complianceResults,
  violations: compliantEval.violations,
  image_url: createDemoSvgLabel(
    'Traditional Aged Basmati Rice 5kg',
    'Heritage Royale',
    {
      commodity: 'Traditional Aged Basmati Rice',
      netQty: '5 kg (5000 g)',
      mrp: '₹540.00 (inclusive of all taxes)',
      pkd: '12/02/2026',
      expiry: '24 Months from packaging',
      consumerCare: '1800-200-4848 / care@heritagerice.com',
      mfgName: 'Heritage Agro Foods Private Limited',
      mfgAddress: 'Plot 42, Sector 8, Ind. Estate, Karnal, Haryana - 132001',
      origin: 'Made in India'
    },
    '#16a34a'
  ),
  latitude: 28.4595,
  longitude: 77.0266,
  location_name: 'Sector 29, Gurugram, Haryana',
  created_at: '2026-09-02T14:30:00Z',
  is_demo: true,
  reviewed_by_inspector: true,
  notes: 'All 8 mandatory declarations under PCR 2011 verified by inspector.'
};

// 2. Non-Compliant Demo: Delite Gold Butter Cookies (Missing Consumer Care & Country of Origin, MRP missing taxes)
const nonCompliantData: ExtractedPackageData = {
  commodity_name: {
    value: 'Rich Butter Cookies',
    confidence: 0.94,
    evidence: 'Delite Gold Rich Butter Cookies',
    boundingBox: { ymin: 150, xmin: 100, ymax: 220, xmax: 900 }
  },
  net_quantity: {
    value: '200 g',
    confidence: 0.92,
    evidence: 'Net Wt: 200 g',
    boundingBox: { ymin: 440, xmin: 240, ymax: 470, xmax: 550 }
  },
  mrp: {
    value: '₹60.00',
    confidence: 0.88,
    evidence: 'MRP ₹60.00', // Missing 'inclusive of all taxes'
    boundingBox: { ymin: 485, xmin: 240, ymax: 520, xmax: 600 }
  },
  manufacturing_or_packing_date: {
    value: '01/2026',
    confidence: 0.90,
    evidence: 'Mfg Date: 15/01/2026',
    boundingBox: { ymin: 530, xmin: 240, ymax: 560, xmax: 650 }
  },
  expiry_or_best_before: {
    value: '6 Months from manufacture',
    confidence: 0.89,
    evidence: 'Best before 6 months from manufacture date',
    boundingBox: { ymin: 575, xmin: 240, ymax: 605, xmax: 750 }
  },
  consumer_care_contact: {
    value: null, // VIOLATION
    confidence: 0.0,
    evidence: null,
    boundingBox: null
  },
  manufacturer_name: {
    value: 'Delite Confectioneries LLP',
    confidence: 0.91,
    evidence: 'Manufactured by Delite Confectioneries LLP',
    boundingBox: { ymin: 675, xmin: 240, ymax: 710, xmax: 820 }
  },
  manufacturer_address: {
    value: 'Industrial Area, Pune, Maharashtra - 411018',
    confidence: 0.87,
    evidence: 'MIDC Phase II, Industrial Area, Pune, Maharashtra - 411018',
    boundingBox: { ymin: 720, xmin: 240, ymax: 760, xmax: 900 }
  },
  country_of_origin: {
    value: null, // VIOLATION
    confidence: 0.0,
    evidence: null,
    boundingBox: null
  },
  fssai_license: {
    value: null, // VIOLATION - missing FSSAI
    confidence: 0.0,
    evidence: null,
    boundingBox: null
  }
};

const nonCompliantEval = evaluatePackageCompliance(nonCompliantData);

export const DEMO_NON_COMPLIANT_INSPECTION: InspectionRecord = {
  id: 'demo-non-compliant-02',
  inspection_code: 'RV-2026-9042-DEMO',
  product_name: 'Delite Gold Butter Cookies 200g',
  commodity_name: nonCompliantData.commodity_name.value,
  mrp: nonCompliantData.mrp.value,
  net_quantity: nonCompliantData.net_quantity.value,
  manufacturing_or_packing_date: nonCompliantData.manufacturing_or_packing_date.value,
  expiry_or_best_before: nonCompliantData.expiry_or_best_before.value,
  consumer_care_contact: nonCompliantData.consumer_care_contact.value,
  manufacturer_name: nonCompliantData.manufacturer_name.value,
  manufacturer_address: nonCompliantData.manufacturer_address.value,
  country_of_origin: nonCompliantData.country_of_origin.value,
  fssai_license: nonCompliantData.fssai_license.value,
  barcode_number: '8901234567890',
  overall_status: nonCompliantEval.overallStatus,
  passed_count: nonCompliantEval.passedCount,
  failed_count: nonCompliantEval.failedCount,
  review_count: nonCompliantEval.reviewCount,
  extracted_data: nonCompliantData,
  compliance_results: nonCompliantEval.complianceResults,
  violations: nonCompliantEval.violations,
  image_url: createDemoSvgLabel(
    'Rich Butter Cookies 200g',
    'Delite Gold',
    {
      commodity: 'Rich Butter Cookies',
      netQty: '200 g',
      mrp: '₹60.00 (Omitted taxes clause)',
      pkd: '15/01/2026',
      expiry: '6 Months from packaging',
      consumerCare: 'NOT DETECTED (Violation Rule 6(1)(f))',
      mfgName: 'Delite Confectioneries LLP',
      mfgAddress: 'MIDC Phase II, Pune, Maharashtra - 411018',
      origin: 'NOT DECLARED (Violation Rule 6(1)(aa))'
    },
    '#dc2626'
  ),
  latitude: 18.5204,
  longitude: 73.8567,
  location_name: 'Shivajinagar, Pune, Maharashtra',
  created_at: '2026-09-02T16:15:00Z',
  is_demo: true,
  reviewed_by_inspector: false,
  notes: 'Flagged for Rule 6(1)(f) and Rule 6(1)(aa) violations. Inspection notice prepared.'
};

// 3. Needs Review Demo: SunPure Refined Sunflower Oil (Curved pouch, smudged date & low address confidence)
const needsReviewData: ExtractedPackageData = {
  commodity_name: {
    value: 'Refined Sunflower Oil',
    confidence: 0.95,
    evidence: 'SunPure 100% Pure Refined Sunflower Oil',
    boundingBox: { ymin: 150, xmin: 100, ymax: 220, xmax: 900 }
  },
  net_quantity: {
    value: '1 L (910 g)',
    confidence: 0.92,
    evidence: 'Net Volume: 1 Litre (910g at 30°C)',
    boundingBox: { ymin: 440, xmin: 240, ymax: 470, xmax: 600 }
  },
  mrp: {
    value: '₹145.00',
    confidence: 0.93,
    evidence: 'MRP ₹145.00 (incl. of all taxes)',
    boundingBox: { ymin: 485, xmin: 240, ymax: 520, xmax: 650 }
  },
  manufacturing_or_packing_date: {
    value: '0?/2026',
    confidence: 0.48, // Low confidence / smudged
    evidence: 'Pkd: 0? / 2026 [Inkjet print faded on pouch fold]',
    boundingBox: { ymin: 530, xmin: 240, ymax: 560, xmax: 650 }
  },
  expiry_or_best_before: {
    value: '9 Months from packaging',
    confidence: 0.55, // Low confidence
    evidence: 'Best before 9 Mo... [Pouch edge glare]',
    boundingBox: { ymin: 575, xmin: 240, ymax: 605, xmax: 750 }
  },
  consumer_care_contact: {
    value: 'Email: care@sunpureoils.in, Tel: 080-28491000',
    confidence: 0.88,
    evidence: 'Consumer care cell: 080-28491000 or care@sunpureoils.in',
    boundingBox: { ymin: 625, xmin: 240, ymax: 660, xmax: 880 }
  },
  manufacturer_name: {
    value: 'MK Agrotech Private Limited',
    confidence: 0.92,
    evidence: 'Manufactured by MK Agrotech Private Limited',
    boundingBox: { ymin: 675, xmin: 240, ymax: 710, xmax: 800 }
  },
  manufacturer_address: {
    value: 'KIADB Industrial Area, Mysuru, Karnataka',
    confidence: 0.58, // Low confidence on PIN code
    evidence: 'KIADB Ind. Area, Mysuru, Karnataka [PIN obscured by crimp]',
    boundingBox: { ymin: 720, xmin: 240, ymax: 760, xmax: 900 }
  },
  country_of_origin: {
    value: 'India',
    confidence: 0.96,
    evidence: 'Country of Origin: India',
    boundingBox: { ymin: 770, xmin: 240, ymax: 805, xmax: 550 }
  },
  fssai_license: {
    value: '20614007000456',
    confidence: 0.55, // Low confidence due to oil stain on pouch
    evidence: 'FSSAI Lic. No. 2061400700... [Partially obscured by oil stain]',
    boundingBox: { ymin: 870, xmin: 400, ymax: 910, xmax: 700 }
  }
};

const needsReviewEval = evaluatePackageCompliance(needsReviewData);

export const DEMO_NEEDS_REVIEW_INSPECTION: InspectionRecord = {
  id: 'demo-review-03',
  inspection_code: 'RV-2026-9043-DEMO',
  product_name: 'SunPure Refined Sunflower Oil 1L',
  commodity_name: needsReviewData.commodity_name.value,
  mrp: needsReviewData.mrp.value,
  net_quantity: needsReviewData.net_quantity.value,
  manufacturing_or_packing_date: needsReviewData.manufacturing_or_packing_date.value,
  expiry_or_best_before: needsReviewData.expiry_or_best_before.value,
  consumer_care_contact: needsReviewData.consumer_care_contact.value,
  manufacturer_name: needsReviewData.manufacturer_name.value,
  manufacturer_address: needsReviewData.manufacturer_address.value,
  country_of_origin: needsReviewData.country_of_origin.value,
  fssai_license: needsReviewData.fssai_license.value,
  barcode_number: '8901234000123',
  overall_status: needsReviewEval.overallStatus,
  passed_count: needsReviewEval.passedCount,
  failed_count: needsReviewEval.failedCount,
  review_count: needsReviewEval.reviewCount,
  extracted_data: needsReviewData,
  compliance_results: needsReviewEval.complianceResults,
  violations: needsReviewEval.violations,
  image_url: createDemoSvgLabel(
    'Refined Sunflower Oil 1 Litre',
    'SunPure',
    {
      commodity: 'Refined Sunflower Oil',
      netQty: '1 L (910 g)',
      mrp: '₹145.00 (incl. of all taxes)',
      pkd: '0?/2026 (Inkjet smudged on seal)',
      expiry: '9 Months from packaging (Partial glare)',
      consumerCare: '080-28491000 / care@sunpureoils.in',
      mfgName: 'MK Agrotech Private Limited',
      mfgAddress: 'KIADB Industrial Area, Mysuru, Karnataka (PIN blurred)',
      origin: 'Product of India'
    },
    '#d97706'
  ),
  latitude: 12.9716,
  longitude: 77.5946,
  location_name: 'Malleshwaram, Bengaluru, Karnataka',
  created_at: '2026-09-02T18:45:00Z',
  is_demo: true,
  reviewed_by_inspector: false,
  notes: 'Pouch fold glare affected date & address confidence. Requires physical verification.'
};

// 4. FarmFresh Classic Potato Chips (SIH PS 26034 Standard Test Case)
const farmFreshChipsData: ExtractedPackageData = {
  commodity_name: {
    value: 'Potato Chips',
    confidence: 0.98,
    evidence: 'FarmFresh Classic Potato Chips',
    boundingBox: { ymin: 150, xmin: 100, ymax: 220, xmax: 900 }
  },
  net_quantity: {
    value: '52 g',
    confidence: 0.97,
    evidence: 'Net Qty: 52 g',
    boundingBox: { ymin: 440, xmin: 240, ymax: 470, xmax: 550 }
  },
  mrp: {
    value: '₹20.00',
    confidence: 0.99,
    evidence: 'MRP: ₹20.00 (inclusive of all taxes)',
    boundingBox: { ymin: 485, xmin: 240, ymax: 520, xmax: 680 }
  },
  manufacturing_or_packing_date: {
    value: '12 JAN 2025',
    confidence: 0.96,
    evidence: 'Mfg Date: 12 JAN 2025 Batch: FF-202501',
    boundingBox: { ymin: 530, xmin: 240, ymax: 560, xmax: 650 }
  },
  expiry_or_best_before: {
    value: '12 JUL 2025',
    confidence: 0.95,
    evidence: 'Best Before 6 Months from Packaging / 12 JUL 2025',
    boundingBox: { ymin: 575, xmin: 240, ymax: 605, xmax: 850 }
  },
  consumer_care_contact: {
    value: '1800-123-4567, care@freshfoods.in',
    confidence: 0.98,
    evidence: 'Consumer Care Cell: 1800-123-4567 | care@freshfoods.in',
    boundingBox: { ymin: 625, xmin: 240, ymax: 660, xmax: 900 }
  },
  manufacturer_name: {
    value: 'Fresh Foods Private Limited',
    confidence: 0.97,
    evidence: 'Manufactured & Packed by: Fresh Foods Private Limited',
    boundingBox: { ymin: 675, xmin: 240, ymax: 710, xmax: 820 }
  },
  manufacturer_address: {
    value: 'Plot No. 42, KIADB Industrial Area, Phase II, Bengaluru, Karnataka - 560066',
    confidence: 0.96,
    evidence: 'Address: Plot No. 42, KIADB Industrial Area, Phase II, Bengaluru, Karnataka - 560066',
    boundingBox: { ymin: 720, xmin: 240, ymax: 760, xmax: 950 }
  },
  country_of_origin: {
    value: 'India',
    confidence: 0.99,
    evidence: 'Country of Origin: India',
    boundingBox: { ymin: 770, xmin: 240, ymax: 805, xmax: 550 }
  },
  fssai_license: {
    value: '1122334400123',
    confidence: 0.98,
    evidence: 'FSSAI Lic. No. 1122334400123',
    boundingBox: { ymin: 870, xmin: 400, ymax: 910, xmax: 700 }
  }
};

const farmFreshChipsEval = evaluatePackageCompliance(farmFreshChipsData);

export const DEMO_FARMFRESH_CHIPS_INSPECTION: InspectionRecord = {
  id: 'demo-farmfresh-chips-04',
  inspection_code: 'RV-2026-9044-DEMO',
  product_name: 'FarmFresh Classic Potato Chips 52g',
  commodity_name: farmFreshChipsData.commodity_name.value,
  mrp: farmFreshChipsData.mrp.value,
  net_quantity: farmFreshChipsData.net_quantity.value,
  manufacturing_or_packing_date: farmFreshChipsData.manufacturing_or_packing_date.value,
  expiry_or_best_before: farmFreshChipsData.expiry_or_best_before.value,
  consumer_care_contact: farmFreshChipsData.consumer_care_contact.value,
  manufacturer_name: farmFreshChipsData.manufacturer_name.value,
  manufacturer_address: farmFreshChipsData.manufacturer_address.value,
  country_of_origin: farmFreshChipsData.country_of_origin.value,
  fssai_license: farmFreshChipsData.fssai_license.value,
  barcode_number: '8901030994125',
  overall_status: farmFreshChipsEval.overallStatus,
  passed_count: farmFreshChipsEval.passedCount,
  failed_count: farmFreshChipsEval.failedCount,
  review_count: farmFreshChipsEval.reviewCount,
  extracted_data: farmFreshChipsData,
  compliance_results: farmFreshChipsEval.complianceResults,
  violations: farmFreshChipsEval.violations,
  image_url: '/assets/farmfresh_potato_chips.jpg',
  latitude: 12.9716,
  longitude: 77.5946,
  location_name: 'Bengaluru, Karnataka',
  created_at: '2026-09-20T10:00:00Z',
  is_demo: true,
  reviewed_by_inspector: true,
  notes: 'Benchmark reference product for SIH Problem Statement 26034. All statutory declarations verified.'
};

export const DEMO_INSPECTIONS: InspectionRecord[] = [
  DEMO_FARMFRESH_CHIPS_INSPECTION,
  DEMO_COMPLIANT_INSPECTION,
  DEMO_NON_COMPLIANT_INSPECTION,
  DEMO_NEEDS_REVIEW_INSPECTION
];

