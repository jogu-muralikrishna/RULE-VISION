import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  ShieldCheck,
  MapPin,
  Calendar,
  AlertOctagon,
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileSpreadsheet
} from 'lucide-react';
import { InspectionRecord } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { BrandLogo } from '../components/BrandLogo';
import { generateComplianceReportPDF, generateLegalNoticePDF } from '../utils/pdfExport';
import { exportInspectionsToCSV } from '../utils/csvExport';
import { calculateTotalPenalty } from '../rules/penaltyCalculator';

interface ReportsPageProps {
  inspections: InspectionRecord[];
  selectedInspection: InspectionRecord | null;
  onSelectInspection: (inspection: InspectionRecord) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  inspections,
  selectedInspection,
  onSelectInspection
}) => {
  const activeInspections = inspections.filter(i => !i.is_deleted);
  const current = selectedInspection && !selectedInspection.is_deleted
    ? selectedInspection
    : activeInspections[0] || null;
  const [reportType, setReportType] = useState<'AUDIT_REPORT' | 'INSPECTION_NOTICE'>('AUDIT_REPORT');

  const handlePrint = () => {
    window.print();
  };

  if (!current) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center space-y-3 max-w-xl mx-auto">
        <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
        <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Inspection Reports Available</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">Conduct your first product audit to view and print statutory reports.</p>
      </div>
    );
  }

  const isNonCompliant = current.overall_status === 'NON_COMPLIANT';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Toolbar (Hidden during print) */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Inspection Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Select Audit:</span>
          <select
            value={current.id}
            onChange={(e) => {
              const found = activeInspections.find(i => i.id === e.target.value);
              if (found) onSelectInspection(found);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-slate-900 dark:focus:ring-white"
          >
            {activeInspections.map(i => (
              <option key={i.id} value={i.id}>
                {i.inspection_code} — {i.product_name} ({i.overall_status})
              </option>
            ))}
          </select>
        </div>

        {/* Report Type & Print Controls */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-100 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReportType('AUDIT_REPORT')}
              className={`px-3 py-1 rounded-md transition-all ${
                reportType === 'AUDIT_REPORT' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Statutory Audit Dossier
            </button>
            <button
              type="button"
              onClick={() => setReportType('INSPECTION_NOTICE')}
              className={`px-3 py-1 rounded-md transition-all ${
                reportType === 'INSPECTION_NOTICE' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              Preliminary Inspection Notice
            </button>
          </div>

          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-950 text-xs font-bold shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
          <button
            id="btn-download-pdf"
            type="button"
            onClick={() => generateComplianceReportPDF(current)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Compliance PDF
          </button>
          {current.violations && current.violations.length > 0 && (
            <button
              id="btn-generate-legal-notice"
              type="button"
              onClick={() => generateLegalNoticePDF(current)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-all hover:shadow"
              title="One-click statutory notice generation under Section 36 of Legal Metrology Act"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Generate Legal Notice (Form 1)
            </button>
          )}
          <button
            id="btn-export-csv"
            type="button"
            onClick={() => exportInspectionsToCSV(activeInspections)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold shadow-2xs transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Printable Document Paper Card */}
      <div className="bg-white rounded-2xl border border-slate-300 p-8 md:p-12 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8 text-slate-900 font-sans">
        {/* Document Formal Header */}
        <div className="border-b-2 border-slate-900 pb-6 flex items-start justify-between gap-6">
          <div className="space-y-2">
            <BrandLogo size="md" badge="Audit System" />
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
              {reportType === 'INSPECTION_NOTICE'
                ? 'Statutory Metrology Inspection Notice / Preliminary Compliance Report'
                : 'Legal Metrology (Packaged Commodities) Rules, 2011 Audit Report'}
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="font-mono font-bold text-base text-slate-950">
              {current.inspection_code}
            </div>
            <div className="text-xs text-slate-500">
              Audit Date: {new Date(current.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </div>
            {current.is_demo && (
              <span className="inline-block text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                DEMO DATA — NOT A REAL INSPECTION
              </span>
            )}
          </div>
        </div>

        {/* Product & Inspection Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div className="space-y-2">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Product / Commodity Label:</span>
              <span className="font-bold text-sm text-slate-900">{current.product_name}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Declared Net Quantity:</span>
              <span className="text-slate-800 font-medium">{current.net_quantity || 'Not Declared'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Maximum Retail Price (MRP):</span>
              <span className="text-slate-800 font-medium">{current.mrp || 'Not Declared'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Inspection Location:</span>
              <span className="text-slate-800 font-medium">
                {current.location_name || (current.latitude ? `${current.latitude.toFixed(4)}° N, ${current.longitude?.toFixed(4)}° E` : 'Location Not Recorded')}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Manufacturer / Packer:</span>
              <span className="text-slate-800 font-medium">{current.manufacturer_name || 'Not Declared'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Country of Origin:</span>
              <span className="text-slate-800 font-medium">{current.country_of_origin || 'Not Declared'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">FSSAI License:</span>
              <span className="text-slate-800 font-medium">{current.fssai_license || 'Not Detected'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px]">Barcode Number:</span>
              <span className="text-slate-800 font-mono font-medium">{current.barcode_number || 'Not Scanned'}</span>
            </div>
          </div>
        </div>

        {/* Overall Status Banner */}
        <div className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
          current.overall_status === 'COMPLIANT'
            ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
            : current.overall_status === 'NON_COMPLIANT'
            ? 'bg-red-50 border-red-300 text-red-950'
            : 'bg-amber-50 border-amber-300 text-amber-950'
        }`}>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider block opacity-75">
              Preliminary Compliance Determination:
            </span>
            <div className="text-xl font-black tracking-tight mt-0.5">
              {current.overall_status === 'COMPLIANT' ? 'COMPLIANT (RULE 6 PCR 2011)' : current.overall_status === 'NON_COMPLIANT' ? 'NON-COMPLIANT (VIOLATIONS DETECTED)' : 'NEEDS MANUAL REVIEW'}
            </div>
          </div>

          <div className="text-right text-xs font-semibold">
            <div>Passed Checks: {current.passed_count} / {current.compliance_results.length}</div>
            {current.failed_count > 0 && <div className="text-red-700">Statutory Breaches: {current.failed_count}</div>}
            {current.review_count > 0 && <div className="text-amber-700">To Review: {current.review_count}</div>}
          </div>
        </div>

        {/* 8-Point Statutory Declarations Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
            Mandatory Declarations Evaluation Matrix (Rule 6(1))
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 w-1/4">Declaration & Rule</th>
                  <th className="p-3 w-1/4">Detected Value / Evidence</th>
                  <th className="p-3 w-1/8">Status</th>
                  <th className="p-3 w-3/8">Statutory Reference & Finding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {current.compliance_results.map((item) => (
                  <tr key={item.fieldKey} className="align-top">
                    <td className="p-3 font-semibold text-slate-900">
                      <div>{item.fieldLabel}</div>
                      <span className="text-[10px] font-mono text-slate-500 font-normal">
                        {item.ruleNumber}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800">
                      <div className="font-medium">{item.detectedValue || <em className="text-red-600">Not Detected</em>}</div>
                      {item.evidence && (
                        <div className="text-[10px] font-mono text-slate-500 mt-1">
                          Evidence: "{item.evidence}"
                        </div>
                      )}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="p-3 text-slate-700 text-[11px] leading-relaxed">
                      <p>{item.reason}</p>
                      <span className="text-[10px] text-slate-400 font-mono block mt-1">
                        {item.ruleReference}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detected Issues / Violations & Notice Clause */}
        {current.violations.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-900 flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-red-600" />
              Noticed Deficiencies & Statutory Breaches
            </h3>
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3 text-xs">
              {current.violations.map((v, idx) => (
                <div key={v.fieldKey} className="space-y-1 pb-2 border-b border-red-100 last:border-none last:pb-0">
                  <div className="font-bold text-red-950">
                    {idx + 1}. {v.fieldLabel} ({v.ruleNumber}) — {v.status === 'FAIL' ? 'Omission / Non-Compliance' : 'Verification Required'}
                  </div>
                  <p className="text-slate-700 text-[11px]">{v.reason}</p>
                  <div className="text-[11px] text-slate-800 dark:text-slate-200 font-medium">
                    Recommended Action: {v.recommendedAction}
                  </div>
                  {v.penaltyInfo && v.status === 'FAIL' && (
                    <div className="text-[10px] text-red-800 font-mono mt-1 bg-red-100 px-2 py-1 rounded">
                      ⚖️ {v.penaltyInfo.section} — Fine: {v.penaltyInfo.firstOffencePenalty} (1st offence), {v.penaltyInfo.secondOffencePenalty} (2nd offence)
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Penalty Summary Box */}
            {(() => {
              const penaltyData = calculateTotalPenalty(
                current.violations.map(v => ({ fieldKey: v.fieldKey, status: v.status }))
              );
              return penaltyData.violationCount > 0 ? (
                <div className="p-4 rounded-xl bg-red-100 border border-red-300 text-xs space-y-1">
                  <h4 className="font-bold text-red-950 flex items-center gap-1">
                    <Scale className="w-3.5 h-3.5" />
                    Estimated Penalty (Legal Metrology Act, 2009)
                  </h4>
                  <p className="text-red-900">
                    <strong>First Offence:</strong> {penaltyData.totalMinPenalty} &nbsp;|&nbsp;
                    <strong>Second Offence:</strong> {penaltyData.totalMaxPenalty}
                  </p>
                  <p className="text-red-800/80 text-[10px]">
                    Penalties applicable under Sections 36 & 42 of the Legal Metrology Act, 2009. Final determination by authorized officer.
                  </p>
                </div>
              ) : null;
            })()}
          </div>
        )}

        {/* Inspector Endorsement & Sign-off */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs">
          <div>
            <span className="font-semibold text-slate-500 block mb-1">Field Screening System:</span>
            <p className="text-slate-800 font-mono font-bold">RuleVision AI Metrology Engine</p>
            <p className="text-slate-500 text-[11px]">Packaged Commodities Compliance Audit</p>
          </div>

          <div className="text-right space-y-1">
            <span className="font-semibold text-slate-500 block mb-2">Screening Auditor Reference:</span>
            <p className="text-slate-900 font-bold text-sm">{current.inspector_name || 'Not Provided'}</p>
            <p className="text-slate-500 text-[11px] font-mono">{current.inspector_email || 'Not Provided'}</p>
            <div className="border-b border-slate-300 w-48 ml-auto my-2"></div>
            <p className="text-amber-700 font-semibold text-[11px]">Preliminary Screening • Digital Stamp: Not Verified</p>
          </div>
        </div>

        {/* Statutory Disclaimer - Mandated by User */}
        <div className="pt-4 border-t border-slate-100 text-[11px] text-slate-500 leading-relaxed text-center">
          <strong>Official Statutory Disclaimer:</strong> RuleVision is an AI-assisted screening tool. Final legal determination must be made by an authorized Legal Metrology officer based on the applicable law and current rules. This preliminary dossier is issued for statutory audit screening and evidence collection under Legal Metrology (Packaged Commodities) Rules, 2011.
        </div>
      </div>
    </div>
  );
};
