import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
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
import { detectVisitorLanguage, sanitizeId } from '../lib/i18n';
import { LanguageCode, UserProfile } from '../types';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  uiLang: LanguageCode;
  setUiLang: (lang: LanguageCode) => void;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [uiLang, setUiLang] = useState<LanguageCode>(() => detectVisitorLanguage('pt'));

  useEffect(() => {
    testFirestoreConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

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
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao autenticar com Google.';
      setAuthError(msg);
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
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
        uiLang,
        setUiLang,
        signInWithGoogle,
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
