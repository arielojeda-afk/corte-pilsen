import { FormEvent, useState } from 'react';
import {
  Award,
  Beer,
  Download,
  Flame,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  UserPlus,
  Utensils,
  X,
} from 'lucide-react';
import { MEAT_CUTS } from '../data/campaignData';
import { ParrilleroProfile, ParrilleroRank } from '../types';
import { validateRegistrationInput } from '../utils/parrillaLogic';

interface CarnetModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingProfile: ParrilleroProfile | null;
  computedRank: ParrilleroRank;
  registrationNotice?: string | null;
  onRegister: (data: {
    name: string;
    email: string;
    password?: string;
    phone?: string;
    ci?: string;
    city: string;
    favoriteCut: string;
    avatarStyle: ParrilleroProfile['avatarStyle'];
  }) => Promise<void>;
  onLogin: (email: string, password: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onOpenAdmin?: () => void;
}

const AVATAR_OPTIONS: {
  id: ParrilleroProfile['avatarStyle'];
  label: string;
}[] = [
  { id: 'brasa', label: 'Maestro Brasa' },
  { id: 'chop', label: 'Pilsen Helada' },
  { id: 'estaca', label: 'Asador Estaca' },
  { id: 'cuchillo', label: 'Filo Maestro' },
];

export function CarnetAvatarIcon({
  style,
  className = 'w-6 h-6',
}: {
  style: ParrilleroProfile['avatarStyle'];
  className?: string;
}) {
  if (style === 'chop') return <Beer className={className} aria-hidden="true" />;
  if (style === 'estaca') return <Award className={className} aria-hidden="true" />;
  if (style === 'cuchillo') return <Utensils className={className} aria-hidden="true" />;
  return <Flame className={className} aria-hidden="true" />;
}

export function downloadCarnetCardPng(profile: ParrilleroProfile, rank: ParrilleroRank) {
  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const grad = ctx.createLinearGradient(0, 0, 960, 540);
  grad.addColorStop(0, '#0B2C7A');
  grad.addColorStop(1, '#071D54');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 960, 540);

  ctx.strokeStyle = '#E5B83B';
  ctx.lineWidth = 6;
  ctx.strokeRect(20, 20, 920, 500);

  ctx.fillStyle = '#D6001C';
  ctx.fillRect(23, 23, 914, 72);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 32px Oswald, sans-serif';
  ctx.fillText('CARNET OFICIAL · MAESTRO PARRILLERO PILSEN', 50, 70);

  ctx.fillStyle = '#E5B83B';
  ctx.font = 'bold 26px Oswald, sans-serif';
  ctx.fillText(`RANGO: ${rank.toUpperCase()}`, 50, 155);

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 50px Oswald, sans-serif';
  ctx.fillText(profile.name.toUpperCase(), 50, 230);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.90)';
  ctx.font = '22px sans-serif';
  ctx.fillText(`Correo: ${profile.email}`, 50, 280);
  ctx.fillText(`Territorio: ${profile.city}`, 50, 320);
  ctx.fillText(`Corte Titular: ${profile.favoriteCut}`, 50, 360);

  ctx.fillStyle = '#E5B83B';
  ctx.font = 'bold 24px monospace';
  ctx.fillText(`CREDENCIAL N° ${profile.memberNumber}`, 50, 445);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PILSEN · PARAGUAY', 690, 445);

  const link = document.createElement('a');
  link.download = `carnet-pilsen-${profile.name.toLowerCase().replace(/\s+/g, '-')}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function CarnetModal({
  isOpen,
  onClose,
  existingProfile,
  computedRank,
  registrationNotice,
  onRegister,
  onLogin,
  onLogout,
  onOpenAdmin,
}: CarnetModalProps) {
  const [authTab, setAuthTab] = useState<'register' | 'login'>('register');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for register
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [favoriteCut, setFavoriteCut] = useState('Tapa Cuadril');
  const [avatarStyle, setAvatarStyle] = useState<ParrilleroProfile['avatarStyle']>('brasa');

  // Form states for login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  if (!isOpen) return null;

  const isSuperAdmin =
    existingProfile?.role === 'superadmin' ||
    existingProfile?.email.toLowerCase() === 'ariel.ojeda@lupe.com.py';

  const handleRegisterSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const validationError = validateRegistrationInput({
      name,
      email,
      password,
      city,
      favoriteCut,
    });
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      await onRegister({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password: password.trim(),
        phone: phone.trim() || undefined,
        city: city.trim(),
        favoriteCut,
        avatarStyle,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrarte. Probá de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!loginEmail.trim() || !loginPassword.trim()) {
      setError('Completá tu correo y contraseña para ingresar.');
      return;
    }

    setLoading(true);
    try {
      await onLogin(loginEmail.trim().toLowerCase(), loginPassword.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión. Verificá tus datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFillAdmin = () => {
    setLoginEmail('ariel.ojeda@lupe.com.py');
    setLoginPassword('');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="carnet-modal-title"
    >
      <div className="w-full max-w-lg my-8 max-h-[90vh] overflow-y-auto bg-[#072468] border-2 border-[#E5B83B] rounded-2xl p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase text-[#E5B83B] tracking-wider">
              Credencial Digital Oficial Pilsen
            </p>
            <h3 id="carnet-modal-title" className="font-display text-2xl sm:text-3xl font-bold uppercase">
              {existingProfile ? 'Tu Carnet de Parrillero' : 'Sacá tu Carnet para Votar'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal de Carnet"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#071D54] border border-white/20 text-white/85 hover:text-[#E5B83B] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {registrationNotice && !existingProfile && (
          <div
            role="status"
            data-testid="carnet-registration-notice"
            className="mb-5 rounded-xl bg-[#D6001C]/30 border-2 border-[#E5B83B] p-3.5 text-sm text-[#FFF6DC] font-medium"
          >
            {registrationNotice}
          </div>
        )}

        {/* View when user IS registered/logged in */}
        {existingProfile ? (
          <div className="space-y-5">
            {isSuperAdmin && (
              <div className="rounded-xl bg-gradient-to-r from-[#D6001C] to-[#071D54] border-2 border-[#E5B83B] p-4 flex items-center justify-between gap-3 shadow-lg">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-[#E5B83B] shrink-0" aria-hidden="true" />
                  <div>
                    <span className="inline-block bg-[#E5B83B] text-[#071D54] text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                      SUPER ADMINISTRADOR
                    </span>
                    <p className="font-display text-base sm:text-lg font-bold text-white mt-0.5">
                      ariel.ojeda@lupe.com.py
                    </p>
                  </div>
                </div>
                {onOpenAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenAdmin();
                    }}
                    className="btn-pilsen-gold min-h-[40px] px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Panel Admin
                  </button>
                )}
              </div>
            )}

            <div className="rounded-2xl border-2 border-[#E5B83B] bg-[#071D54] p-5 shadow-inner">
              <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-white/15">
                <span className="font-display text-sm font-bold uppercase tracking-wider text-[#E5B83B]">
                  Carnet Oficial · Maestro Parrillero
                </span>
                <span className="font-mono-tabular text-xs font-bold text-white bg-[#D6001C] px-2.5 py-1 rounded">
                  {existingProfile.memberNumber}
                </span>
              </div>
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-xl bg-[#D6001C] border border-[#E5B83B] flex items-center justify-center text-white shrink-0">
                  <CarnetAvatarIcon style={existingProfile.avatarStyle} className="w-7 h-7" />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-2xl font-bold uppercase truncate">
                    {existingProfile.name}
                  </p>
                  <p className="text-xs text-[#E5B83B] font-semibold flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    <span>{existingProfile.rank || computedRank}</span>
                  </p>
                </div>
              </div>
              <div className="text-xs text-white/85 space-y-1 mb-5 bg-[#0B2C7A]/60 p-3 rounded-xl border border-white/10">
                <p>
                  <strong className="text-white/60">Correo:</strong> {existingProfile.email}
                </p>
                <p>
                  <strong className="text-white/60">Territorio / Ciudad:</strong> {existingProfile.city}
                </p>
                <p>
                  <strong className="text-white/60">Corte titular:</strong> {existingProfile.favoriteCut}
                </p>
                {existingProfile.phone && (
                  <p>
                    <strong className="text-white/60">Teléfono:</strong> {existingProfile.phone}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => downloadCarnetCardPng(existingProfile, computedRank)}
                className="btn-pilsen-gold w-full min-h-[44px] px-4 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer mb-3"
              >
                <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Descargar Carnet en PNG</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await onLogout();
                  onClose();
                }}
                className="w-full min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold bg-[#0B2C7A] border border-white/20 text-white/80 hover:text-white hover:border-red-400 flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        ) : (
          /* View when user is NOT registered/logged in */
          <div>
            {/* Tabs: Registrarse vs Iniciar Sesión */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#071D54] rounded-xl mb-5 border border-white/15">
              <button
                type="button"
                onClick={() => {
                  setAuthTab('register');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  authTab === 'register'
                    ? 'bg-[#D6001C] text-white shadow-md'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Crear Carnet</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthTab('login');
                  setError(null);
                }}
                className={`py-2 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  authTab === 'login'
                    ? 'bg-[#E5B83B] text-[#071D54] shadow-md font-black'
                    : 'text-white/70 hover:text-white'
                }`}
              >
                <LogIn className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>Iniciar Sesión</span>
              </button>
            </div>

            {error && (
              <p
                className="text-xs text-[#FFF6DC] bg-[#D6001C]/80 border border-[#E5B83B] rounded-xl p-3 mb-4"
                role="alert"
              >
                {error}
              </p>
            )}

            {authTab === 'register' ? (
              /* Registration Form */
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div>
                  <label htmlFor="carnet-name" className="block text-xs font-semibold text-white/85 mb-1.5">
                    Nombre y Apellido o Apodo Parrillero *
                  </label>
                  <input
                    id="carnet-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Ariel Ojeda"
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="carnet-email" className="block text-xs font-semibold text-white/85 mb-1.5">
                      Correo Electrónico *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                      <input
                        id="carnet-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@correo.com"
                        className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="carnet-password" className="block text-xs font-semibold text-white/85 mb-1.5">
                      Contraseña * (mín. 6 letras)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                      <input
                        id="carnet-password"
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="carnet-city" className="block text-xs font-semibold text-white/85 mb-1.5">
                      Barrio / Ciudad *
                    </label>
                    <input
                      id="carnet-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ej. Sajonia, Asunción"
                      className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                    />
                  </div>

                  <div>
                    <label htmlFor="carnet-phone" className="block text-xs font-semibold text-white/85 mb-1.5">
                      Teléfono o C.I. (Opcional)
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                      <input
                        id="carnet-phone"
                        type="text"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Ej. 0981 123 456"
                        className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="carnet-cut" className="block text-xs font-semibold text-white/85 mb-1.5">
                    Corte Favorito de la Parrilla *
                  </label>
                  <select
                    id="carnet-cut"
                    value={favoriteCut}
                    onChange={(e) => setFavoriteCut(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white focus:outline-none focus:border-[#E5B83B]"
                  >
                    <option value="Nuevo Retador (Clasificado)">Nuevo Retador (El Corte Pilsen)</option>
                    {Object.values(MEAT_CUTS)
                      .filter((c) => c.id !== 'retador')
                      .map((cut) => (
                        <option key={cut.id} value={cut.name}>
                          {cut.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <p className="block text-xs font-semibold text-white/85 mb-1.5">
                    Elegí tu Insignia de Parrillero
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {AVATAR_OPTIONS.map((opt) => {
                      const selected = avatarStyle === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setAvatarStyle(opt.id)}
                          aria-pressed={selected}
                          className={`min-h-[50px] p-2 rounded-xl border text-xs font-semibold flex flex-col items-center justify-center gap-1 cursor-pointer transition-colors ${
                            selected
                              ? 'bg-[#D6001C] border-white text-white'
                              : 'bg-[#071D54] border-white/15 text-white/80 hover:border-white/40'
                          }`}
                        >
                          <CarnetAvatarIcon style={opt.id} className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pilsen-cta w-full min-h-[48px] px-5 py-3 rounded-xl font-display text-lg font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Registrando...' : 'Registrarme y Sacar Carnet Oficial'}
                </button>
              </form>
            ) : (
              /* Login Form */
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="rounded-xl bg-[#0B2C7A] p-3 text-xs text-white/85 border border-white/15">
                  <p>
                    Iniciá sesión con tu correo registrado para cargar tus votos oficiales y tu carnet.
                  </p>
                  <button
                    type="button"
                    onClick={handleQuickFillAdmin}
                    className="text-[#E5B83B] hover:underline font-bold mt-1 text-[11px] block cursor-pointer"
                  >
                    👑 ¿Sos Ariel Ojeda (Super Admin)? Hacé clic para completar tu correo
                  </button>
                </div>

                <div>
                  <label htmlFor="login-email" className="block text-xs font-semibold text-white/85 mb-1.5">
                    Correo Electrónico *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="ariel.ojeda@lupe.com.py"
                      className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="block text-xs font-semibold text-white/85 mb-1.5">
                    Contraseña *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-white/40 absolute left-3 top-3.5" aria-hidden="true" />
                    <input
                      id="login-password"
                      type="password"
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      className="w-full min-h-[44px] pl-9 pr-3.5 py-2.5 rounded-xl bg-[#071D54] border border-white/20 text-sm text-white placeholder:text-white/45 focus:outline-none focus:border-[#E5B83B]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-pilsen-gold w-full min-h-[48px] px-5 py-3 rounded-xl font-display text-lg font-bold uppercase tracking-wide cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Verificando...' : 'Iniciar Sesión'}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
