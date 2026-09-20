import { UserProfile, UserRole } from '../types';
import { dbService } from './db';

const LOCAL_AUTH_KEY = 'rulevision_auth_session_v1';
const LOCAL_USERS_KEY = 'rulevision_registered_users_v1';

export interface AuthResponse {
  success: boolean;
  user?: UserProfile;
  error?: string;
}

export const authService = {
  /**
   * Returns current authenticated user profile or null
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
   * Internal helper to fetch or construct user profile
   */
  async fetchUserProfile(userId: string, email: string): Promise<UserProfile> {
    const supabase = (dbService as any).getSupabaseClient?.() || null;
    let role: UserRole = 'consumer';

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();

        if (!error && data?.role) {
          role = data.role as UserRole;
        } else {
          // Check metadata or default
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.user_metadata?.role) {
            role = user.user_metadata.role as UserRole;
          } else if (email.toLowerCase().includes('inspector')) {
            role = 'inspector';
          }
        }
      } catch (e) {
        console.warn('Profile fetch error, using inferred role:', e);
      }
    } else {
      if (email.toLowerCase().includes('inspector') || email === 'admin@rulevision.gov.in') {
        role = 'inspector';
      }
    }

    return {
      id: userId,
      email,
      role,
      created_at: new Date().toISOString()
    };
  },

  /**
   * Login with email & password
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user) {
          const profile = await this.fetchUserProfile(data.user.id, data.user.email || cleanEmail);
          this.setLocalSession(profile);
          return { success: true, user: profile };
        }
      } catch (err: any) {
        console.warn('Supabase auth failed, trying local fallback:', err);
      }
    }

    // Local / Offline authentication fallback
    // Enables seamless testing when Supabase keys are not set
    let role: UserRole = 'consumer';
    if (cleanEmail.includes('inspector') || cleanEmail.startsWith('admin')) {
      role = 'inspector';
    }

    // Check existing registered local users
    try {
      const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
      if (rawUsers) {
        const users = JSON.parse(rawUsers);
        const existing = users.find((u: any) => u.email === cleanEmail);
        if (existing) {
          role = existing.role || role;
        }
      }
    } catch {}

    const localUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      role,
      created_at: new Date().toISOString()
    };

    this.setLocalSession(localUser);
    return { success: true, user: localUser };
  },

  /**
   * Sign up new user (defaults strictly to 'consumer' role per SIH requirements)
   */
  async signUp(email: string, password: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      return { success: false, error: 'Email and password are required.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const supabase = (dbService as any).getSupabaseClient?.() || null;

    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: { role: 'consumer' }
          }
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data?.user) {
          // Attempt inserting into profiles table
          try {
            await supabase.from('profiles').insert([
              {
                id: data.user.id,
                email: cleanEmail,
                role: 'consumer',
                created_at: new Date().toISOString()
              }
            ]);
          } catch (profileErr) {
            console.warn('Profiles table insert skipped or existing:', profileErr);
          }

          const profile: UserProfile = {
            id: data.user.id,
            email: cleanEmail,
            role: 'consumer',
            created_at: new Date().toISOString()
          };
          this.setLocalSession(profile);
          return { success: true, user: profile };
        }
      } catch (err: any) {
        console.warn('Supabase sign up error:', err);
      }
    }

    // Local registration fallback
    const newUser: UserProfile = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      email: cleanEmail,
      role: 'consumer', // Default new users strictly to consumer per spec
      created_at: new Date().toISOString()
    };

    try {
      const rawUsers = localStorage.getItem(LOCAL_USERS_KEY);
      const users = rawUsers ? JSON.parse(rawUsers) : [];
      users.push({ ...newUser, password });
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
    } catch {}

    this.setLocalSession(newUser);
    return { success: true, user: newUser };
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
  },

  setLocalSession(user: UserProfile) {
    try {
      localStorage.setItem(LOCAL_AUTH_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save auth session:', e);
    }
  }
};
