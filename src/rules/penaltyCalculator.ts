import { PenaltyInfo, DeclarationFieldKey, ComplianceStatus } from '../types';

/**
 * Legal Metrology Act, 2009 — Penalty Matrix
 * 
 * Maps violation types to applicable penalty clauses.
 * Section 36: Penalty for non-standard or non-scheduled packages
 * Section 42: General penalty for contravention of rules
 * Section 18: Declarations on pre-packed commodities
 */

interface PenaltyRule {
  section: string;
  offenceType: string;
  firstOffencePenalty: string;
  secondOffencePenalty: string;
  description: string;
  applicableFields: DeclarationFieldKey[];
}

const PENALTY_RULES: PenaltyRule[] = [
  {
    section: 'Section 36',
    offenceType: 'Sale or distribution of non-standard pre-packed commodity',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000',
    description: 'Whoever manufactures, packs, sells, distributes, delivers or offers for sale any pre-packed commodity which does not conform to the declarations required under the rules.',
    applicableFields: ['net_quantity', 'mrp', 'commodity_name']
  },
  {
    section: 'Section 36 read with Rule 6(1)(a)',
    offenceType: 'Failure to declare manufacturer/packer identity',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000',
    description: 'Failure to declare the name and address of the manufacturer or packer on the pre-packed commodity label.',
    applicableFields: ['manufacturer_name', 'manufacturer_address']
  },
  {
    section: 'Section 36 read with Rule 6(1)(d)',
    offenceType: 'Failure to declare date of manufacture/packing',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000',
    description: 'Failure to declare the month and year of manufacture or pre-packing on the commodity label.',
    applicableFields: ['manufacturing_or_packing_date']
  },
  {
    section: 'Section 36 read with Rule 6(1)(da)',
    offenceType: 'Failure to declare best before / expiry date',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000',
    description: 'Failure to declare the best before or use by date for perishable commodities.',
    applicableFields: ['expiry_or_best_before']
  },
  {
    section: 'Section 36 read with Rule 6(1)(f)',
    offenceType: 'Failure to provide consumer grievance contact',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000',
    description: 'Failure to declare contact details (phone/email) for consumer complaint redressal.',
    applicableFields: ['consumer_care_contact']
  },
  {
    section: 'Section 36 read with Rule 6(1)(aa)',
    offenceType: 'Failure to declare Country of Origin',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000',
    description: 'Failure to declare the country of origin, manufacture or assembly on the package.',
    applicableFields: ['country_of_origin']
  },
  {
    section: 'FSSAI Act, 2006 Section 26 read with FSS (Packaging & Labelling) Regulations, 2011',
    offenceType: 'Missing or invalid FSSAI license on food product',
    firstOffencePenalty: '₹5,00,000',
    secondOffencePenalty: '₹5,00,000 + Imprisonment up to 6 months',
    description: 'Manufacture, sale or distribution of food products without a valid FSSAI license number displayed on the package.',
    applicableFields: ['fssai_license']
  },
  {
    section: 'Section 42',
    offenceType: 'General contravention of Packaged Commodities Rules',
    firstOffencePenalty: '₹25,000',
    secondOffencePenalty: '₹50,000 to ₹1,00,000',
    description: 'General penalty for contravention of any provision of the Legal Metrology Act or rules made thereunder.',
    applicableFields: []
  }
];

/**
 * Looks up applicable penalty information for a given field violation.
 * Returns null if the field status is PASS or no penalty applies.
 */
export function getPenaltyForViolation(
  fieldKey: DeclarationFieldKey,
  status: ComplianceStatus
): PenaltyInfo | null {
  if (status === 'PASS') return null;

  // Find the most specific penalty rule for this field
  const specificRule = PENALTY_RULES.find(r =>
    r.applicableFields.includes(fieldKey)
  );

  if (specificRule) {
    return {
      section: specificRule.section,
      offenceType: specificRule.offenceType,
      firstOffencePenalty: specificRule.firstOffencePenalty,
      secondOffencePenalty: specificRule.secondOffencePenalty,
      description: specificRule.description
    };
  }

  // Fall back to general penalty (Section 42) for FAIL status
  if (status === 'FAIL') {
    const generalRule = PENALTY_RULES.find(r => r.section === 'Section 42');
    if (generalRule) {
      return {
        section: generalRule.section,
        offenceType: generalRule.offenceType,
        firstOffencePenalty: generalRule.firstOffencePenalty,
        secondOffencePenalty: generalRule.secondOffencePenalty,
        description: generalRule.description
      };
    }
  }

  return null;
}

/**
 * Calculates total estimated penalties for all violations in an inspection.
 */
export function calculateTotalPenalty(
  violations: { fieldKey: DeclarationFieldKey; status: ComplianceStatus }[]
): { totalMinPenalty: string; totalMaxPenalty: string; violationCount: number } {
  let minTotal = 0;
  let maxTotal = 0;
  let count = 0;

  for (const v of violations) {
    if (v.status === 'FAIL') {
      const penalty = getPenaltyForViolation(v.fieldKey, v.status);
      if (penalty) {
        const minVal = parseInt(penalty.firstOffencePenalty.replace(/[^\d]/g, ''), 10) || 0;
        const maxVal = parseInt(penalty.secondOffencePenalty.replace(/[^\d]/g, ''), 10) || 0;
        minTotal += minVal;
        maxTotal += maxVal;
        count++;
      }
    }
  }

  return {
    totalMinPenalty: `₹${minTotal.toLocaleString('en-IN')}`,
    totalMaxPenalty: `₹${maxTotal.toLocaleString('en-IN')}`,
    violationCount: count
  };
}
