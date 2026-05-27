import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { AppUser, FamilyMember, Instrument, InstrumentInput } from '../../types/finance';
import { db, isFirebaseConfigured } from '../firebase';
import { localStore } from './localStore';
import { memberColors } from '../../types/catalog';

const now = () => new Date().toISOString();
const assertDb = () => {
  if (!db) throw new Error('Firebase is not configured');
  return db;
};
const serializeDoc = <T>(id: string, data: any): T => {
  const normalized = Object.fromEntries(
    Object.entries(data).map(([key, value]) => [
      key,
      value && typeof value === 'object' && 'toDate' in value ? (value as any).toDate().toISOString() : value
    ])
  );
  return { id, ...normalized } as T;
};

export const firestoreService = {
  async getUser(uid: string) {
    if (!isFirebaseConfigured) return localStore.getUser(uid);
    const snap = await getDoc(doc(assertDb(), 'users', uid));
    return snap.exists() ? serializeDoc<AppUser>(uid, snap.data()) : null;
  },
  async upsertUser(user: AppUser) {
    if (!isFirebaseConfigured) return localStore.upsertUser(user);
    await setDoc(
      doc(assertDb(), 'users', user.uid),
      {
        ...user,
        createdAt: user.createdAt,
        lastLoginAt: now()
      },
      { merge: true }
    );
    return user;
  },
  async completeOnboarding(uid: string) {
    if (!isFirebaseConfigured) return localStore.completeOnboarding(uid);
    await updateDoc(doc(assertDb(), 'users', uid), { onboardingComplete: true, updatedAt: serverTimestamp() });
  },
  subscribeMembers(uid: string, callback: (members: FamilyMember[]) => void) {
    if (!isFirebaseConfigured) return localStore.subscribeMembers(uid, callback);
    return onSnapshot(query(collection(assertDb(), 'members'), where('uid', '==', uid)), (snapshot) => {
      callback(snapshot.docs.map((item) => serializeDoc<FamilyMember>(item.id, item.data())));
    });
  },
  async ensureSelfMember(uid: string, name: string) {
    if (!isFirebaseConfigured) return localStore.ensureSelfMember(uid, name);
    const selfMemberId = `${uid}_self`;
    const selfMemberRef = doc(assertDb(), 'members', selfMemberId);
    const payload: Omit<FamilyMember, 'id'> = {
      uid,
      name,
      relationship: 'Self',
      color: memberColors[0],
      gender: 'unspecified',
      isSelf: true,
      createdAt: now(),
      updatedAt: now()
    };
    await setDoc(selfMemberRef, payload, { merge: true });
    return { id: selfMemberId, ...payload };
  },
  async addMember(uid: string, input: Omit<FamilyMember, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'isSelf'>) {
    if (!isFirebaseConfigured) return localStore.addMember(uid, input);
    const members = await getDocs(query(collection(assertDb(), 'members'), where('uid', '==', uid)));
    if (members.size >= 20) throw new Error('You can add up to 20 family members');
    const payload = { ...input, uid, isSelf: false, createdAt: now(), updatedAt: now() };
    const result = await addDoc(collection(assertDb(), 'members'), payload);
    return result.id;
  },
  async updateMember(uid: string, id: string, input: Partial<FamilyMember>) {
    if (!isFirebaseConfigured) return localStore.updateMember(uid, id, input);
    await updateDoc(doc(assertDb(), 'members', id), { ...input, uid, updatedAt: now() });
  },
  async deleteMember(uid: string, id: string) {
    if (!isFirebaseConfigured) return localStore.deleteMember(uid, id);
    const database = assertDb();
    const member = await getDoc(doc(database, 'members', id));
    if (member.data()?.isSelf) throw new Error('Self profile cannot be deleted');
    const instruments = await getDocs(
      query(collection(database, 'instruments'), where('uid', '==', uid), where('memberId', '==', id))
    );
    const batch = writeBatch(database);
    instruments.forEach((instrument) => batch.update(instrument.ref, { status: 'archived', updatedAt: now() }));
    batch.delete(doc(database, 'members', id));
    await batch.commit();
  },
  subscribeInstruments(uid: string, callback: (instruments: Instrument[]) => void) {
    if (!isFirebaseConfigured) return localStore.subscribeInstruments(uid, callback);
    return onSnapshot(query(collection(assertDb(), 'instruments'), where('uid', '==', uid)), (snapshot) => {
      callback(snapshot.docs.map((item) => serializeDoc<Instrument>(item.id, item.data())));
    });
  },
  async addInstrument(uid: string, input: InstrumentInput) {
    if (!isFirebaseConfigured) return localStore.addInstrument(uid, input);
    const payload = { ...input, uid, createdAt: now(), updatedAt: now() };
    const result = await addDoc(collection(assertDb(), 'instruments'), payload);
    return result.id;
  },
  async updateInstrument(uid: string, id: string, input: Partial<Instrument>) {
    if (!isFirebaseConfigured) return localStore.updateInstrument(uid, id, input);
    await updateDoc(doc(assertDb(), 'instruments', id), { ...input, uid, updatedAt: now(), projCache: null });
  },
  async deleteInstrument(uid: string, id: string) {
    if (!isFirebaseConfigured) return localStore.deleteInstrument(uid, id);
    await deleteDoc(doc(assertDb(), 'instruments', id));
  }
};
