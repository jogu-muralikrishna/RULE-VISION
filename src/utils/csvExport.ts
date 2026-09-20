import { InspectionRecord } from '../types';

/**
 * Exports an array of inspection records to CSV format and triggers download.
 */
export function exportInspectionsToCSV(inspections: InspectionRecord[], filename?: string): void {
  const headers = [
    'Inspection Code',
    'Product Name',
    'Commodity Name',
    'MRP',
    'Net Quantity',
    'Mfg/Packing Date',
    'Expiry/Best Before',
    'Consumer Care',
    'Manufacturer Name',
    'Manufacturer Address',
    'Country of Origin',
    'FSSAI License',
    'Barcode Number',
    'Overall Status',
    'Passed Checks',
    'Failed Checks',
    'Review Checks',
    'Violation Details',
    'Location',
    'Inspection Date',
    'Inspector Reviewed'
  ];

  const rows = inspections.map(insp => {
    const violationSummary = insp.violations
      .map(v => `${v.fieldLabel} (${v.ruleNumber}): ${v.status} - ${v.reason}`)
      .join(' | ');

    const location = insp.location_name ||
      (insp.latitude ? `${insp.latitude.toFixed(4)}°N, ${insp.longitude?.toFixed(4)}°E` : '');

    return [
      insp.inspection_code,
      insp.product_name,
      insp.commodity_name || '',
      insp.mrp || '',
      insp.net_quantity || '',
      insp.manufacturing_or_packing_date || '',
      insp.expiry_or_best_before || '',
      insp.consumer_care_contact || '',
      insp.manufacturer_name || '',
      insp.manufacturer_address || '',
      insp.country_of_origin || '',
      insp.fssai_license || '',
      insp.barcode_number || '',
      insp.overall_status,
      String(insp.passed_count),
      String(insp.failed_count),
      String(insp.review_count),
      violationSummary,
      location,
      new Date(insp.created_at).toLocaleDateString('en-IN'),
      insp.reviewed_by_inspector ? 'Yes' : 'No'
    ];
  });

  // Escape CSV fields
  const escapeCSV = (field: string): string => {
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  };

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');

  // Add BOM for Excel UTF-8 compatibility
  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `RuleVision_Export_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
