import { User as FirebaseUser, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppUser } from '../../types/finance';
import { auth, googleProvider, isFirebaseConfigured } from '../../lib/firebase';
import { firestoreService } from '../../lib/firestore/service';
import { useUiStore } from '../stores/uiStore';

interface AuthContextValue {
  user: AppUser | null;
  loading: boolean;
  signIn: () => Promise<void>;
  signInDemo: () => Promise<void>;
  signOutUser: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  updateUserSettings: (updates: Partial<Pick<AppUser, 'currency' | 'autoRenewDeposits'>>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const demoUid = 'demo-family-admin';

const fromFirebaseUser = (firebaseUser: FirebaseUser): AppUser => ({
  uid: firebaseUser.uid,
  email: firebaseUser.email ?? '',
  displayName: firebaseUser.displayName ?? 'Family Admin',
  photoURL: firebaseUser.photoURL ?? undefined,
  currency: 'INR',
  autoRenewDeposits: true,
  onboardingComplete: false,
  createdAt: new Date().toISOString(),
  lastLoginAt: new Date().toISOString()
});

const firebaseSetupMessage =
  'Firebase sign-in worked, but Firestore rejected the app data request. Deploy firestore.rules and firestore.indexes.json to this Firebase project, then try again.';

const authErrorMessage = (error: unknown) => {
  if (error instanceof FirebaseError && error.code === 'permission-denied') {
    return firebaseSetupMessage;
  }
  return error instanceof Error ? error.message : 'Unable to sign in';
};
const onboardingDismissedKey = (uid: string) => `paisa-book:${uid}:onboarding-dismissed`;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const pushToast = useUiStore((state) => state.pushToast);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      const stored = localStorage.getItem('paisa-book:active-user');
      if (stored) {
        void firestoreService.getUser(stored).then((next) => {
          setUser(next);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
      return;
    }
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await firestoreService.upsertUser(fromFirebaseUser(firebaseUser));
        await firestoreService.ensureSelfMember(profile.uid, profile.displayName);
        setUser(profile);
      } catch (error) {
        pushToast({ type: 'error', message: authErrorMessage(error) });
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, [pushToast]);

  const signIn = async () => {
    if (!auth) {
      await signInDemo();
      return;
    }
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await firestoreService.upsertUser(fromFirebaseUser(result.user));
      await firestoreService.ensureSelfMember(profile.uid, profile.displayName);
      setUser(profile);
      pushToast({ type: 'success', message: 'Signed in successfully' });
      navigate('/');
    } catch (error) {
      pushToast({ type: 'error', message: authErrorMessage(error) });
      if (auth.currentUser) await signOut(auth);
    }
  };

  const signInDemo = async () => {
    const profile = await firestoreService.upsertUser({
      uid: demoUid,
      email: 'demo@paisa-book.local',
      displayName: 'Demo Family Admin',
      currency: 'INR',
      autoRenewDeposits: true,
      onboardingComplete: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString()
    });
    await firestoreService.ensureSelfMember(profile.uid, profile.displayName);
    localStorage.setItem('paisa-book:active-user', profile.uid);
    setUser(profile);
    pushToast({ type: 'info', message: 'Firebase is not configured. Running in local demo mode.' });
    navigate('/');
  };

  const signOutUser = async () => {
    if (auth) await signOut(auth);
    localStorage.removeItem('paisa-book:active-user');
    setUser(null);
    pushToast({ type: 'success', message: 'Signed out' });
    navigate('/login');
  };

  const completeOnboarding = async () => {
    if (!user) return;
    localStorage.setItem(onboardingDismissedKey(user.uid), 'true');
    setUser({ ...user, onboardingComplete: true });
    try {
      await firestoreService.completeOnboarding(user.uid);
    } catch (error) {
      pushToast({
        type: 'warning',
        message: error instanceof Error ? error.message : 'Onboarding dismissed locally, but sync failed'
      });
    }
  };

  const updateUserSettings = async (updates: Partial<Pick<AppUser, 'currency' | 'autoRenewDeposits'>>) => {
    if (!user) return;
    const next = { ...user, ...updates };
    setUser(next);
    try {
      const saved = await firestoreService.updateUser(user.uid, updates);
      setUser(saved);
    } catch (error) {
      setUser(user);
      throw error;
    }
  };

  const value = { user, loading, signIn, signInDemo, signOutUser, completeOnboarding, updateUserSettings };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider');
  return value;
};
