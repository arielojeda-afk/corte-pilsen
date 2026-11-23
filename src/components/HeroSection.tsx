import { ArrowDown, Eye, Flame } from 'lucide-react';
import { CAMPAIGN_IMAGES } from '../data/campaignData';
import { GrillImage } from './GrillImage';

interface HeroSectionProps {
  onStartTournament: () => void;
  onInspectChallenger: () => void;
  totalVotesCount: number;
  leadingCutName: string;
  isRevealed?: boolean;
}

export function HeroSection({
  onStartTournament,
  onInspectChallenger,
  totalVotesCount,
  leadingCutName,
  isRevealed = false,
}: HeroSectionProps) {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden pilsen-blue-canvas border-b-4 border-[#D6001C]"
    >
      {/* Subtle Background Parrilla Atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <GrillImage
          src={CAMPAIGN_IMAGES.hero}
          alt="Parrilla paraguaya encendida"
          className="w-full h-full object-cover object-center opacity-25 mix-blend-luminosity"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#071D54]/95 via-[#0B2C7A]/80 to-[#0B2C7A]/65"
        />
      </div>

      {/* Classic Pilsen Rotated Diamond Geometry Accent */}
      <div
        aria-hidden="true"
        className="hidden lg:block pointer-events-none absolute right-[8%] top-1/2 -translate-y-1/2 w-[360px] h-[360px] rotate-45 bg-[#D6001C] border-8 border-white/90 shadow-2xl opacity-90"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          {/* Left Copy Column */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-block bg-[#D6001C] px-3.5 py-1.5">
              <p className="font-display text-xs sm:text-sm font-bold uppercase tracking-wider text-white">
                Pilsen Paraguay · El Torneo Oficial de la Parrilla
              </p>
            </div>

            <h1
              className="font-display font-bold uppercase tracking-tight text-white leading-[0.98]"
              style={{
                fontSize: 'clamp(2.5rem, 5.2vw, 4.4rem)',
                textWrap: 'balance',
              }}
            >
              EN PARAGUAY NO SE COME CARNE. SE COME CORTE.
            </h1>

            <p className="text-base sm:text-xl text-white/90 leading-relaxed max-w-xl">
              Torneo semanal de llaves de Lunes a Domingo con los 8 cortes clásicos. Registrate con tu
              Carnet Parrillero para votar día por día y descubrí las características del Nuevo Retador.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 pt-1">
              <button
                type="button"
                onClick={onStartTournament}
                className="btn-pilsen-cta inline-flex items-center justify-center gap-2.5 min-h-[52px] px-7 py-3.5 rounded-xl font-display text-lg sm:text-xl font-bold tracking-wide uppercase cursor-pointer whitespace-nowrap"
              >
                <Flame className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>ENTRAR A LA PARRILLA Y VOTAR</span>
                <ArrowDown className="w-5 h-5 shrink-0" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={onInspectChallenger}
                className="inline-flex items-center justify-center gap-2 min-h-[52px] px-5 py-3 rounded-xl font-display text-base font-bold uppercase tracking-wide bg-[#071D54]/90 border-2 border-[#E5B83B] text-[#E5B83B] hover:bg-[#E5B83B] hover:text-[#071D54] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{isRevealed ? 'Ver El Corte Pilsen' : 'Ver Nuevo Retador'}</span>
              </button>
            </div>

            <div className="text-xs sm:text-sm text-white/85 flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-2 font-mono-tabular">
              <span>
                <strong className="text-[#E5B83B]">{totalVotesCount.toLocaleString('es-PY')}</strong>{' '}
                votos registrados
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Puntero actual: <strong className="text-[#E5B83B]">{leadingCutName}</strong>
              </span>
            </div>
          </div>

          {/* Right Official Pilsen Product & Grill Visual */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative w-full max-w-md rounded-2xl overflow-hidden border-2 border-[#E5B83B]/80 bg-[#071D54] shadow-2xl">
              <GrillImage
                src={CAMPAIGN_IMAGES.pilsenLineup}
                alt="Chopp Pilsen, botella clásica de litro, Pilsen'i y lata oficial de Pilsen Paraguay"
                className="w-full aspect-square object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#071D54] via-[#071D54]/80 to-transparent"
              />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-display text-xs uppercase tracking-wider text-[#E5B83B] font-bold">
                    Donde está la parrilla, está Pilsen
                  </p>
                  <p className="font-display text-xl font-bold uppercase text-white">
                    Vestida de Novia · 10 Años Monde Selection
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
