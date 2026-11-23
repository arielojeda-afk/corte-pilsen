import test from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceTournamentVote,
  canUserVote,
  castFinalBossVote,
  computeCountdown,
  computeParrilleroRank,
  filterAliados,
  filterAndSortFriendGroups,
  getCurrentMatchup,
  getInitialTournamentState,
  getTournamentLeaderboard,
  isChallengerRevealed,
  isDayUnlocked,
  MAX_GROUP_FRIENDS,
  revealBossBattle,
  selectTournamentDay,
  toggleFriendGroupLike,
  validateCarnetInput,
  validateFriendGroupInput,
  validatePostInput,
} from './parrillaLogic';
import {
  ALLY_LOCATIONS,
  CHALLENGER_REVEAL_TARGET_ISO,
  INITIAL_FRIEND_GROUPS,
  MEAT_CUTS,
  MYSTERIOUS_CHALLENGER_SPECS,
} from '../data/campaignData';

test('canUserVote requires registered profile before casting votes', () => {
  assert.equal(canUserVote(null), false);
  assert.equal(
    canUserVote({
      id: 'p1',
      name: 'Lucas',
      email: 'lucas@gmail.com',
      city: 'Asunción',
      favoriteCut: 'Tapa Cuadril',
      avatarStyle: 'brasa',
      rank: 'Aprendiz de Fuego',
      memberNumber: 'PY-10001',
      createdAt: '2026-11-23T00:00:00Z',
    }),
    true
  );
});

test('weekly 7-day bracket votes across all 8 cuts -> Semis -> Final -> Mysterious Challenger', () => {
  let state = getInitialTournamentState();
  assert.equal(state.activeDay, 1);
  assert.equal(state.phase, 'day1');
  assert.equal(isDayUnlocked(state, 1), true);
  assert.equal(isDayUnlocked(state, 2), false);

  // Day 1 (Lunes): Costilla vs Tira Fina
  assert.equal(getCurrentMatchup(state)?.leftId, 'costilla');
  state = advanceTournamentVote(state, 'costilla');
  assert.equal(state.phase, 'day2');
  assert.equal(state.winners.day1, 'costilla');
  assert.equal(state.cutVotes.costilla, MEAT_CUTS.costilla.baseVotes + 1);

  // Day 2 (Martes): Vacio vs Entrana
  state = advanceTournamentVote(state, 'vacio');
  assert.equal(state.phase, 'day3');
  assert.equal(state.winners.day2, 'vacio');

  // Day 3 (Miercoles): Colita vs Bife Chorizo
  state = advanceTournamentVote(state, 'colita');
  assert.equal(state.phase, 'day4');
  assert.equal(state.winners.day3, 'colita');

  // Day 4 (Jueves): Tapa vs Ojo de Bife
  state = advanceTournamentVote(state, 'tapa');
  assert.equal(state.phase, 'day5');
  assert.equal(state.winners.day4, 'tapa');

  // Day 5 (Viernes): Semifinal A (costilla vs vacio)
  assert.equal(getCurrentMatchup(state)?.leftId, 'costilla');
  assert.equal(getCurrentMatchup(state)?.rightId, 'vacio');
  state = advanceTournamentVote(state, 'vacio');
  assert.equal(state.phase, 'day6');
  assert.equal(state.winners.day5, 'vacio');

  // Day 6 (Sabado): Semifinal B (colita vs tapa)
  assert.equal(getCurrentMatchup(state)?.leftId, 'colita');
  assert.equal(getCurrentMatchup(state)?.rightId, 'tapa');
  state = advanceTournamentVote(state, 'tapa');
  assert.equal(state.phase, 'day7_tradicional');
  assert.equal(state.winners.day6, 'tapa');

  // Day 7 (Domingo): Traditional Final (vacio vs tapa) -> Boss Alert
  state = advanceTournamentVote(state, 'tapa');
  assert.equal(state.phase, 'boss_alert');
  assert.equal(state.winners.day7Tradicional, 'tapa');

  // Reveal Boss Battle -> Vote for Mysterious Challenger
  state = revealBossBattle(state);
  assert.equal(state.phase, 'boss_battle');
  state = castFinalBossVote(state, 'retador');
  assert.equal(state.phase, 'crowned');
  assert.equal(state.cutVotes.retador, MEAT_CUTS.retador.baseVotes + 1);

  // Jumping back to Day 2 to inspect or change vote works cleanly
  state = selectTournamentDay(state, 2);
  assert.equal(state.phase, 'day2');

  const leaderboard = getTournamentLeaderboard(state);
  assert.equal(leaderboard.length, 9);
  assert.equal(leaderboard[0].isLeading, true);
  assert.equal(leaderboard[0].id, 'retador');
  assert.equal(leaderboard[0].userVoted, true);
});

test('mysterious challenger characteristics never expose a revealed cut name', () => {
  const combinedText = [
    MYSTERIOUS_CHALLENGER_SPECS.codeName,
    MYSTERIOUS_CHALLENGER_SPECS.teaserHeadline,
    MYSTERIOUS_CHALLENGER_SPECS.whatIsIt,
    ...MYSTERIOUS_CHALLENGER_SPECS.characteristics.map((c) => `${c.label} ${c.detail}`),
  ]
    .join(' ')
    .toLowerCase();

  assert.equal(combinedText.includes('corte pilsen'), false);
  assert.ok(combinedText.includes('colita de cuadril'));
  assert.ok(combinedText.includes('peceto'));
});

test('isChallengerRevealed keeps name hidden through Days 1-7 boss_alert and reveals on Sunday boss_battle/crowned or target expiry', () => {
  const beforeTargetMs = new Date(CHALLENGER_REVEAL_TARGET_ISO).getTime() - 60_000;
  const afterTargetMs = new Date(CHALLENGER_REVEAL_TARGET_ISO).getTime() + 1_000;

  let state = getInitialTournamentState();
  assert.equal(isChallengerRevealed(state, beforeTargetMs), false);

  state = advanceTournamentVote(state, 'costilla'); // -> day2
  state = advanceTournamentVote(state, 'vacio');    // -> day3
  state = advanceTournamentVote(state, 'colita');   // -> day4
  state = advanceTournamentVote(state, 'tapa');     // -> day5
  state = advanceTournamentVote(state, 'vacio');    // -> day6
  state = advanceTournamentVote(state, 'tapa');     // -> day7_tradicional
  assert.equal(isChallengerRevealed(state, beforeTargetMs), false);

  state = advanceTournamentVote(state, 'tapa');     // -> boss_alert (still hidden before user clicks reveal)
  assert.equal(state.phase, 'boss_alert');
  assert.equal(isChallengerRevealed(state, beforeTargetMs), false);

  // Sunday reveal click unlocks official name
  state = revealBossBattle(state);
  assert.equal(state.phase, 'boss_battle');
  assert.equal(isChallengerRevealed(state, beforeTargetMs), true);

  // Navigating back to inspect an earlier day after bossChoice stays revealed
  const crowned = castFinalBossVote(state, 'retador');
  assert.equal(isChallengerRevealed(crowned, beforeTargetMs), true);
  assert.equal(isChallengerRevealed(selectTournamentDay(crowned, 2), beforeTargetMs), true);

  // Countdown completion also reveals even from day1
  assert.equal(isChallengerRevealed(getInitialTournamentState(), afterTargetMs), true);
});

test('filterAliados filters accurately by zone and category', () => {
  const cdeButchers = filterAliados(ALLY_LOCATIONS, 'Ciudad del Este', 'carniceria');
  assert.equal(cdeButchers.length, 1);
  assert.equal(cdeButchers[0].zone, 'Ciudad del Este');

  const allRestaurants = filterAliados(ALLY_LOCATIONS, 'Todas', 'restaurante');
  assert.equal(allRestaurants.length, 4);
  assert.ok(allRestaurants.every((item) => item.category === 'restaurante'));
});

test('computeCountdown calculates days, hours, minutes, seconds and clamps past dates', () => {
  const target = Date.UTC(2026, 11, 20, 0, 0, 0);
  const now = target - (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000;
  const parts = computeCountdown(target, now);
  assert.deepEqual(parts, {
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
    isComplete: false,
  });

  const expired = computeCountdown(target, target + 5000);
  assert.equal(expired.isComplete, true);
  assert.equal(expired.days, 0);
});

test('toggleFriendGroupLike increments and decrements likes cleanly', () => {
  const initialLikes = INITIAL_FRIEND_GROUPS[0].likes;
  const liked = toggleFriendGroupLike(INITIAL_FRIEND_GROUPS, 'grp-1');
  const firstLiked = liked.find((g) => g.id === 'grp-1')!;
  assert.equal(firstLiked.likedByMe, true);
  assert.equal(firstLiked.likes, initialLikes + 1);

  const unliked = toggleFriendGroupLike(liked, 'grp-1');
  const firstUnliked = unliked.find((g) => g.id === 'grp-1')!;
  assert.equal(firstUnliked.likedByMe, false);
  assert.equal(firstUnliked.likes, initialLikes);
});

test('filterAndSortFriendGroups supports accent-insensitive search by code, member, neighborhood, and quick filters', () => {
  // Search by unique code
  const byCode = filterAndSortFriendGroups(INITIAL_FRIEND_GROUPS, {
    query: '#GRP-0103',
    zone: 'Todas',
    quickFilter: 'all',
    sortBy: 'likes',
  });
  assert.equal(byCode.length, 1);
  assert.equal(byCode[0].id, 'grp-3');

  // Search by accent-insensitive neighborhood/zone ("asuncion" matches "Asunción")
  const byZoneQuery = filterAndSortFriendGroups(INITIAL_FRIEND_GROUPS, {
    query: 'encarnacion',
    zone: 'Interior',
    quickFilter: 'all',
    sortBy: 'likes',
  });
  assert.equal(byZoneQuery.length, 1);
  assert.equal(byZoneQuery[0].id, 'grp-5');

  // Search by member friend name
  const byMember = filterAndSortFriendGroups(INITIAL_FRIEND_GROUPS, {
    query: 'Hans Wiebe',
    zone: 'Todas',
    quickFilter: 'all',
    sortBy: 'likes',
  });
  assert.equal(byMember.length, 1);
  assert.equal(byMember[0].id, 'grp-8');

  // Top 3 Final quick filter returns the 3 most liked groups sorted descending
  const top3 = filterAndSortFriendGroups(INITIAL_FRIEND_GROUPS, {
    query: '',
    zone: 'Todas',
    quickFilter: 'top3',
    sortBy: 'likes',
  });
  assert.equal(top3.length, 3);
  assert.ok(top3[0].likes >= top3[1].likes && top3[1].likes >= top3[2].likes);
});

test('computeParrilleroRank escalates based on participation', () => {
  assert.equal(computeParrilleroRank(false, 0, 0), 'Aprendiz de Fuego');
  assert.equal(computeParrilleroRank(false, 0, 1), 'Asador de Domingo');
  assert.equal(computeParrilleroRank(true, 1, 0), 'Maestro Parrillero Pilsen');
});

test('form validators reject invalid inputs, enforce max 10 friends, and accept valid ones', () => {
  assert.ok(validateCarnetInput('A', 'Asunción', 'Tapa Cuadril') !== null);
  assert.equal(validateCarnetInput('Carlos', 'Asunción', 'Tapa Cuadril'), null);

  assert.ok(validatePostInput('Corto') !== null);
  assert.equal(validatePostInput('Salió espectacular a punto con sal entrefina'), null);

  // Less than 2 friends rejected
  assert.ok(
    validateFriendGroupInput('Los Perros', 'Sajonia', 'Matías', ['Matías'], 'Vamos a ganar') !==
      null
  );
  // More than 10 friends rejected
  const elevenFriends = Array.from({ length: MAX_GROUP_FRIENDS + 1 }, (_, i) => `Amigo ${i + 1}`);
  assert.ok(
    validateFriendGroupInput(
      'Los Perros',
      'Sajonia',
      'Amigo 1',
      elevenFriends,
      'Vamos a la Gran Final a elegir el corte'
    ) !== null
  );
  // Exactly 10 friends accepted
  const tenFriends = Array.from({ length: MAX_GROUP_FRIENDS }, (_, i) => `Amigo ${i + 1}`);
  assert.equal(
    validateFriendGroupInput(
      'Los Perros de Sajonia',
      'Sajonia',
      'Amigo 1',
      tenFriends,
      'Vamos a la Gran Final a elegir el mejor corte'
    ),
    null
  );
});
