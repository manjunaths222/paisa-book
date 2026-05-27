import { AppUser, FamilyMember, Instrument, InstrumentInput } from '../../types/finance';
import { memberColors } from '../../types/catalog';

const key = (uid: string, name: string) => `paisa-book:${uid}:${name}`;
const now = () => new Date().toISOString();

const read = <T>(uid: string, name: string, fallback: T): T => {
  const value = localStorage.getItem(key(uid, name));
  return value ? (JSON.parse(value) as T) : fallback;
};

const write = <T>(uid: string, name: string, value: T) => {
  localStorage.setItem(key(uid, name), JSON.stringify(value));
  window.dispatchEvent(new CustomEvent(`paisa-book:${uid}:${name}`));
};

export const localStore = {
  async upsertUser(user: AppUser) {
    const existing = localStorage.getItem(`paisa-book:user:${user.uid}`);
    const existingUser = existing ? (JSON.parse(existing) as Partial<AppUser>) : {};
    const next = {
      ...existingUser,
      ...user,
      currency: existingUser.currency ?? user.currency ?? 'INR',
      autoRenewDeposits: existingUser.autoRenewDeposits ?? user.autoRenewDeposits ?? true,
      onboardingComplete: existingUser.onboardingComplete ?? user.onboardingComplete ?? false,
      createdAt: existingUser.createdAt ?? user.createdAt,
      lastLoginAt: now()
    };
    localStorage.setItem(`paisa-book:user:${user.uid}`, JSON.stringify(next));
    return next as AppUser;
  },
  async getUser(uid: string) {
    const value = localStorage.getItem(`paisa-book:user:${uid}`);
    if (!value) return null;
    const user = JSON.parse(value) as AppUser;
    return { ...user, autoRenewDeposits: user.autoRenewDeposits ?? true };
  },
  async completeOnboarding(uid: string) {
    const user = await this.getUser(uid);
    if (user) await this.upsertUser({ ...user, onboardingComplete: true });
  },
  async updateUser(uid: string, input: Partial<AppUser>) {
    const user = await this.getUser(uid);
    if (!user) throw new Error('User profile not found');
    const next = { ...user, ...input, lastLoginAt: now() };
    localStorage.setItem(`paisa-book:user:${uid}`, JSON.stringify(next));
    return next;
  },
  subscribeMembers(uid: string, callback: (members: FamilyMember[]) => void) {
    const emit = () => callback(read<FamilyMember[]>(uid, 'members', []));
    emit();
    window.addEventListener(`paisa-book:${uid}:members`, emit);
    return () => window.removeEventListener(`paisa-book:${uid}:members`, emit);
  },
  async ensureSelfMember(uid: string, name: string) {
    const members = read<FamilyMember[]>(uid, 'members', []);
    const existing = members.find((member) => member.isSelf);
    if (existing) return existing;
    const self: FamilyMember = {
      id: crypto.randomUUID(),
      uid,
      name,
      relationship: 'Self',
      color: memberColors[0],
      gender: 'unspecified',
      isSelf: true,
      createdAt: now(),
      updatedAt: now()
    };
    write(uid, 'members', [self, ...members]);
    return self;
  },
  async addMember(uid: string, input: Omit<FamilyMember, 'id' | 'uid' | 'createdAt' | 'updatedAt' | 'isSelf'>) {
    const members = read<FamilyMember[]>(uid, 'members', []);
    if (members.length >= 20) throw new Error('You can add up to 20 family members');
    const member: FamilyMember = {
      ...input,
      id: crypto.randomUUID(),
      uid,
      isSelf: false,
      createdAt: now(),
      updatedAt: now()
    };
    write(uid, 'members', [...members, member]);
    return member.id;
  },
  async updateMember(uid: string, id: string, input: Partial<FamilyMember>) {
    const members = read<FamilyMember[]>(uid, 'members', []);
    write(
      uid,
      'members',
      members.map((member) =>
        member.id === id
          ? { ...member, ...input, relationship: member.isSelf ? 'Self' : input.relationship ?? member.relationship, updatedAt: now() }
          : member
      )
    );
  },
  async deleteMember(uid: string, id: string) {
    const members = read<FamilyMember[]>(uid, 'members', []);
    const member = members.find((item) => item.id === id);
    if (member?.isSelf) throw new Error('Self profile cannot be deleted');
    write(
      uid,
      'members',
      members.filter((item) => item.id !== id)
    );
    const instruments = read<Instrument[]>(uid, 'instruments', []);
    write(
      uid,
      'instruments',
      instruments.map((instrument) =>
        instrument.memberId === id ? { ...instrument, status: 'archived', updatedAt: now() } : instrument
      )
    );
  },
  subscribeInstruments(uid: string, callback: (instruments: Instrument[]) => void) {
    const emit = () => callback(read<Instrument[]>(uid, 'instruments', []));
    emit();
    window.addEventListener(`paisa-book:${uid}:instruments`, emit);
    return () => window.removeEventListener(`paisa-book:${uid}:instruments`, emit);
  },
  async addInstrument(uid: string, input: InstrumentInput) {
    const instruments = read<Instrument[]>(uid, 'instruments', []);
    const instrument = {
      ...input,
      id: crypto.randomUUID(),
      uid,
      createdAt: now(),
      updatedAt: now()
    } as Instrument;
    write(uid, 'instruments', [instrument, ...instruments]);
    return instrument.id;
  },
  async updateInstrument(uid: string, id: string, input: Partial<Instrument>) {
    const instruments = read<Instrument[]>(uid, 'instruments', []);
    write(
      uid,
      'instruments',
      instruments.map((instrument) => (instrument.id === id ? ({ ...instrument, ...input, updatedAt: now() } as Instrument) : instrument))
    );
  },
  async deleteInstrument(uid: string, id: string) {
    const instruments = read<Instrument[]>(uid, 'instruments', []);
    write(
      uid,
      'instruments',
      instruments.filter((instrument) => instrument.id !== id)
    );
  }
};
