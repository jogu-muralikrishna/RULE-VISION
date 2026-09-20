import { parseDeclarationsFromOcrText } from '../src/utils/ocrParser';
import { evaluatePackageCompliance, isPlausibleEntityName } from '../src/rules/complianceEngine';
import { DEFAULT_LEGAL_RULES } from '../src/rules/defaultRules';

function runExactFailureCaseTest() {
  console.log('====================================================');
  console.log('TEST CASE 1: USER REPORT FAILURE CASE REGRESSION');
  console.log('====================================================\n');

  // Exact OCR text from the user's report
  const rawOcrText = `
12 JAN 2025 {f
PIN: 462011
11JUL 2025
  `.trim();

  const lines = [
    { text: '12 JAN 2025 {f', bbox: { y0: 10, x0: 10, y1: 50, x1: 500 } },
    { text: 'PIN: 462011', bbox: { y0: 60, x0: 10, y1: 100, x1: 500 } },
    { text: '11JUL 2025', bbox: { y0: 110, x0: 10, y1: 150, x1: 500 } }
  ];

  const extracted = parseDeclarationsFromOcrText(rawOcrText, lines, 1000, 1000);

  console.log('--- Extracted Values ---');
  console.log('Commodity Name:', extracted.commodity_name.value);
  console.log('Net Quantity:', extracted.net_quantity.value);
  console.log('MRP:', extracted.mrp.value);
  console.log('Mfg Date:', extracted.manufacturing_or_packing_date.value);
  console.log('Expiry / Best Before:', extracted.expiry_or_best_before.value);
  console.log('Consumer Care:', extracted.consumer_care_contact.value);
  console.log('Manufacturer Name:', extracted.manufacturer_name.value);
  console.log('Manufacturer Address:', extracted.manufacturer_address.value);
  console.log('Country of Origin:', extracted.country_of_origin.value);
  console.log('FSSAI License:', extracted.fssai_license.value);

  // 1. Manufacturer Name: "12 JAN 2025 {f"
  console.log('\n--- 1. Manufacturer Name Integrity ---');
  if (isPlausibleEntityName('12 JAN 2025 {f')) {
    throw new Error('FAIL: "12 JAN 2025 {f" was considered a plausible entity name!');
  }
  if (extracted.manufacturer_name.value === '12 JAN 2025 {f') {
    throw new Error('FAIL: "12 JAN 2025 {f" was incorrectly extracted as manufacturer name!');
  }
  console.log('✓ "12 JAN 2025 {f" correctly rejected as manufacturer name');

  // Even if an OCR engine or user assigned "12 JAN 2025 {f" to manufacturer_name:
  const dirtyExtracted = {
    ...extracted,
    manufacturer_name: {
      value: '12 JAN 2025 {f',
      confidence: 0.90,
      evidence: '12 JAN 2025 {f',
      boundingBox: null
    }
  };
  const dirtyEval = evaluatePackageCompliance(dirtyExtracted, DEFAULT_LEGAL_RULES, {
    packagingGeometry: 'flat',
    multiAngleCount: 1
  });
  const dirtyMfgRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'manufacturer_name');
  if (dirtyMfgRes?.status === 'PASS') {
    throw new Error('FAIL: Manufacturer Name evaluation awarded PASS to "12 JAN 2025 {f"!');
  }
  if (dirtyMfgRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: Manufacturer Name evaluation expected NEEDS_REVIEW, got ${dirtyMfgRes?.status}`);
  }
  console.log('✓ evaluateManufacturerName strictly returns NEEDS_REVIEW for date/noise string: PASS');

  // 2. Manufacturer Address: "PIN: 462011"
  console.log('\n--- 2. Manufacturer Address Validation ---');
  const addrRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'manufacturer_address');
  if (addrRes?.status === 'PASS') {
    throw new Error('FAIL: "PIN: 462011" alone must NOT PASS as a complete address!');
  }
  if (addrRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: "PIN: 462011" expected NEEDS_REVIEW, got ${addrRes?.status}`);
  }
  console.log('✓ "PIN: 462011" evaluated as NEEDS_REVIEW (incomplete address): PASS');

  // 3. Expiry candidate: "11JUL 2025"
  console.log('\n--- 3. Expiry / Best Before Validation ---');
  const expRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'expiry_or_best_before');
  if (expRes?.status === 'PASS') {
    throw new Error('FAIL: "11JUL 2025" without expiry prefix must NOT PASS as expiry date!');
  }
  if (expRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: "11JUL 2025" without expiry prefix expected NEEDS_REVIEW, got ${expRes?.status}`);
  }
  console.log('✓ "11JUL 2025" without expiry prefix evaluated as NEEDS_REVIEW: PASS');

  // 4. Generic Commodity Name: Not reliably detected
  console.log('\n--- 4. Commodity Name Integrity ---');
  if (extracted.commodity_name.value !== null) {
    throw new Error(`FAIL: Commodity name must NOT be invented, got "${extracted.commodity_name.value}"`);
  }
  const commRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'commodity_name');
  if (commRes?.status === 'PASS') {
    throw new Error('FAIL: Commodity name must NOT PASS when absent!');
  }
  if (commRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: Commodity name expected NEEDS_REVIEW, got ${commRes?.status}`);
  }
  console.log('✓ Commodity name not invented; evaluates to NEEDS_REVIEW: PASS');

  // 5. MRP: Not detected
  console.log('\n--- 5. MRP Integrity ---');
  if (extracted.mrp.value !== null) {
    throw new Error(`FAIL: MRP must NOT be invented, got "${extracted.mrp.value}"`);
  }
  const mrpRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'mrp');
  if (mrpRes?.status === 'PASS') {
    throw new Error('FAIL: MRP must NOT PASS when absent!');
  }
  if (mrpRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: MRP expected NEEDS_REVIEW, got ${mrpRes?.status}`);
  }
  console.log('✓ MRP not invented; evaluates to NEEDS_REVIEW: PASS');

  // 6. Net Quantity: Not detected
  console.log('\n--- 6. Net Quantity Integrity ---');
  if (extracted.net_quantity.value !== null) {
    throw new Error(`FAIL: Net quantity must NOT be invented, got "${extracted.net_quantity.value}"`);
  }
  const qtyRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'net_quantity');
  if (qtyRes?.status === 'PASS') {
    throw new Error('FAIL: Net quantity must NOT PASS when absent!');
  }
  if (qtyRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: Net quantity expected NEEDS_REVIEW, got ${qtyRes?.status}`);
  }
  console.log('✓ Net quantity not invented; evaluates to NEEDS_REVIEW: PASS');

  // 7. FSSAI: Commodity category unknown
  console.log('\n--- 7. FSSAI Applicability ---');
  const fssaiRes = dirtyEval.complianceResults.find(r => r.fieldKey === 'fssai_license');
  if (fssaiRes?.status === 'FAIL') {
    throw new Error('FAIL: FSSAI must NOT FAIL when product category is unknown!');
  }
  if (fssaiRes?.status !== 'NEEDS_REVIEW') {
    throw new Error(`FAIL: FSSAI expected NEEDS_REVIEW when category unknown, got ${fssaiRes?.status}`);
  }
  console.log('✓ FSSAI applicability evaluated as NEEDS_REVIEW (category unknown): PASS');

  // 8. Single Source of Truth & Zero Duplicate Report Issues
  console.log('\n--- 8. Report Categorization & Mutually Exclusive Counts ---');
  const passItems = dirtyEval.complianceResults.filter(c => c.status === 'PASS');
  const failItems = dirtyEval.complianceResults.filter(c => c.status === 'FAIL');
  const reviewItems = dirtyEval.complianceResults.filter(c => c.status === 'NEEDS_REVIEW');
  const naItems = dirtyEval.complianceResults.filter(c => c.status === 'NOT_APPLICABLE');

  const totalEvaluated = passItems.length + failItems.length + reviewItems.length + naItems.length;
  if (totalEvaluated !== dirtyEval.complianceResults.length) {
    throw new Error(`FAIL: Mutually exclusive sum (${totalEvaluated}) !== total rules (${dirtyEval.complianceResults.length})`);
  }

  // Ensure no rule ID appears in multiple categories
  const allIds = [
    ...passItems.map(r => r.fieldKey),
    ...failItems.map(r => r.fieldKey),
    ...reviewItems.map(r => r.fieldKey),
    ...naItems.map(r => r.fieldKey)
  ];
  const uniqueIds = new Set(allIds);
  if (allIds.length !== uniqueIds.size) {
    throw new Error(`FAIL: Duplicate rule detected across report categories! Total: ${allIds.length}, Unique: ${uniqueIds.size}`);
  }
  console.log('✓ Every rule appears in exactly ONE category (Zero Duplicates): PASS');
  console.log(`✓ Total Checks: ${totalEvaluated} = Passed(${passItems.length}) + Failed(${failItems.length}) + Review(${reviewItems.length}) + NA(${naItems.length}): PASS`);
}

function runValidDeclarationsTest() {
  console.log('\n====================================================');
  console.log('TEST CASE 2: VALID DECLARATIONS MUST STILL PASS');
  console.log('====================================================\n');

  const validSample = `
Generic Commodity: Basmati Rice
Net Quantity: 5 kg
MRP: Rs. 450.00 (inclusive of all taxes)
Mfg Date: 15/01/2025
Best Before: 15/01/2026
Consumer Care: 1800-200-3000 | grievance@himalayanfoods.com
Manufactured by: Himalayan Agro Foods Private Limited
Plot 45, Sector 18, Industrial Area, Karnal - 132001, Haryana
Country of Origin: India
FSSAI Lic. No.: 10014011000234
  `.trim();

  const lines = validSample.split('\n').map((text, i) => ({
    text,
    bbox: { y0: i * 30, x0: 10, y1: (i + 1) * 30, x1: 600 }
  }));

  const extracted = parseDeclarationsFromOcrText(validSample, lines, 1000, 1000);
  const evaluation = evaluatePackageCompliance(extracted, DEFAULT_LEGAL_RULES, {
    packagingGeometry: 'flat',
    multiAngleCount: 1,
    isFullLabelInspected: true
  });

  console.log('Passed Count:', evaluation.passedCount);
  console.log('Failed Count:', evaluation.failedCount);
  console.log('Review Count:', evaluation.reviewCount);
  console.log('Overall Status:', evaluation.overallStatus);

  if (evaluation.overallStatus !== 'COMPLIANT') {
    throw new Error(`FAIL: Valid package expected COMPLIANT, got ${evaluation.overallStatus}`);
  }
  if (evaluation.passedCount < 8) {
    throw new Error(`FAIL: Valid package expected >= 8 passed checks, got ${evaluation.passedCount}`);
  }
  console.log('✓ Valid declarations correctly PASS: ALL CHECKS PASS');
}

function runFarmFreshChipsTestCase() {
  console.log('\n====================================================');
  console.log('TEST CASE 3: FARMFRESH POTATO CHIPS (SIH PS 26034)');
  console.log('====================================================\n');

  const chipsOcrText = `
FarmFresh Classic Potato Chips
Generic Commodity: Potato Chips
Net Quantity: 52 g
MRP: Rs. 20.00 (incl. of all taxes)
Unit Sale Price: Rs. 0.38 / g
Mfg Date: 12 JAN 2025
Best Before: 12 JUL 2025
Consumer Care: 1800-123-4567 | care@freshfoods.in
Manufactured & Packed by: Fresh Foods Private Limited
Address: Plot No. 42, KIADB Industrial Area, Phase II, Bengaluru, Karnataka - 560066
Country of Origin: India
FSSAI Lic. No.: 1122334400123
  `.trim();

  const lines = chipsOcrText.split('\n').map((text, i) => ({
    text,
    bbox: { y0: i * 30, x0: 10, y1: (i + 1) * 30, x1: 600 }
  }));

  const extracted = parseDeclarationsFromOcrText(chipsOcrText, lines, 1000, 1000);
  const evaluation = evaluatePackageCompliance(extracted, DEFAULT_LEGAL_RULES, {
    packagingGeometry: 'flat',
    multiAngleCount: 1,
    isFullLabelInspected: true
  });

  console.log('Commodity Name:', extracted.commodity_name.value);
  console.log('Net Quantity:', extracted.net_quantity.value);
  console.log('MRP:', extracted.mrp.value);
  console.log('Mfg Date:', extracted.manufacturing_or_packing_date.value);
  console.log('Expiry:', extracted.expiry_or_best_before.value);
  console.log('Consumer Care:', extracted.consumer_care_contact.value);
  console.log('Manufacturer Name:', extracted.manufacturer_name.value);
  console.log('Manufacturer Address:', extracted.manufacturer_address.value);
  console.log('Country of Origin:', extracted.country_of_origin.value);
  console.log('FSSAI License:', extracted.fssai_license.value);

  console.log('\nEvaluation:');
  console.log('Passed Count:', evaluation.passedCount);
  console.log('Failed Count:', evaluation.failedCount);
  console.log('Review Count:', evaluation.reviewCount);
  console.log('Overall Status:', evaluation.overallStatus);
  console.log('Compliance Results:', JSON.stringify(evaluation.complianceResults.map(r => ({ key: r.fieldKey, status: r.status, reason: r.reason })), null, 2));

  if (evaluation.overallStatus !== 'COMPLIANT') {
    throw new Error(`FAIL: FarmFresh Chips expected COMPLIANT, got ${evaluation.overallStatus}`);
  }
  if (evaluation.failedCount !== 0) {
    throw new Error(`FAIL: FarmFresh Chips expected 0 failures, got ${evaluation.failedCount}`);
  }
  console.log('✓ FarmFresh Potato Chips (SIH PS 26034 benchmark) verified COMPLIANT with 0 failures');
}

runExactFailureCaseTest();
runValidDeclarationsTest();
runFarmFreshChipsTestCase();

console.log('\n====================================================');
console.log('ALL REGRESSION SUITES PASSED WITH 100% SUCCESS!');
console.log('====================================================\n');

