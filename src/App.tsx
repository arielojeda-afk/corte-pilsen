import { useCallback, useEffect, useState } from 'react';
import { AdminModal } from './components/AdminModal';
import { AliadosSection } from './components/AliadosSection';
import { ButcherModal, PromoQrModal } from './components/ButcherModal';
import { CarnetModal } from './components/CarnetModal';
import { ChallengerModal } from './components/ChallengerModal';
import { CommunitySection } from './components/CommunitySection';
import { FriendGroupModal } from './components/FriendGroupModal';
import { GuinnessSection } from './components/GuinnessSection';
import { HeroSection } from './components/HeroSection';
import { Navbar } from './components/Navbar';
import { TournamentSection } from './components/TournamentSection';
import { INITIAL_FRIEND_GROUPS, INITIAL_POSTS } from './data/campaignData';
import {
  addCommentApi,
  createFriendGroupApi,
  createPostApi,
  fetchPublicState,
  getAuthToken,
  getMe,
  loginUser,
  logoutUser,
  registerUser,
  submitVote,
  toggleGroupLikeApi,
  togglePostFireApi,
} from './lib/api';
import {
  AllyLocation,
  CutId,
  DayNumber,
  ExperiencePost,
  FriendGroup,
  GroupZoneFilter,
  ParrilleroProfile,
  TournamentState,
} from './types';
import {
  advanceTournamentVote,
  canUserVote,
  castFinalBossVote,
  computeParrilleroRank,
  getInitialTournamentState,
  getTournamentLeaderboard,
  isChallengerRevealed,
  revealBossBattle,
  selectTournamentDay,
} from './utils/parrillaLogic';

type PendingVoteAction =
  | { type: 'matchup'; cutId: CutId }
  | { type: 'boss'; choice: 'retador' | 'challenger' }
  | null;

export default function App() {
  const [tournament, setTournament] = useState<TournamentState>(() =>
    getInitialTournamentState()
  );
  const [profile, setProfile] = useState<ParrilleroProfile | null>(null);
  const [posts, setPosts] = useState<ExperiencePost[]>(INITIAL_POSTS);
  const [groups, setGroups] = useState<FriendGroup[]>(INITIAL_FRIEND_GROUPS);

  const [isButcherOpen, setIsButcherOpen] = useState(false);
  const [isChallengerOpen, setIsChallengerOpen] = useState(false);
  const [selectedPromoAlly, setSelectedPromoAlly] = useState<AllyLocation | null>(null);
  const [isCarnetOpen, setIsCarnetOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<PendingVoteAction>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const refreshPublicState = useCallback(async () => {
    try {
      const state = await fetchPublicState();
      setTournament((prev) => ({
        ...state.tournament,
        selectedDay: prev.selectedDay,
      }));
      if (state.profile) {
        setProfile(state.profile);
        if (
          state.profile.role === 'superadmin' ||
          state.profile.email.toLowerCase() === 'ariel.ojeda@lupe.com.py'
        ) {
          const tok = getAuthToken();
          if (tok) setAdminToken(tok);
        }
      }
      setPosts(state.posts);
      setGroups(state.groups);
    } catch (err) {
      console.error('Error sincronizando estado con Supabase:', err);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const me = await getMe();
      if (me.authenticated && me.profile) {
        setProfile(me.profile);
        if (me.isAdmin) {
          const tok = getAuthToken();
          if (tok) setAdminToken(tok);
        }
      }
      await refreshPublicState();
    })();
  }, [refreshPublicState]);

  const userPostsCreated = profile
    ? posts.filter((p) => p.authorName === profile.name).length
    : 0;
  const likedOrOwnedGroupsCount = groups.filter((g) => g.likedByMe || g.isMine).length;
  const computedRank = computeParrilleroRank(
    tournament.bossChoice !== null,
    userPostsCreated,
    likedOrOwnedGroupsCount
  );

  const challengerRevealed = isChallengerRevealed(tournament);
  const leaderboard = getTournamentLeaderboard(tournament);
  const leadingCut = leaderboard[0];
  const leadingCutLabel =
    leadingCut.id === 'retador'
      ? challengerRevealed
        ? 'El Corte Pilsen'
        : 'Nuevo Retador (¿?)'
      : leadingCut.name;

  const totalVotesCount = Object.values(tournament.cutVotes).reduce(
    (sum, n) => sum + n,
    0
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const openRegistrationForVoting = (pending: PendingVoteAction = null) => {
    setPendingVote(pending);
    setRegistrationNotice(
      'Registrate o iniciá sesión con tu Carnet Parrillero para habilitar tu voto oficial.'
    );
    setIsCarnetOpen(true);
  };

  const executeMatchupVote = async (activeProfile: ParrilleroProfile, cutId: CutId) => {
    const nextState = advanceTournamentVote(tournament, cutId);
    setTournament(nextState);

    const dayKeyMap: Record<DayNumber, 'day1' | 'day2' | 'day3' | 'day4' | 'day5' | 'day6' | 'day7Tradicional'> = {
      1: 'day1',
      2: 'day2',
      3: 'day3',
      4: 'day4',
      5: 'day5',
      6: 'day6',
      7: 'day7Tradicional',
    };
    const dayKey = dayKeyMap[tournament.selectedDay];

    try {
      const updated = await submitVote({
        parrilleroId: activeProfile.id,
        dayKey,
        cutId,
      });
      setTournament((prev) => ({
        ...updated.tournament,
        selectedDay: prev.selectedDay,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar tu voto oficial.');
      await refreshPublicState();
    }
  };

  const executeBossVote = async (
    activeProfile: ParrilleroProfile,
    choice: 'retador' | 'challenger'
  ) => {
    const nextState = castFinalBossVote(tournament, choice);
    setTournament(nextState);

    const cutId: CutId =
      choice === 'retador' ? 'retador' : tournament.userDayVotes.day7Tradicional || 'costilla';

    try {
      const updated = await submitVote({
        parrilleroId: activeProfile.id,
        dayKey: 'day7Boss',
        cutId,
        bossChoice: choice,
      });
      setTournament((prev) => ({
        ...updated.tournament,
        selectedDay: prev.selectedDay,
      }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar tu voto final.');
      await refreshPublicState();
    }
  };

  const handleVoteMatchup = (cutId: CutId) => {
    if (!canUserVote(profile) || !profile) {
      openRegistrationForVoting({ type: 'matchup', cutId });
      return;
    }
    void executeMatchupVote(profile, cutId);
  };

  const handleVoteFinalBoss = (choice: 'retador' | 'challenger') => {
    if (!canUserVote(profile) || !profile) {
      openRegistrationForVoting({ type: 'boss', choice });
      return;
    }
    void executeBossVote(profile, choice);
  };

  const handleProcessPendingVote = async (activeProfile: ParrilleroProfile) => {
    setRegistrationNotice(null);
    if (!pendingVote) return;
    const action = pendingVote;
    setPendingVote(null);
    if (action.type === 'matchup') {
      await executeMatchupVote(activeProfile, action.cutId);
    } else if (action.type === 'boss') {
      await executeBossVote(activeProfile, action.choice);
    }
  };

  const handleRegister = async (data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    ci?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
  }) => {
    const session = await registerUser(data);
    setProfile(session.profile);
    if (session.isAdmin) {
      setAdminToken(session.token);
    }
    await refreshPublicState();
    await handleProcessPendingVote(session.profile);
  };

  const handleLogin = async (email: string, password: string) => {
    const session = await loginUser(email, password);
    setProfile(session.profile);
    if (session.isAdmin) {
      setAdminToken(session.token);
    }
    await refreshPublicState();
    await handleProcessPendingVote(session.profile);
  };

  const handleLogout = async () => {
    await logoutUser();
    setProfile(null);
    setAdminToken(null);
    await refreshPublicState();
  };

  const handleCreatePost = async (data: {
    caption: string;
    cookingPoint: ExperiencePost['cookingPoint'];
    image: string;
  }) => {
    try {
      const newPost = await createPostApi({
        caption: data.caption,
        cookingPoint: data.cookingPoint,
        image: data.image,
        authorRank: profile ? computedRank : 'Aprendiz de Fuego',
      });
      setPosts((prev) => [newPost, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo publicar en el Muro.');
    }
  };

  const handleToggleFire = async (postId: string) => {
    try {
      const updated = await togglePostFireApi(postId);
      setPosts(updated.posts);
    } catch (err) {
      console.error('Error toggling fire:', err);
    }
  };

  const handleAddComment = async (postId: string, text: string) => {
    try {
      const comment = await addCommentApi(postId, text);
      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? { ...post, comments: [...post.comments, comment] }
            : post
        )
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo guardar el comentario.');
    }
  };

  const handleCreateGroup = async (data: {
    name: string;
    zone: Exclude<GroupZoneFilter, 'Todas'>;
    neighborhood: string;
    captainName: string;
    members: string[];
    favoriteCut: string;
    motto: string;
  }) => {
    try {
      const newGroup = await createFriendGroupApi(data);
      setGroups((prev) => [newGroup, ...prev]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'No se pudo postular el grupo.');
    }
  };

  const handleToggleGroupLike = async (groupId: string) => {
    try {
      const updated = await toggleGroupLikeApi(groupId);
      setGroups(updated.groups);
    } catch (err) {
      console.error('Error toggling group like:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#081F5C] text-white pb-14 md:pb-0">
      <Navbar
        profile={profile}
        onOpenCarnet={() => {
          setRegistrationNotice(null);
          setIsCarnetOpen(true);
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />

      <main>
        <HeroSection
          onStartTournament={() => scrollToSection('torneo')}
          onInspectChallenger={() => setIsChallengerOpen(true)}
          totalVotesCount={totalVotesCount}
          leadingCutName={leadingCutLabel}
          isRevealed={challengerRevealed}
        />

        <TournamentSection
          tournament={tournament}
          profile={profile}
          isRevealed={challengerRevealed}
          onSelectDay={(day: DayNumber) =>
            setTournament((prev) => selectTournamentDay(prev, day))
          }
          onVoteMatchup={handleVoteMatchup}
          onRevealBoss={() => setTournament((prev) => revealBossBattle(prev))}
          onVoteFinalBoss={handleVoteFinalBoss}
          onResetTournament={() => void refreshPublicState()}
          onOpenButcherMode={() => setIsButcherOpen(true)}
          onInspectChallenger={() => setIsChallengerOpen(true)}
          onRequestRegistration={() => openRegistrationForVoting(null)}
        />

        <AliadosSection
          onOpenButcherMode={() => setIsButcherOpen(true)}
          onOpenPromoQr={(ally) => setSelectedPromoAlly(ally)}
        />

        <GuinnessSection
          onJoinChallenge={() => {
            scrollToSection('comunidad');
            setIsGroupModalOpen(true);
          }}
        />

        <CommunitySection
          profile={profile}
          computedRank={computedRank}
          posts={posts}
          groups={groups}
          onOpenCarnet={() => {
            setRegistrationNotice(null);
            setIsCarnetOpen(true);
          }}
          onOpenCreateGroup={() => setIsGroupModalOpen(true)}
          onCreatePost={handleCreatePost}
          onToggleFire={handleToggleFire}
          onAddComment={handleAddComment}
          onToggleGroupLike={(groupId) => void handleToggleGroupLike(groupId)}
        />
      </main>

      <footer className="bg-[#D6001C] text-white py-3.5 px-4 sm:px-6 lg:px-8 border-t-2 border-white/25">
        <div className="max-w-7xl mx-auto text-center">
          <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-wide">
            SU CONSUMO EN EXCESO DAÑA LA SALUD. PROHIBIDA SU VENTA A MENORES DE 20 AÑOS. LO
            ADVIERTE EL MINISTERIO DE SALUD PÚBLICA Y BIENESTAR SOCIAL.
          </p>
        </div>
      </footer>

      <ChallengerModal
        isOpen={isChallengerOpen}
        isRevealed={challengerRevealed}
        onClose={() => setIsChallengerOpen(false)}
        onOpenButcherMode={() => setIsButcherOpen(true)}
        onGoVote={() => scrollToSection('torneo')}
      />
      <ButcherModal
        isOpen={isButcherOpen}
        isRevealed={challengerRevealed}
        onClose={() => setIsButcherOpen(false)}
      />
      <PromoQrModal
        ally={selectedPromoAlly}
        onClose={() => setSelectedPromoAlly(null)}
      />
      <CarnetModal
        isOpen={isCarnetOpen}
        onClose={() => {
          setIsCarnetOpen(false);
          setRegistrationNotice(null);
          setPendingVote(null);
        }}
        existingProfile={profile}
        computedRank={computedRank}
        registrationNotice={registrationNotice}
        onRegister={handleRegister}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenAdmin={() => setIsAdminOpen(true)}
      />
      <FriendGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        defaultCaptainName={profile?.name ?? ''}
        onCreateGroup={handleCreateGroup}
      />
      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        adminToken={adminToken}
        onSetAdminToken={setAdminToken}
        onPublicDataChanged={refreshPublicState}
      />
    </div>
  );
}