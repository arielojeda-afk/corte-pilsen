import { Award, Flame } from 'lucide-react';
import { CAMPAIGN_IMAGES } from '../data/campaignData';
import { GrillImage } from './GrillImage';

interface GuinnessSectionProps {
  onJoinChallenge: () => void;
}

export function GuinnessSection({ onJoinChallenge }: GuinnessSectionProps) {
  return (
    <section
      id="guinness"
      className="py-16 sm:py-20 pilsen-deep-canvas border-b-4 border-[#D6001C]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Gold Commemorative Plaque Frame */}
        <div className="relative rounded-3xl border-2 border-[#E5B83B] bg-[#0B2C7A] p-6 sm:p-10 lg:p-12 overflow-hidden shadow-2xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left Copy & Plaque Story */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-[#D6001C] px-3 py-1 rounded text-white mb-4">
                  <Award className="w-4 h-4 text-[#E5B83B] shrink-0" aria-hidden="true" />
                  <p className="text-xs font-bold uppercase tracking-wider">
                    Placa Conmemorativa · Orgullo Nacional
                  </p>
                </div>

                <h2
                  className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white mb-4"
                  style={{ textWrap: 'balance' }}
                >
                  La Parrilla Más Grande del Mundo
                </h2>

                <div className="space-y-4 text-sm sm:text-base text-white/90 leading-relaxed">
                  <p>
                    Paraguay ya escribió su nombre en el <strong className="text-[#E5B83B]">Récord Guinness</strong>{' '}
                    con la mayor comilona de asado vacuno del planeta: más de 26.715 kilos de carne
                    asada al carbón de quebracho demostrando al mundo que acá la parrilla es
                    cultura viva.
                  </p>
                  <p>
                    Hoy <strong className="text-[#E5B83B]">Pilsen Paraguay</strong> honra esa hazaña
                    y prepara a todo el país para el próximo hito: <em>la juntada parrillera descentralizada más grande del Paraguay</em>,
                    prendiendo parrillas en los 17 departamentos cuando se devele el nombre del Nuevo
                    Retador.
                  </p>
                </div>
              </div>

              <div className="bg-[#071D54] border border-[#E5B83B]/50 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <p className="font-mono-tabular text-xs font-bold uppercase text-[#E5B83B] mb-1">
                    26.715 KG ASADOS · HITO GUINNESS PARAGUAY
                  </p>
                  <p className="text-xs sm:text-sm text-white/85">
                    Postulá a tu grupo de hasta 10 amigos y juntá Likes para elegir el mejor corte en
                    la Gran Final.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onJoinChallenge}
                  className="btn-pilsen-gold inline-flex items-center justify-center gap-2 min-h-[46px] px-5 py-2.5 rounded-xl font-display text-sm sm:text-base font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Postular mi grupo</span>
                </button>
              </div>
            </div>

            {/* Right Visual Plaque Photo */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative flex-1 min-h-[260px] rounded-2xl overflow-hidden border-2 border-[#E5B83B]/60">
                <GrillImage
                  src={CAMPAIGN_IMAGES.guinness}
                  alt="Estacas de asado paraguayo en hilera iluminando la noche del Récord Guinness"
                  className="w-full h-full object-cover"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-[#071D54] via-[#071D54]/20 to-transparent"
                />
                <div className="absolute bottom-4 left-4 right-4 bg-[#071D54]/90 backdrop-blur-sm border border-[#E5B83B]/60 rounded-xl p-4">
                  <p className="font-mono-tabular text-xs font-bold text-[#E5B83B] mb-1">
                    DE MARIANO ROQUE ALONSO A TODO EL PAÍS
                  </p>
                  <p className="text-xs sm:text-sm text-white/90">
                    Cada quincho, patio y vereda conectado bajo el mismo fuego y una Pilsen bien
                    helada.
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
