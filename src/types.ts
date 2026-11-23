export type CutId =
  | 'costilla'
  | 'tira_fina'
  | 'vacio'
  | 'entrana'
  | 'colita'
  | 'bife_chorizo'
  | 'tapa'
  | 'ojo_bife'
  | 'retador';

export interface MeatCut {
  id: CutId;
  shortLabel: string;
  name: string;
  nickname: string;
  regionNote: string;
  cookingTip: string;
  flavorScore: number;
  juiciness: number;
  baseVotes: number;
  image: string;
  description: string;
}

export type DayNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type TournamentPhase =
  | 'day1'
  | 'day2'
  | 'day3'
  | 'day4'
  | 'day5'
  | 'day6'
  | 'day7_tradicional'
  | 'boss_alert'
  | 'boss_battle'
  | 'crowned';

export type DayVoteKey =
  | 'day1'
  | 'day2'
  | 'day3'
  | 'day4'
  | 'day5'
  | 'day6'
  | 'day7Tradicional'
  | 'day7Boss';

export interface TournamentState {
  activeDay: DayNumber;
  phase: TournamentPhase;
  winners: {
    day1: CutId | null;
    day2: CutId | null;
    day3: CutId | null;
    day4: CutId | null;
    day5: CutId | null;
    day6: CutId | null;
    day7Tradicional: CutId | null;
  };
  bossChoice: 'retador' | 'challenger' | null;
  cutVotes: Record<CutId, number>;
  userDayVotes: {
    day1: CutId | null;
    day2: CutId | null;
    day3: CutId | null;
    day4: CutId | null;
    day5: CutId | null;
    day6: CutId | null;
    day7Tradicional: CutId | null;
    day7Boss: 'retador' | 'challenger' | null;
  };
}

export interface LeaderboardEntry {
  id: CutId;
  name: string;
  votes: number;
  percentage: number;
  isLeading: boolean;
  userVoted: boolean;
}

export type ZoneFilter = 'Todas' | 'Asunción' | 'Gran Asunción' | 'Ciudad del Este';
export type AllyCategory = 'carniceria' | 'restaurante';

export interface AllyLocation {
  id: string;
  name: string;
  category: AllyCategory;
  zone: Exclude<ZoneFilter, 'Todas'>;
  neighborhood: string;
  address: string;
  hours: string;
  promoText: string;
  promoCode: string;
  mapsQuery: string;
  highlightDish?: string;
}

export type ParrilleroRank =
  | 'Aprendiz de Fuego'
  | 'Asador de Domingo'
  | 'Maestro Parrillero Pilsen';

export type UserRole = 'voter' | 'superadmin';

export interface ParrilleroProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ci?: string;
  city: string;
  favoriteCut: string;
  avatarStyle: 'brasa' | 'chop' | 'estaca' | 'cuchillo';
  rank: ParrilleroRank;
  memberNumber: string;
  role?: UserRole;
  createdAt: string;
}

export interface PostComment {
  id: string;
  author: string;
  text: string;
  cookingPoint?: string;
  timestamp: string;
}

export interface ExperiencePost {
  id: string;
  authorName: string;
  authorCity: string;
  authorRank: ParrilleroRank;
  cookingPoint: 'Jugoso' | 'A Punto' | 'Bien Cocido' | 'Vuelta y Vuelta';
  caption: string;
  image: string;
  fires: number;
  hasFired: boolean;
  timestamp: string;
  comments: PostComment[];
}

export type GroupZoneFilter =
  | 'Todas'
  | 'Asunción'
  | 'Gran Asunción'
  | 'Ciudad del Este'
  | 'Interior';

export type GroupSortOrder = 'likes' | 'recent' | 'name';
export type GroupQuickFilter = 'all' | 'top3' | 'liked' | 'mine';

export interface FriendGroup {
  id: string;
  code: string;
  name: string;
  zone: Exclude<GroupZoneFilter, 'Todas'>;
  neighborhood: string;
  captainName: string;
  members: string[];
  favoriteCut: string;
  motto: string;
  likes: number;
  likedByMe: boolean;
  createdAtMs: number;
  isMine?: boolean;
}

export type DbBackendMode = 'supabase' | 'local_file';

export interface AppSettings {
  votingOpen: boolean;
  groupSubmissionsOpen: boolean;
  wallPostingOpen: boolean;
  forceRevealed: boolean;
  challengerTargetIso: string;
}

export interface ModerationLogEntry {
  id: string;
  action: string;
  targetType: 'settings' | 'group' | 'post' | 'comment' | 'registration' | 'votes';
  targetId: string;
  details: string;
  createdAt: string;
}

export interface PublicStateResponse {
  backendMode: DbBackendMode;
  supabaseReady: boolean;
  settings: AppSettings;
  cutVotes: Record<CutId, number>;
  totalVotes: number;
  registeredCount: number;
  profile: ParrilleroProfile | null;
  userDayVotes: TournamentState['userDayVotes'];
  groups: FriendGroup[];
  posts: ExperiencePost[];
}

export type AdminAuthMode = 'env_passcode' | 'claimed_hash' | 'unclaimed';

export interface AdminStatusResponse {
  authMode: AdminAuthMode;
  authenticated: boolean;
  backendMode: DbBackendMode;
  supabaseConfigured: boolean;
  superAdminEmail?: string;
  currentAdminEmail?: string | null;
}

export interface AuthSessionResponse {
  profile: ParrilleroProfile;
  token: string;
  role: UserRole;
  isAdmin: boolean;
}

export interface AuthMeResponse {
  authenticated: boolean;
  profile: ParrilleroProfile | null;
  role?: UserRole;
  isAdmin?: boolean;
}

export interface AdminRegisteredVoter {
  profile: ParrilleroProfile;
  votesCount: number;
  dayVotes: TournamentState['userDayVotes'];
}

export interface AdminOverviewResponse {
  backendMode: DbBackendMode;
  supabaseConfigured: boolean;
  settings: AppSettings;
  cutVotes: Record<CutId, number>;
  totalVotes: number;
  registrations: AdminRegisteredVoter[];
  groups: FriendGroup[];
  posts: ExperiencePost[];
  moderationLog: ModerationLogEntry[];
}

