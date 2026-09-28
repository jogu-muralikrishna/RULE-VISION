import { AdminAuditLog } from '../types';
import { dbService } from './db';

const LOCAL_AUDIT_LOGS_KEY = 'rulevision_audit_logs_v1';

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  {
    id: 'log_init_001',
    action: 'ADMIN_LOGIN',
    admin_id: 'a0000000-0000-0000-0000-000000000001',
    admin_email: 'admin@iare.com',
    target_id: 'a0000000-0000-0000-0000-000000000001',
    target_type: 'auth',
    details: { message: 'Master Administrator authenticated via Supabase Auth' },
    created_at: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'log_init_002',
    action: 'INSPECTOR_APPROVED',
    admin_id: 'a0000000-0000-0000-0000-000000000001',
    admin_email: 'admin@iare.com',
    target_id: 'usr_insp_rajesh_002',
    target_type: 'inspector',
    details: { inspector_id: 'LM-KA-2024-089', full_name: 'Inspector Rajesh Kumar', state: 'Karnataka' },
    created_at: new Date(Date.now() - 3600000 * 24).toISOString()
  },
  {
    id: 'log_init_003',
    action: 'INSPECTOR_APPROVED',
    admin_id: 'a0000000-0000-0000-0000-000000000001',
    admin_email: 'admin@iare.com',
    target_id: 'usr_insp_priya_003',
    target_type: 'inspector',
    details: { inspector_id: 'LM-MH-2023-441', full_name: 'Inspector Priya Sharma', state: 'Maharashtra' },
    created_at: new Date(Date.now() - 3600000 * 48).toISOString()
  }
];

function getStoredLogs(): AdminAuditLog[] {
  try {
    const raw = localStorage.getItem(LOCAL_AUDIT_LOGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local audit logs:', e);
  }
  try {
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(INITIAL_AUDIT_LOGS));
  } catch {}
  return [...INITIAL_AUDIT_LOGS];
}

function saveStoredLogs(logs: AdminAuditLog[]): void {
  try {
    localStorage.setItem(LOCAL_AUDIT_LOGS_KEY, JSON.stringify(logs));
  } catch (e) {
    console.warn('Error saving local audit logs:', e);
  }
}

export const auditLogService = {
  /**
   * Record an administrative action in Supabase admin_audit_logs and local cache
   */
  async logAction(entry: Omit<AdminAuditLog, 'id' | 'created_at'>): Promise<AdminAuditLog> {
    const newLog: AdminAuditLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action: entry.action,
      admin_id: entry.admin_id,
      admin_email: entry.admin_email,
      target_id: entry.target_id,
      target_type: entry.target_type,
      details: entry.details || {},
      created_at: new Date().toISOString()
    };

    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        await supabase.from('admin_audit_logs').insert([
          {
            action: newLog.action,
            admin_id: newLog.admin_id.startsWith('usr_') || newLog.admin_id.startsWith('a000') ? null : newLog.admin_id,
            admin_email: newLog.admin_email,
            target_id: newLog.target_id,
            target_type: newLog.target_type,
            details: newLog.details,
            created_at: newLog.created_at
          }
        ]);
      } catch (err) {
        console.warn('Supabase audit log insert notice:', err);
      }
    }

    const localLogs = getStoredLogs();
    localLogs.unshift(newLog);
    saveStoredLogs(localLogs);

    return newLog;
  },

  /**
   * Fetch audit logs from Supabase or local cache
   */
  async getAuditLogs(limit: number = 100): Promise<AdminAuditLog[]> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('admin_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit);

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            action: d.action,
            admin_id: d.admin_id || 'System Admin',
            admin_email: d.admin_email,
            target_id: d.target_id || '',
            target_type: d.target_type || 'system',
            details: d.details || {},
            created_at: d.created_at
          }));
        }
      } catch (err) {
        console.warn('Supabase getAuditLogs notice:', err);
      }
    }

    return getStoredLogs();
  }
};
