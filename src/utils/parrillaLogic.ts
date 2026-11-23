import { CHALLENGER_REVEAL_TARGET_ISO, MEAT_CUTS } from '../data/campaignData';
import {
  AllyCategory,
  AllyLocation,
  CutId,
  DayNumber,
  FriendGroup,
  GroupQuickFilter,
  GroupSortOrder,
  GroupZoneFilter,
  LeaderboardEntry,
  ParrilleroProfile,
  ParrilleroRank,
  TournamentState,
  ZoneFilter,
} from '../types';

export function canUserVote(profile: ParrilleroProfile | null): boolean {
  return profile !== null && profile.name.trim().length >= 2;
}

export function isChallengerRevealed(
  state: TournamentState,
  nowTimestampMs: number = Date.now(),
  forceRevealed: boolean = false
): boolean {
  if (forceRevealed) {
    return true;
  }
  if (state.phase === 'boss_battle' || state.phase === 'crowned' || state.bossChoice !== null) {
    return true;
  }
  const targetMs = new Date(CHALLENGER_REVEAL_TARGET_ISO).getTime();
  return computeCountdown(targetMs, nowTimestampMs).isComplete;
}

export function createEmptyCutVotes(): Record<CutId, number> {
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

export function createEmptyUserDayVotes(): TournamentState['userDayVotes'] {
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

export function getInitialTournamentState(): TournamentState {
  return {
    activeDay: 1,
    phase: 'day1',
    winners: {
      day1: null,
      day2: null,
      day3: null,
      day4: null,
      day5: null,
      day6: null,
      day7Tradicional: null,
    },
    bossChoice: null,
    cutVotes: createEmptyCutVotes(),
    userDayVotes: createEmptyUserDayVotes(),
  };
}

export function buildTournamentStateFromVotes(
  cutVotes: Record<CutId, number>,
  userDayVotes: TournamentState['userDayVotes'],
  preferredActiveDay?: DayNumber,
  forceBossBattlePhase?: boolean
): TournamentState {
  const winners: TournamentState['winners'] = {
    day1: userDayVotes.day1,
    day2: userDayVotes.day2,
    day3: userDayVotes.day3,
    day4: userDayVotes.day4,
    day5: userDayVotes.day5,
    day6: userDayVotes.day6,
    day7Tradicional: userDayVotes.day7Tradicional,
  };
  const bossChoice = userDayVotes.day7Boss ?? null;

  let computedDay: DayNumber = 1;
  let computedPhase: TournamentState['phase'] = 'day1';

  if (bossChoice !== null) {
    computedDay = 7;
    computedPhase = 'crowned';
  } else if (winners.day7Tradicional !== null) {
    computedDay = 7;
    computedPhase = forceBossBattlePhase ? 'boss_battle' : 'boss_alert';
  } else if (winners.day6 !== null) {
    computedDay = 7;
    computedPhase = 'day7_tradicional';
  } else if (winners.day5 !== null) {
    computedDay = 6;
    computedPhase = 'day6';
  } else if (winners.day4 !== null) {
    computedDay = 5;
    computedPhase = 'day5';
  } else if (winners.day3 !== null) {
    computedDay = 4;
    computedPhase = 'day4';
  } else if (winners.day2 !== null) {
    computedDay = 3;
    computedPhase = 'day3';
  } else if (winners.day1 !== null) {
    computedDay = 2;
    computedPhase = 'day2';
  }

  const baseState: TournamentState = {
    activeDay: computedDay,
    phase: computedPhase,
    winners,
    bossChoice,
    cutVotes: { ...createEmptyCutVotes(), ...cutVotes },
    userDayVotes: { ...createEmptyUserDayVotes(), ...userDayVotes },
  };

  if (preferredActiveDay && isDayUnlocked(baseState, preferredActiveDay)) {
    return selectTournamentDay(baseState, preferredActiveDay);
  }
  return baseState;
}

export interface MatchupPair {
  day: DayNumber;
  roundLabel: string;
  title: string;
  leftId: CutId;
  rightId: CutId;
}

export function getCurrentMatchup(state: TournamentState): MatchupPair | null {
  switch (state.phase) {
    case 'day1':
      return {
        day: 1,
        roundLabel: 'Día 1 · Lunes · Cuartos Llave 1',
        title: 'Duelo de Costillas',
        leftId: 'costilla',
        rightId: 'tira_fina',
      };
    case 'day2':
      return {
        day: 2,
        roundLabel: 'Día 2 · Martes · Cuartos Llave 2',
        title: 'Membrana y Brasa Viva',
        leftId: 'vacio',
        rightId: 'entrana',
      };
    case 'day3':
      return {
        day: 3,
        roundLabel: 'Día 3 · Miércoles · Cuartos Llave 3',
        title: 'Terneza de Punta a Punta',
        leftId: 'colita',
        rightId: 'bife_chorizo',
      };
    case 'day4':
      return {
        day: 4,
        roundLabel: 'Día 4 · Jueves · Cuartos Llave 4',
        title: 'Marmoleado y Grasa Dorada',
        leftId: 'tapa',
        rightId: 'ojo_bife',
      };
    case 'day5':
      if (!state.winners.day1 || !state.winners.day2) return null;
      return {
        day: 5,
        roundLabel: 'Día 5 · Viernes · Semifinal A',
        title: 'Finalista del Lado A',
        leftId: state.winners.day1,
        rightId: state.winners.day2,
      };
    case 'day6':
      if (!state.winners.day3 || !state.winners.day4) return null;
      return {
        day: 6,
        roundLabel: 'Día 6 · Sábado · Semifinal B',
        title: 'Finalista del Lado B',
        leftId: state.winners.day3,
        rightId: state.winners.day4,
      };
    case 'day7_tradicional':
      if (!state.winners.day5 || !state.winners.day6) return null;
      return {
        day: 7,
        roundLabel: 'Día 7 · Domingo · Final Tradicional',
        title: 'Elegí al Campeón Tradicional de la Semana',
        leftId: state.winners.day5,
        rightId: state.winners.day6,
      };
    default:
      return null;
  }
}

export function isDayUnlocked(state: TournamentState, day: DayNumber): boolean {
  if (day === 1) return true;
  if (day === 2) return state.winners.day1 !== null;
  if (day === 3) return state.winners.day2 !== null;
  if (day === 4) return state.winners.day3 !== null;
  if (day === 5) return state.winners.day1 !== null && state.winners.day2 !== null && state.winners.day4 !== null;
  if (day === 6) return state.winners.day5 !== null;
  if (day === 7) return state.winners.day6 !== null;
  return false;
}

export function selectTournamentDay(state: TournamentState, day: DayNumber): TournamentState {
  if (!isDayUnlocked(state, day)) return state;
  if (day === 1) return { ...state, activeDay: 1, phase: 'day1' };
  if (day === 2) return { ...state, activeDay: 2, phase: 'day2' };
  if (day === 3) return { ...state, activeDay: 3, phase: 'day3' };
  if (day === 4) return { ...state, activeDay: 4, phase: 'day4' };
  if (day === 5) return { ...state, activeDay: 5, phase: 'day5' };
  if (day === 6) return { ...state, activeDay: 6, phase: 'day6' };
  if (day === 7) {
    if (state.bossChoice !== null) {
      return { ...state, activeDay: 7, phase: 'crowned' };
    }
    if (state.winners.day7Tradicional !== null) {
      return { ...state, activeDay: 7, phase: 'boss_battle' };
    }
    return { ...state, activeDay: 7, phase: 'day7_tradicional' };
  }
  return state;
}

function applyRoundVote(
  cutVotes: Record<CutId, number>,
  previousVote: CutId | null,
  newVote: CutId
): Record<CutId, number> {
  const next = { ...cutVotes };
  if (previousVote === newVote) return next;
  if (previousVote) {
    next[previousVote] = Math.max(0, next[previousVote] - 1);
  }
  next[newVote] = (next[newVote] ?? 0) + 1;
  return next;
}

export function advanceTournamentVote(state: TournamentState, chosenId: CutId): TournamentState {
  if (state.phase === 'day1') {
    if (chosenId !== 'costilla' && chosenId !== 'tira_fina') return state;
    return {
      ...state,
      activeDay: 2,
      phase: 'day2',
      winners: { ...state.winners, day1: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day1, chosenId),
      userDayVotes: { ...state.userDayVotes, day1: chosenId },
    };
  }
  if (state.phase === 'day2') {
    if (chosenId !== 'vacio' && chosenId !== 'entrana') return state;
    return {
      ...state,
      activeDay: 3,
      phase: 'day3',
      winners: { ...state.winners, day2: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day2, chosenId),
      userDayVotes: { ...state.userDayVotes, day2: chosenId },
    };
  }
  if (state.phase === 'day3') {
    if (chosenId !== 'colita' && chosenId !== 'bife_chorizo') return state;
    return {
      ...state,
      activeDay: 4,
      phase: 'day4',
      winners: { ...state.winners, day3: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day3, chosenId),
      userDayVotes: { ...state.userDayVotes, day3: chosenId },
    };
  }
  if (state.phase === 'day4') {
    if (chosenId !== 'tapa' && chosenId !== 'ojo_bife') return state;
    return {
      ...state,
      activeDay: 5,
      phase: 'day5',
      winners: { ...state.winners, day4: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day4, chosenId),
      userDayVotes: { ...state.userDayVotes, day4: chosenId },
    };
  }
  if (state.phase === 'day5') {
    if (chosenId !== state.winners.day1 && chosenId !== state.winners.day2) return state;
    return {
      ...state,
      activeDay: 6,
      phase: 'day6',
      winners: { ...state.winners, day5: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day5, chosenId),
      userDayVotes: { ...state.userDayVotes, day5: chosenId },
    };
  }
  if (state.phase === 'day6') {
    if (chosenId !== state.winners.day3 && chosenId !== state.winners.day4) return state;
    return {
      ...state,
      activeDay: 7,
      phase: 'day7_tradicional',
      winners: { ...state.winners, day6: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day6, chosenId),
      userDayVotes: { ...state.userDayVotes, day6: chosenId },
    };
  }
  if (state.phase === 'day7_tradicional') {
    if (chosenId !== state.winners.day5 && chosenId !== state.winners.day6) return state;
    return {
      ...state,
      activeDay: 7,
      phase: 'boss_alert',
      winners: { ...state.winners, day7Tradicional: chosenId },
      cutVotes: applyRoundVote(state.cutVotes, state.userDayVotes.day7Tradicional, chosenId),
      userDayVotes: { ...state.userDayVotes, day7Tradicional: chosenId },
    };
  }
  return state;
}

export function revealBossBattle(state: TournamentState): TournamentState {
  if (state.phase !== 'boss_alert') return state;
  return {
    ...state,
    phase: 'boss_battle',
  };
}

export function castFinalBossVote(
  state: TournamentState,
  choice: 'retador' | 'challenger'
): TournamentState {
  if (state.phase !== 'boss_battle' && state.phase !== 'crowned') return state;
  if (state.bossChoice === choice) return state;

  const challengerId = state.winners.day7Tradicional ?? 'tapa';
  const nextVotes = { ...state.cutVotes };

  if (state.bossChoice === 'retador') {
    nextVotes.retador = Math.max(0, nextVotes.retador - 1);
  } else if (state.bossChoice === 'challenger') {
    nextVotes[challengerId] = Math.max(0, nextVotes[challengerId] - 1);
  }

  if (choice === 'retador') {
    nextVotes.retador += 1;
  } else {
    nextVotes[challengerId] += 1;
  }

  return {
    ...state,
    activeDay: 7,
    phase: 'crowned',
    bossChoice: choice,
    cutVotes: nextVotes,
    userDayVotes: {
      ...state.userDayVotes,
      day7Boss: choice,
    },
  };
}

export function getTournamentLeaderboard(state: TournamentState): LeaderboardEntry[] {
  const ids: CutId[] = [
    'retador',
    'tapa',
    'vacio',
    'costilla',
    'ojo_bife',
    'colita',
    'bife_chorizo',
    'entrana',
    'tira_fina',
  ];
  const total = ids.reduce((sum, id) => sum + (state.cutVotes[id] ?? 0), 0);
  const userVotedIds = new Set<CutId>();

  if (state.userDayVotes.day1) userVotedIds.add(state.userDayVotes.day1);
  if (state.userDayVotes.day2) userVotedIds.add(state.userDayVotes.day2);
  if (state.userDayVotes.day3) userVotedIds.add(state.userDayVotes.day3);
  if (state.userDayVotes.day4) userVotedIds.add(state.userDayVotes.day4);
  if (state.userDayVotes.day5) userVotedIds.add(state.userDayVotes.day5);
  if (state.userDayVotes.day6) userVotedIds.add(state.userDayVotes.day6);
  if (state.userDayVotes.day7Tradicional) userVotedIds.add(state.userDayVotes.day7Tradicional);
  if (state.userDayVotes.day7Boss === 'retador') userVotedIds.add('retador');
  if (state.userDayVotes.day7Boss === 'challenger' && state.winners.day7Tradicional) {
    userVotedIds.add(state.winners.day7Tradicional);
  }

  const sorted = ids
    .map((id) => {
      const votes = state.cutVotes[id] ?? 0;
      return {
        id,
        name: MEAT_CUTS[id].name,
        votes,
        percentage: total > 0 ? Math.round((votes / total) * 100) : 0,
        isLeading: false,
        userVoted: userVotedIds.has(id),
      };
    })
    .sort((a, b) => b.votes - a.votes);

  if (sorted.length > 0 && sorted[0].votes > 0) {
    sorted[0].isLeading = true;
  }
  return sorted;
}

export interface MatchupSplit {
  leftPct: number;
  rightPct: number;
  hasVotes: boolean;
  leader: 'left' | 'right' | 'tie';
}

export function computeMatchupSplit(leftVotes: number, rightVotes: number): MatchupSplit {
  const total = leftVotes + rightVotes;
  if (total <= 0) {
    return {
      leftPct: 0,
      rightPct: 0,
      hasVotes: false,
      leader: 'tie',
    };
  }
  const leftPct = Math.round((leftVotes / total) * 100);
  const rightPct = 100 - leftPct;
  const leader = leftVotes > rightVotes ? 'left' : rightVotes > leftVotes ? 'right' : 'tie';
  return {
    leftPct,
    rightPct,
    hasVotes: true,
    leader,
  };
}

export function filterAliados(
  items: AllyLocation[],
  zone: ZoneFilter,
  category: AllyCategory
): AllyLocation[] {
  return items.filter((item) => {
    const matchesCategory = item.category === category;
    const matchesZone = zone === 'Todas' || item.zone === zone;
    return matchesCategory && matchesZone;
  });
}

export const MIN_GROUP_FRIENDS = 2;
export const MAX_GROUP_FRIENDS = 10;

export function computeParrilleroRank(
  hasVotedBoss: boolean,
  postsCount: number,
  likedOrOwnedGroupsCount: number
): ParrilleroRank {
  const score = (hasVotedBoss ? 2 : 0) + postsCount * 2 + likedOrOwnedGroupsCount;
  if (score >= 3) return 'Maestro Parrillero Pilsen';
  if (score >= 1) return 'Asador de Domingo';
  return 'Aprendiz de Fuego';
}

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isComplete: boolean;
}

export function computeCountdown(targetTimestampMs: number, nowTimestampMs: number): CountdownParts {
  const diff = Math.max(0, targetTimestampMs - nowTimestampMs);
  if (diff === 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isComplete: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds, isComplete: false };
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function toggleFriendGroupLike(
  groups: FriendGroup[],
  groupId: string
): FriendGroup[] {
  return groups.map((group) => {
    if (group.id !== groupId) return group;
    const nextLiked = !group.likedByMe;
    return {
      ...group,
      likedByMe: nextLiked,
      likes: Math.max(0, group.likes + (nextLiked ? 1 : -1)),
    };
  });
}

export interface GroupFilterOptions {
  query: string;
  zone: GroupZoneFilter;
  quickFilter: GroupQuickFilter;
  sortBy: GroupSortOrder;
}

export function getTopGroupIds(groups: FriendGroup[], count = 3): Set<string> {
  const sortedByLikes = [...groups].sort((a, b) => b.likes - a.likes);
  return new Set(sortedByLikes.slice(0, count).map((g) => g.id));
}

export function filterAndSortFriendGroups(
  groups: FriendGroup[],
  options: GroupFilterOptions
): FriendGroup[] {
  const normalizedQuery = normalizeSearchText(options.query);
  const top3Ids = getTopGroupIds(groups, 3);

  const filtered = groups.filter((group) => {
    if (options.zone !== 'Todas' && group.zone !== options.zone) {
      return false;
    }
    if (options.quickFilter === 'top3' && !top3Ids.has(group.id)) {
      return false;
    }
    if (options.quickFilter === 'liked' && !group.likedByMe) {
      return false;
    }
    if (options.quickFilter === 'mine' && !group.isMine) {
      return false;
    }
    if (!normalizedQuery) return true;

    const haystack = normalizeSearchText(
      [
        group.name,
        group.code,
        group.zone,
        group.neighborhood,
        group.captainName,
        group.favoriteCut,
        group.motto,
        ...group.members,
      ].join(' ')
    );
    return haystack.includes(normalizedQuery);
  });

  return [...filtered].sort((a, b) => {
    if (options.sortBy === 'recent') {
      return b.createdAtMs - a.createdAtMs;
    }
    if (options.sortBy === 'name') {
      return a.name.localeCompare(b.name, 'es');
    }
    if (b.likes !== a.likes) {
      return b.likes - a.likes;
    }
    return b.createdAtMs - a.createdAtMs;
  });
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateRegistrationInput(data: {
  name: string;
  email: string;
  password?: string;
  city: string;
  favoriteCut: string;
}): string | null {
  if (data.name.trim().length < 2) {
    return 'Ingresá tu nombre o apodo parrillero (mínimo 2 caracteres).';
  }
  if (!validateEmail(data.email)) {
    return 'Ingresá un correo electrónico válido.';
  }
  if (data.password !== undefined && data.password.trim().length < 6) {
    return 'La contraseña debe tener al menos 6 caracteres para proteger tu carnet.';
  }
  if (data.city.trim().length < 2) {
    return 'Indicá tu barrio o ciudad para el carnet.';
  }
  if (!data.favoriteCut.trim()) {
    return 'Elegí tu corte favorito de la parrilla.';
  }
  return null;
}

export function validateCarnetInput(name: string, city: string, favoriteCut: string): string | null {
  if (name.trim().length < 2) {
    return 'Ingresá tu nombre o apodo parrillero (mínimo 2 caracteres).';
  }
  if (city.trim().length < 2) {
    return 'Indicá tu barrio o ciudad para el carnet.';
  }
  if (!favoriteCut.trim()) {
    return 'Elegí tu corte favorito de la parrilla.';
  }
  return null;
}

export function validatePostInput(caption: string): string | null {
  if (caption.trim().length < 8) {
    return 'Contanos un poco más cómo te salió el asado (mínimo 8 caracteres).';
  }
  return null;
}

export function validateFriendGroupInput(
  name: string,
  neighborhood: string,
  captainName: string,
  members: string[],
  motto: string
): string | null {
  if (name.trim().length < 3) {
    return 'Poné un nombre copado para tu grupo de amigos (mínimo 3 caracteres).';
  }
  if (neighborhood.trim().length < 2) {
    return 'Indicá el barrio o ciudad de tu grupo.';
  }
  if (captainName.trim().length < 2) {
    return 'Indicá el nombre del capitán o referente del grupo.';
  }
  const cleanMembers = members.map((m) => m.trim()).filter(Boolean);
  if (cleanMembers.length < MIN_GROUP_FRIENDS) {
    return `El grupo debe tener al menos ${MIN_GROUP_FRIENDS} amigos (incluyendo al capitán).`;
  }
  if (cleanMembers.length > MAX_GROUP_FRIENDS) {
    return `El límite máximo es de ${MAX_GROUP_FRIENDS} amigos por grupo.`;
  }
  if (motto.trim().length < 8) {
    return 'Contanos en al menos 8 caracteres por qué tu grupo merece ir a la Gran Final.';
  }
  return null;
}
