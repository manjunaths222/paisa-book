import { useEffect, useMemo, useState } from 'react';
import { firestoreService } from '../../lib/firestore/service';
import { FamilyMember, Instrument } from '../../types/finance';
import { useAuth } from './useAuth';

export function useMembers() {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return firestoreService.subscribeMembers(user.uid, (next) => {
      setMembers(next.sort((a, b) => Number(b.isSelf) - Number(a.isSelf) || a.name.localeCompare(b.name)));
      setLoading(false);
    });
  }, [user]);

  return useMemo(() => ({ members, loading }), [members, loading]);
}

export function useInstruments() {
  const { user } = useAuth();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    return firestoreService.subscribeInstruments(user.uid, (next) => {
      setInstruments(next.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
      setLoading(false);
    });
  }, [user]);

  return useMemo(() => ({ instruments, loading }), [instruments, loading]);
}
