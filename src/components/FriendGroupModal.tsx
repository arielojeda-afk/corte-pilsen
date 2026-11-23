import { FormEvent, useEffect, useState } from 'react';
import { Trophy, UserPlus, Users, X } from 'lucide-react';
import { GroupZoneFilter } from '../types';
import { MAX_GROUP_FRIENDS, validateFriendGroupInput } from '../utils/parrillaLogic';

interface FriendGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCaptainName: string;
  onCreateGroup: (data: {
    name: string;
    zone: Exclude<GroupZoneFilter, 'Todas'>;
    neighborhood: string;
    captainName: string;
    members: string[];
    favoriteCut: string;
    motto: string;
  }) => void;
}

const CUT_CHOICES = [
  'Tapa Cuadril',
  'Vacío',
  'Costilla Tira Ancha',
  'Colita de Cuadril',
  'Ojo de Bife',
  'Bife de Chorizo',
  'Entraña Fina',
  'Asado de Tira Fina',
  'Nuevo Retador (¿?)',
];

export function FriendGroupModal({
  isOpen,
  onClose,
  defaultCaptainName,
  onCreateGroup,
}: FriendGroupModalProps) {
  const [name, setName] = useState('');
  const [zone, setZone] = useState<Exclude<GroupZoneFilter, 'Todas'>>('Asunción');
  const [neighborhood, setNeighborhood] = useState('');
  const [captainName, setCaptainName] = useState(defaultCaptainName);
  const [favoriteCut, setFavoriteCut] = useState('Tapa Cuadril');
  const [motto, setMotto] = useState('');
  const [memberDraft, setMemberDraft] = useState('');
  const [members, setMembers] = useState<string[]>(() =>
    defaultCaptainName.trim() ? [defaultCaptainName.trim()] : []
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (defaultCaptainName.trim() && !captainName.trim()) {
      setCaptainName(defaultCaptainName.trim());
    }
    if (defaultCaptainName.trim() && members.length === 0) {
      setMembers([defaultCaptainName.trim()]);
    }
  }, [isOpen, defaultCaptainName, captainName, members.length]);

  if (!isOpen) return null;

  const isAtMaxLimit = members.length >= MAX_GROUP_FRIENDS;

  const handleAddMember = () => {
    const cleaned = memberDraft.trim();
    if (!cleaned) return;
    if (members.length >= MAX_GROUP_FRIENDS) {
      setError(`Límite máximo de ${MAX_GROUP_FRIENDS} amigos alcanzado.`);
      return;
    }
    if (members.some((m) => m.toLowerCase() === cleaned.toLowerCase())) {
      setError('Ese amigo ya figura en la lista del grupo.');
      return;
    }
    setError(null);
    setMembers((prev) => [...prev, cleaned]);
    setMemberDraft('');
  };

  const handleRemoveMember = (index: number) => {
    setError(null);
    setMembers((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const resolvedMembers = [...members];
    const cleanCaptain = captainName.trim();
    if (
      cleanCaptain &&
      !resolvedMembers.some((m) => m.toLowerCase() === cleanCaptain.toLowerCase()) &&
      resolvedMembers.length < MAX_GROUP_FRIENDS
    ) {
      resolvedMembers.unshift(cleanCaptain);
    }

    const validationError = validateFriendGroupInput(
      name,
      neighborhood,
      captainName,
      resolvedMembers,
      motto
    );
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onCreateGroup({
      name: name.trim(),
      zone,
      neighborhood: neighborhood.trim(),
      captainName: cleanCaptain,
      members: resolvedMembers,
      favoriteCut,
      motto: motto.trim(),
    });
    setName('');
    setNeighborhood('');
    setMotto('');
    setMemberDraft('');
    setMembers(defaultCaptainName.trim() ? [defaultCaptainName.trim()] : []);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="friend-group-modal-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto bg-[#072468] border-2 border-[#E5B83B] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase text-[#E5B83B]">
              Rumbo a la Gran Final · Máximo {MAX_GROUP_FRIENDS} Amigos
            </p>
            <h3
              id="friend-group-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold uppercase"
            >
              Postular mi Grupo de Amigos
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar formulario de grupo de amigos"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#071D54] border border-white/20 text-white/85 hover:text-[#E5B83B] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-[#071D54] border border-[#E5B83B]/45 rounded-xl p-3.5 mb-4 text-xs text-white/90 flex items-start gap-2.5">
          <Trophy className="w-4 h-4 text-[#E5B83B] shrink-0 mt-0.5" aria-hidden="true" />
          <p>
            El grupo con más <strong className="text-[#E5B83B]">Likes</strong> gana su mesa en la{' '}
            <strong className="text-white">Gran Final</strong> para degustar y elegir al mejor corte
            del país. Cupo estricto de hasta {MAX_GROUP_FRIENDS} integrantes.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="group-name"
              className="block text-xs font-semibold text-white/85 mb-1.5"
            >
              Nombre del Grupo de Amigos
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Los Perros de Recoleta"
              className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="group-zone"
                className="block text-xs font-semibold text-white/85 mb-1.5"
              >
                Zona
              </label>
              <select
                id="group-zone"
                value={zone}
                onChange={(e) =>
                  setZone(e.target.value as Exclude<GroupZoneFilter, 'Todas'>)
                }
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
              >
                <option value="Asunción">Asunción</option>
                <option value="Gran Asunción">Gran Asunción</option>
                <option value="Ciudad del Este">Ciudad del Este</option>
                <option value="Interior">Interior</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="group-neighborhood"
                className="block text-xs font-semibold text-white/85 mb-1.5"
              >
                Barrio o Ciudad
              </label>
              <input
                id="group-neighborhood"
                type="text"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                placeholder="Ej. Recoleta"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="group-captain"
                className="block text-xs font-semibold text-white/85 mb-1.5"
              >
                Capitán / Referente
              </label>
              <input
                id="group-captain"
                type="text"
                value={captainName}
                onChange={(e) => setCaptainName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
              />
            </div>

            <div>
              <label
                htmlFor="group-favorite-cut"
                className="block text-xs font-semibold text-white/85 mb-1.5"
              >
                Corte favorito que defienden
              </label>
              <select
                id="group-favorite-cut"
                value={favoriteCut}
                onChange={(e) => setFavoriteCut(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
              >
                {CUT_CHOICES.map((cut) => (
                  <option key={cut} value={cut}>
                    {cut}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Friends Builder (Max 10) */}
          <div className="bg-[#071D54] border border-white/15 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="group-member-input"
                className="text-xs font-bold uppercase tracking-wide text-[#E5B83B] flex items-center gap-1.5"
              >
                <Users className="w-4 h-4" aria-hidden="true" />
                <span>Integrantes del grupo</span>
              </label>
              <span
                className={`font-mono-tabular text-xs font-bold ${
                  isAtMaxLimit ? 'text-[#D6001C] bg-white px-2 py-0.5 rounded' : 'text-white/85'
                }`}
                data-testid="group-members-counter"
              >
                {members.length} / {MAX_GROUP_FRIENDS} amigos máx.
              </span>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="group-member-input"
                type="text"
                value={memberDraft}
                disabled={isAtMaxLimit}
                onChange={(e) => setMemberDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                placeholder={
                  isAtMaxLimit
                    ? 'Límite máximo de 10 amigos alcanzado'
                    : 'Nombre del amigo (ej. Santi Ferreira)'
                }
                className="flex-1 min-h-[42px] px-3 py-2 rounded-xl bg-[#0B2C7A] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B] disabled:opacity-55"
              />
              <button
                type="button"
                disabled={isAtMaxLimit || !memberDraft.trim()}
                onClick={handleAddMember}
                className="btn-pilsen-gold min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <UserPlus className="w-4 h-4" aria-hidden="true" />
                <span>Sumar amigo</span>
              </button>
            </div>

            {isAtMaxLimit && (
              <p className="text-xs font-semibold text-[#E5B83B]">
                Límite máximo de {MAX_GROUP_FRIENDS} amigos alcanzado. Podés quitar a alguien si
                necesitás reemplazar un lugar.
              </p>
            )}

            {members.length > 0 ? (
              <ul className="flex flex-wrap gap-2" aria-label="Amigos agregados al grupo">
                {members.map((member, index) => (
                  <li
                    key={`${member}-${index}`}
                    className="inline-flex items-center gap-1.5 bg-[#0B2C7A] border border-white/20 rounded-lg px-2.5 py-1 text-xs text-white"
                  >
                    <span>
                      {index + 1}. {member}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(index)}
                      aria-label={`Quitar a ${member} del grupo`}
                      className="text-white/65 hover:text-[#D6001C] cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-white/60">
                Agregá entre 2 y {MAX_GROUP_FRIENDS} amigos para postular el equipo.
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="group-motto"
              className="block text-xs font-semibold text-white/85 mb-1.5"
            >
              Lema parrillero (¿Por qué tienen que estar en la Gran Final?)
            </label>
            <textarea
              id="group-motto"
              rows={2}
              value={motto}
              onChange={(e) => setMotto(e.target.value)}
              placeholder="Ej. Diez años haciendo el asado del tercer tiempo sin fallar un punto."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
            />
          </div>

          {error && (
            <p
              className="text-xs text-[#E5B83B] bg-[#D6001C]/35 border border-[#D6001C] rounded-lg p-3"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-pilsen-cta w-full min-h-[48px] px-5 py-3 rounded-xl font-display text-lg font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
          >
            <Trophy className="w-5 h-5" aria-hidden="true" />
            <span>Postular Grupo a la Gran Final</span>
          </button>
        </form>
      </div>
    </div>
  );
}
