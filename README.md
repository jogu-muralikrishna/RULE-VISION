# RuleVision — AI-Powered Legal Metrology Compliance Auditor

RuleVision is an advanced, production-grade statutory compliance screening platform designed for packaged commodities under India's **Legal Metrology Act, 2009** and the **Legal Metrology (Packaged Commodities) Rules, 2011**.

---

## Key Capabilities

- **Multimodal Vision AI & OCR Extraction**: High-precision recognition of curved, reflective, or cylindrical package labels to extract mandatory declarations under Rule 6(1).
- **Automated Statutory Rule Verification**:
  - Rule 6(1)(a): Manufacturer / Packer Name & Complete Address
  - Rule 6(1)(b): Generic or Common Commodity Name
  - Rule 6(1)(c): Net Quantity in Standard Units of Measurement
  - Rule 6(1)(d): Month & Year of Manufacture / Packing / Import
  - Rule 6(1)(e): Maximum Retail Price (MRP inclusive of all taxes)
  - Rule 6(1)(f): Consumer Care Contact Details (Name, Phone, Email, Address)
  - Rule 6(1)(g): Country of Origin (for imported commodities)
  - FSSAI License: 14-digit statutory food safety license recognition
- **Role-Based Workspaces**:
  - **Citizen / Consumer Workspace**: Immediate access for consumers to quickly scan packaged goods, verify declarations, and review inspection history.
  - **Inspector Enforcement Suite**: Dedicated portal for verified Legal Metrology Officers featuring penalty calculations (Section 36 & 42), court-ready PDF dossier generation, show-cause notices, and batch audits.
  - **Administrator Portal**: Secure dashboard to review, verify, and approve officer credential access requests.
- **Red Noir Design System**: Accessible, high-contrast UI with dark and light mode support.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (version 18 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/jogu-muralikrishna/RULE-VISION.git
   cd RULE-VISION
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables (optional):
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Set your optional `VISION_API_KEY` or Supabase credentials.

4. Start the development server:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## Production Build

To create an optimized production build:
```bash
npm run build
npm start
```

---

## License

All rights reserved • RuleVision Legal Metrology Compliance Screening Platform.
