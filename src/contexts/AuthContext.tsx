import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  testFirestoreConnection,
} from '../lib/firebase';
import { GPC_TABLES, getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { mapRowToUserProfile } from '../lib/supabaseMappers';
import { detectVisitorLanguage, sanitizeId } from '../lib/i18n';
import { LanguageCode, UserProfile } from '../types';

export interface AuthSessionUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextValue {
  user: AuthSessionUser | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  unauthorizedDomain: string | null;
  supportsEmailAuth: boolean;
  uiLang: LanguageCode;
  setUiLang: (lang: LanguageCode) => void;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthSessionUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<LanguageCode>(() => detectVisitorLanguage('pt'));

  useEffect(() => {
    if (isSupabaseConfigured) {
      const supabase = getSupabaseClient();
      let active = true;

      const syncSupabaseUser = async (supaUser: {
        id: string;
        email?: string;
        user_metadata?: Record<string, unknown>;
      } | null) => {
        if (!active) return;
        if (!supaUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        const meta = supaUser.user_metadata || {};
        const displayName = String(
          meta.full_name || meta.name || supaUser.email?.split('@')[0] || 'Afiliado Global'
        ).slice(0, 120);
        const photoUrl = String(meta.avatar_url || meta.picture || '').slice(0, 500);

        setUser({
          uid: supaUser.id,
          email: supaUser.email || null,
          displayName,
          photoURL: photoUrl || null,
        });

        try {
          const initialLang = detectVisitorLanguage('pt');
          const { data: userRow, error: userErr } = await supabase
            .from(GPC_TABLES.users)
            .upsert(
              {
                uid: supaUser.id,
                email: (supaUser.email || 'contato@globalpresell.com').slice(0, 200),
                display_name: displayName,
                photo_url: photoUrl,
                plan: 'pro',
                default_lang: initialLang,
                default_policy_email: (supaUser.email || '').slice(0, 200),
              },
              { onConflict: 'uid' }
            )
            .select()
            .single();

          if (userErr) throw userErr;

          await supabase
            .from(GPC_TABLES.userSettings)
            .upsert(
              {
                owner_id: supaUser.id,
                default_visitor_lang: initialLang,
                cookie_consent_text_pt:
                  'Utilizamos cookies essenciais para personalizar sua experiência e garantir a segurança do acesso oficial.',
                cookie_consent_text_en:
                  'We use essential cookies to personalize your experience and verify secure official portal access.',
              },
              { onConflict: 'owner_id', ignoreDuplicates: true }
            );

          if (active && userRow) {
            setProfile(mapRowToUserProfile(userRow as Record<string, unknown>));
          }
        } catch (err) {
          console.error('Supabase profile sync error:', err);
        } finally {
          if (active) setLoading(false);
        }
      };

      supabase.auth.getSession().then(({ data }) => {
        syncSupabaseUser(data.session?.user ?? null);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        syncSupabaseUser(session?.user ?? null);
      });

      return () => {
        active = false;
        subscription.unsubscribe();
      };
    }

    // Firebase Auth + Firestore fallback when Supabase env vars are not configured
    testFirestoreConnection();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName,
        photoURL: firebaseUser.photoURL,
      });

      const safeUid = sanitizeId(firebaseUser.uid);
      try {
        const userRef = doc(db, 'users', safeUid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          const initialLang = detectVisitorLanguage('pt');
          const profilePayload = {
            uid: firebaseUser.uid,
            displayName: (firebaseUser.displayName || 'Afiliado Global').slice(0, 120),
            photoUrl: (firebaseUser.photoURL || '').slice(0, 500),
            plan: 'pro',
            defaultLang: initialLang,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, profilePayload);

          const privateRef = doc(db, 'users', safeUid, 'private', 'info');
          await setDoc(privateRef, {
            uid: firebaseUser.uid,
            email: (firebaseUser.email || 'contato@globalpresell.com').slice(0, 200),
            companyName: '',
            defaultPolicyEmail: (firebaseUser.email || '').slice(0, 200),
            updatedAt: serverTimestamp(),
          });

          const settingsRef = doc(db, 'userSettings', safeUid);
          const settingsSnap = await getDoc(settingsRef);
          if (!settingsSnap.exists()) {
            await setDoc(settingsRef, {
              ownerId: firebaseUser.uid,
              ga4MeasurementId: '',
              gtmContainerId: '',
              googleAdsId: '',
              googleAdsConversionLabel: '',
              metaPixelId: '',
              headScripts: '',
              bodyScripts: '',
              customDomain: '',
              autoDetectVisitorLang: true,
              defaultVisitorLang: initialLang,
              preserveAffiliateParams: true,
              robotsIndexDefault: true,
              cookieConsentTextPt:
                'Utilizamos cookies essenciais para personalizar sua experiência e garantir a segurança do acesso oficial.',
              cookieConsentTextEn:
                'We use essential cookies to personalize your experience and verify secure official portal access.',
              updatedAt: serverTimestamp(),
            });
          }

          const refreshed = await getDoc(userRef);
          if (refreshed.exists()) {
            setProfile(refreshed.data() as UserProfile);
          }
        } else {
          const data = snap.data() as UserProfile;
          setProfile(data);
        }
      } catch (err) {
        console.error('Auth profile sync error:', err);
        try {
          handleFirestoreError(err, OperationType.WRITE, `users/${safeUid}`);
        } catch {
          // Keep session usable while logging structured FirestoreErrorInfo
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    setUnauthorizedDomain(null);
    if (isSupabaseConfigured) {
      try {
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin,
          },
        });
        if (error) setAuthError(error.message);
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Falha ao iniciar login com Google.');
      }
      return;
    }

    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code: unknown }).code)
          : '';
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar com Google.';
      if (code === 'auth/unauthorized-domain' || msg.includes('auth/unauthorized-domain')) {
        setUnauthorizedDomain(typeof window !== 'undefined' ? window.location.hostname : '');
      }
      setAuthError(msg);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    if (!isSupabaseConfigured) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setAuthError(error.message);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<string | null> => {
    setAuthError(null);
    if (!isSupabaseConfigured) return null;
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          full_name: (displayName || email.split('@')[0] || 'Afiliado Global').trim(),
        },
      },
    });
    if (error) {
      setAuthError(error.message);
      return null;
    }
    if (!data.session) {
      return 'Conta criada! Verifique seu e-mail para confirmar o acesso.';
    }
    return null;
  };

  const signOut = async () => {
    if (isSupabaseConfigured) {
      await getSupabaseClient().auth.signOut();
    } else {
      await firebaseSignOut(auth);
    }
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        authError,
        unauthorizedDomain,
        supportsEmailAuth: isSupabaseConfigured,
        uiLang,
        setUiLang,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
