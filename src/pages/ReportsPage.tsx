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
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#131b2e] p-4 rounded-xl border border-[#e2e8f0] dark:border-slate-800 shadow-2xs">
        {/* Inspection Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-500 uppercase tracking-wider">Select Audit:</span>
          <select
            value={current.id}
            onChange={(e) => {
              const found = activeInspections.find(i => i.id === e.target.value);
              if (found) onSelectInspection(found);
            }}
            className="px-3 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 text-xs font-semibold text-[#0d1c2e] dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:ring-2 focus:ring-[#0f172a] focus:outline-hidden font-mono"
          >
            {activeInspections.map(i => (
              <option key={i.id} value={i.id}>
                {i.inspection_code} — {i.product_name} ({i.overall_status})
              </option>
            ))}
          </select>
        </div>

        {/* Report Type & Print Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex rounded-lg border border-[#cbd5e1] dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setReportType('AUDIT_REPORT')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] font-bold ${
                reportType === 'AUDIT_REPORT'
                  ? 'bg-white dark:bg-[#0f172a] text-[#0d1c2e] dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Statutory Audit Dossier
            </button>
            <button
              type="button"
              onClick={() => setReportType('INSPECTION_NOTICE')}
              className={`px-3 py-1.5 rounded-md transition-all font-mono text-[11px] font-bold ${
                reportType === 'INSPECTION_NOTICE'
                  ? 'bg-white dark:bg-[#0f172a] text-[#0d1c2e] dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Preliminary Inspection Notice
            </button>
          </div>

          <button
            id="btn-print-report"
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#1e293b] text-white text-xs font-mono font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Docket
          </button>
          <button
            id="btn-download-pdf"
            type="button"
            onClick={() => generateComplianceReportPDF(current)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#059669] hover:bg-emerald-700 text-white text-xs font-mono font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Compliance PDF
          </button>
          {current.violations && current.violations.length > 0 && (
            <button
              id="btn-generate-legal-notice"
              type="button"
              onClick={() => generateLegalNoticePDF(current)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#dc2626] hover:bg-red-700 text-white text-xs font-mono font-bold shadow-2xs transition-all cursor-pointer"
              title="One-click statutory notice generation under Section 36 of Legal Metrology Act"
            >
              <AlertOctagon className="w-3.5 h-3.5" />
              Legal Notice (Form 1)
            </button>
          )}
          <button
            id="btn-export-csv"
            type="button"
            onClick={() => exportInspectionsToCSV(activeInspections)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#cbd5e1] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>
      </div>

      {/* Printable Document Paper Card */}
      <div className="bg-white rounded-xl border border-[#cbd5e1] p-8 md:p-12 shadow-sm print:border-none print:shadow-none print:p-0 space-y-8 text-slate-900 font-sans">
        {/* Document Formal Header */}
        <div className="border-b-2 border-[#0f172a] pb-6 flex items-start justify-between gap-6">
          <div className="space-y-2">
            <BrandLogo size="md" badge="Statutory Enforcement Docket" />
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider font-mono">
              {reportType === 'INSPECTION_NOTICE'
                ? 'Statutory Metrology Inspection Notice / Form 1 Preliminary Notice'
                : 'Legal Metrology (Packaged Commodities) Rules, 2011 — Official Inspection Dossier'}
            </p>
          </div>

          <div className="text-right space-y-1">
            <div className="font-mono font-bold text-base text-[#0f172a]">
              {current.inspection_code}
            </div>
            <div className="text-xs font-mono text-slate-500">
              Audit Date: {new Date(current.created_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </div>
            {current.is_demo && (
              <span className="inline-block text-[10px] font-mono font-bold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                BENCHMARK DEMO SPECIMEN
              </span>
            )}
          </div>
        </div>

        {/* Product & Inspection Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl bg-[#f8f9ff] border border-[#e2e8f0] text-xs">
          <div className="space-y-2">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Product / Commodity Label:</span>
              <span className="font-bold text-sm text-[#0f172a]">{current.product_name}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Declared Net Quantity (Rule 12):</span>
              <span className="text-slate-800 font-medium">{current.net_quantity || 'Not Declared'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Maximum Retail Price (MRP - Rule 6(1)(e)):</span>
              <span className="text-slate-800 font-medium">{current.mrp || 'Not Declared'}</span>
            </div>
          </div>

          <div className="space-y-2">
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Inspection Location:</span>
              <span className="text-slate-800 font-medium">
                {current.location_name || (current.latitude ? `${current.latitude.toFixed(4)}° N, ${current.longitude?.toFixed(4)}° E` : 'Location Not Recorded')}
              </span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Manufacturer / Packer (Rule 6(1)(a)):</span>
              <span className="text-slate-800 font-medium">{current.manufacturer_name || 'Not Declared'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Country of Origin (Rule 6(10)):</span>
              <span className="text-slate-800 font-medium">{current.country_of_origin || 'Not Declared'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">FSSAI / License Ref:</span>
              <span className="text-slate-800 font-medium">{current.fssai_license || 'Not Detected'}</span>
            </div>
            <div>
              <span className="font-bold text-slate-500 block uppercase text-[10px] font-mono">Barcode / GTIN:</span>
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
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider block opacity-75">
              Statutory Compliance Determination:
            </span>
            <div className="text-lg font-headline font-black tracking-tight mt-0.5">
              {current.overall_status === 'COMPLIANT' ? 'COMPLIANT (PCR 2011 — ALL RULES SATISFIED)' : current.overall_status === 'NON_COMPLIANT' ? 'NON-COMPLIANT (STATUTORY VIOLATIONS DETECTED)' : 'NEEDS MANUAL PHYSICAL VERIFICATION'}
            </div>
          </div>

          <div className="text-right text-xs font-mono font-semibold">
            <div>Passed: {current.passed_count} / {current.compliance_results.length}</div>
            {current.failed_count > 0 && <div className="text-[#dc2626] font-bold">Breaches: {current.failed_count}</div>}
            {current.review_count > 0 && <div className="text-[#d97706] font-bold">Review: {current.review_count}</div>}
          </div>
        </div>

        {/* 8-Point Statutory Declarations Table */}
        <div className="space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0f172a]">
            Mandatory Declarations Evaluation Matrix (Rule 6 & Rule 7)
          </h3>

          <div className="border border-[#cbd5e1] rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f8f9ff] text-[#0f172a] font-mono text-[11px] font-bold border-b border-[#cbd5e1]">
                <tr>
                  <th className="p-3 w-1/4">Declaration & Rule</th>
                  <th className="p-3 w-1/4">Detected Value / Evidence</th>
                  <th className="p-3 w-1/8">Status</th>
                  <th className="p-3 w-3/8">Statutory Reference & Finding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f0]">
                {current.compliance_results.map((item) => (
                  <tr key={item.fieldKey} className="align-top hover:bg-slate-50/50">
                    <td className="p-3 font-semibold text-[#0d1c2e]">
                      <div>{item.fieldLabel}</div>
                      <span className="text-[10px] font-mono text-slate-500 font-normal">
                        {item.ruleNumber}
                      </span>
                    </td>
                    <td className="p-3 text-slate-800">
                      <div className="font-medium font-mono text-xs">{item.detectedValue || <em className="text-red-600 font-sans">Not Detected</em>}</div>
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
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#dc2626] flex items-center gap-1.5">
              <AlertOctagon className="w-4 h-4 text-[#dc2626]" />
              Noticed Deficiencies & Statutory Breaches (Section 36)
            </h3>
            <div className="p-4 rounded-xl border border-red-200 bg-red-50/50 space-y-3 text-xs">
              {current.violations.map((v, idx) => (
                <div key={v.fieldKey} className="space-y-1 pb-2 border-b border-red-100 last:border-none last:pb-0">
                  <div className="font-bold text-red-950 font-mono">
                    {idx + 1}. {v.fieldLabel} ({v.ruleNumber}) — {v.status === 'FAIL' ? 'Omission / Non-Compliance' : 'Verification Required'}
                  </div>
                  <p className="text-slate-700 text-[11px]">{v.reason}</p>
                  <div className="text-[11px] text-slate-800 font-medium">
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
                  <h4 className="font-bold text-red-950 flex items-center gap-1 font-headline">
                    <Scale className="w-3.5 h-3.5" />
                    Estimated Statutory Penalties (Legal Metrology Act, 2009)
                  </h4>
                  <p className="text-red-900 font-mono">
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
        <div className="pt-8 border-t border-[#cbd5e1] grid grid-cols-2 gap-8 text-xs">
          <div>
            <span className="font-mono font-bold text-slate-500 uppercase tracking-wider block mb-1">Field Screening System:</span>
            <p className="text-[#0f172a] font-mono font-bold">RuleVision AI Metrology Engine</p>
            <p className="text-slate-500 text-[11px]">Packaged Commodities Compliance Audit</p>
          </div>

          <div className="text-right space-y-1">
            <span className="font-mono font-bold text-slate-500 uppercase tracking-wider block mb-2">Screening Auditor Reference:</span>
            <p className="text-[#0f172a] font-bold text-sm">{current.inspector_name || 'Not Provided'}</p>
            <p className="text-slate-500 text-[11px] font-mono">{current.inspector_email || 'Not Provided'}</p>
            <div className="border-b border-[#cbd5e1] w-48 ml-auto my-2"></div>
            <p className="text-amber-700 font-mono font-semibold text-[11px]">Preliminary Screening • Digital Stamp: Not Verified</p>
          </div>
        </div>

        {/* Statutory Disclaimer - Mandated by User */}
        <div className="pt-4 border-t border-[#e2e8f0] text-[11px] text-slate-500 leading-relaxed text-center">
          <strong>Official Statutory Disclaimer:</strong> RuleVision is an AI-assisted screening tool. Final legal determination must be made by an authorized Legal Metrology officer based on the applicable law and current rules. This preliminary dossier is issued for statutory audit screening and evidence collection under Legal Metrology (Packaged Commodities) Rules, 2011.
        </div>
      </div>
    </div>
  );
};
