import { ChangeEvent, FormEvent, useMemo, useState } from 'react';
import {
  Camera,
  Crown,
  Download,
  Flame,
  Heart,
  MapPin,
  MessageSquare,
  Plus,
  Search,
  Send,
  Shield,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { CAMPAIGN_IMAGES } from '../data/campaignData';
import {
  ExperiencePost,
  FriendGroup,
  GroupQuickFilter,
  GroupSortOrder,
  GroupZoneFilter,
  ParrilleroProfile,
  ParrilleroRank,
} from '../types';
import {
  filterAndSortFriendGroups,
  getTopGroupIds,
  MAX_GROUP_FRIENDS,
  validatePostInput,
} from '../utils/parrillaLogic';
import { CarnetAvatarIcon, downloadCarnetCardPng } from './CarnetModal';
import { GrillImage } from './GrillImage';

interface CommunitySectionProps {
  profile: ParrilleroProfile | null;
  computedRank: ParrilleroRank;
  posts: ExperiencePost[];
  groups: FriendGroup[];
  onOpenCarnet: () => void;
  onOpenCreateGroup: () => void;
  onCreatePost: (post: {
    caption: string;
    cookingPoint: ExperiencePost['cookingPoint'];
    image: string;
  }) => void;
  onToggleFire: (postId: string) => void;
  onAddComment: (postId: string, text: string) => void;
  onToggleGroupLike: (groupId: string) => void;
}

const PRESET_PHOTOS = [
  { label: 'Cuña Misteriosa en Hierro', src: CAMPAIGN_IMAGES.retadorMystery },
  { label: 'Parrilla Encendida', src: CAMPAIGN_IMAGES.hero },
  { label: 'Tapa Cuadril a la Brasa', src: CAMPAIGN_IMAGES.tapa },
  { label: 'Costilla Tira Ancha', src: CAMPAIGN_IMAGES.costilla },
];

const ZONE_OPTIONS: GroupZoneFilter[] = [
  'Todas',
  'Asunción',
  'Gran Asunción',
  'Ciudad del Este',
  'Interior',
];

const QUICK_FILTER_OPTIONS: { id: GroupQuickFilter; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'top3', label: 'Top 3 Final' },
  { id: 'liked', label: 'Mis Likes' },
  { id: 'mine', label: 'Mi Grupo' },
];

const PAGE_SIZE = 6;

export function CommunitySection({
  profile,
  computedRank,
  posts,
  groups,
  onOpenCarnet,
  onOpenCreateGroup,
  onCreatePost,
  onToggleFire,
  onAddComment,
  onToggleGroupLike,
}: CommunitySectionProps) {
  const [caption, setCaption] = useState('');
  const [cookingPoint, setCookingPoint] =
    useState<ExperiencePost['cookingPoint']>('A Punto');
  const [selectedImage, setSelectedImage] = useState<string>(CAMPAIGN_IMAGES.retadorMystery);
  const [postError, setPostError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});

  // Friend Group search, filter, sort & pagination state
  const [searchQuery, setSearchQuery] = useState('');
  const [zoneFilter, setZoneFilter] = useState<GroupZoneFilter>('Todas');
  const [quickFilter, setQuickFilter] = useState<GroupQuickFilter>('all');
  const [sortBy, setSortBy] = useState<GroupSortOrder>('likes');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const globalRankingById = useMemo(() => {
    const sorted = [...groups].sort((a, b) => b.likes - a.likes);
    const map = new Map<string, number>();
    sorted.forEach((g, idx) => map.set(g.id, idx + 1));
    return map;
  }, [groups]);

  const topGroup = useMemo(() => {
    if (groups.length === 0) return null;
    return [...groups].sort((a, b) => b.likes - a.likes)[0];
  }, [groups]);

  const top3Ids = useMemo(() => getTopGroupIds(groups, 3), [groups]);

  const filteredGroups = useMemo(
    () =>
      filterAndSortFriendGroups(groups, {
        query: searchQuery,
        zone: zoneFilter,
        quickFilter,
        sortBy,
      }),
    [groups, searchQuery, zoneFilter, quickFilter, sortBy]
  );

  const visibleGroups = filteredGroups.slice(0, visibleCount);
  const hasMoreGroups = filteredGroups.length > visibleGroups.length;

  const handleResetFilters = () => {
    setSearchQuery('');
    setZoneFilter('Todas');
    setQuickFilter('all');
    setSortBy('likes');
    setVisibleCount(PAGE_SIZE);
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedImage(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handlePostSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validatePostInput(caption);
    if (err) {
      setPostError(err);
      return;
    }
    setPostError(null);
    onCreatePost({
      caption: caption.trim(),
      cookingPoint,
      image: selectedImage,
    });
    setCaption('');
  };

  const handleCommentSubmit = (e: FormEvent, postId: string) => {
    e.preventDefault();
    const draft = (commentDrafts[postId] ?? '').trim();
    if (!draft) return;
    onAddComment(postId, draft);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  return (
    <section
      id="comunidad"
      className="py-16 sm:py-20 pilsen-blue-canvas"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#E5B83B] mb-2">
              Comunidad Oficial de Parrilleros del Paraguay
            </p>
            <h2
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              Grupos Rumbo a la Gran Final &amp; Muro Parrillero
            </h2>
            <p className="text-sm sm:text-base text-white/85 mt-2 max-w-2xl">
              Postulá a tu grupo de hasta {MAX_GROUP_FRIENDS} amigos: el equipo con más Likes
              disfrutará la Gran Final en vivo y elegirá al mejor corte del país.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenCarnet}
            className="btn-pilsen-gold inline-flex items-center justify-center gap-2 min-h-[48px] px-6 py-3 rounded-xl font-display text-base sm:text-lg font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
          >
            <Shield className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{profile ? 'Ver / Editar mi Carnet' : 'Crear Carnet Parrillero'}</span>
          </button>
        </div>

        {/* Registered Carnet Card Strip */}
        {profile && (
          <div className="mb-10 bg-[#071D54] border-2 border-[#E5B83B] rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-[#D6001C] border border-[#E5B83B] flex items-center justify-center text-white shrink-0">
                <CarnetAvatarIcon style={profile.avatarStyle} className="w-7 h-7" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#E5B83B]">
                  Carnet Activo · {profile.memberNumber}
                </p>
                <h3 className="font-display text-2xl font-bold uppercase text-white">
                  {profile.name} — {computedRank}
                </h3>
                <p className="text-xs text-white/80 mt-0.5">
                  {profile.city} · Corte titular: {profile.favoriteCut}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => downloadCarnetCardPng(profile, computedRank)}
              className="btn-pilsen-gold inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Descargar Carnet PNG</span>
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 7 Cols: Grupos de Amigos Postulados a la Gran Final (with Search & Multi-Filters) */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-[#E5B83B] shrink-0" aria-hidden="true" />
                  <span>Grupos en Carrera a la Gran Final</span>
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mt-0.5">
                  Máximo {MAX_GROUP_FRIENDS} amigos por equipo · El #1 en Likes elige al corte
                  campeón en la mesa final
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenCreateGroup}
                className="btn-pilsen-cta inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold cursor-pointer whitespace-nowrap shrink-0"
              >
                <Plus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Postular mi Grupo (Máx. 10)</span>
              </button>
            </div>

            {/* #1 Leader Spotlight Card */}
            {topGroup && (
              <div
                className="bg-[#071D54] border-2 border-[#E5B83B] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
                data-testid="top-leader-group"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#E5B83B] flex items-center gap-1.5 mb-1">
                    <Crown className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Líder actual rumbo a la Gran Final · {topGroup.code}</span>
                  </p>
                  <h4 className="font-display text-xl sm:text-2xl font-bold uppercase text-white truncate">
                    {topGroup.name}
                  </h4>
                  <p className="text-xs text-white/80 mt-0.5">
                    {topGroup.zone} · {topGroup.neighborhood} · Capitán: {topGroup.captainName} ·{' '}
                    <span className="font-mono-tabular">
                      {topGroup.members.length}/{MAX_GROUP_FRIENDS} amigos
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p className="font-mono-tabular text-2xl font-bold text-[#E5B83B] leading-none">
                      {topGroup.likes.toLocaleString('es-PY')}
                    </p>
                    <p className="text-[11px] text-white/75 uppercase tracking-wide mt-0.5">
                      Likes totales
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Scalable Search + Multi-Facet Filter Bar */}
            <div className="bg-[#071D54] border border-white/15 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-8 relative">
                  <label htmlFor="groups-search" className="sr-only">
                    Buscar grupo por nombre, código, barrio o integrante
                  </label>
                  <Search
                    className="w-4 h-4 text-[#E5B83B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="groups-search"
                    data-testid="groups-search-input"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setVisibleCount(PAGE_SIZE);
                    }}
                    placeholder="Buscar por nombre, código #GRP, barrio o amigo..."
                    className="w-full min-h-[44px] pl-10 pr-10 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#E5B83B]"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      aria-label="Limpiar búsqueda de grupos"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-white/70 hover:text-[#E5B83B] cursor-pointer"
                    >
                      <X className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <label htmlFor="groups-sort" className="sr-only">
                    Ordenar grupos
                  </label>
                  <select
                    id="groups-sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as GroupSortOrder)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                  >
                    <option value="likes">Orden: Más Likes</option>
                    <option value="recent">Orden: Más Recientes</option>
                    <option value="name">Orden: Alfabético (A–Z)</option>
                  </select>
                </div>
              </div>

              {/* Zone Filter Row */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-white/65">
                  Filtrar por zona
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar grupos por zona">
                  {ZONE_OPTIONS.map((zone) => {
                    const active = zoneFilter === zone;
                    return (
                      <button
                        key={zone}
                        type="button"
                        onClick={() => {
                          setZoneFilter(zone);
                          setVisibleCount(PAGE_SIZE);
                        }}
                        aria-pressed={active}
                        className={`min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#E5B83B] text-[#071D54]'
                            : 'bg-[#0B2C7A] text-white/85 border border-white/15 hover:border-[#E5B83B]/70'
                        }`}
                      >
                        {zone}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Filter Row + Match Counter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-white/10">
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Filtros rápidos de grupos"
                >
                  {QUICK_FILTER_OPTIONS.map((opt) => {
                    const active = quickFilter === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          setQuickFilter(opt.id);
                          setVisibleCount(PAGE_SIZE);
                        }}
                        aria-pressed={active}
                        className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                          active
                            ? 'bg-[#D6001C] text-white border border-white/60'
                            : 'bg-[#0B2C7A] text-white/80 border border-white/15 hover:border-white/40'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>

                <p
                  className="font-mono-tabular text-xs text-white/75 whitespace-nowrap"
                  data-testid="groups-count-status"
                >
                  Mostrando {visibleGroups.length} de {filteredGroups.length}{' '}
                  {filteredGroups.length === 1 ? 'grupo' : 'grupos'}
                </p>
              </div>
            </div>

            {/* Friend Groups List */}
            {visibleGroups.length > 0 ? (
              <div className="space-y-4" data-testid="friend-groups-board">
                {visibleGroups.map((group) => {
                  const globalRank = globalRankingById.get(group.id) ?? 99;
                  const isTop3 = top3Ids.has(group.id);

                  return (
                    <article
                      key={group.id}
                      data-testid={`group-card-${group.id}`}
                      className={`bg-[#071D54] rounded-2xl p-5 space-y-3.5 border ${
                        globalRank === 1
                          ? 'border-[#E5B83B]'
                          : isTop3
                            ? 'border-[#E5B83B]/50'
                            : 'border-white/15'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#E5B83B] flex flex-wrap items-center gap-x-2 gap-y-0.5 mb-1">
                            <span className="font-mono-tabular text-white bg-[#D6001C] px-2 py-0.5 rounded">
                              #{globalRank}
                            </span>
                            <span className="font-mono-tabular">{group.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {group.zone} ({group.neighborhood})
                            </span>
                            {group.isMine && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-white underline decoration-[#E5B83B]">
                                  Tu grupo postulado
                                </span>
                              </>
                            )}
                          </p>
                          <h4 className="font-display text-xl sm:text-2xl font-bold uppercase text-white">
                            {group.name}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleGroupLike(group.id)}
                          aria-pressed={group.likedByMe}
                          aria-label={`Dar like a ${group.name}, actualmente ${group.likes} likes`}
                          className={`inline-flex items-center justify-center gap-2 min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                            group.likedByMe
                              ? 'bg-[#D6001C] border border-white text-white'
                              : 'bg-[#0B2C7A] border border-[#E5B83B]/70 text-white hover:bg-[#E5B83B] hover:text-[#071D54]'
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 shrink-0 ${
                              group.likedByMe ? 'fill-white text-white' : 'text-[#E5B83B]'
                            }`}
                            aria-hidden="true"
                          />
                          <span className="font-mono-tabular">
                            {group.likedByMe ? 'Te gusta' : 'Like'} ·{' '}
                            {group.likes.toLocaleString('es-PY')}
                          </span>
                        </button>
                      </div>

                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                        “{group.motto}”
                      </p>

                      <div className="pt-2.5 border-t border-white/10 space-y-2 text-xs text-white/85">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-[#E5B83B]" aria-hidden="true" />
                            Capitán: <strong className="text-white">{group.captainName}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1.5 font-mono-tabular">
                            <Users className="w-3.5 h-3.5 text-[#E5B83B]" aria-hidden="true" />
                            <strong className="text-[#E5B83B]">{group.members.length}</strong> /{' '}
                            {MAX_GROUP_FRIENDS} amigos
                          </span>
                          <span>
                            Defienden:{' '}
                            <strong className="text-white">{group.favoriteCut}</strong>
                          </span>
                        </div>

                        <p className="text-xs text-white/75 leading-relaxed">
                          <strong className="text-white/90">Integrantes:</strong>{' '}
                          {group.members.join(' · ')}
                        </p>
                      </div>
                    </article>
                  );
                })}

                {hasMoreGroups && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + PAGE_SIZE)}
                    className="w-full min-h-[46px] px-5 py-3 rounded-xl bg-[#071D54] border border-[#E5B83B] text-[#E5B83B] hover:bg-[#E5B83B] hover:text-[#071D54] font-bold text-sm transition-colors cursor-pointer"
                  >
                    Ver más grupos ({filteredGroups.length - visibleGroups.length} restantes)
                  </button>
                )}
              </div>
            ) : (
              <div className="bg-[#071D54] border border-white/15 rounded-2xl p-8 text-center space-y-3">
                <p className="font-display text-xl font-bold uppercase text-white">
                  No encontramos grupos con ese filtro
                </p>
                <p className="text-xs sm:text-sm text-white/75 max-w-md mx-auto">
                  Probá buscar por otro nombre, código #GRP, barrio o nombre de un amigo, o limpiá
                  los filtros activos.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="btn-pilsen-gold inline-flex items-center justify-center min-h-[42px] px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Mostrar todos los grupos
                </button>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Muro de Experiencias Parrilleras */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <h3 className="font-display text-2xl font-bold uppercase text-white">
                Muro de Experiencias
              </h3>
              <p className="text-xs text-white/75">
                Subí la foto de tu parrilla y opiná sobre el punto de cocción
              </p>
            </div>

            <form
              onSubmit={handlePostSubmit}
              className="bg-[#071D54] border border-white/15 rounded-2xl p-5 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-display text-lg font-bold uppercase text-white">
                  Contá cómo salió tu asado
                </h4>
                {!profile && (
                  <button
                    type="button"
                    onClick={onOpenCarnet}
                    className="text-xs font-bold text-[#E5B83B] hover:underline cursor-pointer"
                  >
                    Publicás como invitado · Crear Carnet
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="experience-caption" className="sr-only">
                  Reseña de tu asado
                </label>
                <textarea
                  id="experience-caption"
                  rows={3}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ej. Le tiré sal entrefina, brasa fuerte en la grasa y acompañamos con Pilsen vestida de novia..."
                  className="w-full px-4 py-3 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-[#E5B83B]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="experience-point"
                    className="block text-xs font-semibold text-white/80 mb-1.5"
                  >
                    Punto de cocción
                  </label>
                  <select
                    id="experience-point"
                    value={cookingPoint}
                    onChange={(e) =>
                      setCookingPoint(e.target.value as ExperiencePost['cookingPoint'])
                    }
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                  >
                    <option value="Jugoso">Jugoso</option>
                    <option value="A Punto">A Punto</option>
                    <option value="Vuelta y Vuelta">Vuelta y Vuelta</option>
                    <option value="Bien Cocido">Bien Cocido</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="experience-photo-preset"
                    className="block text-xs font-semibold text-white/80 mb-1.5"
                  >
                    Foto de tu parrilla
                  </label>
                  <select
                    id="experience-photo-preset"
                    value={
                      PRESET_PHOTOS.some((p) => p.src === selectedImage)
                        ? selectedImage
                        : 'custom'
                    }
                    onChange={(e) => {
                      if (e.target.value !== 'custom') {
                        setSelectedImage(e.target.value);
                      }
                    }}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                  >
                    {PRESET_PHOTOS.map((preset) => (
                      <option key={preset.src} value={preset.src}>
                        {preset.label}
                      </option>
                    ))}
                    {!PRESET_PHOTOS.some((p) => p.src === selectedImage) && (
                      <option value="custom">Foto cargada desde tu dispositivo</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-xs font-semibold text-white/90 hover:border-[#E5B83B] cursor-pointer">
                  <Camera className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
                  <span>Subir foto propia</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                </label>

                <button
                  type="submit"
                  className="btn-pilsen-cta min-h-[44px] px-5 py-2.5 rounded-xl font-bold text-sm inline-flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" aria-hidden="true" />
                  <span>Publicar en el Muro</span>
                </button>
              </div>

              {postError && (
                <p
                  className="text-xs text-[#E5B83B] bg-[#D6001C]/35 border border-[#D6001C] rounded-lg p-3"
                  role="alert"
                >
                  {postError}
                </p>
              )}
            </form>

            {/* Posts Feed */}
            <div className="space-y-5" data-testid="experiences-feed">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="bg-[#071D54] border border-white/15 rounded-2xl overflow-hidden"
                >
                  <div className="p-5 pb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-base text-white">{post.authorName}</h4>
                      <p className="text-xs text-white/75 flex flex-wrap items-center gap-x-2">
                        <span className="text-[#E5B83B] font-semibold">{post.authorRank}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.authorCity}</span>
                        <span aria-hidden="true">·</span>
                        <span>Punto: {post.cookingPoint}</span>
                        <span aria-hidden="true">·</span>
                        <span>{post.timestamp}</span>
                      </p>
                    </div>
                  </div>

                  <p className="px-5 pb-4 text-sm text-white/90 leading-relaxed">
                    {post.caption}
                  </p>

                  <div className="aspect-[16/10] bg-[#0B2C7A] overflow-hidden">
                    <GrillImage
                      src={post.image}
                      alt={`Asado publicado por ${post.authorName}`}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-4 sm:px-5 border-t border-white/10 flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => onToggleFire(post.id)}
                      aria-pressed={post.hasFired}
                      aria-label={`Dar fuego a la publicación de ${post.authorName}, ${post.fires} fuegos`}
                      className={`inline-flex items-center gap-2 min-h-[40px] px-4 py-2 rounded-xl text-sm font-bold border transition-colors cursor-pointer ${
                        post.hasFired
                          ? 'bg-[#D6001C] border-white text-white'
                          : 'bg-[#0B2C7A] border-white/20 text-white/90 hover:border-[#E5B83B]'
                      }`}
                    >
                      <Flame
                        className={`w-4 h-4 ${
                          post.hasFired ? 'text-[#E5B83B] fill-[#E5B83B]' : 'text-[#E5B83B]'
                        }`}
                        aria-hidden="true"
                      />
                      <span className="font-mono-tabular">Fuego {post.fires}</span>
                    </button>

                    <span className="text-xs text-white/75 inline-flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {post.comments.length}{' '}
                        {post.comments.length === 1 ? 'comentario' : 'comentarios'}
                      </span>
                    </span>
                  </div>

                  <div className="px-5 pb-5 pt-3 border-t border-white/10 space-y-3 bg-[#061847]">
                    {post.comments.map((comment) => (
                      <div key={comment.id} className="text-xs space-y-0.5">
                        <p className="text-white/95">
                          <strong className="text-[#E5B83B]">{comment.author}</strong>{' '}
                          <span className="text-white/55">· {comment.timestamp}</span>
                        </p>
                        <p className="text-white/85">{comment.text}</p>
                      </div>
                    ))}

                    <form
                      onSubmit={(e) => handleCommentSubmit(e, post.id)}
                      className="flex items-center gap-2 pt-1"
                    >
                      <label htmlFor={`comment-${post.id}`} className="sr-only">
                        Comentar punto de cocción en el post de {post.authorName}
                      </label>
                      <input
                        id={`comment-${post.id}`}
                        type="text"
                        value={commentDrafts[post.id] ?? ''}
                        onChange={(e) =>
                          setCommentDrafts((prev) => ({
                            ...prev,
                            [post.id]: e.target.value,
                          }))
                        }
                        placeholder="Opiná sobre el punto de cocción..."
                        className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-xs text-white placeholder:text-white/50 focus:outline-none focus:border-[#E5B83B]"
                      />
                      <button
                        type="submit"
                        className="min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E5B83B] text-[#071D54] hover:bg-[#F3C952] transition-colors cursor-pointer whitespace-nowrap"
                      >
                        Comentar
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
