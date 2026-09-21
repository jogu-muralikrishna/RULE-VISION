import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { extractPackageDeclarationsFromImage } from './server/ai/visionExtractor';
import { evaluatePackageCompliance } from './src/rules/complianceEngine';
import { DEFAULT_LEGAL_RULES } from './src/rules/defaultRules';
import { InspectionRecord, LegalRuleDefinition } from './src/types';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Essential for receiving high-resolution package images
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Enable CORS for Live Server (port 5500, etc.) and other dev origins
  app.use((req: Request, res: Response, next: any) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-vision-api-key, x-gemini-api-key');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // ----------------------------------------------------
  // API Routes (mounted BEFORE Vite middleware)
  // ----------------------------------------------------

  // 1. System Health & Environment Status
  app.get('/api/status', (req: Request, res: Response) => {
    const hasVisionKey = Boolean(
      (process.env.VISION_API_KEY && process.env.VISION_API_KEY.trim() !== '') ||
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY')
    );
    const hasSupabase = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY);

    res.json({
      status: 'operational',
      app: 'RuleVision',
      team: 'RuleVision',
      version: '1.0.0',
      category: 'Legal Metrology Compliance Auditor',
      visionAi: {
        configured: hasVisionKey,
        model: 'RuleVision Multimodal Neural Engine',
        provider: 'RuleVision Proprietary Vision AI'
      },
      database: {
        configured: hasSupabase,
        type: hasSupabase ? 'Supabase PostgreSQL' : 'Local Audit Storage (Fallback Active)'
      },
      statutoryFramework: 'Legal Metrology (Packaged Commodities) Rules, 2011'
    });
  });

  // 2. Inspect Single Product Image
  app.post('/api/inspect', async (req: Request, res: Response) => {
    try {
      const {
        image,
        mimeType = 'image/jpeg',
        productName = 'Packaged Commodity',
        rawSvg = null,
        isDemo = false,
        latitude = null,
        longitude = null,
        locationName = null,
        customRules = null,
        barcodeNumber = null,
        apiKey: bodyApiKey = null
      } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Missing product image for inspection.' });
      }

      const clientApiKey = (req.headers['x-vision-api-key'] as string) || (req.headers['x-gemini-api-key'] as string) || bodyApiKey || undefined;

      // Step 1: Multimodal Vision AI Extraction
      const extractionResult = await extractPackageDeclarationsFromImage(image, mimeType, {
        productName,
        rawSvg,
        isDemo,
        apiKey: clientApiKey
      });

      if (!extractionResult.success) {
        return res.status(422).json({
          success: false,
          error: extractionResult.error || 'Vision AI failed to analyze label.',
          canFallbackToDemo: true
        });
      }

      const extractedData = extractionResult.data;

      // Step 2: Deterministic Legal Metrology Compliance Engine
      const rulesToUse: LegalRuleDefinition[] = customRules && Array.isArray(customRules) && customRules.length > 0
        ? customRules
        : DEFAULT_LEGAL_RULES;

      const evalResult = evaluatePackageCompliance(extractedData, rulesToUse, {
        packagingGeometry: req.body.packagingGeometry || 'flat',
        multiAngleCount: req.body.multiAngleImages ? req.body.multiAngleImages.length + 1 : 1,
        imageQualityReport: req.body.imageQualityReport
      });

      // Step 3: Build Inspection Record
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const inspectionCode = `PS-${new Date().getFullYear()}-${randomSuffix}`;
      const detectedProduct = extractedData.commodity_name.value
        ? extractedData.commodity_name.value
        : 'Commodity Name Not Identified';

      const record: InspectionRecord = {
        id: `insp_${Date.now()}_${randomSuffix}`,
        inspection_code: inspectionCode,
        product_name: detectedProduct,
        commodity_name: extractedData.commodity_name.value,
        mrp: extractedData.mrp.value,
        net_quantity: extractedData.net_quantity.value,
        manufacturing_or_packing_date: extractedData.manufacturing_or_packing_date.value,
        expiry_or_best_before: extractedData.expiry_or_best_before.value,
        consumer_care_contact: extractedData.consumer_care_contact.value,
        manufacturer_name: extractedData.manufacturer_name.value,
        manufacturer_address: extractedData.manufacturer_address.value,
        country_of_origin: extractedData.country_of_origin.value,
        fssai_license: extractedData.fssai_license.value,
        barcode_number: barcodeNumber,
        overall_status: evalResult.overallStatus,
        passed_count: evalResult.passedCount,
        failed_count: evalResult.failedCount,
        review_count: evalResult.reviewCount,
        not_applicable_count: evalResult.notApplicableCount ?? 0,
        packaging_geometry: req.body.packagingGeometry || 'flat',
        multi_angle_images: req.body.multiAngleImages || undefined,
        extracted_data: extractedData,
        compliance_results: evalResult.complianceResults,
        violations: evalResult.violations,
        image_url: image,
        latitude: latitude ? Number(latitude) : null,
        longitude: longitude ? Number(longitude) : null,
        location_name: locationName || (latitude ? 'Verified Coordinates' : 'Not Provided'),
        created_at: new Date().toISOString(),
        is_demo: false,
        reviewed_by_inspector: false,
        inspector_name: req.body.inspectorName || 'Not Provided',
        inspector_email: req.body.inspectorEmail || 'Not Provided',
        is_deleted: false,
        deleted_at: null
      };

      res.json({
        success: true,
        inspection: record
      });
    } catch (err: any) {
      console.error('API /api/inspect error:', err);
      res.status(500).json({
        success: false,
        error: err.message || 'Internal inspection processing error'
      });
    }
  });

  // 3. Batch Inspection Endpoint
  app.post('/api/batch-inspect', async (req: Request, res: Response) => {
    try {
      const { items } = req.body;
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Provide an array of items for batch inspection.'
        });
      }

      const results = [];
      for (const item of items) {
        try {
          const extraction = await extractPackageDeclarationsFromImage(item.image, item.mimeType || 'image/jpeg', {
            productName: item.productName || undefined,
            isDemo: false
          });
          if (extraction.success) {
            const evalResult = evaluatePackageCompliance(extraction.data, DEFAULT_LEGAL_RULES, {
              packagingGeometry: item.packagingGeometry || 'flat',
              multiAngleCount: 1
            });
            const code = `RV-BATCH-${Math.floor(1000 + Math.random() * 9000)}`;
            results.push({
              id: item.id || `batch_${Date.now()}`,
              status: 'completed',
              inspection: {
                id: `insp_batch_${Date.now()}`,
                inspection_code: code,
                product_name: extraction.data.commodity_name.value || 'Commodity Name Not Identified',
                commodity_name: extraction.data.commodity_name.value,
                mrp: extraction.data.mrp.value,
                net_quantity: extraction.data.net_quantity.value,
                manufacturing_or_packing_date: extraction.data.manufacturing_or_packing_date.value,
                expiry_or_best_before: extraction.data.expiry_or_best_before.value,
                consumer_care_contact: extraction.data.consumer_care_contact.value,
                manufacturer_name: extraction.data.manufacturer_name.value,
                manufacturer_address: extraction.data.manufacturer_address.value,
                country_of_origin: extraction.data.country_of_origin.value,
                fssai_license: extraction.data.fssai_license.value,
                barcode_number: item.barcodeNumber || null,
                overall_status: evalResult.overallStatus,
                passed_count: evalResult.passedCount,
                failed_count: evalResult.failedCount,
                review_count: evalResult.reviewCount,
                extracted_data: extraction.data,
                compliance_results: evalResult.complianceResults,
                violations: evalResult.violations,
                image_url: item.image,
                latitude: null,
                longitude: null,
                location_name: 'Not Provided',
                created_at: new Date().toISOString(),
                is_demo: false,
                is_deleted: false,
                deleted_at: null
              }
            });
          } else {
            results.push({
              id: item.id,
              status: 'failed',
              error: extraction.error || 'Failed to extract label data'
            });
          }
        } catch (itemErr: any) {
          results.push({
            id: item.id,
            status: 'failed',
            error: itemErr.message || 'Batch item processing error'
          });
        }
      }

      res.json({ success: true, results });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || 'Batch inspection failed'
      });
    }
  });

  // 4. API 404 Handler - prevents /api/* from falling through to Vite SPA index.html
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: `API route not found: ${req.method} ${req.originalUrl}`
    });
  });

  // 5. Global Express Error Handler - returns JSON instead of HTML error pages
  app.use((err: any, req: Request, res: Response, next: any) => {
    console.error('Unhandled server error:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(err.status || 500).json({
      success: false,
      error: err.message || 'Internal server error'
    });
  });

  // ----------------------------------------------------
  // Vite Integration (Development vs Production)
  // ----------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RuleVision Auditor server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
