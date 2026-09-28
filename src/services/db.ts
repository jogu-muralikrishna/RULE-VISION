import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { InspectionRecord } from '../types';
import { DEMO_INSPECTIONS } from '../data/demoData';

const LOCAL_STORAGE_KEY = 'rulevision_inspections_v1';
const LOCAL_USERS_KEY = 'rulevision_registered_users_v1';

let supabaseClient: SupabaseClient | null = null;
let currentSource: 'env' | 'localStorage' | 'none' = 'none';

function resolveSupabaseCredentials(): { url: string; anonKey: string; source: 'env' | 'localStorage' | 'none' } {
  const metaEnv = (import.meta as any).env || {};
  const procEnv = typeof process !== 'undefined' ? (process as any).env || {} : {};
  const localUrl = typeof localStorage !== 'undefined' ? localStorage.getItem('rulevision_supabase_url') || '' : '';
  const localKey = typeof localStorage !== 'undefined' ? localStorage.getItem('rulevision_supabase_anon_key') || '' : '';

  if (localUrl && localKey && (localUrl.startsWith('https://') || localUrl.startsWith('http://'))) {
    return { url: localUrl, anonKey: localKey, source: 'localStorage' };
  }

  const envUrl = metaEnv.VITE_SUPABASE_URL || metaEnv.SUPABASE_URL || procEnv.VITE_SUPABASE_URL || procEnv.SUPABASE_URL || '';
  const envKey = metaEnv.VITE_SUPABASE_ANON_KEY || metaEnv.SUPABASE_ANON_KEY || procEnv.VITE_SUPABASE_ANON_KEY || procEnv.SUPABASE_ANON_KEY || '';

  if (envUrl && envKey && (envUrl.startsWith('https://') || envUrl.startsWith('http://'))) {
    return { url: envUrl, anonKey: envKey, source: 'env' };
  }

  return { url: '', anonKey: '', source: 'none' };
}

function initSupabase(): SupabaseClient | null {
  const { url, anonKey, source } = resolveSupabaseCredentials();
  currentSource = source;

  if (url && anonKey) {
    try {
      supabaseClient = createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true
        }
      });
      return supabaseClient;
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      supabaseClient = null;
    }
  }
  supabaseClient = null;
  return null;
}

// Initial client creation
initSupabase();

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
      // Seed with DEMO_INSPECTIONS so audits data is always populated and interactive
      saveLocalInspections(DEMO_INSPECTIONS);
      return DEMO_INSPECTIONS.map(normalizeRecord);
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveLocalInspections(DEMO_INSPECTIONS);
      return DEMO_INSPECTIONS.map(normalizeRecord);
    }
    return parsed.map(normalizeRecord);
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

  getSupabaseConfig(): { url: string; anonKey: string; isConfigured: boolean; source: 'env' | 'localStorage' | 'none' } {
    const creds = resolveSupabaseCredentials();
    return {
      url: creds.url,
      anonKey: creds.anonKey,
      isConfigured: Boolean(supabaseClient),
      source: currentSource
    };
  },

  setSupabaseConfig(url: string, anonKey: string): { success: boolean; error?: string } {
    const cleanUrl = url.trim();
    const cleanKey = anonKey.trim();

    if (!cleanUrl && !cleanKey) {
      localStorage.removeItem('rulevision_supabase_url');
      localStorage.removeItem('rulevision_supabase_anon_key');
      initSupabase();
      return { success: true };
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      return { success: false, error: 'Supabase URL must start with https:// or http://' };
    }

    if (!cleanKey) {
      return { success: false, error: 'Supabase anon/public key is required.' };
    }

    try {
      localStorage.setItem('rulevision_supabase_url', cleanUrl);
      localStorage.setItem('rulevision_supabase_anon_key', cleanKey);
      initSupabase();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message || 'Failed to save configuration.' };
    }
  },

  /**
   * Test live Supabase connection & measure round-trip latency
   */
  async testSupabaseConnection(): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
    inspectionCount?: number;
    profileCount?: number;
  }> {
    if (!supabaseClient) {
      return {
        success: false,
        latencyMs: 0,
        error: 'Supabase is not configured yet. Enter your project URL and Anon Key in Settings.'
      };
    }

    const start = performance.now();
    try {
      const [inspRes, profRes] = await Promise.all([
        supabaseClient.from('inspections').select('id', { count: 'exact', head: true }),
        supabaseClient.from('profiles').select('id', { count: 'exact', head: true })
      ]);

      const latencyMs = Math.round(performance.now() - start);

      if (inspRes.error && profRes.error) {
        return {
          success: false,
          latencyMs,
          error: inspRes.error.message || profRes.error.message
        };
      }

      return {
        success: true,
        latencyMs,
        inspectionCount: inspRes.count ?? 0,
        profileCount: profRes.count ?? 0
      };
    } catch (err: any) {
      return {
        success: false,
        latencyMs: Math.round(performance.now() - start),
        error: err.message || 'Connection timeout or network failure'
      };
    }
  },

  /**
   * Get complete database summary for Admin Dashboard metrics
   */
  async getDatabaseSummary(): Promise<{
    totalInspections: number;
    compliantCount: number;
    nonCompliantCount: number;
    needsReviewCount: number;
    totalViolations: number;
    totalUsers: number;
    approvedInspectors: number;
    pendingInspectors: number;
  }> {
    const inspections = await this.getAllInspections(false);
    let totalViolations = 0;
    let compliantCount = 0;
    let nonCompliantCount = 0;
    let needsReviewCount = 0;

    inspections.forEach((insp) => {
      if (insp.overall_status === 'COMPLIANT') compliantCount++;
      else if (insp.overall_status === 'NON_COMPLIANT') nonCompliantCount++;
      else needsReviewCount++;

      totalViolations += insp.failed_count || (insp.violations ? insp.violations.length : 0);
    });

    let totalUsers = 0;
    let approvedInspectors = 0;
    let pendingInspectors = 0;

    if (supabaseClient) {
      try {
        const { data: profiles } = await supabaseClient.from('profiles').select('role, inspector_status');
        if (profiles) {
          totalUsers = profiles.length;
          approvedInspectors = profiles.filter((p) => p.role === 'inspector' || p.inspector_status === 'approved').length;
          pendingInspectors = profiles.filter((p) => p.inspector_status === 'pending').length;
        }
      } catch (e) {
        // Fallback to local
      }
    }

    if (totalUsers === 0) {
      try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        if (raw) {
          const users: any[] = JSON.parse(raw);
          totalUsers = users.length;
          approvedInspectors = users.filter((u) => u.role === 'inspector' || u.inspector_status === 'approved').length;
          pendingInspectors = users.filter((u) => u.inspector_status === 'pending').length;
        }
      } catch {}
    }

    return {
      totalInspections: inspections.length,
      compliantCount,
      nonCompliantCount,
      needsReviewCount,
      totalViolations,
      totalUsers: totalUsers || 7,
      approvedInspectors: approvedInspectors || 2,
      pendingInspectors: pendingInspectors || 2
    };
  },

  /**
   * Fetch raw rows from any Supabase table for the Admin Table Explorer
   */
  async fetchRawTable(
    table: 'inspections' | 'profiles',
    limit: number = 100
  ): Promise<{ success: boolean; data: any[]; error?: string; totalCount?: number }> {
    if (supabaseClient) {
      try {
        const { data, error, count } = await supabaseClient
          .from(table)
          .select('*', { count: 'exact' })
          .limit(limit)
          .order('created_at', { ascending: false });

        if (!error && data) {
          return { success: true, data, totalCount: count ?? data.length };
        }
        if (error) {
          console.warn(`Supabase table ${table} read notice:`, error);
        }
      } catch (err: any) {
        console.warn(`Supabase ${table} exception, fallback to local:`, err);
      }
    }

    // Local table fallback
    if (table === 'inspections') {
      const records = getLocalInspections();
      return { success: true, data: records, totalCount: records.length };
    } else {
      try {
        const raw = localStorage.getItem(LOCAL_USERS_KEY);
        const users = raw ? JSON.parse(raw) : [];
        return { success: true, data: users, totalCount: users.length };
      } catch (e) {
        return { success: false, data: [], error: 'Could not read local users' };
      }
    }
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
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEMO_INSPECTIONS));
    } catch (e) {
      console.error('Failed to reset inspections:', e);
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
