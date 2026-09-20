import { LegalRuleDefinition } from '../types';

/**
 * Configured statutory rules under the Legal Metrology (Packaged Commodities) Rules, 2011
 * Enacted under the Legal Metrology Act, 2009 (Act No. 1 of 2010).
 * 
 * NOTE: These rules are strictly derived from verified statutory provisions.
 * RuleVision does not invent legal numbers or clauses.
 */
export const DEFAULT_LEGAL_RULES: LegalRuleDefinition[] = [
  {
    id: 'rule-6-1-b-commodity',
    fieldKey: 'commodity_name',
    fieldLabel: 'Generic Commodity Name',
    ruleNumber: 'Rule 6(1)(b)',
    ruleTitle: 'Declaration of Common or Generic Name',
    requirement: 'Every package shall bear the common or generic name of the commodity contained in the package.',
    validationType: 'presence',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(b)',
    description: 'Mandates clear declaration of the generic identity of the goods to avoid misleading consumers about package contents.'
  },
  {
    id: 'rule-6-1-c-net-quantity',
    fieldKey: 'net_quantity',
    fieldLabel: 'Net Quantity',
    ruleNumber: 'Rule 6(1)(c)',
    ruleTitle: 'Declaration of Net Quantity in Standard Metric Units',
    requirement: 'Every package shall bear the net quantity, in terms of the standard unit of weight or measure (g, kg, ml, l, m) or by number (units/N).',
    validationType: 'quantity_unit',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(c) read with Rule 12 & Second Schedule',
    description: 'Quantity must be expressed in SI units (kilogram, gram, litre, millilitre, metre) without non-standard symbols like "gms", "kilos", or non-metric measures.'
  },
  {
    id: 'rule-6-1-e-mrp',
    fieldKey: 'mrp',
    fieldLabel: 'Maximum Retail Price (MRP)',
    ruleNumber: 'Rule 6(1)(e)',
    ruleTitle: 'Declaration of Retail Sale Price (MRP)',
    requirement: 'Every package shall declare the retail sale price in the form "Maximum or Max. Retail Price Rs. / ₹ ... inclusive of all taxes" or "MRP Rs. / ₹ ... (incl. of all taxes)".',
    validationType: 'mrp_format',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(e)',
    description: 'Requires explicit mention of price inclusive of all taxes. Ambiguous or missing tax declarations require verification.'
  },
  {
    id: 'rule-6-1-d-mfg-date',
    fieldKey: 'manufacturing_or_packing_date',
    fieldLabel: 'Manufacturing / Packing Date',
    ruleNumber: 'Rule 6(1)(d)',
    ruleTitle: 'Declaration of Month and Year of Manufacture / Packing',
    requirement: 'The month and year in which the commodity is manufactured or pre-packed or imported shall be clearly indicated.',
    validationType: 'date_format',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(d)',
    description: 'Date declaration must contain at least Month and Year (e.g., "01/2026", "Jan 2026", "Pkd: 01/26").'
  },
  {
    id: 'rule-6-1-da-expiry',
    fieldKey: 'expiry_or_best_before',
    fieldLabel: 'Expiry / Best Before Date',
    ruleNumber: 'Rule 6(1)(da)',
    ruleTitle: 'Declaration of Best Before or Use By Date',
    requirement: 'Best before or use by date, month and year for commodities which may become unfit for human consumption after a period of time.',
    validationType: 'date_format',
    active: true,
    enabled: true,
    isMandatory: false,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(da) & FSSAI Packaging Regulations',
    description: 'Mandatory for food, perishables, and commodities with limited shelf life. In non-food durable commodities, declaration may be discretionary or not applicable.'
  },
  {
    id: 'rule-6-1-f-consumer-care',
    fieldKey: 'consumer_care_contact',
    fieldLabel: 'Consumer Care Contact Details',
    ruleNumber: 'Rule 6(1)(f)',
    ruleTitle: 'Declaration of Consumer Complaint Mechanism',
    requirement: 'The name, address, telephone number, or e-mail address of the person or office that can be contacted in case of consumer complaints.',
    validationType: 'contact_details',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(f)',
    description: 'Requires active channels for consumer grievance redressal (helpline number, email address, or registered consumer cell postal address).'
  },
  {
    id: 'rule-6-1-a-manufacturer-name',
    fieldKey: 'manufacturer_name',
    fieldLabel: 'Manufacturer / Packer Name',
    ruleNumber: 'Rule 6(1)(a)',
    ruleTitle: 'Declaration of Manufacturer or Packer Entity Name',
    requirement: 'Name of the manufacturer, or where manufacturer is not the packer, the name of the manufacturer and packer, or importer for imported packages.',
    validationType: 'presence',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(a)',
    description: 'Legal identity of the packaging or manufacturing entity must be declared.'
  },
  {
    id: 'rule-6-1-a-manufacturer-address',
    fieldKey: 'manufacturer_address',
    fieldLabel: 'Manufacturer / Packer Full Address',
    ruleNumber: 'Rule 6(1)(a)',
    ruleTitle: 'Declaration of Complete Geographic Address',
    requirement: 'Complete address of the manufacturer or packer including street/area, city/town, state, and postal index number (PIN code).',
    validationType: 'address_completeness',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(a)',
    description: 'Vague statements (e.g. "Made in Bangalore") without specific identifiable address or postal details require manual review.'
  },
  {
    id: 'rule-6-1-aa-origin',
    fieldKey: 'country_of_origin',
    fieldLabel: 'Country of Origin',
    ruleNumber: 'Rule 6(1)(aa)',
    ruleTitle: 'Declaration of Country of Origin',
    requirement: 'The name of the country of origin or manufacture or assembly in case of imported products, and mandatory origin disclosures.',
    validationType: 'presence',
    active: true,
    enabled: true,
    isMandatory: true,
    statutoryReference: 'Legal Metrology (Packaged Commodities) Rules, 2011 - Rule 6(1)(aa)',
    description: 'Must explicitly disclose origin country (e.g., "Made in India", "Country of Origin: India", "Product of India").'
  },
  {
    id: 'fssai-license-number',
    fieldKey: 'fssai_license',
    fieldLabel: 'FSSAI License Number',
    ruleNumber: 'FSS Regulations',
    ruleTitle: 'FSSAI License Number Declaration',
    requirement: 'Every food product package shall bear a valid 14-digit FSSAI license number as mandated under the Food Safety and Standards (Packaging and Labelling) Regulations, 2011.',
    validationType: 'fssai_license',
    active: true,
    enabled: true,
    isMandatory: false,
    statutoryReference: 'Food Safety & Standards Act, 2006 - Section 26 read with FSS (Packaging & Labelling) Regulations, 2011 Reg. 2.2.2(5)',
    description: 'Mandatory for all food products. FSSAI license number must be a valid 14-digit number printed on the label. Not applicable for non-food commodities.'
  }
];

export const DEFAULT_PCR_RULES = DEFAULT_LEGAL_RULES;
