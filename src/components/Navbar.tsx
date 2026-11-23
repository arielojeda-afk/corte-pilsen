import { Flame, MapPin, Award, Users, UserCheck, ShieldCheck } from 'lucide-react';
import { ParrilleroProfile } from '../types';

interface NavbarProps {
  profile: ParrilleroProfile | null;
  onOpenCarnet: () => void;
  onOpenAdmin?: () => void;
}

export function Navbar({ profile, onOpenCarnet, onOpenAdmin }: NavbarProps) {
  const isSuperAdmin =
    profile?.role === 'superadmin' ||
    profile?.email.toLowerCase() === 'ariel.ojeda@lupe.com.py';

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#072468] border-b-4 border-[#D6001C] shadow-md">
        <div className="max-w-7xl mx-auto h-14 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 sm:gap-8">
          {/* Zone 1: Single-line Pilsen Diamond Wordmark */}
          <a
            href="#inicio"
            className="inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#E5B83B] rounded-sm"
          >
            <svg
              viewBox="0 0 64 40"
              className="w-10 h-6 shrink-0"
              aria-hidden="true"
            >
              <polygon
                points="32,2 62,20 32,38 2,20"
                fill="#D6001C"
                stroke="#FFFFFF"
                strokeWidth="2.5"
              />
              <text
                x="32"
                y="24"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="700"
                fontFamily="Oswald, sans-serif"
                letterSpacing="0.8"
              >
                PILSEN
              </text>
            </svg>
            <span className="font-display text-lg sm:text-2xl font-bold tracking-tight text-white uppercase">
              TORNEO DEL CORTE
            </span>
          </a>

          {/* Zone 2: 4 Single-line Text Nav Links */}
          <nav
            aria-label="Navegación principal"
            className="hidden md:flex items-center gap-6 text-sm font-semibold text-white/90 uppercase tracking-wide"
          >
            <a
              href="#torneo"
              className="hover:text-[#E5B83B] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#D6001C]"
            >
              Torneo
            </a>
            <a
              href="#donde-conseguirlo"
              className="hover:text-[#E5B83B] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#D6001C]"
            >
              Dónde Conseguirlo
            </a>
            <a
              href="#guinness"
              className="hover:text-[#E5B83B] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#D6001C]"
            >
              Récord Guinness
            </a>
            <a
              href="#comunidad"
              className="hover:text-[#E5B83B] transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:border-[#D6001C]"
            >
              Comunidad
            </a>
          </nav>

          {/* Zone 3: Actions */}
          <div className="flex items-center gap-2.5 shrink-0">
            {isSuperAdmin && onOpenAdmin && (
              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-1.5 min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-black uppercase whitespace-nowrap shrink-0 bg-[#D6001C] text-white border-2 border-[#E5B83B] hover:bg-red-700 transition-colors shadow-md cursor-pointer"
                title="Abrir Panel de Super Administrador"
              >
                <ShieldCheck className="w-4 h-4 text-[#E5B83B] shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Super Admin</span>
              </button>
            )}

            <button
              type="button"
              onClick={onOpenCarnet}
              className="inline-flex items-center gap-2 min-h-[38px] px-3 sm:px-4 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap shrink-0 bg-[#E5B83B] text-[#071D54] hover:bg-[#F3C952] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white cursor-pointer"
            >
              {profile ? (
                <>
                  <UserCheck className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span className="truncate max-w-[110px] sm:max-w-[140px]">{profile.name}</span>
                </>
              ) : (
                <span>Ingresar / Carnet</span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Thumb Nav */}
      <nav
        aria-label="Navegación móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-14 bg-[#072468]/95 backdrop-blur-md border-t-2 border-[#D6001C]"
      >
        <div className={`grid ${isSuperAdmin ? 'grid-cols-5' : 'grid-cols-4'} h-full`}>
          <a
            href="#torneo"
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white/90 hover:text-[#E5B83B] transition-colors min-h-[44px]"
          >
            <Flame className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
            <span>Torneo</span>
          </a>
          <a
            href="#donde-conseguirlo"
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white/90 hover:text-[#E5B83B] transition-colors min-h-[44px]"
          >
            <MapPin className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
            <span>Aliados</span>
          </a>
          <a
            href="#guinness"
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white/90 hover:text-[#E5B83B] transition-colors min-h-[44px]"
          >
            <Award className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
            <span>Guinness</span>
          </a>
          <a
            href="#comunidad"
            className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold text-white/90 hover:text-[#E5B83B] transition-colors min-h-[44px]"
          >
            <Users className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
            <span>Muro</span>
          </a>
          {isSuperAdmin && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-[#E5B83B] hover:text-white transition-colors min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
