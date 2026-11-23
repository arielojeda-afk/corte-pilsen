import { useState } from 'react';
import {
  Beer,
  Clock,
  ExternalLink,
  MapPin,
  QrCode,
  Scissors,
  Store,
  UtensilsCrossed,
} from 'lucide-react';
import { ALLY_LOCATIONS, CAMPAIGN_IMAGES } from '../data/campaignData';
import { AllyCategory, AllyLocation, ZoneFilter } from '../types';
import { filterAliados } from '../utils/parrillaLogic';
import { GrillImage } from './GrillImage';

interface AliadosSectionProps {
  onOpenButcherMode: () => void;
  onOpenPromoQr: (ally: AllyLocation) => void;
}

const ZONES: ZoneFilter[] = ['Todas', 'Asunción', 'Gran Asunción', 'Ciudad del Este'];

export function AliadosSection({ onOpenButcherMode, onOpenPromoQr }: AliadosSectionProps) {
  const [selectedZone, setSelectedZone] = useState<ZoneFilter>('Todas');
  const [activeCategory, setActiveCategory] = useState<AllyCategory>('carniceria');

  const filteredLocations = filterAliados(ALLY_LOCATIONS, selectedZone, activeCategory);

  return (
    <section
      id="donde-conseguirlo"
      className="py-16 sm:py-20 pilsen-blue-canvas border-b-4 border-[#D6001C]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Pilsen Promo Feature Banner with Real Pilsen'i Image */}
        <div className="mb-10 rounded-2xl overflow-hidden bg-[#071D54] border-2 border-[#E5B83B]/70 grid grid-cols-1 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 h-52 lg:h-full relative">
            <GrillImage
              src={CAMPAIGN_IMAGES.pilsenBottleHand}
              alt="Botella de Pilsen bien helada vestida de novia"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-transparent to-[#071D54]/80 hidden lg:block"
            />
          </div>
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#E5B83B] mb-1.5">
                Red Oficial · Asunción, Gran Asunción y Alto Paraná
              </p>
              <h2
                className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                ¿Dónde conseguir el corte y tu Pilsen fría?
              </h2>
              <p className="text-sm text-white/85 mt-2 max-w-xl">
                Mostrá el diagrama del Modo Carnicero en las carnicerías aliadas o probá la pieza
                en nuestras churrasquerías oficiales con packs de Pilsen bien helada.
              </p>
            </div>

            <button
              type="button"
              onClick={onOpenButcherMode}
              className="btn-pilsen-cta inline-flex items-center justify-center gap-2 min-h-[48px] px-5 py-3 rounded-xl font-display text-base font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
            >
              <Scissors className="w-5 h-5 shrink-0" aria-hidden="true" />
              <span>Modo Carnicero</span>
            </button>
          </div>
        </div>

        {/* Category Tabs + Zone Filter Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 mb-8 border-b border-white/15">
          <div
            role="tablist"
            aria-label="Tipo de establecimiento"
            className="flex flex-wrap sm:inline-flex w-full sm:w-auto gap-1 p-1 rounded-xl bg-[#071D54] border border-white/15 self-start"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'carniceria'}
              onClick={() => setActiveCategory('carniceria')}
              className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === 'carniceria'
                  ? 'bg-[#D6001C] text-white'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <Store className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Carnicerías Aliadas</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === 'restaurante'}
              onClick={() => setActiveCategory('restaurante')}
              className={`inline-flex flex-1 sm:flex-initial items-center justify-center gap-1.5 min-h-[40px] px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                activeCategory === 'restaurante'
                  ? 'bg-[#D6001C] text-white'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              <UtensilsCrossed className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Restaurantes y Churrasquerías</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por zona">
            {ZONES.map((zone) => {
              const active = selectedZone === zone;
              return (
                <button
                  key={zone}
                  type="button"
                  onClick={() => setSelectedZone(zone)}
                  aria-pressed={active}
                  className={`min-h-[40px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-[#E5B83B] border-[#E5B83B] text-[#071D54]'
                      : 'bg-[#071D54] border-white/20 text-white/85 hover:border-white/50'
                  }`}
                >
                  {zone}
                </button>
              );
            })}
          </div>
        </div>

        {/* Ally Cards Grid */}
        {filteredLocations.length === 0 ? (
          <div className="bg-[#071D54] border border-white/15 rounded-2xl p-8 text-center">
            <p className="text-base text-white/85 mb-3">
              Todavía no hay locales cargados en esta categoría para {selectedZone}.
            </p>
            <button
              type="button"
              onClick={() => setSelectedZone('Todas')}
              className="min-h-[40px] px-4 py-2 rounded-lg text-sm font-bold bg-[#E5B83B] text-[#071D54] cursor-pointer"
            >
              Ver todas las zonas
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredLocations.map((ally) => {
              const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                `${ally.name} ${ally.address} Paraguay`
              )}`;

              return (
                <article
                  key={ally.id}
                  className="bg-[#071D54] border border-white/15 rounded-2xl p-5 flex flex-col justify-between gap-5 hover:border-[#E5B83B] transition-colors"
                >
                  <div className="space-y-3">
                    <div className="text-xs text-[#E5B83B] font-bold flex items-center gap-2">
                      <span>{ally.zone}</span>
                      <span aria-hidden="true">·</span>
                      <span>{ally.neighborhood}</span>
                    </div>

                    <h3 className="font-display text-2xl font-bold uppercase tracking-tight text-white">
                      {ally.name}
                    </h3>

                    <div className="space-y-1.5 text-sm text-white/85">
                      <p className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-[#E5B83B] shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{ally.address}</span>
                      </p>
                      <p className="flex items-start gap-2 text-xs text-white/70">
                        <Clock className="w-4 h-4 text-white/60 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{ally.hours}</span>
                      </p>
                    </div>

                    {ally.highlightDish && (
                      <p className="text-xs text-white/85 pt-2 border-t border-white/10">
                        <strong className="text-[#E5B83B]">En carta:</strong> {ally.highlightDish}
                      </p>
                    )}

                    <div className="bg-[#0B2C7A] border border-[#E5B83B]/45 rounded-xl p-3.5 space-y-1.5">
                      <p className="text-xs font-bold text-[#E5B83B] flex items-center gap-1.5">
                        {ally.category === 'carniceria' ? (
                          <QrCode className="w-4 h-4 shrink-0" aria-hidden="true" />
                        ) : (
                          <Beer className="w-4 h-4 shrink-0" aria-hidden="true" />
                        )}
                        <span>
                          {ally.category === 'carniceria'
                            ? 'Promo QR · Pack Pilsen Fría'
                            : 'Experiencia Pilsen Oficial'}
                        </span>
                      </p>
                      <p className="text-xs text-white/90 leading-relaxed">{ally.promoText}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => onOpenPromoQr(ally)}
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-[#D6001C] text-white hover:bg-[#B80017] transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <QrCode className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Ver Promo QR</span>
                    </button>

                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold bg-[#0B2C7A] border border-white/25 text-white hover:border-[#E5B83B] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                    >
                      <span>Cómo llegar</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
