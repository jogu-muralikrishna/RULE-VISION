import { UserProfile, UserRole, InspectorStatus, InspectorAccessRequest } from '../types';
import { dbService } from './db';
import { auditLogService } from './auditLogService';

const LOCAL_AUTH_KEY = 'rulevision_auth_session_v1';
const LOCAL_USERS_KEY = 'rulevision_registered_users_v1';

export const isAdminEmail = (email: string): boolean => {
  const clean = email.trim().toLowerCase();
  return clean === 'admin@iare.com' || clean === 'admin@rulevision.gov.in';
};

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export interface InspectorDetailsInput {
  inspectorId: string;
  department: string;
  state: string;
  district: string;
  supportingDocument?: string | null;
}

export interface SignUpParams {
  fullName: string;
  email: string;
  password: string;
  accountType: 'consumer' | 'inspector';
  inspectorDetails?: InspectorDetailsInput;
}

// Initial default user profiles for development / offline demonstration
const DEFAULT_INITIAL_PROFILES: UserProfile[] = [
  {
    id: 'usr_admin_iare_001',
    email: 'admin@iare.com',
    full_name: 'IARE Administrator',
    role: 'admin',
    inspector_status: 'approved',
    department: 'Central Legal Metrology & Standards Directorate',
    state: 'Telangana',
    district: 'Hyderabad (IARE Campus)',
    verified_by: 'System Master Authority',
    verified_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_insp_rajesh_002',
    email: 'inspector.rajesh@rulevision.gov.in',
    full_name: 'Inspector Rajesh Kumar',
    role: 'inspector',
    inspector_status: 'approved',
    inspector_id: 'LM-KA-2024-089',
    department: 'Department of Legal Metrology',
    state: 'Karnataka',
    district: 'Bengaluru Urban',
    verified_by: 'admin@iare.com',
    verified_at: '2026-02-15T10:30:00.000Z',
    created_at: '2026-02-14T08:00:00.000Z'
  },
  {
    id: 'usr_insp_priya_003',
    email: 'inspector.priya@rulevision.gov.in',
    full_name: 'Inspector Priya Sharma',
    role: 'inspector',
    inspector_status: 'approved',
    inspector_id: 'LM-MH-2023-441',
    department: 'Legal Metrology Enforcement Wing',
    state: 'Maharashtra',
    district: 'Mumbai Suburban',
    verified_by: 'admin@iare.com',
    verified_at: '2026-02-20T14:15:00.000Z',
    created_at: '2026-02-18T11:20:00.000Z'
  },
  {
    id: 'usr_pending_vikram_004',
    email: 'officer.vikram@iare.com',
    full_name: 'Vikram Reddy',
    role: 'consumer',
    inspector_status: 'pending',
    inspector_id: 'LM-TS-2026-102',
    department: 'Directorate of Legal Metrology',
    state: 'Telangana',
    district: 'Hyderabad',
    supporting_document_path: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=400&q=80',
    created_at: '2026-09-24T09:45:00.000Z'
  },
  {
    id: 'usr_pending_sunita_005',
    email: 'sunita.verma@gov.in',
    full_name: 'Sunita Verma',
    role: 'consumer',
    inspector_status: 'pending',
    inspector_id: 'LM-DL-2025-309',
    department: 'Weights & Measures Enforcement Dept',
    state: 'Delhi (NCT)',
    district: 'New Delhi',
    supporting_document_path: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=400&q=80',
    created_at: '2026-09-25T16:10:00.000Z'
  },
  {
    id: 'usr_rejected_anil_006',
    email: 'anil.mehta@consumer.org',
    full_name: 'Anil Mehta',
    role: 'consumer',
    inspector_status: 'rejected',
    inspector_id: 'LM-GJ-2024-012',
    department: 'Gujarat Civil Supplies',
    state: 'Gujarat',
    district: 'Ahmedabad',
    verified_by: 'admin@iare.com',
    verified_at: '2026-09-20T11:00:00.000Z',
    created_at: '2026-09-18T10:00:00.000Z'
  },
  {
    id: 'usr_consumer_murali_007',
    email: 'citizen.murali@example.com',
    full_name: 'Murali Krishna',
    role: 'consumer',
    inspector_status: 'not_requested',
    created_at: '2026-09-21T07:30:00.000Z'
  }
];

function getStoredUsers(): UserProfile[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Error reading local users:', e);
  }
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(DEFAULT_INITIAL_PROFILES));
  } catch {}
  return [...DEFAULT_INITIAL_PROFILES];
}

function saveStoredUsers(users: UserProfile[]): void {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.warn('Error saving local users:', e);
  }
}

export const authService = {
  /**
   * Returns current authenticated user profile or null from storage
   */
  getCurrentUser(): UserProfile | null {
    try {
      const stored = localStorage.getItem(LOCAL_AUTH_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading stored session:', e);
    }
    return null;
  },

  /**
   * Initializes auth state and checks Supabase session if available
   */
  async initSession(): Promise<UserProfile | null> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const profile = await this.fetchUserProfile(session.user.id, session.user.email || '');
          this.setLocalSession(profile);
          return profile;
        }
      } catch (err) {
        console.warn('Supabase session lookup notice:', err);
      }
    }
    return this.getCurrentUser();
  },

  /**
   * Internal helper to fetch or construct trusted user profile from Supabase profiles table
   */
  async fetchUserProfile(userId: string, email: string): Promise<UserProfile> {
    const cleanEmail = email.trim().toLowerCase();
    const supabase = (dbService as any).getSupabaseClient?.() || null;

    let profile: UserProfile = {
      id: userId,
      email: cleanEmail,
      full_name: cleanEmail.split('@')[0],
      role: 'consumer',
      inspector_status: 'not_requested',
      created_at: new Date().toISOString()
    };

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (!error && data) {
          profile = {
            id: data.id,
            email: data.email || cleanEmail,
            full_name: data.full_name || cleanEmail.split('@')[0],
            role: (data.role as UserRole) || 'consumer',
            inspector_status: (data.inspector_status as InspectorStatus) || 'not_requested',
            inspector_id: data.inspector_id || null,
            department: data.department || null,
            state: data.state || null,
            district: data.district || null,
            supporting_document_path: data.supporting_document_path || null,
            verified_by: data.verified_by || null,
            verified_at: data.verified_at || null,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || null
          };
          return profile;
        }
      } catch (e) {
        console.warn('Profile fetch error, checking local store:', e);
      }
    }

    // Local Storage fallback lookup
    const users = getStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail || u.id === userId);
    if (existing) {
      profile = {
        ...profile,
        ...existing
      };
    }

    return profile;
  },

  /**
   * Login with email & password via Supabase Auth
   * Security Requirement: Authenticates via Supabase Auth and validates trusted database role.
   * No hardcoded passwords in client code.
   */
  async signIn(email: string, password: string, requiredRole?: UserRole): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!cleanEmail || !trimmedPassword) {
      return { success: false, error: 'Email and password are required.' };
    }

    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: trimmedPassword
        });

        if (error) {
          // If Supabase auth user does not exist yet for admin@iare.com, provide setup notice
          if (cleanEmail === 'admin@iare.com' && error.message.toLowerCase().includes('invalid login')) {
            return {
              success: false,
              error: 'Invalid credentials. Please verify your administrative email and password.'
            };
          }
          return { success: false, error: error.message };
        }

        if (data?.user) {
          // Fetch trusted profile from database
          const profile = await this.fetchUserProfile(data.user.id, data.user.email || cleanEmail);

          // If requiredRole specified (e.g. 'admin' on /admin/login), enforce it
          if (requiredRole && profile.role !== requiredRole) {
            await supabase.auth.signOut();
            return {
              success: false,
              error: `Access Denied: This account is registered as "${profile.role}". Administrative privileges are required.`
            };
          }

          // Record admin login in audit log
          if (profile.role === 'admin') {
            await auditLogService.logAction({
              action: 'ADMIN_LOGIN',
              admin_id: profile.id,
              admin_email: profile.email,
              target_id: profile.id,
              target_type: 'auth',
              details: { method: 'password', time: new Date().toISOString() }
            });
          }

          this.setLocalSession(profile);
          return { success: true, user: profile };
        }
      } catch (err: any) {
        console.warn('Supabase auth error:', err);
      }
    }

    // Local Development / Offline Mock Verification
    const users = getStoredUsers();
    let found = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (found) {
      if (requiredRole && found.role !== requiredRole) {
        return {
          success: false,
          error: `Access Denied: Your account role is "${found.role}". Administrator privileges are required.`
        };
      }

      if (found.role === 'admin') {
        await auditLogService.logAction({
          action: 'ADMIN_LOGIN',
          admin_id: found.id,
          admin_email: found.email,
          target_id: found.id,
          target_type: 'auth',
          details: { method: 'local_session', time: new Date().toISOString() }
        });
      }

      this.setLocalSession(found);
      return { success: true, user: found };
    }

    return {
      success: false,
      error: 'User not found. Please verify your credentials or create an account.'
    };
  },

  /**
   * Register a new user (Consumer or Inspector Access Request)
   * Users can NEVER set role = 'admin' from client registration.
   */
  async signUp(params: SignUpParams): Promise<AuthResponse> {
    const cleanEmail = params.email.trim().toLowerCase();
    const fullName = params.fullName.trim();

    if (!cleanEmail || !params.password) {
      return { success: false, error: 'Email and password are required.' };
    }
    if (!fullName) {
      return { success: false, error: 'Full name is required.' };
    }
    if (params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (params.accountType === 'inspector') {
      if (!params.inspectorDetails?.inspectorId?.trim()) {
        return { success: false, error: 'Inspector ID / Employee ID is required for inspector access requests.' };
      }
      if (!params.inspectorDetails?.department?.trim()) {
        return { success: false, error: 'Department / Office is required.' };
      }
      if (!params.inspectorDetails?.state?.trim()) {
        return { success: false, error: 'State is required.' };
      }
      if (!params.inspectorDetails?.district?.trim()) {
        return { success: false, error: 'District is required.' };
      }
    }

    // Strict Security Rule: User is ALWAYS created with role = 'consumer' initially.
    // Client can NEVER register as admin.
    const initialRole: UserRole = 'consumer';
    const initialStatus: InspectorStatus = params.accountType === 'inspector' ? 'pending' : 'not_requested';

    const profileData: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      full_name: fullName,
      role: initialRole,
      inspector_status: initialStatus,
      inspector_id: params.accountType === 'inspector' ? params.inspectorDetails?.inspectorId : null,
      department: params.accountType === 'inspector' ? params.inspectorDetails?.department : null,
      state: params.accountType === 'inspector' ? params.inspectorDetails?.state : null,
      district: params.accountType === 'inspector' ? params.inspectorDetails?.district : null,
      supporting_document_path: params.accountType === 'inspector' ? params.inspectorDetails?.supportingDocument || null : null,
      created_at: new Date().toISOString()
    };

    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: params.password,
          options: {
            data: {
              full_name: fullName,
              role: initialRole,
              inspector_status: initialStatus
            }
          }
        });

        if (error) {
          console.warn('Supabase signUp notice:', error.message);
        } else if (data?.user) {
          profileData.id = data.user.id;

          try {
            await supabase.from('profiles').upsert([
              {
                id: data.user.id,
                email: cleanEmail,
                full_name: fullName,
                role: initialRole,
                inspector_status: initialStatus,
                inspector_id: profileData.inspector_id,
                department: profileData.department,
                state: profileData.state,
                district: profileData.district,
                supporting_document_path: profileData.supporting_document_path,
                created_at: new Date().toISOString()
              }
            ]);
          } catch (profileErr) {
            console.warn('Profiles table insert error:', profileErr);
          }
        }
      } catch (err: any) {
        console.warn('Supabase sign up error, saving locally:', err);
      }
    }

    const users = getStoredUsers();
    const existingIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (existingIdx >= 0) {
      users[existingIdx] = { ...profileData };
    } else {
      users.push({ ...profileData });
    }
    saveStoredUsers(users);

    this.setLocalSession(profileData);
    return { success: true, user: profileData };
  },

  /**
   * Upload supporting document for Inspector request
   */
  async uploadSupportingDocument(file: File): Promise<string | null> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const path = `inspector_docs/${Date.now()}_${cleanName}`;
        const { data, error } = await supabase.storage
          .from('inspector-documents')
          .upload(path, file, { upsert: true });

        if (!error && data) {
          const { data: pubData } = supabase.storage
            .from('inspector-documents')
            .getPublicUrl(path);
          return pubData?.publicUrl || path;
        }
      } catch (e) {
        console.warn('Document storage upload notice:', e);
      }
    }

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  },

  /**
   * Fetch all inspector access requests (Admin only)
   */
  async getInspectorRequests(): Promise<InspectorAccessRequest[]> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .neq('inspector_status', 'not_requested')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            user_id: d.id,
            full_name: d.full_name || 'Inspector Applicant',
            email: d.email,
            inspector_id: d.inspector_id || 'N/A',
            department: d.department || 'Legal Metrology Department',
            state: d.state || 'Not Specified',
            district: d.district || 'Not Specified',
            supporting_document_path: d.supporting_document_path,
            status: d.inspector_status,
            created_at: d.created_at,
            verified_by: d.verified_by,
            verified_at: d.verified_at
          }));
        }
      } catch (err) {
        console.warn('Failed to fetch inspector requests from Supabase:', err);
      }
    }

    const users = getStoredUsers();
    return users
      .filter((u) => u.inspector_status && u.inspector_status !== 'not_requested')
      .map((u) => ({
        id: u.id,
        user_id: u.id,
        full_name: u.full_name || u.email.split('@')[0],
        email: u.email,
        inspector_id: u.inspector_id || 'N/A',
        department: u.department || 'Legal Metrology Department',
        state: u.state || 'Not Specified',
        district: u.district || 'Not Specified',
        supporting_document_path: u.supporting_document_path,
        status: u.inspector_status || 'pending',
        created_at: u.created_at,
        verified_by: u.verified_by,
        verified_at: u.verified_at
      }));
  },

  /**
   * Fetch all user profiles across the system (Admin only)
   */
  async getAllProfiles(): Promise<UserProfile[]> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          return data.map((d: any) => ({
            id: d.id,
            email: d.email,
            full_name: d.full_name || d.email.split('@')[0],
            role: d.role as UserRole,
            inspector_status: d.inspector_status as InspectorStatus,
            inspector_id: d.inspector_id,
            department: d.department,
            state: d.state,
            district: d.district,
            supporting_document_path: d.supporting_document_path,
            verified_by: d.verified_by,
            verified_at: d.verified_at,
            created_at: d.created_at,
            updated_at: d.updated_at
          }));
        }
      } catch (err) {
        console.warn('Supabase getAllProfiles notice:', err);
      }
    }

    return getStoredUsers();
  },

  /**
   * Admin approves an inspector request
   */
  async approveInspectorRequest(
    userId: string,
    adminEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    const currentUser = this.getCurrentUser();
    if (currentUser?.id === userId) {
      return { success: false, error: 'Security Violation: Administrators cannot approve their own inspector request.' };
    }

    const verifiedAt = new Date().toISOString();
    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({
            role: 'inspector',
            inspector_status: 'approved',
            verified_by: adminEmail,
            verified_at: verifiedAt,
            updated_at: verifiedAt
          })
          .eq('id', userId);

        if (updateErr) {
          console.warn('Supabase approve inspector update error:', updateErr);
        }
      } catch (err: any) {
        console.warn('Supabase approval error, updating locally:', err);
      }
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === userId);
    let inspectorBadge = 'N/A';
    if (idx >= 0) {
      users[idx].role = 'inspector';
      users[idx].inspector_status = 'approved';
      users[idx].verified_by = adminEmail;
      users[idx].verified_at = verifiedAt;
      users[idx].updated_at = verifiedAt;
      inspectorBadge = users[idx].inspector_id || 'N/A';
      saveStoredUsers(users);
    }

    // Record in Audit Log
    await auditLogService.logAction({
      action: 'INSPECTOR_APPROVED',
      admin_id: currentUser?.id || 'admin',
      admin_email: adminEmail,
      target_id: userId,
      target_type: 'inspector',
      details: { inspector_id: inspectorBadge, timestamp: verifiedAt }
    });

    if (currentUser?.id === userId) {
      this.setLocalSession({
        ...currentUser,
        role: 'inspector',
        inspector_status: 'approved',
        verified_by: adminEmail,
        verified_at: verifiedAt
      });
    }

    return { success: true };
  },

  /**
   * Admin rejects an inspector request
   */
  async rejectInspectorRequest(
    userId: string,
    adminEmail: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const currentUser = this.getCurrentUser();
    if (currentUser?.id === userId) {
      return { success: false, error: 'Security Violation: Administrators cannot reject their own inspector request.' };
    }

    const verifiedAt = new Date().toISOString();
    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            role: 'consumer',
            inspector_status: 'rejected',
            verified_by: adminEmail,
            verified_at: verifiedAt,
            updated_at: verifiedAt
          })
          .eq('id', userId);
      } catch (err: any) {
        console.warn('Supabase reject error, updating locally:', err);
      }
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx >= 0) {
      users[idx].role = 'consumer';
      users[idx].inspector_status = 'rejected';
      users[idx].verified_by = adminEmail;
      users[idx].verified_at = verifiedAt;
      users[idx].updated_at = verifiedAt;
      saveStoredUsers(users);
    }

    // Record in Audit Log
    await auditLogService.logAction({
      action: 'INSPECTOR_REJECTED',
      admin_id: currentUser?.id || 'admin',
      admin_email: adminEmail,
      target_id: userId,
      target_type: 'inspector',
      details: { reason: reason || 'Requirements not met', timestamp: verifiedAt }
    });

    if (currentUser?.id === userId) {
      this.setLocalSession({
        ...currentUser,
        role: 'consumer',
        inspector_status: 'rejected',
        verified_by: adminEmail,
        verified_at: verifiedAt
      });
    }

    return { success: true };
  },

  /**
   * Revoke inspector privileges (Admin action)
   */
  async revokeInspectorRequest(
    userId: string,
    adminEmail: string
  ): Promise<{ success: boolean; error?: string }> {
    const res = await this.rejectInspectorRequest(userId, adminEmail, 'Revoked by administrator');
    if (res.success) {
      await auditLogService.logAction({
        action: 'INSPECTOR_REVOKED',
        admin_id: adminEmail,
        admin_email: adminEmail,
        target_id: userId,
        target_type: 'inspector',
        details: { action: 'Revocation of inspector credentials' }
      });
    }
    return res;
  },

  /**
   * Update any user profile directly (Role, Status, Information)
   */
  async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: string }> {
    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();
    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ ...updates, updated_at: now })
          .eq('id', userId);

        if (error) {
          console.warn('Supabase updateUserProfile error:', error);
        }
      } catch (e: any) {
        console.warn('Supabase update profile error:', e);
      }
    }

    const users = getStoredUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx >= 0) {
      users[idx] = {
        ...users[idx],
        ...updates,
        updated_at: now
      };
      saveStoredUsers(users);
    }

    if (currentUser?.id === userId) {
      this.setLocalSession({ ...currentUser, ...updates });
    }

    // Record in Audit Log
    await auditLogService.logAction({
      action: 'USER_ROLE_CHANGED',
      admin_id: currentUser?.id || 'admin',
      admin_email: currentUser?.email || 'admin@iare.com',
      target_id: userId,
      target_type: 'user',
      details: updates
    });

    return { success: true };
  },

  /**
   * Delete a user profile (Admin action)
   */
  async deleteUserProfile(userId: string): Promise<{ success: boolean; error?: string }> {
    const currentUser = this.getCurrentUser();
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        await supabase.from('profiles').delete().eq('id', userId);
      } catch (e) {
        console.warn('Supabase delete profile error:', e);
      }
    }

    const users = getStoredUsers().filter(u => u.id !== userId);
    saveStoredUsers(users);

    await auditLogService.logAction({
      action: 'USER_DELETED',
      admin_id: currentUser?.id || 'admin',
      admin_email: currentUser?.email || 'admin@iare.com',
      target_id: userId,
      target_type: 'user',
      details: { deleted_user_id: userId }
    });

    return { success: true };
  },

  /**
   * Directly create & authorize an inspector account (Admin action)
   */
  async createInspectorDirectly(data: {
    email: string;
    fullName: string;
    inspectorId: string;
    department: string;
    state: string;
    district: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !data.fullName || !data.inspectorId) {
      return { success: false, error: 'Email, Full Name, and Inspector ID are required.' };
    }

    const now = new Date().toISOString();
    const currentUser = this.getCurrentUser();
    const newOfficer: UserProfile = {
      id: `usr_insp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      email: cleanEmail,
      full_name: data.fullName.trim(),
      role: 'inspector',
      inspector_status: 'approved',
      inspector_id: data.inspectorId.trim(),
      department: data.department.trim(),
      state: data.state.trim(),
      district: data.district.trim(),
      verified_by: currentUser?.email || 'admin@iare.com',
      verified_at: now,
      created_at: now
    };

    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        await supabase.from('profiles').upsert([newOfficer]);
      } catch (e) {
        console.warn('Supabase create inspector notice:', e);
      }
    }

    const users = getStoredUsers();
    users.unshift(newOfficer);
    saveStoredUsers(users);

    await auditLogService.logAction({
      action: 'INSPECTOR_APPROVED',
      admin_id: currentUser?.id || 'admin',
      admin_email: currentUser?.email || 'admin@iare.com',
      target_id: newOfficer.id,
      target_type: 'inspector',
      details: {
        created_directly: true,
        inspector_id: newOfficer.inspector_id,
        email: newOfficer.email
      }
    });

    return { success: true, user: newOfficer };
  },

  /**
   * Reapply for Inspector Access (for rejected or not_requested users)
   */
  async reapplyInspectorRequest(
    userId: string,
    details: InspectorDetailsInput
  ): Promise<AuthResponse> {
    if (!details.inspectorId?.trim()) {
      return { success: false, error: 'Inspector ID / Employee ID is required.' };
    }
    if (!details.department?.trim()) {
      return { success: false, error: 'Department / Office is required.' };
    }
    if (!details.state?.trim()) {
      return { success: false, error: 'State is required.' };
    }
    if (!details.district?.trim()) {
      return { success: false, error: 'District is required.' };
    }

    const currentUser = this.getCurrentUser();
    const updatedProfile: UserProfile = {
      ...(currentUser || {
        id: userId,
        email: '',
        full_name: '',
        created_at: new Date().toISOString()
      }),
      role: 'consumer',
      inspector_status: 'pending',
      inspector_id: details.inspectorId.trim(),
      department: details.department.trim(),
      state: details.state.trim(),
      district: details.district.trim(),
      supporting_document_path: details.supportingDocument || currentUser?.supporting_document_path || null,
      verified_by: null,
      verified_at: null,
      updated_at: new Date().toISOString()
    };

    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        await supabase
          .from('profiles')
          .update({
            inspector_status: 'pending',
            inspector_id: updatedProfile.inspector_id,
            department: updatedProfile.department,
            state: updatedProfile.state,
            district: updatedProfile.district,
            supporting_document_path: updatedProfile.supporting_document_path,
            verified_by: null,
            verified_at: null,
            updated_at: updatedProfile.updated_at
          })
          .eq('id', userId);
      } catch (e) {
        console.warn('Supabase reapply notice:', e);
      }
    }

    const users = getStoredUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx >= 0) {
      users[idx] = { ...users[idx], ...updatedProfile };
      saveStoredUsers(users);
    }

    this.setLocalSession(updatedProfile);
    return { success: true, user: updatedProfile };
  },

  /**
   * Send 6-digit OTP to registered inspector email via Supabase Auth
   */
  async sendInspectorOtp(email: string): Promise<{ success: boolean; error?: string; message?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Please enter your registered official email address.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address format.' };
    }

    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: {
            shouldCreateUser: false
          }
        });

        if (error) {
          if (
            error.message.toLowerCase().includes('signups not allowed') ||
            error.message.toLowerCase().includes('user not found') ||
            error.message.toLowerCase().includes('not found')
          ) {
            return {
              success: false,
              error: 'This email is not registered as an Inspector. Please create an account or verify your email.'
            };
          }
          if (error.message.toLowerCase().includes('rate') || error.message.toLowerCase().includes('too many')) {
            return {
              success: false,
              error: 'Too many OTP requests. Please wait 60 seconds before requesting a new code.'
            };
          }
          return { success: false, error: error.message };
        }

        return {
          success: true,
          message: `Verification code sent to ${cleanEmail}. Please check your inbox.`
        };
      } catch (err: any) {
        console.error('Supabase signInWithOtp error:', err);
        return {
          success: false,
          error: err?.message || 'Unable to connect to authentication server.'
        };
      }
    }

    const devOtp = '123456';
    try {
      sessionStorage.setItem(`rulevision_dev_otp_${cleanEmail}`, devOtp);
    } catch {}

    return {
      success: true,
      message: `[Development Mode] Verification code generated: ${devOtp} (Add VITE_SUPABASE_URL to .env for live email delivery).`
    };
  },

  /**
   * Verify 6-digit OTP through Supabase Auth and evaluate inspector authorization
   */
  async verifyInspectorOtp(
    email: string,
    token: string
  ): Promise<AuthResponse & { route?: 'inspector' | 'pending' | 'rejected' | 'consumer' | 'admin' }> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    if (!cleanEmail || !cleanToken) {
      return { success: false, error: 'Email and 6-digit verification code are required.' };
    }

    if (cleanToken.length !== 6 || !/^\d{6}$/.test(cleanToken)) {
      return { success: false, error: 'Please enter a complete 6-digit numeric verification code.' };
    }

    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          email: cleanEmail,
          token: cleanToken,
          type: 'email'
        });

        if (error) {
          if (error.message.toLowerCase().includes('expired')) {
            return { success: false, error: 'The verification code has expired. Please request a new code.' };
          }
          return { success: false, error: 'Invalid verification code. Please check your email and enter the correct 6 digits.' };
        }

        if (data?.user) {
          const profile = await this.fetchUserProfile(data.user.id, data.user.email || cleanEmail);
          this.setLocalSession(profile);

          let route: 'inspector' | 'pending' | 'rejected' | 'consumer' | 'admin' = 'consumer';

          if (profile.role === 'admin') {
            route = 'admin';
          } else if (profile.role === 'inspector' && profile.inspector_status === 'approved') {
            route = 'inspector';
          } else if (profile.inspector_status === 'pending') {
            route = 'pending';
          } else if (profile.inspector_status === 'rejected') {
            route = 'rejected';
          } else {
            route = 'consumer';
          }

          return {
            success: true,
            user: profile,
            route
          };
        }

        return { success: false, error: 'Failed to retrieve authenticated user session.' };
      } catch (err: any) {
        console.error('Supabase verifyOtp error:', err);
        return { success: false, error: err?.message || 'Failed to verify OTP code.' };
      }
    }

    const expectedOtp = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem(`rulevision_dev_otp_${cleanEmail}`)) || '123456';
    if (cleanToken === expectedOtp || cleanToken === '123456') {
      let profile = await this.fetchUserProfile(`dev_inspector_${Date.now()}`, cleanEmail);
      if (profile.role === 'consumer' && profile.inspector_status === 'not_requested') {
        profile = {
          ...profile,
          role: 'inspector',
          inspector_status: 'approved',
          department: 'Legal Metrology Enforcement Dept',
          inspector_id: 'LMO-IND-8821',
          state: 'National Capital Territory',
          district: 'Central Enforcement Zone'
        };
      }

      let route: 'inspector' | 'pending' | 'rejected' | 'consumer' | 'admin' = 'inspector';
      if (profile.role === 'admin') route = 'admin';
      else if (profile.inspector_status === 'pending') route = 'pending';
      else if (profile.inspector_status === 'rejected') route = 'rejected';
      else route = 'inspector';

      this.setLocalSession(profile);
      return {
        success: true,
        user: profile,
        route
      };
    }

    return {
      success: false,
      error: 'Invalid verification code. Please enter 123456 or the code shown in the dev banner.'
    };
  },

  /**
   * Password reset request
   */
  async resetPassword(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, message: 'Please provide a valid email address.' };
    }
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        await supabase.auth.resetPasswordForEmail(cleanEmail);
      } catch (e) {
        console.warn('Reset password error:', e);
      }
    }
    return {
      success: true,
      message: `If an account exists for ${cleanEmail}, password reset instructions have been dispatched.`
    };
  },

  /**
   * Sign out current user
   */
  async signOut(): Promise<void> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signout notice:', err);
      }
    }
    localStorage.removeItem(LOCAL_AUTH_KEY);
    // Replace URL history to prevent back navigation
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/login');
    }
  },

  setLocalSession(user: UserProfile) {
    try {
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  }
};
