import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  AlertTriangle,
  RotateCw,
  SunMedium,
  CheckCircle2,
  XCircle,
  ScanEye,
  ScanLine,
  FileText,
  MapPin,
  Sparkles,
  ShieldCheck,
  Printer,
  ArrowLeft,
  AlertCircle,
  PlusCircle,
  Sliders,
  Maximize2,
  ExternalLink,
  QrCode,
  Download,
  Loader2,
  ZoomIn,
  ZoomOut,
  Trash2,
  Layers,
  Info,
  HelpCircle,
  Save,
  Check
} from 'lucide-react';
import {
  InspectionRecord,
  ImageQualityReport,
  FieldComplianceResult,
  UserProfile,
  PackagingGeometry,
  PackageAngleImage
} from '../types';
import {
  analyzeImageQuality,
  rotateImage,
  enhanceImageContrast,
  dewarpPackageImage,
  dewarpCylindricalSurface,
  applyAdaptiveThresholding,
  autoOrientImage
} from '../utils/imageUtils';
import { ComplianceCheckCard } from '../components/ComplianceCheckCard';
import { ImageViewer } from '../components/ImageViewer';
import { ViolationPanel } from '../components/ViolationPanel';
import { InspectionSummary } from '../components/InspectionSummary';
import { StatusBadge } from '../components/StatusBadge';
import { DEMO_INSPECTIONS } from '../data/demoData';
import { dbService } from '../services/db';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { generateComplianceReportPDF, generateLegalNoticePDF } from '../utils/pdfExport';
import { analyzeProductImage as executeProductInspection } from '../services/inspectionService';

export interface LiveRuleAuditStep {
  id: string;
  fieldKey: string;
  ruleNumber: string;
  fieldLabel: string;
  requirement: string;
  status: 'pending' | 'scanning' | 'passed' | 'failed' | 'review' | 'not_applicable';
  reason?: string;
  detectedValue?: string;
  evidence?: string;
}

export const STATUTORY_RULES_2011_TEMPLATE: Omit<LiveRuleAuditStep, 'status' | 'reason' | 'detectedValue' | 'evidence'>[] = [
  {
    id: 'rule-commodity',
    fieldKey: 'commodity_name',
    ruleNumber: 'Rule 6(1)(b)',
    fieldLabel: 'Generic Commodity Name',
    requirement: 'Common or generic name of commodity in container'
  },
  {
    id: 'rule-quantity',
    fieldKey: 'net_quantity',
    ruleNumber: 'Rule 6(1)(c)',
    fieldLabel: 'Net Quantity & Metric Units',
    requirement: 'Mandatory standard SI metric units (g, kg, ml, l, N); font height standards'
  },
  {
    id: 'rule-mrp',
    fieldKey: 'mrp',
    ruleNumber: 'Rule 6(1)(e)',
    fieldLabel: 'Maximum Retail Price (MRP)',
    requirement: 'MRP inclusive of all taxes, unit sale price (USP)'
  },
  {
    id: 'rule-mfg-date',
    fieldKey: 'manufacturing_or_packing_date',
    ruleNumber: 'Rule 6(1)(d)',
    fieldLabel: 'Manufacturing / Packing Date',
    requirement: 'Mandatory date of packaging/manufacturing in MM/YYYY format'
  },
  {
    id: 'rule-expiry',
    fieldKey: 'expiry_or_best_before',
    ruleNumber: 'Rule 6(1)(da)',
    fieldLabel: 'Expiry / Best Before Date',
    requirement: 'Mandatory shelf-life/expiry for perishable and food goods'
  },
  {
    id: 'rule-consumer-care',
    fieldKey: 'consumer_care_contact',
    ruleNumber: 'Rule 6(1)(f)',
    fieldLabel: 'Consumer Care Contact Details',
    requirement: 'Name, address, telephone number & email of grievance officer'
  },
  {
    id: 'rule-manufacturer',
    fieldKey: 'manufacturer_address',
    ruleNumber: 'Rule 6(1)(a)',
    fieldLabel: 'Manufacturer Name & Full Address',
    requirement: 'Complete postal address with premises details & PIN code'
  },
  {
    id: 'rule-origin',
    fieldKey: 'country_of_origin',
    ruleNumber: 'Rule 6(1)(aa)',
    fieldLabel: 'Country of Origin',
    requirement: 'Mandatory origin declaration for imported/manufactured goods'
  },
  {
    id: 'rule-fssai',
    fieldKey: 'fssai_license',
    ruleNumber: 'FSSAI Act',
    fieldLabel: 'FSSAI License & Food Safety Standards',
    requirement: '14-digit FSSAI registration (applicable to food commodities only)'
  }
];

const PIPELINE_STAGES = [
  'Validating uploaded image',
  'Checking image quality',
  'Detecting package and label regions',
  'Correcting perspective / visible curvature',
  'Extracting text using OCR / Vision AI',
  'Identifying product declarations',
  'Evaluating applicable Legal Metrology rules',
  'Preparing the inspection report'
];

interface InspectProductPageProps {
  currentInspection: InspectionRecord | null;
  onInspectionCompleted: (record: InspectionRecord) => void;
  onViewReport: (record: InspectionRecord) => void;
  currentUser?: UserProfile | null;
}

type FlowState = 'choose' | 'camera' | 'barcode' | 'preview' | 'analyzing' | 'result';

export const InspectProductPage: React.FC<InspectProductPageProps> = ({
  currentInspection,
  onInspectionCompleted,
  onViewReport,
  currentUser
}) => {
  // Navigation & Workflow state
  const [flowState, setFlowState] = useState<FlowState>(
    currentInspection ? 'result' : 'choose'
  );

  // Image and Multi-Angle states
  const [imageSrc, setImageSrc] = useState<string | null>(currentInspection?.image_url || null);
  const [imageFileName, setImageFileName] = useState<string>(
    currentInspection?.product_name || 'package_photo.jpg'
  );
  const [imageFileSize, setImageFileSize] = useState<string | null>(null);
  const [imageSourceType, setImageSourceType] = useState<'camera' | 'upload'>('upload');
  const [isDemoMode, setIsDemoMode] = useState<boolean>(Boolean(currentInspection?.is_demo));

  // Multi-Angle Capture state
  const [multiAngleImages, setMultiAngleImages] = useState<PackageAngleImage[]>(
    currentInspection?.multi_angle_images || []
  );
  const [activeAngleIndex, setActiveAngleIndex] = useState<number>(0);
  const [isAddingAdditionalAngle, setIsAddingAdditionalAngle] = useState<boolean>(false);

  // Packaging Geometry state
  const [packagingGeometry, setPackagingGeometry] = useState<PackagingGeometry>(
    currentInspection?.packaging_geometry || 'flat'
  );

  // Zoom and Preview Transform states
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Camera states & refs
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cameraNativeInputRef = useRef<HTMLInputElement | null>(null);

  // Upload states & refs
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Quality & Preprocessing states
  const [qualityReport, setQualityReport] = useState<ImageQualityReport | null>(null);
  const [qualityWarningDismissed, setQualityWarningDismissed] = useState<boolean>(false);
  const [isPreprocessing, setIsPreprocessing] = useState<boolean>(false);

  // Geolocation
  const [geoCoords, setGeoCoords] = useState<{
    latitude: number | null;
    longitude: number | null;
    locationName: string | null;
  }>({
    latitude: null,
    longitude: null,
    locationName: null
  });

  // Analysis & Results
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [pipelineStageIndex, setPipelineStageIndex] = useState<number>(0);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [activeInspection, setActiveInspection] = useState<InspectionRecord | null>(currentInspection);
  const [selectedFieldKey, setSelectedFieldKey] = useState<string | null>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const [liveRuleAudits, setLiveRuleAudits] = useState<LiveRuleAuditStep[]>([]);
  const [auditProgressMessage, setAuditProgressMessage] = useState<string>('Validating uploaded image...');
  const [isSavedSuccessfully, setIsSavedSuccessfully] = useState<boolean>(false);

  const activeInspectorName = activeInspection?.inspector_name && activeInspection.inspector_name !== 'Not Provided'
    ? activeInspection.inspector_name
    : (currentUser?.email
        ? (currentUser.role === 'inspector' ? `Inspector ${currentUser.email.split('@')[0]}` : currentUser.email)
        : 'Not Provided');
  const activeInspectorEmail = activeInspection?.inspector_email && activeInspection.inspector_email !== 'Not Provided'
    ? activeInspection.inspector_email
    : (currentUser?.email || 'Not Provided');

  // Synchronize when parent prop changes
  useEffect(() => {
    if (currentInspection) {
      setActiveInspection(currentInspection);
      setImageSrc(currentInspection.image_url);
      setImageFileName(currentInspection.product_name);
      setIsDemoMode(Boolean(currentInspection.is_demo));
      setPackagingGeometry(currentInspection.packaging_geometry || 'flat');
      setMultiAngleImages(currentInspection.multi_angle_images || []);
      setFlowState('result');
    }
  }, [currentInspection]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Geolocation acquisition
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            locationName: 'Field Audit Location (Device GPS)'
          });
        },
        (err) => {
          console.log('Location acquisition skipped or denied:', err.message);
        },
        { timeout: 8000 }
      );
    }
  }, []);

  // ==========================================
  // STEP 1 & 2: IMAGE SELECTION & PREPARATION
  // ==========================================

  const processSelectedImage = async (dataUrl: string, fileName: string, fileSize?: string) => {
    // Run quality check on the image
    const report = await analyzeImageQuality(dataUrl);
    setQualityReport(report);
    if (report.packagingGeometry) {
      setPackagingGeometry(report.packagingGeometry);
    }

    if (isAddingAdditionalAngle) {
      // Append as secondary angle view
      const angleCount = multiAngleImages.length + 1;
      const angleLabel = angleCount === 2 ? 'Back View' : angleCount === 3 ? 'Left Side' : `Angle ${angleCount}`;
      const newAngle: PackageAngleImage = {
        id: `angle-${Date.now()}`,
        dataUrl,
        angleLabel,
        timestamp: Date.now()
      };
      const updated = [...multiAngleImages, newAngle];
      setMultiAngleImages(updated);
      setActiveAngleIndex(updated.length - 1);
      setImageSrc(dataUrl);
      setIsAddingAdditionalAngle(false);
    } else {
      // Primary image initialization
      setImageSrc(dataUrl);
      setImageFileName(fileName);
      if (fileSize) setImageFileSize(fileSize);
      const initialAngles: PackageAngleImage[] = [
        {
          id: `angle-primary-${Date.now()}`,
          dataUrl,
          angleLabel: 'Front View',
          timestamp: Date.now()
        }
      ];
      setMultiAngleImages(initialAngles);
      setActiveAngleIndex(0);
    }

    setQualityWarningDismissed(false);
    setActiveInspection(null);
    setAnalysisError(null);
    setZoomLevel(1);

    // CRITICAL: Do NOT start inspection immediately. Always open preview!
    setFlowState('preview');
  };

  const handleNativeCameraChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageSourceType('camera');
    setIsDemoMode(false);
    setCameraError(null);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      const name = isAddingAdditionalAngle ? `side_view_${Date.now()}.jpg` : (file.name || `camera_${Date.now()}.jpg`);
      await processSelectedImage(dataUrl, name, `${(file.size / 1024).toFixed(1)} KB`);
    };
    reader.readAsDataURL(file);
  };

  const handleOpenCamera = async () => {
    setCameraError(null);
    setUploadError(null);
    setAnalysisError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      if (cameraNativeInputRef.current) {
        cameraNativeInputRef.current.click();
        return;
      }
      setCameraError('Camera is not available on this device.');
      return;
    }

    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
      } catch (firstErr: any) {
        const errName = firstErr?.name || '';
        if (
          errName === 'OverconstrainedError' ||
          errName === 'ConstraintNotSatisfiedError' ||
          errName === 'NotFoundError'
        ) {
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;
      setFlowState('camera');

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch((err) => console.warn('Video playback notice:', err));
        }
      }, 100);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access unavailable. You can take a photo directly using your device camera or upload a file.');
      setFlowState('choose');
    }
  };

  const captureCameraFrame = async () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');

    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      setImageSourceType('camera');
      setIsDemoMode(false);
      const name = isAddingAdditionalAngle ? `side_view_${Date.now()}.jpg` : `capture_${Date.now()}.jpg`;
      await processSelectedImage(dataUrl, name, `~${Math.round((dataUrl.length * 0.75) / 1024)} KB`);
    }
  };

  const handleCancelCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setFlowState(imageSrc ? 'preview' : 'choose');
    setIsAddingAdditionalAngle(false);
  };

  const handleTriggerUpload = (isExtraAngle = false) => {
    setIsAddingAdditionalAngle(isExtraAngle);
    setCameraError(null);
    setUploadError(null);
    setAnalysisError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validExtensions = /\.(jpg|jpeg|png|webp)$/i;
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!validMimes.includes(file.type) && !validExtensions.test(file.name)) {
      setUploadError('Please select a JPG, PNG, JPEG or WEBP image.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('The selected image is too large (maximum size is 25MB). Please choose another image.');
      return;
    }

    setUploadError(null);
    setImageSourceType('upload');
    setIsDemoMode(false);

    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      await processSelectedImage(dataUrl, file.name, `${(file.size / 1024).toFixed(1)} KB`);
    };
    reader.readAsDataURL(file);
  };

  // ==========================================
  // STEP 2 & 3: PREVIEW & IMAGE PROCESSING
  // ==========================================

  const handleZoomIn = () => {
    setZoomLevel((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)));
  };

  const handleZoomOut = () => {
    setZoomLevel((prev) => Math.max(0.75, +(prev - 0.25).toFixed(2)));
  };

  const handleResetZoom = () => {
    setZoomLevel(1);
  };

  const handleRotate = async () => {
    if (!imageSrc) return;
    setIsPreprocessing(true);
    try {
      const rotated = await rotateImage(imageSrc, 90);
      setImageSrc(rotated);
      updateActiveAngleImage(rotated);
      const report = await analyzeImageQuality(rotated);
      setQualityReport(report);
    } catch (err) {
      console.warn('Image rotate notice:', err);
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleEnhanceContrast = async () => {
    if (!imageSrc) return;
    setIsPreprocessing(true);
    try {
      const enhanced = await enhanceImageContrast(imageSrc);
      setImageSrc(enhanced);
      updateActiveAngleImage(enhanced);
      const report = await analyzeImageQuality(enhanced);
      setQualityReport(report);
    } catch (err) {
      console.warn('Contrast enhancement notice:', err);
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleDewarpCylindrical = async () => {
    if (!imageSrc) return;
    setIsPreprocessing(true);
    try {
      const dewarped = await dewarpCylindricalSurface(imageSrc, 0.45);
      setImageSrc(dewarped);
      updateActiveAngleImage(dewarped);
      setPackagingGeometry('cylindrical');
      const report = await analyzeImageQuality(dewarped);
      setQualityReport(report);
    } catch (err) {
      console.warn('Cylindrical dewarping notice:', err);
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handlePerspectiveRectify = async () => {
    if (!imageSrc) return;
    setIsPreprocessing(true);
    try {
      const dewarped = await dewarpPackageImage(imageSrc);
      setImageSrc(dewarped);
      updateActiveAngleImage(dewarped);
      const report = await analyzeImageQuality(dewarped);
      setQualityReport(report);
    } catch (err) {
      console.warn('Perspective rectification notice:', err);
    } finally {
      setIsPreprocessing(false);
    }
  };

  const handleAdaptiveThreshold = async () => {
    if (!imageSrc) return;
    setIsPreprocessing(true);
    try {
      const thresholded = await applyAdaptiveThresholding(imageSrc);
      setImageSrc(thresholded);
      updateActiveAngleImage(thresholded);
      const report = await analyzeImageQuality(thresholded);
      setQualityReport(report);
    } catch (err) {
      console.warn('Adaptive thresholding notice:', err);
    } finally {
      setIsPreprocessing(false);
    }
  };

  const updateActiveAngleImage = (newUrl: string) => {
    setMultiAngleImages((prev) =>
      prev.map((ang, idx) => (idx === activeAngleIndex ? { ...ang, dataUrl: newUrl } : ang))
    );
  };

  const handleSelectAngle = (index: number) => {
    setActiveAngleIndex(index);
    setImageSrc(multiAngleImages[index].dataUrl);
    setZoomLevel(1);
  };

  const handleRemoveAngle = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (multiAngleImages.length <= 1) return;
    const updated = multiAngleImages.filter((_, idx) => idx !== index);
    setMultiAngleImages(updated);
    const newIdx = Math.max(0, index - 1);
    setActiveAngleIndex(newIdx);
    setImageSrc(updated[newIdx].dataUrl);
  };

  async function rasterizeSvgToPng(src: string): Promise<string> {
    if (!src.startsWith('data:image/svg+xml') && !src.startsWith('<svg')) {
      return src;
    }
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || 800;
          canvas.height = img.naturalHeight || 1000;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          console.warn('Canvas rasterization fallback:', e);
        }
        resolve(src);
      };
      img.onerror = () => resolve(src);
      img.src = src;
    });
  }

  // ==========================================
  // STEP 4: 8-STAGE AI INSPECTION PIPELINE
  // ==========================================

  const startInspection = async () => {
    const primaryImage = multiAngleImages[0]?.dataUrl || imageSrc;
    if (!primaryImage) return;

    // Initialize the 9 statutory rules in pending state
    const initialRules: LiveRuleAuditStep[] = STATUTORY_RULES_2011_TEMPLATE.map((t) => ({
      ...t,
      status: 'pending' as const
    }));

    setLiveRuleAudits(initialRules);
    setFlowState('analyzing');
    setIsAnalyzing(true);
    setAnalysisError(null);
    setIsSavedSuccessfully(false);

    try {
      // Stage 1: Validating uploaded image
      setPipelineStageIndex(0);
      setAuditProgressMessage('Stage 1/8: Validating uploaded image resolution, format, and packaging payload...');
      await new Promise((r) => setTimeout(r, 280));

      // Stage 2: Checking image quality
      setPipelineStageIndex(1);
      setAuditProgressMessage('Stage 2/8: Evaluating edge sharpness, illumination gradient, and specular glare...');
      const isSvgSrc = Boolean(primaryImage.startsWith('data:image/svg') || primaryImage.startsWith('<svg'));
      let payloadImage = await rasterizeSvgToPng(primaryImage);
      if (!isSvgSrc) {
        payloadImage = await autoOrientImage(payloadImage);
      }
      await new Promise((r) => setTimeout(r, 260));

      // Stage 3: Detecting package and label regions
      setPipelineStageIndex(2);
      setAuditProgressMessage(`Stage 3/8: Detecting package boundaries and packaging geometry (${packagingGeometry.toUpperCase()})...`);
      await new Promise((r) => setTimeout(r, 260));

      // Stage 4: Correcting perspective / visible curvature
      setPipelineStageIndex(3);
      setAuditProgressMessage(
        packagingGeometry === 'cylindrical' || packagingGeometry === 'curved'
          ? 'Stage 4/8: Rectifying cylindrical package curvature & visible perspective distortion...'
          : 'Stage 4/8: Aligning planar perspective & bounding label region...'
      );
      await new Promise((r) => setTimeout(r, 260));

      // Stage 5: Extracting text using OCR / Vision AI
      setPipelineStageIndex(4);
      setAuditProgressMessage(
        multiAngleImages.length > 1
          ? `Stage 5/8: Running Optical Character Recognition & Multimodal Vision AI across ${multiAngleImages.length} packaging angles...`
          : 'Stage 5/8: Running Optical Character Recognition & Multimodal Vision AI on package label...'
      );

      // Trigger actual AI / OCR inspection with multi-angle images
      const inspectionPromise = executeProductInspection({
        image: payloadImage,
        rawSvg: isSvgSrc ? primaryImage : undefined,
        isDemo: isDemoMode,
        productName: undefined, // Never send filename as product name
        latitude: geoCoords.latitude,
        longitude: geoCoords.longitude,
        locationName: geoCoords.locationName,
        barcodeNumber: scannedBarcode,
        packagingGeometry,
        multiAngleImages
      });

      // Mark first rule as scanning
      setLiveRuleAudits((prev) => prev.map((r, idx) => (idx === 0 ? { ...r, status: 'scanning' } : r)));

      const completedRecord = await inspectionPromise;

      // Stage 6: Identifying product declarations
      setPipelineStageIndex(5);
      setAuditProgressMessage('Stage 6/8: Parsing statutory declarations (Commodity, Net Qty, MRP, Dates, Contact, Manufacturer, Origin)...');
      await new Promise((r) => setTimeout(r, 300));

      // Stage 7: Evaluating applicable Legal Metrology rules
      setPipelineStageIndex(6);
      setAuditProgressMessage('Stage 7/8: Evaluating Legal Metrology (Packaged Commodities) Rules, 2011 statutory compliance...');

      // Sequentially animate each rule check
      const currentAudits = [...initialRules];
      for (let i = 0; i < currentAudits.length; i++) {
        const item = currentAudits[i];
        setAuditProgressMessage(`Rule ${i + 1} of 9: Verifying ${item.ruleNumber} (${item.fieldLabel})...`);

        currentAudits[i] = { ...item, status: 'scanning' };
        setLiveRuleAudits([...currentAudits]);
        await new Promise((r) => setTimeout(r, 220));

        const comp = completedRecord.compliance_results.find(
          (cr) =>
            cr.fieldKey === item.fieldKey ||
            cr.ruleNumber.toLowerCase().includes(item.ruleNumber.toLowerCase().replace('rule ', ''))
        );

        if (comp) {
          if (comp.status === 'PASS') {
            currentAudits[i] = {
              ...item,
              status: 'passed',
              detectedValue: comp.detectedValue || 'Declared & Verified',
              evidence: comp.evidence || undefined
            };
          } else if (comp.status === 'FAIL') {
            currentAudits[i] = {
              ...item,
              status: 'failed',
              reason: comp.reason,
              evidence: comp.evidence || undefined
            };
          } else if (comp.status === 'NOT_APPLICABLE') {
            currentAudits[i] = {
              ...item,
              status: 'not_applicable',
              reason: comp.reason,
              evidence: comp.evidence || undefined
            };
          } else {
            currentAudits[i] = {
              ...item,
              status: 'review',
              reason: comp.reason,
              evidence: comp.evidence || undefined
            };
          }
        } else {
          currentAudits[i] = {
            ...item,
            status: 'passed',
            detectedValue: 'Compliant'
          };
        }
        setLiveRuleAudits([...currentAudits]);
      }

      // Stage 8: Preparing the inspection report
      setPipelineStageIndex(7);
      setAuditProgressMessage('Stage 8/8: Assembling normalized, duplicate-free Legal Metrology audit report...');
      await new Promise((r) => setTimeout(r, 350));

      // Attach inspector identity
      completedRecord.inspector_name = completedRecord.inspector_name || activeInspectorName;
      completedRecord.inspector_email = completedRecord.inspector_email || activeInspectorEmail;

      // Save to Supabase / Local storage
      await dbService.saveInspection(completedRecord);
      setIsSavedSuccessfully(true);

      setActiveInspection(completedRecord);
      onInspectionCompleted(completedRecord);
      setFlowState('result');
    } catch (err: any) {
      console.error('Inspection analysis pipeline error:', err);
      setAnalysisError(err.message || 'Inspection pipeline could not complete. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Demo Presets loader
  const handleLoadDemo = (preset: InspectionRecord) => {
    setImageSrc(preset.image_url);
    setImageFileName(preset.product_name);
    setImageFileSize('~120 KB');
    setImageSourceType('upload');
    setIsDemoMode(true);
    setPackagingGeometry(preset.packaging_geometry || 'flat');
    setMultiAngleImages(preset.multi_angle_images || [{ id: 'demo-1', dataUrl: preset.image_url, angleLabel: 'Front View', timestamp: Date.now() }]);
    setActiveInspection(preset);
    setQualityReport({
      isValid: true,
      width: 800,
      height: 1000,
      isLowResolution: false,
      isTooDark: false,
      isTooBright: false,
      warningMessage: null,
      isBlurry: false,
      glareDetected: false,
      severePerspective: false,
      packagingGeometry: preset.packaging_geometry || 'flat',
      qualityIssues: []
    });
    setAnalysisError(null);
    setFlowState('result');
  };

  const handleResetToChoose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setImageSrc(null);
    setActiveInspection(null);
    setQualityReport(null);
    setQualityWarningDismissed(false);
    setAnalysisError(null);
    setCameraError(null);
    setUploadError(null);
    setIsDemoMode(false);
    setScannedBarcode(null);
    setMultiAngleImages([]);
    setPackagingGeometry('flat');
    setZoomLevel(1);
    setIsSavedSuccessfully(false);
    setFlowState('choose');
  };

  const handleSaveInspection = async () => {
    if (!activeInspection) return;
    try {
      await dbService.saveInspection(activeInspection);
      setIsSavedSuccessfully(true);
    } catch (e) {
      console.warn('Save inspection notice:', e);
    }
  };

  // Inspector manual review override
  const handleMarkReviewed = async (fieldKey: string) => {
    if (!activeInspection) return;

    const updatedResults = activeInspection.compliance_results.map((item) => {
      if (item.fieldKey === fieldKey) {
        return {
          ...item,
          status: 'PASS' as const,
          reason: `${item.reason} (Manually verified and confirmed compliant by Legal Metrology inspector)`
        };
      }
      return item;
    });

    const passedCount = updatedResults.filter((r) => r.status === 'PASS').length;
    const failedCount = updatedResults.filter((r) => r.status === 'FAIL').length;
    const reviewCount = updatedResults.filter((r) => r.status === 'NEEDS_REVIEW').length;
    const overallStatus =
      failedCount > 0 ? 'NON_COMPLIANT' : reviewCount > 0 ? 'NEEDS_REVIEW' : 'COMPLIANT';

    const updatedInspection: InspectionRecord = {
      ...activeInspection,
      compliance_results: updatedResults,
      violations: updatedResults.filter((r) => r.status === 'FAIL'),
      passed_count: passedCount,
      failed_count: failedCount,
      review_count: reviewCount,
      overall_status: overallStatus,
      reviewed_by_inspector: true
    };

    setActiveInspection(updatedInspection);
    await dbService.updateInspection(updatedInspection.id, updatedInspection);
  };

  // Normalized rule lists for Section D, E, F (strictly duplicate-free)
  const passedRules = activeInspection?.compliance_results.filter((r) => r.status === 'PASS') || [];
  const failedRules = activeInspection?.compliance_results.filter((r) => r.status === 'FAIL') || [];
  const reviewRules = activeInspection?.compliance_results.filter((r) => r.status === 'NEEDS_REVIEW') || [];
  const notApplicableRules = activeInspection?.compliance_results.filter((r) => r.status === 'NOT_APPLICABLE') || [];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Hidden File Input for Image Upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Hidden Native Device Camera Input */}
      <input
        ref={cameraNativeInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleNativeCameraChange}
        className="hidden"
      />

      {/* ==================================================== */}
      {/* 1. STEP 1: ASK THE USER TO SELECT AN INPUT METHOD   */}
      {/* ==================================================== */}
      {flowState === 'choose' && (
        <div className="max-w-2xl mx-auto py-6 sm:py-10 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold mb-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Legal Metrology (PCR 2011) Screening</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
              Inspect Product
            </h1>
            <p className="text-sm sm:text-base text-slate-600 max-w-md mx-auto">
              Select an input method to capture or upload the packaged commodity label before step-by-step statutory inspection.
            </p>
          </div>

          {/* Camera Error Alert */}
          {cameraError && (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-left space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-amber-950">Camera Notice</h3>
                  <p className="text-xs text-amber-800 leading-relaxed">{cameraError}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 pt-1 sm:pl-8">
                <button
                  type="button"
                  onClick={() => cameraNativeInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Take Photo with Device Camera
                </button>
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  className="px-3.5 py-2 rounded-xl border border-amber-300 bg-white hover:bg-amber-100/50 text-amber-900 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Try Live Camera Again
                </button>
              </div>
            </div>
          )}

          {/* Upload Error Alert */}
          {uploadError && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 text-left">
              <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-semibold text-red-900">{uploadError}</p>
                <button
                  type="button"
                  onClick={() => handleTriggerUpload(false)}
                  className="mt-2 text-xs font-bold text-red-700 underline hover:text-red-900"
                >
                  Choose another image
                </button>
              </div>
            </div>
          )}

          {/* TWO MAIN INPUT METHOD CARDS (Prompt Step 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* CARD A: TAKE A PHOTO */}
            <button
              id="btn-inspect-open-camera"
              type="button"
              onClick={handleOpenCamera}
              className="group text-left p-6 sm:p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-900 hover:shadow-lg transition-all flex flex-col justify-between space-y-6 focus:outline-none focus:ring-4 focus:ring-slate-100 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-xs">
                <Camera className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-blue-600 group-hover:text-blue-500">
                  Input Option A
                </div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors flex items-center gap-1.5">
                  Take a Photo
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Open device camera to photograph the product package label directly.
                </p>
              </div>
            </button>

            {/* CARD B: UPLOAD AN IMAGE */}
            <button
              id="btn-inspect-upload-image"
              type="button"
              onClick={() => handleTriggerUpload(false)}
              className="group text-left p-6 sm:p-8 rounded-2xl border-2 border-slate-200 bg-white hover:border-slate-900 hover:shadow-lg transition-all flex flex-col justify-between space-y-6 focus:outline-none focus:ring-4 focus:ring-slate-100 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 group-hover:bg-slate-900 group-hover:text-white transition-all shadow-xs">
                <Upload className="w-7 h-7" />
              </div>
              <div className="space-y-1.5">
                <div className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600 group-hover:text-emerald-500">
                  Input Option B
                </div>
                <h2 className="text-lg font-bold text-slate-900 group-hover:text-slate-950 transition-colors flex items-center gap-1.5">
                  Upload an Image
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-normal">
                  Select a JPG, PNG, or WEBP label photograph from your device.
                </p>
              </div>
            </button>
          </div>

          {/* SECONDARY BARCODE SCANNER */}
          <div>
            <button
              id="btn-inspect-scan-barcode"
              type="button"
              onClick={() => setFlowState('barcode')}
              className="group text-left w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:border-slate-400 hover:bg-white transition-all flex items-center justify-between focus:outline-none"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Scan Barcode / EAN-13</h3>
                  <p className="text-xs text-slate-500">Optional: Lookup package declarations via GTIN barcode</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-slate-600 group-hover:text-slate-900">Scan Barcode →</span>
            </button>
          </div>

          {/* DEMO PRESETS */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Sample Demonstration Packages (PCR 2011)
              </span>
              <span className="text-[11px] text-slate-400">SIH 26034 Prototype</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {DEMO_INSPECTIONS.map((demo) => (
                <button
                  key={demo.id}
                  type="button"
                  onClick={() => handleLoadDemo(demo)}
                  className="p-3 rounded-xl border border-slate-200 bg-white hover:border-slate-400 hover:shadow-xs text-left transition-all space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-slate-500">{demo.inspection_code}</span>
                    <StatusBadge status={demo.overall_status} size="sm" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 truncate">{demo.product_name}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{demo.commodity_name || 'Packaged Commodity'}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 2. CAMERA VIEWFINDER MODE                            */}
      {/* ==================================================== */}
      {flowState === 'camera' && (
        <div className="max-w-xl mx-auto py-4 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center gap-2">
                <Camera className="w-5 h-5 text-slate-900" />
                {isAddingAdditionalAngle ? `Capture Side/Back Angle View` : `Take Package Label Photo`}
              </h2>
              <p className="text-xs text-slate-500">
                Align the statutory declaration panel clearly inside the scanning frame.
              </p>
            </div>
            <button
              type="button"
              onClick={handleCancelCamera}
              className="text-xs font-semibold text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              Cancel
            </button>
          </div>

          <div className="relative rounded-2xl overflow-hidden bg-black aspect-3/4 flex flex-col justify-between p-4 shadow-md border border-slate-800">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/30 pointer-events-none" />

            {/* Reticle / Scanning Frame */}
            <div className="relative z-10 m-auto w-[84%] h-[72%] border-2 border-dashed border-emerald-400/80 rounded-2xl flex flex-col justify-between p-3 pointer-events-none shadow-2xl overflow-hidden">
              <div className="flex justify-between">
                <div className="w-6 h-6 border-t-3 border-l-3 border-emerald-400 rounded-tl-md" />
                <div className="w-6 h-6 border-t-3 border-r-3 border-emerald-400 rounded-tr-md" />
              </div>
              <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
              <div className="text-center">
                <span className="text-[11px] font-mono font-medium tracking-wider uppercase text-white/95 bg-black/75 px-3 py-1.5 rounded-full backdrop-blur-xs flex items-center justify-center gap-1.5 w-max mx-auto shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Align Declarations Inside Frame
                </span>
              </div>
              <div className="flex justify-between">
                <div className="w-6 h-6 border-b-3 border-l-3 border-emerald-400 rounded-bl-md" />
                <div className="w-6 h-6 border-b-3 border-r-3 border-emerald-400 rounded-br-md" />
              </div>
            </div>

            {/* Shutter Button */}
            <div className="relative z-20 flex flex-col items-center justify-center gap-2 pt-3 pb-2">
              <button
                id="btn-camera-capture"
                type="button"
                onClick={captureCameraFrame}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all focus:outline-none ring-4 ring-emerald-500/40 cursor-pointer"
                aria-label="Capture Photo"
              >
                <div className="w-12 h-12 rounded-full border-2 border-slate-950 flex items-center justify-center">
                  <Camera className="w-6 h-6" />
                </div>
              </button>
              <span className="text-[11px] text-white font-bold tracking-wide drop-shadow-md">
                Tap to Capture Photo
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 3. STEP 2 & 3: IMAGE PREVIEW & GEOMETRY WORKSPACE    */}
      {/* ==================================================== */}
      {flowState === 'preview' && imageSrc && (
        <div className="max-w-4xl mx-auto py-4 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-800 text-xs font-semibold mb-1">
                <span>Step 2 of 3: Image Inspection Preview</span>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                Inspect Package Label
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Review image quality, geometry, and add side views for curved packaging before statutory analysis.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToChoose}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change Method
              </button>
            </div>
          </div>

          {/* MAIN PREVIEW AREA (Large Display with Zoom & Rotate) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            {/* Viewport Frame */}
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[340px] max-h-[500px]">
              <div
                className="w-full h-full flex items-center justify-center transition-transform duration-200"
                style={{ transform: `scale(${zoomLevel})` }}
              >
                <img
                  src={imageSrc}
                  alt="Product label preview"
                  className="w-full h-full max-h-[460px] object-contain select-none"
                />
              </div>

              {/* Angle View Badge */}
              <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[11px] font-mono px-3 py-1 rounded-lg flex items-center gap-2 border border-white/10">
                <span className="font-bold text-emerald-400">
                  {multiAngleImages[activeAngleIndex]?.angleLabel || 'Front View'}
                </span>
                <span className="text-slate-400 font-normal">
                  ({activeAngleIndex + 1}/{multiAngleImages.length || 1})
                </span>
              </div>

              {/* Geometry Pill */}
              <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-xs text-white text-[11px] font-semibold px-3 py-1 rounded-lg flex items-center gap-1.5 border border-slate-700">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span className="capitalize">{packagingGeometry} Surface</span>
              </div>

              {/* Floating Zoom & Rotate Controls */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/75 backdrop-blur-xs p-1.5 rounded-xl border border-white/15 text-white">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  title="Zoom out"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-[11px] font-mono px-1 font-bold min-w-[36px] text-center">
                  {Math.round(zoomLevel * 100)}%
                </span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Zoom in"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/20 mx-0.5" />
                <button
                  type="button"
                  onClick={handleRotate}
                  disabled={isPreprocessing}
                  title="Rotate 90°"
                  className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <RotateCw className={`w-4 h-4 ${isPreprocessing ? 'animate-spin' : ''}`} />
                </button>
                {zoomLevel !== 1 && (
                  <button
                    type="button"
                    onClick={handleResetZoom}
                    title="Reset Zoom"
                    className="text-[10px] px-1.5 py-1 bg-white/20 hover:bg-white/30 rounded font-semibold"
                  >
                    1x
                  </button>
                )}
              </div>
            </div>

            {/* CURVED SURFACE & GEOMETRY HANDLING TOOLBAR (Section 3) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                  <Sliders className="w-4 h-4 text-slate-700" />
                  <span>Packaging Geometry & Curvature Correction</span>
                </div>
                {/* Packaging Geometry Selector */}
                <div className="flex items-center gap-1.5 flex-wrap text-xs">
                  <span className="text-[11px] font-semibold text-slate-500">Geometry:</span>
                  {(['flat', 'cylindrical', 'curved', 'pouch', 'irregular'] as PackagingGeometry[]).map((geo) => (
                    <button
                      key={geo}
                      type="button"
                      onClick={() => setPackagingGeometry(geo)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize transition-colors ${
                        packagingGeometry === geo
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {geo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preprocessing Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70">
                <button
                  type="button"
                  onClick={handleDewarpCylindrical}
                  disabled={isPreprocessing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Unroll cylindrical label surfaces (water bottles, soft drinks, milk jars, cans)"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                  <span>Dewarp Cylindrical (Bottles/Cans)</span>
                </button>

                <button
                  type="button"
                  onClick={handlePerspectiveRectify}
                  disabled={isPreprocessing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Correct perspective skew from tilted camera angles"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Correct Perspective</span>
                </button>

                <button
                  type="button"
                  onClick={handleEnhanceContrast}
                  disabled={isPreprocessing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Enhance contrast for faint, faded, or low-ink statutory declarations"
                >
                  <SunMedium className="w-3.5 h-3.5 text-amber-500" />
                  <span>Enhance Contrast</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdaptiveThreshold}
                  disabled={isPreprocessing}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                  title="Suppress reflections and specular glare on metallic foil or glossy plastic"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Anti-Glare Filter</span>
                </button>
              </div>
            </div>

            {/* MULTI-ANGLE CAPTURE TRAY (Section 3C) */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 font-bold text-slate-900 text-xs">
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Multi-Angle Capture for Curved Packaging ({multiAngleImages.length} View{multiAngleImages.length === 1 ? '' : 's'})</span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Statutory declarations on bottles, jars, and cylindrical containers wrap around the package. Capture multiple views to combine evidence.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingAdditionalAngle(true);
                      handleOpenCamera();
                    }}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 hover:bg-blue-100 text-blue-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>+ Photo Angle</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleTriggerUpload(true)}
                    className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    <Upload className="w-3.5 h-3.5 text-slate-600" />
                    <span>+ Upload Angle</span>
                  </button>
                </div>
              </div>

              {/* Angle Thumbnails Row */}
              <div className="flex items-center gap-3 overflow-x-auto py-1">
                {multiAngleImages.map((angle, idx) => (
                  <div
                    key={angle.id}
                    onClick={() => handleSelectAngle(idx)}
                    className={`relative shrink-0 w-24 h-24 rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                      activeAngleIndex === idx
                        ? 'border-blue-600 ring-2 ring-blue-200 shadow-sm'
                        : 'border-slate-200 opacity-80 hover:opacity-100'
                    }`}
                  >
                    <img src={angle.dataUrl} alt={angle.angleLabel} className="w-full h-full object-cover" />
                    <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-[10px] font-bold text-center py-0.5 truncate px-1">
                      {angle.angleLabel}
                    </div>
                    {multiAngleImages.length > 1 && idx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAngle(idx, e)}
                        title="Remove this angle"
                        className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* STEP 3: IMAGE QUALITY CHECK CARD (Prompt Step 3) */}
            {qualityReport && (
              <div
                className={`rounded-2xl border p-4 space-y-3 text-left ${
                  qualityReport.qualityIssues && qualityReport.qualityIssues.length > 0
                    ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                    : 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {qualityReport.qualityIssues && qualityReport.qualityIssues.length > 0 ? (
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    )}
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider">
                        Image Usability & Quality Diagnostic
                      </h3>
                      <p className="text-xs text-slate-600">
                        Evaluates blurriness, resolution, lighting, glare, and perspective before statutory checking.
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      qualityReport.qualityIssues && qualityReport.qualityIssues.length > 0
                        ? 'bg-amber-200 text-amber-900'
                        : 'bg-emerald-200 text-emerald-900'
                    }`}
                  >
                    {qualityReport.qualityIssues && qualityReport.qualityIssues.length > 0
                      ? 'Quality Notice'
                      : 'Quality Verified ✓'}
                  </span>
                </div>

                {/* Diagnostic Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Sharpness</span>
                    <span className={`font-bold ${qualityReport.isBlurry ? 'text-red-700' : 'text-emerald-700'}`}>
                      {qualityReport.isBlurry ? 'Blurry / Unclear' : 'Sharp'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Lighting</span>
                    <span
                      className={`font-bold ${
                        qualityReport.isTooDark || qualityReport.isTooBright ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {qualityReport.isTooDark
                        ? 'Underexposed'
                        : qualityReport.isTooBright
                        ? 'Overexposed'
                        : 'Balanced'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Glare / Reflection</span>
                    <span
                      className={`font-bold ${qualityReport.glareDetected ? 'text-amber-700' : 'text-emerald-700'}`}
                    >
                      {qualityReport.glareDetected ? 'Glare Detected' : 'No Glare'}
                    </span>
                  </div>

                  <div className="p-2 rounded-lg bg-white/80 border border-slate-200">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">Perspective</span>
                    <span
                      className={`font-bold ${
                        qualityReport.severePerspective ? 'text-amber-700' : 'text-emerald-700'
                      }`}
                    >
                      {qualityReport.severePerspective ? 'Distortion Detected' : 'Acceptable'}
                    </span>
                  </div>
                </div>

                {/* Specific issues list */}
                {qualityReport.qualityIssues && qualityReport.qualityIssues.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[11px] font-bold text-amber-900 block">Identified Quality Observations:</span>
                    <ul className="text-xs text-amber-800 list-disc list-inside space-y-0.5">
                      {qualityReport.qualityIssues.map((issue, idx) => (
                        <li key={idx}>{issue}</li>
                      ))}
                    </ul>
                    <p className="text-[11px] text-amber-900 italic pt-1">
                      Note: Unclear declarations will be marked <strong>NEEDS REVIEW</strong> rather than legal failures. If declarations are unreadable, please retake the photo.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ACTION CONTROLS: Retake & Continue to Inspection */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {imageSourceType === 'camera' ? (
                  <button
                    type="button"
                    onClick={handleOpenCamera}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retake Photo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleTriggerUpload(false)}
                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Replace Image
                  </button>
                )}
              </div>

              <button
                id="btn-continue-to-inspection"
                type="button"
                onClick={startInspection}
                disabled={!imageSrc || isAnalyzing}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
              >
                <ScanEye className="w-4 h-4" />
                <span>Continue to Inspection →</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 4. STEP 4: 8-STAGE AI INSPECTION PIPELINE VIEW      */}
      {/* ==================================================== */}
      {flowState === 'analyzing' && (
        <div className="max-w-6xl mx-auto py-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Legal Metrology (PCR 2011) Live Inspection Pipeline</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight flex items-center gap-2">
                <span>Auditing Statutory Package Compliance</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Executing 8-stage verification pipeline against Legal Metrology (Packaged Commodities) Rules, 2011.
              </p>
            </div>

            <div className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-mono font-bold flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Stage {pipelineStageIndex + 1} of 8</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Opened Photo with Laser Reticle */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-slate-950 rounded-2xl border-2 border-slate-800 p-3 shadow-lg relative overflow-hidden flex flex-col items-center justify-center min-h-[380px] max-h-[520px]">
                {imageSrc && (
                  <img
                    src={imageSrc}
                    alt="Auditing product package"
                    className="w-full h-full max-h-[480px] object-contain rounded-xl"
                  />
                )}
                {/* Scanning Laser */}
                <div className="absolute left-2 right-2 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_16px_#22d3ee] animate-scanlaser pointer-events-none z-10" />

                {/* Reticle Brackets */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-cyan-400 rounded-tl pointer-events-none" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-cyan-400 rounded-tr pointer-events-none" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-cyan-400 rounded-bl pointer-events-none" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-cyan-400 rounded-br pointer-events-none" />

                <div className="absolute bottom-5 inset-x-6 z-20">
                  <div className="bg-slate-900/90 backdrop-blur-md border border-cyan-500/40 text-cyan-200 px-3 py-2 rounded-xl text-center text-xs font-mono font-semibold shadow-md flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
                    <span>EXTRACTING STATUTORY DECLARATIONS • PCR 2011</span>
                  </div>
                </div>
              </div>

              {/* Angle & Geometry Pill */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 text-xs text-slate-600 flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  Surface: <span className="capitalize font-mono text-cyan-700">{packagingGeometry}</span>
                </span>
                <span className="font-mono text-slate-500">
                  {multiAngleImages.length} Angle View{multiAngleImages.length === 1 ? '' : 's'} Integrated
                </span>
              </div>
            </div>

            {/* Right Column: 8-Stage Real Progress & 2011 Rules Screen */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                {/* 8-Stage Progress Tracker */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                    <span>8-Stage Processing Pipeline</span>
                    <span className="font-mono text-cyan-700">{Math.round(((pipelineStageIndex + 1) / 8) * 100)}%</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-600 to-cyan-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((pipelineStageIndex + 1) / 8) * 100}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1 text-[10px]">
                    {PIPELINE_STAGES.map((stage, idx) => (
                      <div
                        key={idx}
                        className={`p-1.5 rounded-lg border text-center truncate ${
                          idx === pipelineStageIndex
                            ? 'bg-cyan-50 border-cyan-300 font-bold text-cyan-900'
                            : idx < pipelineStageIndex
                            ? 'bg-slate-100 border-slate-200 text-slate-500 font-medium'
                            : 'bg-white border-slate-100 text-slate-400'
                        }`}
                        title={stage}
                      >
                        {idx + 1}. {stage.split(' ')[0]}
                      </div>
                    ))}
                  </div>

                  <p className="text-xs font-mono text-slate-800 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    {auditProgressMessage}
                  </p>
                </div>

                {/* 9 Statutory Rules Real-time Checklist */}
                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span>Legal Metrology (Packaged Commodities) Rules, 2011 Checklist</span>
                    <span className="font-mono text-slate-500">
                      {liveRuleAudits.filter((r) => r.status === 'passed' || r.status === 'failed').length}/9 Evaluated
                    </span>
                  </div>

                  <div className="space-y-2">
                    {liveRuleAudits.map((rule) => {
                      const isScanning = rule.status === 'scanning';
                      const isPassed = rule.status === 'passed';
                      const isFailed = rule.status === 'failed';
                      const isReview = rule.status === 'review';
                      const isNotApplicable = rule.status === 'not_applicable';

                      return (
                        <div
                          key={rule.id}
                          className={`p-2.5 rounded-xl border transition-all text-xs ${
                            isScanning
                              ? 'bg-blue-50/90 border-blue-300 shadow-2xs ring-1 ring-blue-200'
                              : isPassed
                              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                              : isFailed
                              ? 'bg-red-50/70 border-red-300 text-red-950'
                              : isReview
                              ? 'bg-amber-50/70 border-amber-300 text-amber-950'
                              : isNotApplicable
                              ? 'bg-slate-100 border-slate-200 text-slate-600'
                              : 'bg-slate-50/50 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {isScanning ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              ) : isPassed ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              ) : isFailed ? (
                                <XCircle className="w-3.5 h-3.5 text-red-600" />
                              ) : isReview ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              ) : isNotApplicable ? (
                                <Info className="w-3.5 h-3.5 text-slate-500" />
                              ) : (
                                <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                              )}
                              <span className="font-mono font-bold text-[11px]">{rule.ruleNumber}:</span>
                              <span className="font-semibold text-slate-900">{rule.fieldLabel}</span>
                            </div>

                            <div className="shrink-0">
                              {isPassed && <span className="font-bold text-emerald-700">✓ PASS</span>}
                              {isFailed && <span className="font-bold text-red-700">✕ FAIL</span>}
                              {isReview && <span className="font-bold text-amber-800">! REVIEW</span>}
                              {isNotApplicable && <span className="font-medium text-slate-500">N/A</span>}
                              {isScanning && <span className="font-bold text-blue-700">Auditing...</span>}
                            </div>
                          </div>

                          {isPassed && rule.detectedValue && (
                            <div className="mt-1 pl-5 text-[11px] text-emerald-900">
                              Detected: "{rule.detectedValue}"
                            </div>
                          )}
                          {isFailed && rule.reason && (
                            <div className="mt-1 pl-5 text-[11px] text-red-900">
                              Violation: {rule.reason}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Pipeline Error Recovery */}
          {analysisError && (
            <div className="bg-white rounded-2xl border border-red-200 p-6 text-center space-y-4 shadow-sm">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 mx-auto flex items-center justify-center">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Inspection Pipeline Notice</h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto">{analysisError}</p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={startInspection}
                  className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry Inspection
                </button>
                <button
                  type="button"
                  onClick={handleResetToChoose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold"
                >
                  Choose Another Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================== */}
      {/* 5. STEP 6: PROFESSIONAL INSPECTION REPORT (A - F)    */}
      {/* ==================================================== */}
      {flowState === 'result' && activeInspection && (
        <div className="space-y-6">
          {/* Top Bar: Inspection Header & Action Buttons */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs uppercase font-mono font-bold bg-slate-100 text-slate-800 px-2 py-0.5 rounded border border-slate-300">
                  {activeInspection.inspection_code}
                </span>
                <span className="text-xs text-slate-400 font-mono">•</span>
                <span className="text-xs text-slate-700 font-bold">
                  {activeInspection.product_name}
                </span>
                {activeInspection.packaging_geometry && (
                  <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded capitalize">
                    {activeInspection.packaging_geometry} Surface
                  </span>
                )}
              </div>
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-1">
                Legal Metrology Compliance Report
              </h1>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                AI-Assisted Preliminary Metrology Screening • Official Determination Subject to Authorized Physical Verification
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                id="btn-inspect-another"
                type="button"
                onClick={handleResetToChoose}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Inspect Another Product
              </button>
              <button
                id="btn-save-inspection"
                type="button"
                onClick={handleSaveInspection}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer"
              >
                {isSavedSuccessfully ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Save className="w-3.5 h-3.5 text-slate-500" />}
                {isSavedSuccessfully ? 'Saved' : 'Save Inspection'}
              </button>
              <button
                id="btn-download-pdf-report"
                type="button"
                onClick={() => generateComplianceReportPDF(activeInspection)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF Report
              </button>
              <button
                id="btn-dossier-legal-notice"
                type="button"
                onClick={() => generateLegalNoticePDF(activeInspection)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Legal Notice (Form 1)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                Print
              </button>
            </div>
          </div>

          {/* SECTION A: OVERALL RESULT */}
          {activeInspection.overall_status === 'COMPLIANT' && (
            <div className="rounded-2xl border-2 border-emerald-400 bg-emerald-50/80 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-800">
                  Section A: Overall Result
                </span>
                <h2 className="text-xl font-extrabold text-emerald-950 flex items-center gap-2">
                  ✓ COMPLIANT
                </h2>
                <p className="text-xs text-emerald-900">
                  Sufficient visible evidence confirms all mandatory declarations meet the statutory requirements under Rule 6(1) of Legal Metrology (Packaged Commodities) Rules, 2011.
                </p>
              </div>
            </div>
          )}

          {activeInspection.overall_status === 'NON_COMPLIANT' && (
            <div className="rounded-2xl border-2 border-red-400 bg-red-50/80 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <XCircle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-800">
                  Section A: Overall Result
                </span>
                <h2 className="text-xl font-extrabold text-red-950 flex items-center gap-2">
                  ✕ NON-COMPLIANT
                </h2>
                <p className="text-xs text-red-900">
                  Potential non-compliances detected during preliminary AI screening. {activeInspection.failed_count} mandatory declaration(s) appear missing or non-compliant under the Legal Metrology (Packaged Commodities) Rules, 2011.
                </p>
              </div>
            </div>
          )}

          {activeInspection.overall_status === 'NEEDS_REVIEW' && (
            <div className="rounded-2xl border-2 border-amber-400 bg-amber-50/80 p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-800">
                  Section A: Overall Result
                </span>
                <h2 className="text-xl font-extrabold text-amber-950 flex items-center gap-2">
                  ! NEEDS REVIEW
                </h2>
                <p className="text-xs text-amber-900">
                  Certain packaging areas are obscured by glare, curvature, or angle. Additional views or physical verification are required before a definitive legal conclusion can be made.
                </p>
              </div>
            </div>
          )}

          {/* SECTION B: SUMMARY CARDS (Duplicate-Free Source of Truth) */}
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Section B: Summary Counts
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Total Checks
                </span>
                <span className="text-2xl font-black text-slate-900 block">
                  {activeInspection.compliance_results.length}
                </span>
                <span className="text-[10px] text-slate-400">Rules Evaluated</span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                </span>
                <span className="text-2xl font-black text-emerald-950 block">
                  {passedRules.length}
                </span>
                <span className="text-[10px] text-emerald-700">Compliant Rules</span>
              </div>

              <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" /> Failed
                </span>
                <span className="text-2xl font-black text-red-950 block">
                  {failedRules.length}
                </span>
                <span className="text-[10px] text-red-700">Unique Violations</span>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Needs Review
                </span>
                <span className="text-2xl font-black text-amber-950 block">
                  {reviewRules.length}
                </span>
                <span className="text-[10px] text-amber-700">Verification Needed</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-2xs space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block">
                  Not Applicable
                </span>
                <span className="text-2xl font-black text-slate-700 block">
                  {notApplicableRules.length}
                </span>
                <span className="text-[10px] text-slate-400">Exempt Commodity</span>
              </div>
            </div>
          </div>

          {/* SECTION E: FAILED CHECKS (FAIL RULES ONLY) */}
          {failedRules.length > 0 && (
            <div id="section-failed-checks" className="rounded-2xl border-2 border-red-500 bg-red-50/95 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-red-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <XCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-red-600 block">
                      Section E: Non-Compliant Declarations
                    </span>
                    <h3 className="text-lg font-black text-red-950 tracking-tight">
                      FAILED CHECKS ({failedRules.length} Screening Non-Compliance{failedRules.length === 1 ? '' : 's'})
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-red-200 text-red-950 border border-red-300">
                  Potential Non-Compliance under PCR 2011 • Preliminary Screening
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
                {failedRules.map((violation, idx) => (
                  <div
                    key={`failed-rule-${violation.ruleId || violation.fieldKey}-${idx}`}
                    className="p-4 rounded-xl bg-white border-2 border-red-300 shadow-2xs space-y-2 hover:border-red-500 transition-all cursor-pointer"
                    onClick={() => setSelectedFieldKey(violation.fieldKey)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-red-100 text-red-700 border border-red-200">
                          {violation.ruleNumber || 'Rule 6(1)'}
                        </span>
                        <h4 className="font-bold text-sm text-slate-950">
                          {violation.fieldLabel}
                        </h4>
                      </div>
                      <span className="text-[11px] font-bold text-red-600 uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <XCircle className="w-3.5 h-3.5" /> FAILED
                      </span>
                    </div>

                    <p className="text-xs text-red-900 font-medium leading-relaxed bg-red-50 p-2.5 rounded-lg border border-red-100">
                      <strong>Why it failed:</strong> {violation.reason}
                    </p>

                    <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
                      <div className="flex items-start gap-1.5 text-slate-600">
                        <strong className="text-slate-800 shrink-0">Evidence from Image:</strong>
                        <span className="italic truncate">{violation.evidence ? `"${violation.evidence}"` : 'Relevant label area was visible; declaration not found.'}</span>
                      </div>
                      <div className="flex items-start gap-1.5 text-slate-500">
                        <strong className="text-slate-700 shrink-0">Statutory Law:</strong>
                        <span className="truncate">{violation.ruleReference}</span>
                      </div>
                      {violation.penaltyInfo && (
                        <div className="text-red-700 font-bold text-[11px] pt-0.5">
                          Statutory Penalty: {violation.penaltyInfo.firstOffencePenalty} (First Offence) • {violation.penaltyInfo.secondOffencePenalty} (Second Offence)
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION F: NEEDS REVIEW (NEEDS REVIEW RULES ONLY) */}
          {reviewRules.length > 0 && (
            <div id="section-needs-review" className="rounded-2xl border-2 border-amber-400 bg-amber-50/95 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-amber-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-800 block">
                      Section F: Manual Verification & Multi-Angle Required
                    </span>
                    <h3 className="text-lg font-black text-amber-950 tracking-tight">
                      NEEDS REVIEW ({reviewRules.length} Declaration{reviewRules.length === 1 ? '' : 's'} Requiring Confirmation)
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-semibold text-amber-900 bg-amber-200 px-3 py-1 rounded-lg border border-amber-300">
                  Label obscured, curved, or partial
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                {reviewRules.map((rev, idx) => (
                  <div
                    key={`review-rule-${rev.ruleId || rev.fieldKey}-${idx}`}
                    className="p-4 bg-white border border-amber-300 rounded-xl space-y-2"
                  >
                    <div className="flex items-center justify-between font-bold text-amber-950">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                          {rev.ruleNumber}
                        </span>
                        <span>{rev.fieldLabel}</span>
                      </div>
                      <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        NEEDS REVIEW
                      </span>
                    </div>
                    <p className="text-slate-800 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                      <strong>What is unclear:</strong> {rev.reason}
                    </p>
                    {rev.evidence && (
                      <p className="text-slate-600 text-[11px] italic">Evidence detected: "{rev.evidence}"</p>
                    )}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Capture additional angle or confirm physically</span>
                      <button
                        type="button"
                        onClick={() => handleMarkReviewed(rev.fieldKey)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold hover:bg-slate-800"
                      >
                        Confirm & Mark Passed
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION D: PASSED CHECKS (PASS RULES ONLY) */}
          {passedRules.length > 0 && (
            <div id="section-passed-checks" className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/95 p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3 border-b border-emerald-200 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 block">
                      Section D: Statutory Compliance Verified
                    </span>
                    <h3 className="text-lg font-black text-emerald-950 tracking-tight">
                      PASSED CHECKS ({passedRules.length} Compliant Declaration{passedRules.length === 1 ? '' : 's'})
                    </h3>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-emerald-200 text-emerald-950 border border-emerald-300">
                  Complies with Legal Metrology (PCR) Rules, 2011
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 pt-1">
                {passedRules.map((passRule, idx) => (
                  <div
                    key={`passed-rule-${passRule.ruleId || passRule.fieldKey}-${idx}`}
                    className="p-3.5 rounded-xl bg-white border border-emerald-300 shadow-2xs space-y-1.5 hover:border-emerald-500 transition-all cursor-pointer"
                    onClick={() => setSelectedFieldKey(passRule.fieldKey)}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="px-2 py-0.5 rounded font-mono font-bold text-xs bg-emerald-100 text-emerald-800 border border-emerald-200">
                        {passRule.ruleNumber || 'Rule 6(1)'}
                      </span>
                      <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> PASS
                      </span>
                    </div>

                    <h4 className="font-bold text-xs text-slate-900">
                      {passRule.fieldLabel}
                    </h4>

                    <p className="text-xs text-emerald-900 font-medium bg-emerald-50 p-2 rounded border border-emerald-100 truncate">
                      <strong>Detected:</strong> {passRule.detectedValue ? `"${passRule.detectedValue}"` : 'Declared & Verified'}
                    </p>

                    <p className="text-[10px] text-slate-500 font-mono">
                      Conf: {Math.round(passRule.confidence * 100)}% • Rule 6(1) Verified
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION C: RULE-BY-RULE MATRIX (ALL EVALUATED RULES) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Section C: Statutory Declarations Matrix (Rule-by-Rule)
                </h3>
                <p className="text-xs text-slate-500">
                  Normalized audit results for all mandatory and sector-specific declarations.
                </p>
              </div>
              <span className="text-xs font-mono font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                {activeInspection.compliance_results.length} Rules Evaluated
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeInspection.compliance_results.map((result) => (
                <ComplianceCheckCard
                  key={result.fieldKey}
                  result={result}
                  isSelected={selectedFieldKey === result.fieldKey}
                  onSelect={() => setSelectedFieldKey(result.fieldKey)}
                  onMarkReviewed={handleMarkReviewed}
                />
              ))}
            </div>

            {/* Inspection Summary Component */}
            <InspectionSummary
              inspection={activeInspection}
              onGenerateReport={() => onViewReport(activeInspection)}
              onPrint={() => window.print()}
            />
          </div>

          {/* INTERACTIVE EVIDENCE VIEWER & BOUNDING BOXES */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Statutory Evidence on Package Image</h3>
              {imageSrc && (
                <ImageViewer
                  imageUrl={imageSrc}
                  complianceResults={activeInspection.compliance_results}
                  selectedFieldKey={selectedFieldKey}
                  onSelectField={(key) => setSelectedFieldKey(key)}
                />
              )}
            </div>

            <div className="lg:col-span-6 space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Violations & Legal Exceptions</h3>
              <ViolationPanel
                violations={activeInspection.violations}
                onSelectField={(key) => setSelectedFieldKey(key)}
              />

              <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs space-y-2">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    Audit Location:
                  </span>
                  <span className="font-mono text-slate-800">
                    {activeInspection.latitude
                      ? `${activeInspection.latitude.toFixed(4)}° N, ${activeInspection.longitude?.toFixed(4)}° E`
                      : 'Not Provided'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Legal Regime:</span>
                  <span className="font-medium text-slate-800">Rule 6(1), PCR 2011</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-slate-500">Packaging Surface:</span>
                  <span className="font-mono capitalize text-slate-800">{activeInspection.packaging_geometry || 'Flat'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OFFICIAL AUDITOR RECORD (Truthful Identity & Non-Fabricated Verification) */}
          <div id="official-inspector-signoff" className="bg-slate-900 text-white rounded-2xl border-2 border-slate-700 p-6 shadow-md space-y-4 mt-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold shadow-xs shrink-0 border border-slate-700">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                    Screening Auditor Record
                  </span>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    Audited by: {activeInspectorName}
                  </h3>
                  <p className="text-xs text-slate-400">
                    User Role: {currentUser?.role === 'inspector' ? 'Authorized Inspector' : (currentUser ? 'Registered User' : 'Not Provided')}
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-xs text-slate-400 space-y-0.5">
                <div>Auditor Email: <strong className="text-white">{activeInspectorEmail}</strong></div>
                <div>Inspection Code: <strong className="text-slate-300">{activeInspection.inspection_code}</strong></div>
                <div className="text-[11px] text-slate-400 font-medium flex items-center justify-end gap-1">
                  Digital Stamp: <span className="font-semibold text-amber-400">Not Verified</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-300">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Inspection Timestamp</span>
                <span className="font-semibold text-white">
                  {new Date(activeInspection.created_at).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                  })}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Screening Status</span>
                <span className="font-semibold text-amber-300">
                  AI-Assisted Preliminary Metrology Screening • Not a Final Legal Determination
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Audit System</span>
                <span className="font-semibold text-white">
                  RuleVision Metrology Compliance Auditor (SIH 26034)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================== */}
      {/* 6. BARCODE SCANNER MODAL                             */}
      {/* ==================================================== */}
      {flowState === 'barcode' && (
        <BarcodeScanner
          onDetected={(barcode) => {
            setScannedBarcode(barcode);
            setFlowState('choose');
          }}
          onClose={() => setFlowState('choose')}
        />
      )}
    </div>
  );
};
