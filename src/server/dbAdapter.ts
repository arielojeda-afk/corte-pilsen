import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type {
  AdminOverviewResponse,
  AdminRegisteredVoter,
  AppSettings,
  CutId,
  DbBackendMode,
  ExperiencePost,
  FriendGroup,
  GroupZoneFilter,
  ModerationLogEntry,
  ParrilleroProfile,
  PostComment,
  PublicStateResponse,
  TournamentState,
  UserRole,
} from '../types';
import {
  DEFAULT_APP_SETTINGS,
  SEED_EXPERIENCE_POSTS,
  SEED_FRIEND_GROUPS,
  VALID_CUT_IDS,
} from './seedData';

export const SUPER_ADMIN_EMAIL = 'ariel.ojeda@lupe.com.py';

export function hashPasscodeScrypt(passcode: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPasscodeScrypt(passcode: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, expectedHex] = parts;
  if (!salt || !expectedHex) return false;
  try {
    const derived = crypto.scryptSync(passcode, salt, 64);
    const expected = Buffer.from(expectedHex, 'hex');
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export type DayVoteKey =
  | 'day1'
  | 'day2'
  | 'day3'
  | 'day4'
  | 'day5'
  | 'day6'
  | 'day7Tradicional'
  | 'day7Boss';

export interface VoteRecord {
  parrilleroId: string;
  dayKey: DayVoteKey;
  cutId: CutId;
  bossChoice: 'retador' | 'challenger' | null;
  updatedAt: string;
}

export interface StoredFriendGroup extends Omit<FriendGroup, 'likedByMe' | 'isMine'> {
  ownerVisitorId?: string;
}

export interface StoredExperiencePost extends Omit<ExperiencePost, 'hasFired'> {}

export interface StoredRegistration extends ParrilleroProfile {
  passwordHash: string;
}

export interface LocalDbSchema {
  version: number;
  seededGroups: boolean;
  seededPosts: boolean;
  settings: AppSettings;
  adminPasscodeHash: string | null;
  registrations: StoredRegistration[];
  votes: VoteRecord[];
  groups: StoredFriendGroup[];
  groupLikesByVisitor: Record<string, string[]>;
  posts: StoredExperiencePost[];
  postFiresByVisitor: Record<string, string[]>;
  moderationLog: ModerationLogEntry[];
}

function emptyCutVotes(): Record<CutId, number> {
  return {
    costilla: 0,
    tira_fina: 0,
    vacio: 0,
    entrana: 0,
    colita: 0,
    bife_chorizo: 0,
    tapa: 0,
    ojo_bife: 0,
    retador: 0,
  };
}

function emptyUserDayVotes(): TournamentState['userDayVotes'] {
  return {
    day1: null,
    day2: null,
    day3: null,
    day4: null,
    day5: null,
    day6: null,
    day7Tradicional: null,
    day7Boss: null,
  };
}

function aggregateCutVotes(votes: VoteRecord[]): Record<CutId, number> {
  const counts = emptyCutVotes();
  for (const v of votes) {
    if (VALID_CUT_IDS.includes(v.cutId)) {
      counts[v.cutId] += 1;
    }
  }
  return counts;
}

function buildUserDayVotes(
  votes: VoteRecord[],
  parrilleroId?: string | null
): TournamentState['userDayVotes'] {
  const dayVotes = emptyUserDayVotes();
  if (!parrilleroId) return dayVotes;
  for (const v of votes) {
    if (v.parrilleroId !== parrilleroId) continue;
    if (v.dayKey === 'day7Boss') {
      dayVotes.day7Boss = v.bossChoice ?? null;
    } else {
      dayVotes[v.dayKey] = v.cutId;
    }
  }
  return dayVotes;
}

function totalFromCutVotes(cutVotes: Record<CutId, number>): number {
  return Object.values(cutVotes).reduce((sum, n) => sum + n, 0);
}

export interface ParrillaDbAdapter {
  readonly backendMode: DbBackendMode;
  readonly supabaseConfigured: boolean;
  getPublicState(visitorId: string, parrilleroId?: string | null): Promise<PublicStateResponse>;
  getAdminPasscodeHash(): Promise<string | null>;
  setAdminPasscodeHash(hash: string): Promise<void>;
  registerUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    ci?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
    role?: UserRole;
  }): Promise<ParrilleroProfile>;
  findUserByEmail(email: string): Promise<StoredRegistration | null>;
  findUserById(id: string): Promise<StoredRegistration | null>;
  updateUser(id: string, patch: Partial<StoredRegistration>): Promise<ParrilleroProfile | null>;
  changeAdminPassword(newHash: string): Promise<void>;
  upsertRegistration(input: {
    existingId?: string | null;
    name: string;
    email?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
  }): Promise<ParrilleroProfile>;
  getRegistrationById(id: string): Promise<ParrilleroProfile | null>;
  getUserDayVotes(parrilleroId: string): Promise<TournamentState['userDayVotes']>;
  castVote(input: {
    parrilleroId: string;
    dayKey: DayVoteKey;
    cutId: CutId;
    bossChoice: 'retador' | 'challenger' | null;
  }): Promise<void>;
  createFriendGroup(input: {
    visitorId: string;
    name: string;
    zone: Exclude<GroupZoneFilter, 'Todas'>;
    neighborhood: string;
    captainName: string;
    members: string[];
    favoriteCut: string;
    motto: string;
  }): Promise<FriendGroup>;
  toggleGroupLike(groupId: string, visitorId: string): Promise<boolean>;
  createPost(input: {
    authorName: string;
    authorCity: string;
    authorRank: ParrilleroProfile['rank'];
    cookingPoint: ExperiencePost['cookingPoint'];
    caption: string;
    image: string;
  }): Promise<ExperiencePost>;
  togglePostFire(postId: string, visitorId: string): Promise<boolean>;
  addComment(input: {
    postId: string;
    author: string;
    text: string;
  }): Promise<PostComment | null>;
  getAdminOverview(): Promise<AdminOverviewResponse>;
  updateSettings(patch: Partial<AppSettings>): Promise<AppSettings>;
  deleteFriendGroup(groupId: string): Promise<boolean>;
  deletePost(postId: string): Promise<boolean>;
  deleteComment(postId: string, commentId: string): Promise<boolean>;
  deleteRegistration(parrilleroId: string): Promise<boolean>;
  resetAllVotes(): Promise<number>;
}

// ============================================================================
// 1) Local Server JSON File Adapter (Persistent immediately with zero setup)
// ============================================================================
class LocalFileDbAdapter implements ParrillaDbAdapter {
  readonly backendMode: DbBackendMode = 'local_file';
  readonly supabaseConfigured = false;
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(dataDir: string) {
    this.filePath = path.resolve(dataDir, 'parrilla-db.json');
  }

  private async readDb(): Promise<LocalDbSchema> {
    const defaultAdminPasscode =
      process.env.ADMIN_PASSCODE?.trim() ||
      process.env.SUPER_ADMIN_PASSWORD?.trim() ||
      'Pilsen2026!';
    const defaultHash = hashPasscodeScrypt(defaultAdminPasscode);

    let dbData: LocalDbSchema;
    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<LocalDbSchema>;
      dbData = {
        version: 1,
        seededGroups: Boolean(parsed.seededGroups),
        seededPosts: Boolean(parsed.seededPosts),
        settings: { ...DEFAULT_APP_SETTINGS, ...(parsed.settings ?? {}) },
        adminPasscodeHash: parsed.adminPasscodeHash ?? defaultHash,
        registrations: Array.isArray(parsed.registrations) ? (parsed.registrations as StoredRegistration[]) : [],
        votes: Array.isArray(parsed.votes) ? parsed.votes : [],
        groups: Array.isArray(parsed.groups) ? parsed.groups : [],
        groupLikesByVisitor: parsed.groupLikesByVisitor ?? {},
        posts: Array.isArray(parsed.posts) ? parsed.posts : [],
        postFiresByVisitor: parsed.postFiresByVisitor ?? {},
        moderationLog: Array.isArray(parsed.moderationLog) ? parsed.moderationLog : [],
      };
    } catch {
      dbData = {
        version: 1,
        seededGroups: true,
        seededPosts: true,
        settings: { ...DEFAULT_APP_SETTINGS },
        adminPasscodeHash: defaultHash,
        registrations: [],
        votes: [],
        groups: SEED_FRIEND_GROUPS.map(({ likedByMe: _l, isMine: _m, ...rest }) => rest),
        groupLikesByVisitor: {},
        posts: SEED_EXPERIENCE_POSTS.map(({ hasFired: _f, ...rest }) => rest),
        postFiresByVisitor: {},
        moderationLog: [],
      };
    }

    // Ensure Ariel Ojeda exists as Super Administrator
    const cleanAdminEmail = SUPER_ADMIN_EMAIL.toLowerCase();
    let ariel = dbData.registrations.find(
      (r) => (r.email || '').trim().toLowerCase() === cleanAdminEmail
    );
    if (!ariel) {
      ariel = {
        id: 'usr-ariel-superadmin',
        name: 'Ariel Ojeda',
        email: SUPER_ADMIN_EMAIL,
        passwordHash: dbData.adminPasscodeHash || defaultHash,
        phone: '+595 981 123456',
        ci: '1.234.567',
        city: 'Asunción',
        favoriteCut: 'Tapa Cuadril',
        avatarStyle: 'brasa',
        rank: 'Maestro Parrillero Pilsen',
        memberNumber: 'PY-00001',
        role: 'superadmin',
        createdAt: new Date().toISOString(),
      };
      dbData.registrations.unshift(ariel);
    } else {
      ariel.role = 'superadmin';
      if (!ariel.passwordHash) {
        ariel.passwordHash = dbData.adminPasscodeHash || defaultHash;
      }
    }

    // Ensure all registrations have email and role
    for (const r of dbData.registrations) {
      if (!r.email) {
        r.email = `votante-${(r.memberNumber || 'py').toLowerCase()}@corte.pilsen.com.py`;
      }
      if ((r.email || '').trim().toLowerCase() === cleanAdminEmail) {
        r.role = 'superadmin';
      } else if (!r.role) {
        r.role = 'voter';
      }
    }

    return dbData;
  }

  private sanitizeProfile(r: StoredRegistration): ParrilleroProfile {
    const { passwordHash: _p, ...profile } = r;
    return profile;
  }

  private async writeDbAtomic(db: LocalDbSchema): Promise<void> {
    const dir = path.dirname(this.filePath);
    await fs.mkdir(dir, { recursive: true });
    const tmpFile = `${this.filePath}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
    await fs.rename(tmpFile, this.filePath);
  }

  private async mutateDb<T>(mutator: (db: LocalDbSchema) => Promise<T> | T): Promise<T> {
    let result!: T;
    this.writeQueue = this.writeQueue.then(async () => {
      const db = await this.readDb();
      result = await mutator(db);
      await this.writeDbAtomic(db);
    });
    await this.writeQueue;
    return result;
  }

  private appendModerationLog(
    db: LocalDbSchema,
    action: string,
    targetType: ModerationLogEntry['targetType'],
    targetId: string,
    details: string
  ) {
    db.moderationLog.unshift({
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      targetType,
      targetId,
      details,
      createdAt: new Date().toISOString(),
    });
    if (db.moderationLog.length > 50) {
      db.moderationLog = db.moderationLog.slice(0, 50);
    }
  }

  async getPublicState(visitorId: string, parrilleroId?: string | null): Promise<PublicStateResponse> {
    const db = await this.readDb();
    const activeStored =
      parrilleroId ? db.registrations.find((r) => r.id === parrilleroId) ?? null : null;
    const activeProfile = activeStored ? this.sanitizeProfile(activeStored) : null;
    const cutVotes = aggregateCutVotes(db.votes);
    const userDayVotes = buildUserDayVotes(db.votes, activeProfile?.id ?? null);

    const groups: FriendGroup[] = db.groups.map((g) => {
      const likedSet = new Set(db.groupLikesByVisitor[g.id] ?? []);
      return {
        id: g.id,
        code: g.code,
        name: g.name,
        zone: g.zone,
        neighborhood: g.neighborhood,
        captainName: g.captainName,
        members: g.members,
        favoriteCut: g.favoriteCut,
        motto: g.motto,
        likes: g.likes,
        createdAtMs: g.createdAtMs,
        likedByMe: likedSet.has(visitorId),
        isMine: Boolean(visitorId && g.ownerVisitorId === visitorId),
      };
    });

    const posts: ExperiencePost[] = db.posts.map((p) => {
      const firedSet = new Set(db.postFiresByVisitor[p.id] ?? []);
      return {
        ...p,
        hasFired: firedSet.has(visitorId),
      };
    });

    return {
      backendMode: this.backendMode,
      supabaseReady: this.supabaseConfigured,
      settings: db.settings,
      cutVotes,
      totalVotes: totalFromCutVotes(cutVotes),
      registeredCount: db.registrations.length,
      profile: activeProfile,
      userDayVotes,
      groups,
      posts,
    };
  }

  async getAdminPasscodeHash(): Promise<string | null> {
    const db = await this.readDb();
    return db.adminPasscodeHash;
  }

  async setAdminPasscodeHash(hash: string): Promise<void> {
    await this.mutateDb((db) => {
      db.adminPasscodeHash = hash;
      this.appendModerationLog(db, 'CLAIM_ADMIN', 'settings', 'admin', 'Clave de administrador configurada.');
    });
  }

  async registerUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    ci?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
    role?: UserRole;
  }): Promise<ParrilleroProfile> {
    return this.mutateDb((db) => {
      const cleanEmail = input.email.trim().toLowerCase();
      const existing = db.registrations.find(
        (r) => (r.email || '').trim().toLowerCase() === cleanEmail
      );
      if (existing) {
        throw new Error('Este correo ya está registrado con un Carnet. Iniciá sesión con tu contraseña.');
      }
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      const nextNum = 10001 + db.registrations.length;
      const created: StoredRegistration = {
        id: `parrillero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name.trim(),
        email: cleanEmail,
        passwordHash: input.passwordHash,
        phone: input.phone?.trim() || undefined,
        ci: input.ci?.trim() || undefined,
        city: input.city.trim(),
        favoriteCut: input.favoriteCut,
        avatarStyle: input.avatarStyle,
        rank: isSuper ? 'Maestro Parrillero Pilsen' : 'Aprendiz de Fuego',
        memberNumber: isSuper ? 'PY-00001' : `PY-${nextNum}`,
        role: isSuper ? 'superadmin' : (input.role || 'voter'),
        createdAt: new Date().toISOString(),
      };
      db.registrations.push(created);
      this.appendModerationLog(
        db,
        'REGISTER_USER',
        'registration',
        created.id,
        `Nuevo parrillero registrado: ${created.name} (${cleanEmail})`
      );
      return this.sanitizeProfile(created);
    });
  }

  async findUserByEmail(email: string): Promise<StoredRegistration | null> {
    const db = await this.readDb();
    const cleanEmail = email.trim().toLowerCase();
    const found = db.registrations.find(
      (r) => (r.email || '').trim().toLowerCase() === cleanEmail
    );
    return found ? { ...found } : null;
  }

  async findUserById(id: string): Promise<StoredRegistration | null> {
    const db = await this.readDb();
    const found = db.registrations.find((r) => r.id === id);
    return found ? { ...found } : null;
  }

  async updateUser(id: string, patch: Partial<StoredRegistration>): Promise<ParrilleroProfile | null> {
    return this.mutateDb((db) => {
      const found = db.registrations.find((r) => r.id === id);
      if (!found) return null;
      if (patch.name) found.name = patch.name.trim();
      if (patch.city) found.city = patch.city.trim();
      if (patch.favoriteCut) found.favoriteCut = patch.favoriteCut;
      if (patch.avatarStyle) found.avatarStyle = patch.avatarStyle;
      if (patch.phone !== undefined) found.phone = patch.phone?.trim() || undefined;
      if (patch.ci !== undefined) found.ci = patch.ci?.trim() || undefined;
      if (patch.passwordHash) found.passwordHash = patch.passwordHash;
      if (patch.rank) found.rank = patch.rank;
      return this.sanitizeProfile(found);
    });
  }

  async changeAdminPassword(newHash: string): Promise<void> {
    await this.mutateDb((db) => {
      db.adminPasscodeHash = newHash;
      const cleanEmail = SUPER_ADMIN_EMAIL.toLowerCase();
      const ariel = db.registrations.find(
        (r) => (r.email || '').trim().toLowerCase() === cleanEmail
      );
      if (ariel) {
        ariel.passwordHash = newHash;
      }
      this.appendModerationLog(
        db,
        'CHANGE_ADMIN_PASSWORD',
        'settings',
        'admin',
        'Contraseña del Super Administrador actualizada exitosamente.'
      );
    });
  }

  async upsertRegistration(input: {
    existingId?: string | null;
    name: string;
    email?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
  }): Promise<ParrilleroProfile> {
    return this.mutateDb((db) => {
      const existing = input.existingId
        ? db.registrations.find((r) => r.id === input.existingId)
        : undefined;
      if (existing) {
        existing.name = input.name;
        existing.city = input.city;
        existing.favoriteCut = input.favoriteCut;
        existing.avatarStyle = input.avatarStyle;
        if (input.email) existing.email = input.email.trim().toLowerCase();
        return this.sanitizeProfile(existing);
      }
      const cleanEmail = (input.email || '').trim().toLowerCase();
      const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
      const nextNum = 10001 + db.registrations.length;
      const created: StoredRegistration = {
        id: `parrillero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: input.name,
        email: cleanEmail || `votante-${nextNum}@corte.pilsen.com.py`,
        passwordHash: '',
        city: input.city,
        favoriteCut: input.favoriteCut,
        avatarStyle: input.avatarStyle,
        rank: isSuper ? 'Maestro Parrillero Pilsen' : 'Aprendiz de Fuego',
        memberNumber: isSuper ? 'PY-00001' : `PY-${nextNum}`,
        role: isSuper ? 'superadmin' : 'voter',
        createdAt: new Date().toISOString(),
      };
      db.registrations.unshift(created);
      return this.sanitizeProfile(created);
    });
  }

  async getRegistrationById(id: string): Promise<ParrilleroProfile | null> {
    const db = await this.readDb();
    const found = db.registrations.find((r) => r.id === id);
    return found ? this.sanitizeProfile(found) : null;
  }

  async getUserDayVotes(parrilleroId: string): Promise<TournamentState['userDayVotes']> {
    const db = await this.readDb();
    return buildUserDayVotes(db.votes, parrilleroId);
  }

  async castVote(input: {
    parrilleroId: string;
    dayKey: DayVoteKey;
    cutId: CutId;
    bossChoice: 'retador' | 'challenger' | null;
  }): Promise<void> {
    await this.mutateDb((db) => {
      const idx = db.votes.findIndex(
        (v) => v.parrilleroId === input.parrilleroId && v.dayKey === input.dayKey
      );
      const record: VoteRecord = {
        parrilleroId: input.parrilleroId,
        dayKey: input.dayKey,
        cutId: input.cutId,
        bossChoice: input.bossChoice,
        updatedAt: new Date().toISOString(),
      };
      if (idx >= 0) {
        db.votes[idx] = record;
      } else {
        db.votes.push(record);
      }
    });
  }

  async createFriendGroup(input: {
    visitorId: string;
    name: string;
    zone: Exclude<GroupZoneFilter, 'Todas'>;
    neighborhood: string;
    captainName: string;
    members: string[];
    favoriteCut: string;
    motto: string;
  }): Promise<FriendGroup> {
    return this.mutateDb((db) => {
      const nextSerial = 101 + db.groups.length + Math.floor(Math.random() * 5);
      const id = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const stored: StoredFriendGroup = {
        id,
        code: `#GRP-${String(nextSerial).padStart(4, '0')}`,
        name: input.name,
        zone: input.zone,
        neighborhood: input.neighborhood,
        captainName: input.captainName,
        members: input.members,
        favoriteCut: input.favoriteCut,
        motto: input.motto,
        likes: 1,
        createdAtMs: Date.now(),
        ownerVisitorId: input.visitorId,
      };
      db.groups.unshift(stored);
      db.groupLikesByVisitor[id] = [input.visitorId];
      return {
        id: stored.id,
        code: stored.code,
        name: stored.name,
        zone: stored.zone,
        neighborhood: stored.neighborhood,
        captainName: stored.captainName,
        members: stored.members,
        favoriteCut: stored.favoriteCut,
        motto: stored.motto,
        likes: stored.likes,
        createdAtMs: stored.createdAtMs,
        likedByMe: true,
        isMine: true,
      };
    });
  }

  async toggleGroupLike(groupId: string, visitorId: string): Promise<boolean> {
    return this.mutateDb((db) => {
      const group = db.groups.find((g) => g.id === groupId);
      if (!group) return false;
      const list = db.groupLikesByVisitor[groupId] ?? [];
      const existsIdx = list.indexOf(visitorId);
      if (existsIdx >= 0) {
        list.splice(existsIdx, 1);
        group.likes = Math.max(0, group.likes - 1);
      } else {
        list.push(visitorId);
        group.likes += 1;
      }
      db.groupLikesByVisitor[groupId] = list;
      return true;
    });
  }

  async createPost(input: {
    authorName: string;
    authorCity: string;
    authorRank: ParrilleroProfile['rank'];
    cookingPoint: ExperiencePost['cookingPoint'];
    caption: string;
    image: string;
  }): Promise<ExperiencePost> {
    return this.mutateDb((db) => {
      const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const stored: StoredExperiencePost = {
        id,
        authorName: input.authorName,
        authorCity: input.authorCity,
        authorRank: input.authorRank,
        cookingPoint: input.cookingPoint,
        caption: input.caption,
        image: input.image,
        fires: 1,
        timestamp: 'Recién ahora',
        comments: [],
      };
      db.posts.unshift(stored);
      return { ...stored, hasFired: true };
    });
  }

  async togglePostFire(postId: string, visitorId: string): Promise<boolean> {
    return this.mutateDb((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return false;
      const list = db.postFiresByVisitor[postId] ?? [];
      const existsIdx = list.indexOf(visitorId);
      if (existsIdx >= 0) {
        list.splice(existsIdx, 1);
        post.fires = Math.max(0, post.fires - 1);
      } else {
        list.push(visitorId);
        post.fires += 1;
      }
      db.postFiresByVisitor[postId] = list;
      return true;
    });
  }

  async addComment(input: {
    postId: string;
    author: string;
    text: string;
  }): Promise<PostComment | null> {
    return this.mutateDb((db) => {
      const post = db.posts.find((p) => p.id === input.postId);
      if (!post) return null;
      const comment: PostComment = {
        id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        author: input.author,
        text: input.text,
        timestamp: 'Ahora',
      };
      post.comments.push(comment);
      return comment;
    });
  }

  async getAdminOverview(): Promise<AdminOverviewResponse> {
    const db = await this.readDb();
    const cutVotes = aggregateCutVotes(db.votes);
    const registrations: AdminRegisteredVoter[] = db.registrations.map((stored) => {
      const profile = this.sanitizeProfile(stored);
      const userVotes = db.votes.filter((v) => v.parrilleroId === profile.id);
      return {
        profile,
        votesCount: userVotes.length,
        dayVotes: buildUserDayVotes(db.votes, profile.id),
      };
    });

    return {
      backendMode: this.backendMode,
      supabaseConfigured: this.supabaseConfigured,
      settings: db.settings,
      cutVotes,
      totalVotes: totalFromCutVotes(cutVotes),
      registrations,
      groups: db.groups.map((g) => ({ ...g, likedByMe: false })),
      posts: db.posts.map((p) => ({ ...p, hasFired: false })),
      moderationLog: db.moderationLog,
    };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    return this.mutateDb((db) => {
      db.settings = {
        ...db.settings,
        ...patch,
      };
      this.appendModerationLog(
        db,
        'UPDATE_SETTINGS',
        'settings',
        'default',
        `Configuración actualizada: votación=${db.settings.votingOpen ? 'ON' : 'OFF'}, postulaciones=${db.settings.groupSubmissionsOpen ? 'ON' : 'OFF'}, muro=${db.settings.wallPostingOpen ? 'ON' : 'OFF'}, corte_revelado=${db.settings.forceRevealed ? 'SI' : 'NO'}`
      );
      return db.settings;
    });
  }

  async deleteFriendGroup(groupId: string): Promise<boolean> {
    return this.mutateDb((db) => {
      const target = db.groups.find((g) => g.id === groupId);
      if (!target) return false;
      db.groups = db.groups.filter((g) => g.id !== groupId);
      delete db.groupLikesByVisitor[groupId];
      this.appendModerationLog(
        db,
        'DELETE_GROUP',
        'group',
        groupId,
        `Postulación eliminada: "${target.name}" (${target.code})`
      );
      return true;
    });
  }

  async deletePost(postId: string): Promise<boolean> {
    return this.mutateDb((db) => {
      const target = db.posts.find((p) => p.id === postId);
      if (!target) return false;
      db.posts = db.posts.filter((p) => p.id !== postId);
      delete db.postFiresByVisitor[postId];
      this.appendModerationLog(
        db,
        'DELETE_POST',
        'post',
        postId,
        `Publicación del muro eliminada (autor: ${target.authorName})`
      );
      return true;
    });
  }

  async deleteComment(postId: string, commentId: string): Promise<boolean> {
    return this.mutateDb((db) => {
      const post = db.posts.find((p) => p.id === postId);
      if (!post) return false;
      const before = post.comments.length;
      post.comments = post.comments.filter((c) => c.id !== commentId);
      if (post.comments.length === before) return false;
      this.appendModerationLog(
        db,
        'DELETE_COMMENT',
        'comment',
        commentId,
        `Comentario eliminado en publicación ${postId}`
      );
      return true;
    });
  }

  async deleteRegistration(parrilleroId: string): Promise<boolean> {
    return this.mutateDb((db) => {
      const target = db.registrations.find((r) => r.id === parrilleroId);
      if (!target) return false;
      db.registrations = db.registrations.filter((r) => r.id !== parrilleroId);
      const beforeVotes = db.votes.length;
      db.votes = db.votes.filter((v) => v.parrilleroId !== parrilleroId);
      const removedVotes = beforeVotes - db.votes.length;
      this.appendModerationLog(
        db,
        'DELETE_REGISTRATION',
        'registration',
        parrilleroId,
        `Registro eliminado: ${target.name} (${target.memberNumber}) · ${removedVotes} votos removidos`
      );
      return true;
    });
  }

  async resetAllVotes(): Promise<number> {
    return this.mutateDb((db) => {
      const count = db.votes.length;
      db.votes = [];
      this.appendModerationLog(
        db,
        'RESET_VOTES',
        'votes',
        'all',
        `Se reinició el torneo: ${count} votos eliminados (los carnets registrados permanecen)`
      );
      return count;
    });
  }
}

// ============================================================================
// 2) Supabase PostgreSQL Adapter (Active when SUPABASE_URL & SERVICE_ROLE_KEY exist)
// ============================================================================
class SupabaseDbAdapter implements ParrillaDbAdapter {
  readonly backendMode: DbBackendMode = 'supabase';
  readonly supabaseConfigured = true;
  private readonly client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  private async ensureSettingsRow(): Promise<AppSettings & { adminPasscodeHash: string | null }> {
    const { data, error } = await this.client
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error) {
      throw new Error(`Supabase error reading app_settings: ${error.message}`);
    }
    if (!data) {
      const { data: inserted, error: insertError } = await this.client
        .from('app_settings')
        .upsert({
          id: 'default',
          voting_open: true,
          group_submissions_open: true,
          wall_posting_open: true,
          force_revealed: false,
          challenger_target_iso: DEFAULT_APP_SETTINGS.challengerTargetIso,
        })
        .select('*')
        .single();
      if (insertError) {
        throw new Error(`Supabase error seeding app_settings: ${insertError.message}`);
      }
      return {
        votingOpen: inserted.voting_open,
        groupSubmissionsOpen: inserted.group_submissions_open,
        wallPostingOpen: inserted.wall_posting_open,
        forceRevealed: inserted.force_revealed,
        challengerTargetIso: inserted.challenger_target_iso,
        adminPasscodeHash: inserted.admin_passcode_hash ?? null,
      };
    }

    return {
      votingOpen: data.voting_open,
      groupSubmissionsOpen: data.group_submissions_open,
      wallPostingOpen: data.wall_posting_open,
      forceRevealed: data.force_revealed,
      challengerTargetIso: data.challenger_target_iso,
      adminPasscodeHash: data.admin_passcode_hash ?? null,
    };
  }

  private async logModeration(
    action: string,
    targetType: ModerationLogEntry['targetType'],
    targetId: string,
    details: string
  ) {
    await this.client.from('moderation_logs').insert({
      id: `mod-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      action,
      target_type: targetType,
      target_id: targetId,
      details,
    });
  }

  private async fetchAllVotes(): Promise<VoteRecord[]> {
    const { data, error } = await this.client.from('tournament_votes').select('*');
    if (error) throw new Error(`Supabase votes error: ${error.message}`);
    return (data ?? []).map((row) => ({
      parrilleroId: row.parrillero_id,
      dayKey: row.day_key as DayVoteKey,
      cutId: row.cut_id as CutId,
      bossChoice: (row.boss_choice ?? null) as 'retador' | 'challenger' | null,
      updatedAt: row.updated_at,
    }));
  }

  async getPublicState(visitorId: string, parrilleroId?: string | null): Promise<PublicStateResponse> {
    const [settingsRow, votes, groupsRes, groupLikesRes, postsRes, commentsRes, firesRes, regCountRes] =
      await Promise.all([
        this.ensureSettingsRow(),
        this.fetchAllVotes(),
        this.client.from('friend_groups').select('*').order('created_at_ms', { ascending: false }),
        visitorId
          ? this.client.from('friend_group_likes').select('group_id').eq('visitor_id', visitorId)
          : Promise.resolve({ data: [], error: null }),
        this.client.from('experience_posts').select('*').order('created_at', { ascending: false }),
        this.client.from('post_comments').select('*').order('created_at', { ascending: true }),
        visitorId
          ? this.client.from('post_fires').select('post_id').eq('visitor_id', visitorId)
          : Promise.resolve({ data: [], error: null }),
        this.client.from('parrilleros').select('id', { count: 'exact', head: true }),
      ]);

    const activeProfile = parrilleroId ? await this.getRegistrationById(parrilleroId) : null;
    const cutVotes = aggregateCutVotes(votes);
    const userDayVotes = buildUserDayVotes(votes, activeProfile?.id ?? null);

    const likedGroupSet = new Set((groupLikesRes.data ?? []).map((r: { group_id: string }) => r.group_id));
    const firedPostSet = new Set((firesRes.data ?? []).map((r: { post_id: string }) => r.post_id));

    const commentsByPost = new Map<string, PostComment[]>();
    for (const c of commentsRes.data ?? []) {
      const list = commentsByPost.get(c.post_id) ?? [];
      list.push({
        id: c.id,
        author: c.author,
        text: c.text,
        cookingPoint: c.cooking_point ?? undefined,
        timestamp: c.timestamp_label,
      });
      commentsByPost.set(c.post_id, list);
    }

    const groups: FriendGroup[] = (groupsRes.data ?? []).map((g) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      zone: g.zone,
      neighborhood: g.neighborhood,
      captainName: g.captain_name,
      members: Array.isArray(g.members) ? g.members : [],
      favoriteCut: g.favorite_cut,
      motto: g.motto,
      likes: g.likes,
      likedByMe: likedGroupSet.has(g.id),
      createdAtMs: Number(g.created_at_ms),
      isMine: Boolean(visitorId && g.owner_visitor_id === visitorId),
    }));

    const posts: ExperiencePost[] = (postsRes.data ?? []).map((p) => ({
      id: p.id,
      authorName: p.author_name,
      authorCity: p.author_city,
      authorRank: p.author_rank,
      cookingPoint: p.cooking_point,
      caption: p.caption,
      image: p.image,
      fires: p.fires,
      hasFired: firedPostSet.has(p.id),
      timestamp: p.timestamp_label,
      comments: commentsByPost.get(p.id) ?? [],
    }));

    return {
      backendMode: this.backendMode,
      supabaseReady: true,
      settings: {
        votingOpen: settingsRow.votingOpen,
        groupSubmissionsOpen: settingsRow.groupSubmissionsOpen,
        wallPostingOpen: settingsRow.wallPostingOpen,
        forceRevealed: settingsRow.forceRevealed,
        challengerTargetIso: settingsRow.challengerTargetIso,
      },
      cutVotes,
      totalVotes: totalFromCutVotes(cutVotes),
      registeredCount: regCountRes.count ?? 0,
      profile: activeProfile,
      userDayVotes,
      groups,
      posts,
    };
  }

  async getAdminPasscodeHash(): Promise<string | null> {
    const s = await this.ensureSettingsRow();
    return s.adminPasscodeHash;
  }

  async setAdminPasscodeHash(hash: string): Promise<void> {
    const { error } = await this.client
      .from('app_settings')
      .update({ admin_passcode_hash: hash, updated_at: new Date().toISOString() })
      .eq('id', 'default');
    if (error) throw new Error(error.message);
    await this.logModeration('CLAIM_ADMIN', 'settings', 'admin', 'Clave de administrador configurada.');
  }

  async registerUser(input: {
    name: string;
    email: string;
    passwordHash: string;
    phone?: string;
    ci?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
    role?: UserRole;
  }): Promise<ParrilleroProfile> {
    const cleanEmail = input.email.trim().toLowerCase();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      throw new Error('Este correo ya está registrado con un Carnet. Iniciá sesión con tu contraseña.');
    }
    const isSuper = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();
    const { count } = await this.client
      .from('parrilleros')
      .select('id', { count: 'exact', head: true });
    const id = `parrillero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const memberNumber = isSuper ? 'PY-00001' : `PY-${10001 + (count ?? 0)}`;
    const createdAt = new Date().toISOString();
    const role: UserRole = isSuper ? 'superadmin' : (input.role || 'voter');

    const { error } = await this.client.from('parrilleros').insert({
      id,
      name: input.name.trim(),
      email: cleanEmail,
      password_hash: input.passwordHash,
      phone: input.phone?.trim() || null,
      ci: input.ci?.trim() || null,
      city: input.city.trim(),
      favorite_cut: input.favoriteCut,
      avatar_style: input.avatarStyle,
      rank: isSuper ? 'Maestro Parrillero Pilsen' : 'Aprendiz de Fuego',
      member_number: memberNumber,
      role,
      created_at: createdAt,
    });
    if (error) throw new Error(error.message);

    return {
      id,
      name: input.name.trim(),
      email: cleanEmail,
      phone: input.phone?.trim(),
      ci: input.ci?.trim(),
      city: input.city.trim(),
      favoriteCut: input.favoriteCut,
      avatarStyle: input.avatarStyle,
      rank: isSuper ? 'Maestro Parrillero Pilsen' : 'Aprendiz de Fuego',
      memberNumber,
      role,
      createdAt,
    };
  }

  async findUserByEmail(email: string): Promise<StoredRegistration | null> {
    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await this.client
      .from('parrilleros')
      .select('*')
      .ilike('email', cleanEmail)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email || cleanEmail,
      passwordHash: data.password_hash || '',
      phone: data.phone ?? undefined,
      ci: data.ci ?? undefined,
      city: data.city,
      favoriteCut: data.favorite_cut,
      avatarStyle: data.avatar_style,
      rank: data.rank,
      memberNumber: data.member_number,
      role: (data.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : data.role) || 'voter',
      createdAt: data.created_at,
    };
  }

  async findUserById(id: string): Promise<StoredRegistration | null> {
    const { data, error } = await this.client
      .from('parrilleros')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email || `votante-${data.member_number?.toLowerCase() || 'py'}@corte.pilsen.com.py`,
      passwordHash: data.password_hash || '',
      phone: data.phone ?? undefined,
      ci: data.ci ?? undefined,
      city: data.city,
      favoriteCut: data.favorite_cut,
      avatarStyle: data.avatar_style,
      rank: data.rank,
      memberNumber: data.member_number,
      role: (data.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : data.role) || 'voter',
      createdAt: data.created_at,
    };
  }

  async updateUser(id: string, patch: Partial<StoredRegistration>): Promise<ParrilleroProfile | null> {
    const updatePayload: Record<string, unknown> = {};
    if (patch.name) updatePayload.name = patch.name.trim();
    if (patch.city) updatePayload.city = patch.city.trim();
    if (patch.favoriteCut) updatePayload.favorite_cut = patch.favoriteCut;
    if (patch.avatarStyle) updatePayload.avatar_style = patch.avatarStyle;
    if (patch.phone !== undefined) updatePayload.phone = patch.phone?.trim() || null;
    if (patch.ci !== undefined) updatePayload.ci = patch.ci?.trim() || null;
    if (patch.passwordHash) updatePayload.password_hash = patch.passwordHash;
    if (patch.rank) updatePayload.rank = patch.rank;

    const { data, error } = await this.client
      .from('parrilleros')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email || '',
      phone: data.phone ?? undefined,
      ci: data.ci ?? undefined,
      city: data.city,
      favoriteCut: data.favorite_cut,
      avatarStyle: data.avatar_style,
      rank: data.rank,
      memberNumber: data.member_number,
      role: (data.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : data.role) || 'voter',
      createdAt: data.created_at,
    };
  }

  async changeAdminPassword(newHash: string): Promise<void> {
    await this.setAdminPasscodeHash(newHash);
    await this.client
      .from('parrilleros')
      .update({ password_hash: newHash })
      .ilike('email', SUPER_ADMIN_EMAIL);
    await this.logModeration(
      'CHANGE_ADMIN_PASSWORD',
      'settings',
      'admin',
      'Contraseña de Super Admin actualizada en Supabase.'
    );
  }

  async upsertRegistration(input: {
    existingId?: string | null;
    name: string;
    email?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
  }): Promise<ParrilleroProfile> {
    if (input.existingId) {
      const existing = await this.getRegistrationById(input.existingId);
      if (existing) {
        const { error } = await this.client
          .from('parrilleros')
          .update({
            name: input.name,
            city: input.city,
            favorite_cut: input.favoriteCut,
            avatar_style: input.avatarStyle,
          })
          .eq('id', existing.id);
        if (error) throw new Error(error.message);
        return {
          ...existing,
          name: input.name,
          city: input.city,
          favoriteCut: input.favoriteCut,
          avatarStyle: input.avatarStyle,
        };
      }
    }

    const { count } = await this.client
      .from('parrilleros')
      .select('id', { count: 'exact', head: true });
    const id = `parrillero-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const memberNumber = `PY-${10001 + (count ?? 0) + Math.floor(Math.random() * 5)}`;
    const createdAt = new Date().toISOString();

    const { error } = await this.client.from('parrilleros').insert({
      id,
      name: input.name,
      city: input.city,
      favorite_cut: input.favoriteCut,
      avatar_style: input.avatarStyle,
      rank: 'Aprendiz de Fuego',
      member_number: memberNumber,
      created_at: createdAt,
    });
    if (error) throw new Error(error.message);

    return {
      id,
      name: input.name,
      email: (input.email || '').trim().toLowerCase() || `votante-${memberNumber.toLowerCase()}@corte.pilsen.com.py`,
      city: input.city,
      favoriteCut: input.favoriteCut,
      avatarStyle: input.avatarStyle,
      rank: 'Aprendiz de Fuego',
      memberNumber,
      createdAt,
    };
  }

  async getRegistrationById(id: string): Promise<ParrilleroProfile | null> {
    const { data, error } = await this.client
      .from('parrilleros')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      email: data.email || `votante-${(data.member_number || 'py').toLowerCase()}@corte.pilsen.com.py`,
      phone: data.phone ?? undefined,
      ci: data.ci ?? undefined,
      city: data.city,
      favoriteCut: data.favorite_cut,
      avatarStyle: data.avatar_style,
      rank: data.rank,
      memberNumber: data.member_number,
      role: (data.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : data.role) || 'voter',
      createdAt: data.created_at,
    };
  }

  async getUserDayVotes(parrilleroId: string): Promise<TournamentState['userDayVotes']> {
    const { data } = await this.client
      .from('tournament_votes')
      .select('*')
      .eq('parrillero_id', parrilleroId);
    const votes: VoteRecord[] = (data ?? []).map((row) => ({
      parrilleroId: row.parrillero_id,
      dayKey: row.day_key as DayVoteKey,
      cutId: row.cut_id as CutId,
      bossChoice: (row.boss_choice ?? null) as 'retador' | 'challenger' | null,
      updatedAt: row.updated_at,
    }));
    return buildUserDayVotes(votes, parrilleroId);
  }

  async castVote(input: {
    parrilleroId: string;
    dayKey: DayVoteKey;
    cutId: CutId;
    bossChoice: 'retador' | 'challenger' | null;
  }): Promise<void> {
    const { error } = await this.client.from('tournament_votes').upsert(
      {
        id: `${input.parrilleroId}:${input.dayKey}`,
        parrillero_id: input.parrilleroId,
        day_key: input.dayKey,
        cut_id: input.cutId,
        boss_choice: input.bossChoice,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'parrillero_id,day_key' }
    );
    if (error) throw new Error(error.message);
  }

  async createFriendGroup(input: {
    visitorId: string;
    name: string;
    zone: Exclude<GroupZoneFilter, 'Todas'>;
    neighborhood: string;
    captainName: string;
    members: string[];
    favoriteCut: string;
    motto: string;
  }): Promise<FriendGroup> {
    const { count } = await this.client
      .from('friend_groups')
      .select('id', { count: 'exact', head: true });
    const id = `grp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const code = `#GRP-${String(101 + (count ?? 0) + Math.floor(Math.random() * 5)).padStart(4, '0')}`;
    const createdAtMs = Date.now();

    const { error } = await this.client.from('friend_groups').insert({
      id,
      code,
      name: input.name,
      zone: input.zone,
      neighborhood: input.neighborhood,
      captain_name: input.captainName,
      members: input.members,
      favorite_cut: input.favoriteCut,
      motto: input.motto,
      likes: 1,
      created_at_ms: createdAtMs,
      owner_visitor_id: input.visitorId,
      is_seeded: false,
    });
    if (error) throw new Error(error.message);

    await this.client
      .from('friend_group_likes')
      .upsert({ group_id: id, visitor_id: input.visitorId });

    return {
      id,
      code,
      name: input.name,
      zone: input.zone,
      neighborhood: input.neighborhood,
      captainName: input.captainName,
      members: input.members,
      favoriteCut: input.favoriteCut,
      motto: input.motto,
      likes: 1,
      likedByMe: true,
      createdAtMs,
      isMine: true,
    };
  }

  async toggleGroupLike(groupId: string, visitorId: string): Promise<boolean> {
    const { data: group } = await this.client
      .from('friend_groups')
      .select('id, likes')
      .eq('id', groupId)
      .maybeSingle();
    if (!group) return false;

    const { data: existingLike } = await this.client
      .from('friend_group_likes')
      .select('group_id')
      .eq('group_id', groupId)
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (existingLike) {
      await this.client
        .from('friend_group_likes')
        .delete()
        .eq('group_id', groupId)
        .eq('visitor_id', visitorId);
      await this.client
        .from('friend_groups')
        .update({ likes: Math.max(0, Number(group.likes) - 1) })
        .eq('id', groupId);
    } else {
      await this.client
        .from('friend_group_likes')
        .insert({ group_id: groupId, visitor_id: visitorId });
      await this.client
        .from('friend_groups')
        .update({ likes: Number(group.likes) + 1 })
        .eq('id', groupId);
    }
    return true;
  }

  async createPost(input: {
    authorName: string;
    authorCity: string;
    authorRank: ParrilleroProfile['rank'];
    cookingPoint: ExperiencePost['cookingPoint'];
    caption: string;
    image: string;
  }): Promise<ExperiencePost> {
    const id = `post-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await this.client.from('experience_posts').insert({
      id,
      author_name: input.authorName,
      author_city: input.authorCity,
      author_rank: input.authorRank,
      cooking_point: input.cookingPoint,
      caption: input.caption,
      image: input.image,
      fires: 1,
      timestamp_label: 'Recién ahora',
    });
    if (error) throw new Error(error.message);

    return {
      id,
      authorName: input.authorName,
      authorCity: input.authorCity,
      authorRank: input.authorRank,
      cookingPoint: input.cookingPoint,
      caption: input.caption,
      image: input.image,
      fires: 1,
      hasFired: true,
      timestamp: 'Recién ahora',
      comments: [],
    };
  }

  async togglePostFire(postId: string, visitorId: string): Promise<boolean> {
    const { data: post } = await this.client
      .from('experience_posts')
      .select('id, fires')
      .eq('id', postId)
      .maybeSingle();
    if (!post) return false;

    const { data: existingFire } = await this.client
      .from('post_fires')
      .select('post_id')
      .eq('post_id', postId)
      .eq('visitor_id', visitorId)
      .maybeSingle();

    if (existingFire) {
      await this.client
        .from('post_fires')
        .delete()
        .eq('post_id', postId)
        .eq('visitor_id', visitorId);
      await this.client
        .from('experience_posts')
        .update({ fires: Math.max(0, Number(post.fires) - 1) })
        .eq('id', postId);
    } else {
      await this.client
        .from('post_fires')
        .insert({ post_id: postId, visitor_id: visitorId });
      await this.client
        .from('experience_posts')
        .update({ fires: Number(post.fires) + 1 })
        .eq('id', postId);
    }
    return true;
  }

  async addComment(input: {
    postId: string;
    author: string;
    text: string;
  }): Promise<PostComment | null> {
    const { data: post } = await this.client
      .from('experience_posts')
      .select('id')
      .eq('id', input.postId)
      .maybeSingle();
    if (!post) return null;

    const comment: PostComment = {
      id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      author: input.author,
      text: input.text,
      timestamp: 'Ahora',
    };
    const { error } = await this.client.from('post_comments').insert({
      id: comment.id,
      post_id: input.postId,
      author: comment.author,
      text: comment.text,
      timestamp_label: comment.timestamp,
    });
    if (error) throw new Error(error.message);
    return comment;
  }

  async getAdminOverview(): Promise<AdminOverviewResponse> {
    const [pub, regsRes, votes, logsRes] = await Promise.all([
      this.getPublicState('', null),
      this.client.from('parrilleros').select('*').order('created_at', { ascending: false }),
      this.fetchAllVotes(),
      this.client
        .from('moderation_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const registrations: AdminRegisteredVoter[] = (regsRes.data ?? []).map((r) => {
      const profile: ParrilleroProfile = {
        id: r.id,
        name: r.name,
        email: r.email || `votante-${(r.member_number || 'py').toLowerCase()}@corte.pilsen.com.py`,
        phone: r.phone ?? undefined,
        ci: r.ci ?? undefined,
        city: r.city,
        favoriteCut: r.favorite_cut,
        avatarStyle: r.avatar_style,
        rank: r.rank,
        memberNumber: r.member_number,
        role: (r.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() ? 'superadmin' : r.role) || 'voter',
        createdAt: r.created_at,
      };
      const userVotes = votes.filter((v) => v.parrilleroId === profile.id);
      return {
        profile,
        votesCount: userVotes.length,
        dayVotes: buildUserDayVotes(votes, profile.id),
      };
    });

    const moderationLog: ModerationLogEntry[] = (logsRes.data ?? []).map((l) => ({
      id: l.id,
      action: l.action,
      targetType: l.target_type,
      targetId: l.target_id,
      details: l.details,
      createdAt: l.created_at,
    }));

    return {
      backendMode: this.backendMode,
      supabaseConfigured: true,
      settings: pub.settings,
      cutVotes: pub.cutVotes,
      totalVotes: pub.totalVotes,
      registrations,
      groups: pub.groups,
      posts: pub.posts,
      moderationLog,
    };
  }

  async updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.ensureSettingsRow();
    const next: AppSettings = {
      votingOpen: patch.votingOpen ?? current.votingOpen,
      groupSubmissionsOpen: patch.groupSubmissionsOpen ?? current.groupSubmissionsOpen,
      wallPostingOpen: patch.wallPostingOpen ?? current.wallPostingOpen,
      forceRevealed: patch.forceRevealed ?? current.forceRevealed,
      challengerTargetIso: patch.challengerTargetIso ?? current.challengerTargetIso,
    };
    const { error } = await this.client
      .from('app_settings')
      .update({
        voting_open: next.votingOpen,
        group_submissions_open: next.groupSubmissionsOpen,
        wall_posting_open: next.wallPostingOpen,
        force_revealed: next.forceRevealed,
        challenger_target_iso: next.challengerTargetIso,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default');
    if (error) throw new Error(error.message);

    await this.logModeration(
      'UPDATE_SETTINGS',
      'settings',
      'default',
      `Configuración actualizada: votación=${next.votingOpen ? 'ON' : 'OFF'}, postulaciones=${next.groupSubmissionsOpen ? 'ON' : 'OFF'}, muro=${next.wallPostingOpen ? 'ON' : 'OFF'}, corte_revelado=${next.forceRevealed ? 'SI' : 'NO'}`
    );
    return next;
  }

  async deleteFriendGroup(groupId: string): Promise<boolean> {
    const { data: existing } = await this.client
      .from('friend_groups')
      .select('id, name, code')
      .eq('id', groupId)
      .maybeSingle();
    if (!existing) return false;
    const { error } = await this.client.from('friend_groups').delete().eq('id', groupId);
    if (error) throw new Error(error.message);
    await this.logModeration(
      'DELETE_GROUP',
      'group',
      groupId,
      `Postulación eliminada: "${existing.name}" (${existing.code})`
    );
    return true;
  }

  async deletePost(postId: string): Promise<boolean> {
    const { data: existing } = await this.client
      .from('experience_posts')
      .select('id, author_name')
      .eq('id', postId)
      .maybeSingle();
    if (!existing) return false;
    const { error } = await this.client.from('experience_posts').delete().eq('id', postId);
    if (error) throw new Error(error.message);
    await this.logModeration(
      'DELETE_POST',
      'post',
      postId,
      `Publicación del muro eliminada (autor: ${existing.author_name})`
    );
    return true;
  }

  async deleteComment(postId: string, commentId: string): Promise<boolean> {
    const { data: existing } = await this.client
      .from('post_comments')
      .select('id')
      .eq('id', commentId)
      .eq('post_id', postId)
      .maybeSingle();
    if (!existing) return false;
    const { error } = await this.client.from('post_comments').delete().eq('id', commentId);
    if (error) throw new Error(error.message);
    await this.logModeration(
      'DELETE_COMMENT',
      'comment',
      commentId,
      `Comentario eliminado en publicación ${postId}`
    );
    return true;
  }

  async deleteRegistration(parrilleroId: string): Promise<boolean> {
    const { data: existing } = await this.client
      .from('parrilleros')
      .select('id, name, member_number')
      .eq('id', parrilleroId)
      .maybeSingle();
    if (!existing) return false;
    const { error } = await this.client.from('parrilleros').delete().eq('id', parrilleroId);
    if (error) throw new Error(error.message);
    await this.logModeration(
      'DELETE_REGISTRATION',
      'registration',
      parrilleroId,
      `Registro eliminado: ${existing.name} (${existing.member_number})`
    );
    return true;
  }

  async resetAllVotes(): Promise<number> {
    const { count } = await this.client
      .from('tournament_votes')
      .select('id', { count: 'exact', head: true });
    const { error } = await this.client.from('tournament_votes').delete().neq('id', '');
    if (error) throw new Error(error.message);
    await this.logModeration(
      'RESET_VOTES',
      'votes',
      'all',
      `Se reinició el torneo: ${count ?? 0} votos eliminados`
    );
    return count ?? 0;
  }
}

export function createDbAdapter(): ParrillaDbAdapter {
  const supabaseUrl = process.env.SUPABASE_URL?.trim();
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (supabaseUrl && supabaseServiceKey) {
    return new SupabaseDbAdapter(supabaseUrl, supabaseServiceKey);
  }

  const dataDir = path.resolve(process.cwd(), '.data');
  return new LocalFileDbAdapter(dataDir);
}
