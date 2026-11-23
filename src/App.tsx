import { useEffect, useState } from 'react';
import { AliadosSection } from './components/AliadosSection';
import { ButcherModal, PromoQrModal } from './components/ButcherModal';
import { CarnetModal } from './components/CarnetModal';
import { ChallengerModal } from './components/ChallengerModal';
import { CommunitySection } from './components/CommunitySection';
import { GuinnessSection } from './components/GuinnessSection';
import { HeroSection } from './components/HeroSection';
import { FriendGroupModal } from './components/FriendGroupModal';
import { Navbar } from './components/Navbar';
import { TournamentSection } from './components/TournamentSection';
import { INITIAL_FRIEND_GROUPS, INITIAL_POSTS } from './data/campaignData';
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
  toggleFriendGroupLike,
} from './utils/parrillaLogic';

const STORAGE_KEYS = {
  tournament: 'corte_pilsen_tournament_v3',
  profile: 'corte_pilsen_profile_v3',
  posts: 'corte_pilsen_posts_v3',
  groups: 'corte_pilsen_groups_v4',
};

function readStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

type PendingVoteAction =
  | { type: 'matchup'; cutId: CutId }
  | { type: 'boss'; choice: 'retador' | 'challenger' }
  | null;

export default function App() {
  const [tournament, setTournament] = useState<TournamentState>(() =>
    readStorage(STORAGE_KEYS.tournament, getInitialTournamentState())
  );
  const [profile, setProfile] = useState<ParrilleroProfile | null>(() =>
    readStorage(STORAGE_KEYS.profile, null)
  );
  const [posts, setPosts] = useState<ExperiencePost[]>(() =>
    readStorage(STORAGE_KEYS.posts, INITIAL_POSTS)
  );
  const [groups, setGroups] = useState<FriendGroup[]>(() =>
    readStorage(STORAGE_KEYS.groups, INITIAL_FRIEND_GROUPS)
  );

  const [isButcherOpen, setIsButcherOpen] = useState(false);
  const [isChallengerOpen, setIsChallengerOpen] = useState(false);
  const [selectedPromoAlly, setSelectedPromoAlly] = useState<AllyLocation | null>(null);
  const [isCarnetOpen, setIsCarnetOpen] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState<string | null>(null);
  const [pendingVote, setPendingVote] = useState<PendingVoteAction>(null);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [userPostsCreated, setUserPostsCreated] = useState(0);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.tournament, JSON.stringify(tournament));
    } catch {
      // Ignore quota errors
    }
  }, [tournament]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
    } catch {
      // Ignore quota errors
    }
  }, [profile]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.posts, JSON.stringify(posts));
    } catch {
      // Ignore quota errors
    }
  }, [posts]);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEYS.groups, JSON.stringify(groups));
    } catch {
      // Ignore quota errors
    }
  }, [groups]);

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
      'Registrate gratis con tu Carnet Parrillero para habilitar tu voto oficial en las llaves de la semana.'
    );
    setIsCarnetOpen(true);
  };

  const handleVoteMatchup = (cutId: CutId) => {
    if (!canUserVote(profile)) {
      openRegistrationForVoting({ type: 'matchup', cutId });
      return;
    }
    setTournament((prev) => advanceTournamentVote(prev, cutId));
  };

  const handleVoteFinalBoss = (choice: 'retador' | 'challenger') => {
    if (!canUserVote(profile)) {
      openRegistrationForVoting({ type: 'boss', choice });
      return;
    }
    setTournament((prev) => castFinalBossVote(prev, choice));
  };

  const handleSaveProfile = (data: {
    name: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
  }) => {
    const nextProfile: ParrilleroProfile = {
      id: profile?.id ?? `parrillero-${Date.now()}`,
      name: data.name,
      city: data.city,
      favoriteCut: data.favoriteCut,
      avatarStyle: data.avatarStyle,
      rank: computedRank,
      memberNumber:
        profile?.memberNumber ??
        `PY-${String(Math.floor(10000 + Math.random() * 89999))}`,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
    };
    setProfile(nextProfile);
    setRegistrationNotice(null);

    if (pendingVote) {
      const action = pendingVote;
      setPendingVote(null);
      if (action.type === 'matchup') {
        setTournament((prev) => advanceTournamentVote(prev, action.cutId));
      } else if (action.type === 'boss') {
        setTournament((prev) => castFinalBossVote(prev, action.choice));
      }
    }
  };

  const handleCreatePost = (data: {
    caption: string;
    cookingPoint: ExperiencePost['cookingPoint'];
    image: string;
  }) => {
    const newPost: ExperiencePost = {
      id: `post-${Date.now()}`,
      authorName: profile?.name ?? 'Parrillero Invitado',
      authorCity: profile?.city ?? 'Asunción, Paraguay',
      authorRank: profile ? computedRank : 'Aprendiz de Fuego',
      cookingPoint: data.cookingPoint,
      caption: data.caption,
      image: data.image,
      fires: 1,
      hasFired: true,
      timestamp: 'Recién ahora',
      comments: [],
    };
    setPosts((prev) => [newPost, ...prev]);
    setUserPostsCreated((c) => c + 1);
  };

  const handleToggleFire = (postId: string) => {
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        const nextFired = !post.hasFired;
        return {
          ...post,
          hasFired: nextFired,
          fires: Math.max(0, post.fires + (nextFired ? 1 : -1)),
        };
      })
    );
  };

  const handleAddComment = (postId: string, text: string) => {
    const commentAuthor = profile?.name ?? 'Parrillero Invitado';
    setPosts((prev) =>
      prev.map((post) => {
        if (post.id !== postId) return post;
        return {
          ...post,
          comments: [
            ...post.comments,
            {
              id: `comment-${Date.now()}`,
              author: commentAuthor,
              text,
              timestamp: 'Ahora',
            },
          ],
        };
      })
    );
  };

  const handleCreateGroup = (data: {
    name: string;
    zone: Exclude<GroupZoneFilter, 'Todas'>;
    neighborhood: string;
    captainName: string;
    members: string[];
    favoriteCut: string;
    motto: string;
  }) => {
    const nextNumber = String(101 + groups.length).padStart(4, '0');
    const newGroup: FriendGroup = {
      id: `grp-${Date.now()}`,
      code: `#GRP-${nextNumber}`,
      name: data.name,
      zone: data.zone,
      neighborhood: data.neighborhood,
      captainName: data.captainName,
      members: data.members,
      favoriteCut: data.favoriteCut,
      motto: data.motto,
      likes: 1,
      likedByMe: true,
      createdAtMs: Date.now(),
      isMine: true,
    };
    setGroups((prev) => [newGroup, ...prev]);
  };

  return (
    <div className="min-h-screen bg-[#081F5C] text-white pb-14 md:pb-0">
      <Navbar
        profile={profile}
        onOpenCarnet={() => {
          setRegistrationNotice(null);
          setIsCarnetOpen(true);
        }}
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
          onResetTournament={() => setTournament(getInitialTournamentState())}
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
          onToggleGroupLike={(groupId) =>
            setGroups((prev) => toggleFriendGroupLike(prev, groupId))
          }
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
        onSaveProfile={handleSaveProfile}
      />
      <FriendGroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        defaultCaptainName={profile?.name ?? ''}
        onCreateGroup={handleCreateGroup}
      />
    </div>
  );
}
