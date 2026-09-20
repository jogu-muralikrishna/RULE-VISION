import { jsPDF } from 'jspdf';
import { InspectionRecord } from '../types';
import { calculateTotalPenalty } from '../rules/penaltyCalculator';

/**
 * Generates a downloadable PDF compliance report for a given inspection.
 * Uses jsPDF for client-side PDF generation.
 */
export function generateComplianceReportPDF(inspection: InspectionRecord): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Helper: add text and auto-wrap
  const addText = (text: string, x: number, yPos: number, opts?: { fontSize?: number; fontStyle?: string; maxWidth?: number; color?: number[] }) => {
    doc.setFontSize(opts?.fontSize || 10);
    if (opts?.fontStyle === 'bold') {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    if (opts?.color) {
      doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    } else {
      doc.setTextColor(30, 30, 30);
    }
    const lines = doc.splitTextToSize(text, opts?.maxWidth || contentWidth);
    doc.text(lines, x, yPos);
    return lines.length * (opts?.fontSize ? opts.fontSize * 0.4 : 4);
  };

  // === HEADER ===
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RuleVision — Legal Metrology Compliance Report', margin, 12);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Legal Metrology (Packaged Commodities) Rules, 2011 | Powered by AI Vision', margin, 19);
  doc.text(inspection.inspection_code, pageWidth - margin, 12, { align: 'right' });
  doc.text(`Date: ${new Date(inspection.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, 19, { align: 'right' });

  y = 35;

  // === OVERALL STATUS BANNER ===
  const statusColor = inspection.overall_status === 'COMPLIANT' ? [22, 163, 74] :
    inspection.overall_status === 'NON_COMPLIANT' ? [220, 38, 38] : [217, 119, 6];
  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(margin, y, contentWidth, 12, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  const statusText = inspection.overall_status === 'COMPLIANT' ? 'COMPLIANT — All Statutory Checks Passed' :
    inspection.overall_status === 'NON_COMPLIANT' ? 'NON-COMPLIANT — Violations Detected' : 'NEEDS REVIEW — Manual Verification Required';
  doc.text(statusText, margin + 4, y + 8);
  y += 18;

  // === PRODUCT DETAILS ===
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, contentWidth, 32, 2, 2, 'FD');

  const col1X = margin + 4;
  const col2X = margin + contentWidth / 2 + 4;
  y += 6;

  addText('Product Name:', col1X, y, { fontSize: 8, fontStyle: 'bold', color: [100, 116, 139] });
  y += 4;
  addText(inspection.commodity_name || inspection.product_name || 'Not Detected', col1X, y, { fontSize: 10, fontStyle: 'bold' });
  y -= 4;

  addText('Manufacturer:', col2X, y, { fontSize: 8, fontStyle: 'bold', color: [100, 116, 139] });
  y += 4;
  addText(inspection.manufacturer_name || 'Not Declared', col2X, y, { fontSize: 10, maxWidth: contentWidth / 2 - 8 });

  y += 7;
  addText(`Net Qty: ${inspection.net_quantity || 'N/A'}  |  MRP: ${inspection.mrp || 'N/A'}  |  Barcode: ${inspection.barcode_number || 'N/A'}`, col1X, y, { fontSize: 8, color: [71, 85, 105] });
  y += 5;
  addText(`FSSAI: ${inspection.fssai_license || 'N/A'}  |  Origin: ${inspection.country_of_origin || 'N/A'}`, col1X, y, { fontSize: 8, color: [71, 85, 105] });
  y += 5;
  addText(`Location: ${inspection.location_name || (inspection.latitude ? `${inspection.latitude.toFixed(4)}°N, ${inspection.longitude?.toFixed(4)}°E` : 'Not recorded')}`, col1X, y, { fontSize: 8, color: [71, 85, 105] });

  y += 10;

  // === COMPLIANCE RESULTS TABLE ===
  addText('MANDATORY DECLARATIONS EVALUATION MATRIX', margin, y, { fontSize: 11, fontStyle: 'bold' });
  y += 7;

  // Table header
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('DECLARATION & RULE', margin + 2, y + 5);
  doc.text('DETECTED VALUE', margin + 55, y + 5);
  doc.text('STATUS', margin + 115, y + 5);
  doc.text('PENALTY CLAUSE', margin + 135, y + 5);
  y += 9;

  // Table rows
  for (const item of inspection.compliance_results) {
    // Check if we need a new page
    if (y > 265) {
      doc.addPage();
      y = margin;
    }

    const rowColor = item.status === 'PASS' ? [240, 253, 244] :
      item.status === 'FAIL' ? [254, 242, 242] :
      item.status === 'NOT_APPLICABLE' ? [248, 250, 252] : [255, 251, 235];
    doc.setFillColor(rowColor[0], rowColor[1], rowColor[2]);
    doc.rect(margin, y, contentWidth, 12, 'F');

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text(`${item.fieldLabel}`, margin + 2, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(`${item.ruleNumber}`, margin + 2, y + 8.5);

    doc.setFontSize(7);
    doc.setTextColor(30, 41, 59);
    const detectedVal = item.detectedValue ? item.detectedValue.slice(0, 35) + (item.detectedValue.length > 35 ? '...' : '') : (item.status === 'NOT_APPLICABLE' ? 'Not Applicable' : 'Not Detected');
    doc.text(detectedVal, margin + 55, y + 5);
    doc.setFontSize(6);
    doc.setTextColor(100, 116, 139);
    doc.text(item.status === 'NOT_APPLICABLE' ? 'N/A' : `Conf: ${Math.round(item.confidence * 100)}%`, margin + 55, y + 9);

    // Status badge
    const badgeColor = item.status === 'PASS' ? [22, 163, 74] :
      item.status === 'FAIL' ? [220, 38, 38] :
      item.status === 'NOT_APPLICABLE' ? [100, 116, 139] : [217, 119, 6];
    doc.setFillColor(badgeColor[0], badgeColor[1], badgeColor[2]);
    const badgeLabel = item.status === 'NOT_APPLICABLE' ? 'N/A' : item.status === 'NEEDS_REVIEW' ? 'REVIEW' : item.status;
    doc.roundedRect(margin + 115, y + 1.5, 18, 5, 1, 1, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text(badgeLabel, margin + 117, y + 5);

    // Penalty info
    if (item.penaltyInfo && item.status === 'FAIL') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(220, 38, 38);
      doc.text(`${item.penaltyInfo.section}`, margin + 135, y + 4);
      doc.text(`Fine: ${item.penaltyInfo.firstOffencePenalty}`, margin + 135, y + 8);
    }

    y += 14;
  }

  y += 5;

  // === PENALTY SUMMARY ===
  if (inspection.failed_count > 0) {
    if (y > 250) { doc.addPage(); y = margin; }

    const penaltyData = calculateTotalPenalty(
      inspection.violations.map(v => ({ fieldKey: v.fieldKey, status: v.status }))
    );

    doc.setFillColor(254, 242, 242);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'F');
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(margin, y, contentWidth, 16, 2, 2, 'D');
    addText('PENALTY SUMMARY (Legal Metrology Act, 2009)', margin + 4, y + 5, { fontSize: 9, fontStyle: 'bold', color: [153, 27, 27] });
    addText(`Violations: ${penaltyData.violationCount}  |  Estimated First Offence: ${penaltyData.totalMinPenalty}  |  Second Offence: ${penaltyData.totalMaxPenalty}`, margin + 4, y + 11, { fontSize: 8, color: [185, 28, 28] });
    y += 22;
  }

  // === FOOTER ===
  if (y > 255) { doc.addPage(); y = margin; }
  y += 5;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 5;

  addText('Field Screening System: RuleVision AI Metrology Engine', margin, y, { fontSize: 8, color: [100, 116, 139] });
  y += 5;
  addText('This is an AI-assisted screening report. Final legal determination must be made by an authorized Legal Metrology officer.', margin, y, { fontSize: 7, color: [148, 163, 184] });

  y += 8;
  addText(`Inspected By: ${inspection.inspector_name || 'Not Provided'} (${inspection.inspector_email || 'Not Provided'})`, margin, y, { fontSize: 8, color: [30, 41, 59], fontStyle: 'bold' });
  addText('Preliminary Screening • Digital Stamp: Not Verified', pageWidth - margin - 80, y, { fontSize: 8, color: [100, 116, 139], fontStyle: 'bold' });

  // Save the PDF
  const fileName = `RuleVision_Report_${inspection.inspection_code.replace(/[^a-zA-Z0-9\-]/g, '_')}.pdf`;
  doc.save(fileName);
}

/**
 * Generates an official Statutory Legal Notice (Form 1 under Section 36 of Legal Metrology Act, 2009)
 * Complete with timestamp, geo-coordinates, specific contravened clauses, and statutory penalty computation.
 */
export function generateLegalNoticePDF(inspection: InspectionRecord): void {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const addText = (text: string, x: number, yPos: number, opts?: { fontSize?: number; fontStyle?: string; maxWidth?: number; color?: number[]; align?: 'left' | 'center' | 'right' }) => {
    doc.setFontSize(opts?.fontSize || 10);
    if (opts?.fontStyle === 'bold') {
      doc.setFont('helvetica', 'bold');
    } else if (opts?.fontStyle === 'italic') {
      doc.setFont('helvetica', 'italic');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    if (opts?.color) {
      doc.setTextColor(opts.color[0], opts.color[1], opts.color[2]);
    } else {
      doc.setTextColor(20, 20, 20);
    }
    const lines = doc.splitTextToSize(text, opts?.maxWidth || contentWidth);
    doc.text(lines, x, yPos, { align: opts?.align || 'left' });
    return lines.length * (opts?.fontSize ? opts.fontSize * 0.42 : 4.5);
  };

  // === OFFICIAL STATUTORY EMBLEM HEADER ===
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 32, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICE OF THE CONTROLLER OF LEGAL METROLOGY', pageWidth / 2, 12, { align: 'center' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('DEPARTMENT OF CONSUMER AFFAIRS — GOVERNMENT OF INDIA', pageWidth / 2, 19, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text('LEGAL METROLOGY (PACKAGED COMMODITIES) RULES, 2011 — ENFORCEMENT CELL', pageWidth / 2, 26, { align: 'center' });

  y = 42;

  // Notice Ref Number & Timestamp
  const noticeRef = `LM/NOTICE/${new Date().getFullYear()}/${inspection.inspection_code.replace(/[^0-9]/g, '').slice(-6) || '881204'}`;
  const inspectionDate = new Date(inspection.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
  const inspectionTime = new Date(inspection.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

  addText(`NOTICE REFERENCE NO: ${noticeRef}`, margin, y, { fontSize: 9, fontStyle: 'bold', color: [15, 23, 42] });
  addText(`Date of Inspection: ${inspectionDate} at ${inspectionTime}`, pageWidth - margin, y, { fontSize: 9, fontStyle: 'bold', align: 'right' });
  y += 8;

  // Geo-tag Box
  const geoText = inspection.location_name
    ? `${inspection.location_name} (GPS: ${inspection.latitude?.toFixed(5) || '12.9716'}° N, ${inspection.longitude?.toFixed(5) || '77.5946'}° E)`
    : `GPS: ${inspection.latitude?.toFixed(5) || '12.9716'}° N, ${inspection.longitude?.toFixed(5) || '77.5946'}° E`;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'F');
  addText(`GEO-TAGGED LOCATION: ${geoText}`, margin + 3, y + 5.5, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
  y += 14;

  // Formal Notice Title
  doc.setFillColor(239, 68, 68);
  doc.rect(margin, y, contentWidth, 9, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('FORM 1: STATUTORY SHOW-CAUSE NOTICE FOR CONTRAVENTION OF PCR, 2011', pageWidth / 2, y + 6, { align: 'center' });
  y += 15;

  // Addressed To
  addText('TO,', margin, y, { fontSize: 9, fontStyle: 'bold' });
  y += 5;
  addText(`THE DIRECTORS / PRINCIPAL OFFICERS / PROPRIETOR`, margin, y, { fontSize: 9, fontStyle: 'bold' });
  y += 4.5;
  addText(`M/s ${inspection.manufacturer_name || 'MANUFACTURER / PACKER OF COMMODITY'}`, margin, y, { fontSize: 10, fontStyle: 'bold', color: [30, 41, 59] });
  y += 4.5;
  addText(`Address: ${inspection.manufacturer_address || 'Address Not Disclosed on Packaging'}`, margin, y, { fontSize: 8, maxWidth: contentWidth - 10, color: [71, 85, 105] });
  y += 9;

  // Subject
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4.5;
  addText(`SUBJECT: Notice under Section 36 of Legal Metrology Act, 2009 for contraventions detected on package of "${inspection.commodity_name || inspection.product_name || 'Not Detected'}" (Net Qty: ${inspection.net_quantity || 'N/A'}, MRP: ${inspection.mrp || 'N/A'}).`, margin, y, { fontSize: 9, fontStyle: 'bold' });
  y += 8;
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Body Paragraph
  addText(
    `WHEREAS, during statutory inspection of packaged commodities carried out using the RuleVision Automated Metrology System under powers conferred by Section 15 of the Legal Metrology Act, 2009, the pre-packed commodity described above was examined, and the following non-conformities with Rule 6 of the Legal Metrology (Packaged Commodities) Rules, 2011 were officially documented:`,
    margin, y, { fontSize: 8.5, maxWidth: contentWidth }
  );
  y += 14;

  // Violations Table
  const violations = inspection.violations.length > 0 ? inspection.violations : inspection.compliance_results.filter(r => r.status !== 'PASS');
  
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, y, contentWidth, 7, 'F');
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('SL', margin + 2, y + 4.5);
  doc.text('STATUTORY CLAUSE', margin + 12, y + 4.5);
  doc.text('NATURE OF CONTRAVENTION', margin + 60, y + 4.5);
  doc.text('OFFENCE SECTION', margin + 125, y + 4.5);
  y += 9;

  let sl = 1;
  for (const v of violations) {
    if (y > 255) { doc.addPage(); y = margin; }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(220, 38, 38);
    doc.text(`${sl}.`, margin + 2, y + 4);
    doc.text(`${v.ruleNumber}`, margin + 12, y + 4);

    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    doc.text(`${v.fieldLabel}`, margin + 12, y + 8);

    const reasonText = v.reason.slice(0, 50) + (v.reason.length > 50 ? '...' : '');
    doc.text(reasonText, margin + 60, y + 4, { maxWidth: 62 });

    doc.setFontSize(7);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`${v.penaltyInfo?.section || 'Section 36'}`, margin + 125, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`Fine: ${v.penaltyInfo?.firstOffencePenalty || '₹25,000'}`, margin + 125, y + 8);

    doc.setDrawColor(241, 245, 249);
    doc.line(margin, y + 10, pageWidth - margin, y + 10);
    y += 12;
    sl++;
  }

  y += 4;

  // Directive & Timeline
  const penaltySummary = calculateTotalPenalty(violations.map(v => ({ fieldKey: v.fieldKey, status: v.status })));
  addText(
    `NOW THEREFORE, take notice that under Section 36 of the Legal Metrology Act, 2009, whoever manufactures, packs, imports, sells or distributes pre-packed commodities in contravention of the Rules is punishable with fine up to ${penaltySummary.totalMinPenalty} for first offence, and up to ${penaltySummary.totalMaxPenalty} or imprisonment for second offence.`,
    margin, y, { fontSize: 8, fontStyle: 'bold', color: [153, 27, 27], maxWidth: contentWidth }
  );
  y += 12;

  addText(
    `You are hereby directed to show cause in writing within FIFTEEN (15) DAYS from the receipt of this notice as to why penal action should not be initiated against you under the Act, or why proceedings under Section 48 (Compounding of Offences) should not be filed. Failure to respond within the stipulated period shall result in filing of prosecution in the competent Court of Judicial Magistrate.`,
    margin, y, { fontSize: 8, maxWidth: contentWidth }
  );
  y += 16;

  // Sign & Seal Block
  if (y > 255) { doc.addPage(); y = margin; }
  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  const signX = pageWidth - margin - 75;
  addText('AUDIT & SCREENING SUMMARY', signX, y, { fontSize: 8, fontStyle: 'bold', color: [71, 85, 105] });
  y += 5;
  addText(`${inspection.inspector_name || 'Not Provided'}`, signX, y, { fontSize: 9, fontStyle: 'bold' });
  y += 4;
  addText('Auditor / Operator Reference', signX, y, { fontSize: 8 });
  addText('RuleVision AI Compliance Auditor', signX, y, { fontSize: 8 });
  y += 4.5;
  addText('Notice Draft • Official Verification: Pending Authorized Inspection', signX, y, { fontSize: 7, fontStyle: 'italic', color: [100, 116, 139] });

  // Save Legal Notice PDF
  const noticeFileName = `RuleVision_Legal_Notice_${inspection.inspection_code.replace(/[^a-zA-Z0-9\-]/g, '_')}.pdf`;
  doc.save(noticeFileName);
}
