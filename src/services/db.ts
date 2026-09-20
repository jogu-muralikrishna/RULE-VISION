import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InspectionRecord } from '../types';
import { DEMO_INSPECTIONS } from '../data/demoData';

const LOCAL_STORAGE_KEY = 'rulevision_inspections_v1';

let supabaseClient: SupabaseClient | null = null;
const metaEnv = (import.meta as any).env || {};
const supabaseUrl = metaEnv.VITE_SUPABASE_URL || '';
const supabaseAnonKey = metaEnv.VITE_SUPABASE_ANON_KEY || '';

if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://')) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
    supabaseClient = null;
  }
}

/**
 * Initializes local storage with demo records if empty
 */
function normalizeRecord(raw: any): InspectionRecord {
  return {
    ...raw,
    is_deleted: Boolean(raw.is_deleted),
    deleted_at: raw.deleted_at || null
  };
}

function getLocalInspections(): InspectionRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) {
      const initial = DEMO_INSPECTIONS.map(normalizeRecord);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeRecord) : DEMO_INSPECTIONS.map(normalizeRecord);
  } catch (e) {
    console.error('Error reading local inspections:', e);
    return DEMO_INSPECTIONS.map(normalizeRecord);
  }
}

function saveLocalInspections(records: InspectionRecord[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Error saving local inspections:', e);
  }
}

export const dbService = {
  isSupabaseConfigured(): boolean {
    return Boolean(supabaseClient);
  },

  getSupabaseClient(): SupabaseClient | null {
    return supabaseClient;
  },

  async uploadImage(dataUrl: string, filename: string = 'product.jpg'): Promise<string | null> {
    if (!supabaseClient || !dataUrl.startsWith('data:image/')) {
      return null;
    }
    try {
      const match = dataUrl.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
      if (!match) return null;
      const mimeType = match[1];
      const base64Data = match[2];
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });

      const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      const storagePath = `audit_${Date.now()}_${cleanName}`;

      let usedBucket = 'product-images';
      const { data, error } = await supabaseClient.storage
        .from('product-images')
        .upload(storagePath, blob, {
          contentType: mimeType,
          upsert: true
        });

      let storageSuccess = !error && Boolean(data);
      if (!storageSuccess) {
        usedBucket = 'inspection-images';
        const { data: fbData, error: fbErr } = await supabaseClient.storage
          .from('inspection-images')
          .upload(storagePath, blob, {
            contentType: mimeType,
            upsert: true
          });
        storageSuccess = !fbErr && Boolean(fbData);
      }

      if (storageSuccess) {
        const { data: pubUrl } = supabaseClient.storage
          .from(usedBucket)
          .getPublicUrl(storagePath);
        return pubUrl?.publicUrl || null;
      }
    } catch (storageErr) {
      console.warn('Supabase storage upload optional notice:', storageErr);
    }
    return null;
  },

  async getAllInspections(includeDeleted = false): Promise<InspectionRecord[]> {
    if (supabaseClient) {
      try {
        let query = supabaseClient
          .from('inspections')
          .select('*')
          .order('created_at', { ascending: false });

        if (!includeDeleted) {
          query = query.or('is_deleted.is.null,is_deleted.eq.false');
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return data.map(normalizeRecord);
        }
      } catch (err) {
        console.warn('Supabase query failed, falling back to local audit storage:', err);
      }
    }
    const local = getLocalInspections();
    return includeDeleted ? local : local.filter(r => !r.is_deleted);
  },

  async getInspections(): Promise<InspectionRecord[]> {
    return this.getAllInspections(false);
  },

  async getDeletedInspections(): Promise<InspectionRecord[]> {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('inspections')
          .select('*')
          .eq('is_deleted', true)
          .order('deleted_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map(normalizeRecord);
        }
      } catch (err) {
        console.warn('Supabase query for recycle bin failed, using local:', err);
      }
    }
    const local = getLocalInspections();
    return local.filter(r => Boolean(r.is_deleted));
  },

  async resetToDemoData(): Promise<void> {
    try {
      const normalized = DEMO_INSPECTIONS.map(normalizeRecord);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(normalized));
    } catch (e) {
      console.error('Failed to reset demo data:', e);
    }
  },

  async getInspectionById(id: string): Promise<InspectionRecord | null> {
    if (supabaseClient) {
      try {
        const { data, error } = await supabaseClient
          .from('inspections')
          .select('*')
          .eq('id', id)
          .single();

        if (!error && data) {
          return normalizeRecord(data);
        }
      } catch (err) {
        console.warn('Supabase getById failed, checking local storage:', err);
      }
    }
    const local = getLocalInspections();
    const found = local.find(i => i.id === id || i.inspection_code === id);
    return found ? normalizeRecord(found) : null;
  },

  async saveInspection(record: InspectionRecord): Promise<{ success: boolean; id: string; persistedTo: 'supabase' | 'local'; error?: string }> {
    const storedUser = (typeof localStorage !== 'undefined') ? JSON.parse(localStorage.getItem('rulevision_auth_session_v1') || 'null') : null;
    const defaultInspectorName = storedUser?.role === 'inspector' 
      ? (storedUser.email ? `Inspector ${storedUser.email.split('@')[0]}` : 'Authorized Inspector')
      : (storedUser?.email || 'Not Provided');

    const recordToSave: InspectionRecord = {
      ...record,
      inspector_name: record.inspector_name && record.inspector_name !== 'Inspector Rajesh Kumar' ? record.inspector_name : defaultInspectorName,
      inspector_email: record.inspector_email && record.inspector_email !== 'inspector@rulevision.gov.in' ? record.inspector_email : (storedUser?.email || 'Not Provided'),
      user_id: record.user_id || storedUser?.id || null,
      is_deleted: record.is_deleted ?? false,
      deleted_at: record.deleted_at ?? null
    };

    // Attempt upload to Supabase Storage if data url is present
    if (recordToSave.image_url && recordToSave.image_url.startsWith('data:image/')) {
      try {
        const storedUrl = await this.uploadImage(recordToSave.image_url, `${recordToSave.product_name || 'package'}.jpg`);
        if (storedUrl) {
          recordToSave.image_url = storedUrl;
        }
      } catch {
        // Keep original image_url
      }
    }

    // Always persist to local cache for instant UI and resilience
    const local = getLocalInspections();
    const existingIndex = local.findIndex(i => i.id === recordToSave.id);
    if (existingIndex >= 0) {
      local[existingIndex] = recordToSave;
    } else {
      local.unshift(recordToSave);
    }
    saveLocalInspections(local);

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient.from('inspections').upsert({
          id: recordToSave.id,
          inspection_code: recordToSave.inspection_code,
          product_name: recordToSave.product_name,
          commodity_name: recordToSave.commodity_name,
          mrp: recordToSave.mrp,
          net_quantity: recordToSave.net_quantity,
          manufacturing_or_packing_date: recordToSave.manufacturing_or_packing_date,
          expiry_or_best_before: recordToSave.expiry_or_best_before,
          consumer_care_contact: recordToSave.consumer_care_contact,
          manufacturer_name: recordToSave.manufacturer_name,
          manufacturer_address: recordToSave.manufacturer_address,
          country_of_origin: recordToSave.country_of_origin,
          fssai_license: recordToSave.fssai_license || null,
          user_id: recordToSave.user_id || null,
          overall_status: recordToSave.overall_status,
          passed_count: recordToSave.passed_count,
          failed_count: recordToSave.failed_count,
          review_count: recordToSave.review_count,
          extracted_data: recordToSave.extracted_data,
          compliance_results: recordToSave.compliance_results,
          violations: recordToSave.violations,
          image_url: recordToSave.image_url,
          latitude: recordToSave.latitude,
          longitude: recordToSave.longitude,
          location_name: recordToSave.location_name,
          is_demo: recordToSave.is_demo || false,
          reviewed_by_inspector: recordToSave.reviewed_by_inspector || false,
          notes: recordToSave.notes || null,
          created_at: recordToSave.created_at,
          is_deleted: recordToSave.is_deleted || false,
          deleted_at: recordToSave.deleted_at || null
        });

        if (!error) {
          return { success: true, id: recordToSave.id, persistedTo: 'supabase' };
        }
        console.warn('Supabase insert warning:', error);
      } catch (err: any) {
        console.warn('Supabase persistence error, saved locally:', err);
      }
    }

    return { success: true, id: recordToSave.id, persistedTo: 'local' };
  },

  async softDeleteInspection(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const local = getLocalInspections();
    const idx = local.findIndex(i => i.id === id);
    if (idx >= 0) {
      local[idx].is_deleted = true;
      local[idx].deleted_at = now;
      saveLocalInspections(local);
    }

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('inspections')
          .update({ is_deleted: true, deleted_at: now })
          .eq('id', id);
        if (error) {
          console.warn('Supabase soft delete warning:', error);
        }
      } catch (err) {
        console.warn('Supabase soft delete error:', err);
      }
    }
    return true;
  },

  async restoreInspection(id: string): Promise<boolean> {
    const local = getLocalInspections();
    const idx = local.findIndex(i => i.id === id);
    if (idx >= 0) {
      local[idx].is_deleted = false;
      local[idx].deleted_at = null;
      saveLocalInspections(local);
    }

    if (supabaseClient) {
      try {
        const { error } = await supabaseClient
          .from('inspections')
          .update({ is_deleted: false, deleted_at: null })
          .eq('id', id);
        if (error) {
          console.warn('Supabase restore warning:', error);
        }
      } catch (err) {
        console.warn('Supabase restore error:', err);
      }
    }
    return true;
  },

  async permanentlyDeleteInspection(id: string): Promise<{ success: boolean; error?: string }> {
    const local = getLocalInspections();
    const record = local.find(i => i.id === id);
    const updated = local.filter(i => i.id !== id);
    saveLocalInspections(updated);

    if (supabaseClient) {
      try {
        // Attempt deleting associated image from storage if applicable
        if (record?.image_url && record.image_url.includes('inspection-images/')) {
          try {
            const parts = record.image_url.split('inspection-images/');
            if (parts[1]) {
              await supabaseClient.storage.from('inspection-images').remove([parts[1]]);
            }
          } catch {
            // Ignore storage deletion error
          }
        }

        const { error } = await supabaseClient
          .from('inspections')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Supabase permanent delete error:', error);
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        console.error('Supabase permanent delete exception:', err);
        return { success: false, error: err.message || 'Database deletion error' };
      }
    }

    return { success: true };
  },

  async updateInspection(id: string, updates: Partial<InspectionRecord>): Promise<boolean> {
    const local = getLocalInspections();
    const idx = local.findIndex(i => i.id === id);
    if (idx >= 0) {
      local[idx] = { ...local[idx], ...updates };
      saveLocalInspections(local);
    }

    if (supabaseClient) {
      try {
        await supabaseClient.from('inspections').update(updates).eq('id', id);
      } catch (err) {
        console.warn('Supabase update failed:', err);
      }
    }
    return true;
  }
};
