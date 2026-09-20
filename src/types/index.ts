/**
 * RuleVision Type Definitions
 * AI-Powered Legal Metrology Packaged Commodities Rules Auditor
 */

export type ComplianceStatus = 'PASS' | 'FAIL' | 'NEEDS_REVIEW' | 'NOT_APPLICABLE';
export type OverallComplianceStatus = 'COMPLIANT' | 'NON_COMPLIANT' | 'NEEDS_REVIEW';
export type PackagingGeometry = 'flat' | 'cylindrical' | 'curved' | 'pouch' | 'irregular';

export interface PackageAngleImage {
  id: string;
  angle?: 'front' | 'back' | 'left' | 'right' | 'top_bottom' | 'additional';
  label?: string;
  angleLabel?: string;
  dataUrl: string;
  url?: string;
  fileName?: string;
  timestamp?: number;
  geometry?: PackagingGeometry;
}

export interface BoundingBox {
  ymin: number; // 0 - 1000 normalized
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface ExtractedField {
  value: string | null;
  confidence: number; // 0.0 to 1.0
  evidence: string | null;
  boundingBox?: BoundingBox | null;
}

export interface ExtractedPackageData {
  commodity_name: ExtractedField;
  net_quantity: ExtractedField;
  mrp: ExtractedField;
  manufacturing_or_packing_date: ExtractedField;
  expiry_or_best_before: ExtractedField;
  consumer_care_contact: ExtractedField;
  manufacturer_name: ExtractedField;
  manufacturer_address: ExtractedField;
  country_of_origin: ExtractedField;
  fssai_license: ExtractedField;
}

export type DeclarationFieldKey = keyof ExtractedPackageData;

/**
 * Penalty information for violations under Legal Metrology Act, 2009
 */
export interface PenaltyInfo {
  section: string;         // e.g. "Section 36" or "Section 42"
  offenceType: string;     // e.g. "Non-standard package"
  firstOffencePenalty: string;  // e.g. "₹25,000"
  secondOffencePenalty: string; // e.g. "₹50,000"
  description: string;
}

export interface LegalRuleDefinition {
  id: string;
  fieldKey: DeclarationFieldKey;
  fieldLabel: string;
  ruleNumber: string; // e.g. "Rule 6(1)(e)"
  ruleTitle: string;
  requirement: string;
  validationType: 'presence' | 'mrp_format' | 'quantity_unit' | 'date_format' | 'contact_details' | 'address_completeness' | 'fssai_license';
  active: boolean;
  enabled?: boolean;
  isMandatory?: boolean;
  statutoryReference: string;
  description: string;
}

export type ComplianceRuleConfig = LegalRuleDefinition;
export type StatutoryRuleConfig = LegalRuleDefinition;

export interface FieldComplianceResult {
  ruleId?: string;
  fieldKey: DeclarationFieldKey;
  fieldLabel: string;
  ruleNumber: string;
  status: ComplianceStatus;
  detectedValue: string | null;
  confidence: number;
  evidence: string | null;
  reason: string;
  ruleReference: string;
  recommendedAction: string;
  boundingBox?: BoundingBox | null;
  penaltyInfo?: PenaltyInfo | null;
  isApplicable?: boolean;
}

export interface InspectionRecord {
  id: string;
  inspection_code: string; // e.g. RV-2026-8812
  product_name: string;
  commodity_name: string | null;
  mrp: string | null;
  net_quantity: string | null;
  manufacturing_or_packing_date: string | null;
  expiry_or_best_before: string | null;
  consumer_care_contact: string | null;
  manufacturer_name: string | null;
  manufacturer_address: string | null;
  country_of_origin: string | null;
  fssai_license: string | null;
  barcode_number: string | null;
  overall_status: OverallComplianceStatus;
  passed_count: number;
  failed_count: number;
  review_count: number;
  not_applicable_count?: number;
  packaging_geometry?: PackagingGeometry;
  multi_angle_images?: PackageAngleImage[] | { angle: string; url: string; label: string }[];
  extracted_data: ExtractedPackageData;
  compliance_results: FieldComplianceResult[];
  violations: FieldComplianceResult[];
  image_url: string;
  latitude: number | null;
  longitude: number | null;
  location_name?: string | null;
  created_at: string;
  is_demo?: boolean;
  reviewed_by_inspector?: boolean;
  inspector_name?: string | null;
  inspector_email?: string | null;
  notes?: string | null;
  user_id?: string | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export type UserRole = 'admin' | 'inspector' | 'consumer';
export type InspectorStatus = 'not_requested' | 'pending' | 'approved' | 'rejected';

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  role: UserRole;
  inspector_status?: InspectorStatus;
  inspector_id?: string | null;
  department?: string | null;
  state?: string | null;
  district?: string | null;
  supporting_document_path?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  created_at: string;
  updated_at?: string | null;
}

export interface InspectorAccessRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  inspector_id: string;
  department: string;
  state: string;
  district: string;
  supporting_document_path?: string | null;
  status: InspectorStatus;
  created_at: string;
  verified_by?: string | null;
  verified_at?: string | null;
}

export interface ImageQualityReport {
  isValid: boolean;
  width: number;
  height: number;
  isLowResolution: boolean;
  isTooDark: boolean;
  isTooBright: boolean;
  blurScore?: number;
  isBlurry?: boolean;
  glareDetected?: boolean;
  severePerspective?: boolean;
  packagingGeometry?: PackagingGeometry;
  geometryDescription?: string;
  warningMessage?: string | null;
  qualityIssues?: string[];
}

export interface BatchItem {
  id: string;
  fileName: string;
  fileSize: number;
  dataUrl: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  inspection?: InspectionRecord;
  error?: string;
}
