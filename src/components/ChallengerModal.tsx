import { useEffect, useState } from 'react';
import { Clock, EyeOff, Flame, Lock, Scissors, X } from 'lucide-react';
import {
  CAMPAIGN_IMAGES,
  CHALLENGER_REVEAL_TARGET_ISO,
  MYSTERIOUS_CHALLENGER_SPECS,
} from '../data/campaignData';
import { computeCountdown } from '../utils/parrillaLogic';
import { GrillImage } from './GrillImage';

interface ChallengerModalProps {
  isOpen: boolean;
  isRevealed?: boolean;
  onClose: () => void;
  onOpenButcherMode: () => void;
  onGoVote: () => void;
}

export function ChallengerModal({
  isOpen,
  isRevealed = false,
  onClose,
  onOpenButcherMode,
  onGoVote,
}: ChallengerModalProps) {
  const targetMs = new Date(CHALLENGER_REVEAL_TARGET_ISO).getTime();
  const [countdown, setCountdown] = useState(() => computeCountdown(targetMs, Date.now()));

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCountdown(computeCountdown(targetMs, Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, targetMs]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="challenger-modal-title"
    >
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#072468] border-2 border-[#E5B83B] rounded-2xl p-5 sm:p-7 text-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#E5B83B] flex items-center gap-1.5 mb-1">
              <EyeOff className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {isRevealed
                  ? 'RETADOR N° 09 · IDENTIDAD REVELADA'
                  : MYSTERIOUS_CHALLENGER_SPECS.codeName}
              </span>
            </p>
            <h3
              id="challenger-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold uppercase text-white"
            >
              {isRevealed
                ? 'El Corte Pilsen · Ficha Oficial'
                : 'Nuevo Retador · Características Clasificadas'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={
              isRevealed
                ? 'Cerrar ficha de El Corte Pilsen'
                : 'Cerrar características del Nuevo Retador'
            }
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#071D54] border border-white/20 text-white/85 hover:text-[#E5B83B] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Classified Name Lock + Countdown (or Sunday Reveal Banner) */}
        <div className="bg-[#071D54] border border-[#D6001C] rounded-xl p-4 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Lock className="w-5 h-5 text-[#D6001C] shrink-0" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase text-[#E5B83B]">
                {isRevealed
                  ? 'Revelación del Domingo Desbloqueada'
                  : 'Nombre oficial oculto hasta el lanzamiento'}
              </p>
              <p className="text-xs text-white/80">
                {isRevealed
                  ? 'El 9° corte inédito de la parrilla paraguaya ya compite en la Gran Final: El Corte Pilsen.'
                  : MYSTERIOUS_CHALLENGER_SPECS.teaserHeadline}
              </p>
            </div>
          </div>

          {isRevealed ? (
            <div className="font-display text-sm font-bold uppercase tracking-wide text-[#071D54] bg-[#E5B83B] px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center">
              <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>EL CORTE PILSEN</span>
            </div>
          ) : (
            <div className="font-mono-tabular text-sm font-bold text-white bg-[#D6001C] px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center">
              <Clock className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                {String(countdown.days).padStart(2, '0')}d :{' '}
                {String(countdown.hours).padStart(2, '0')}h :{' '}
                {String(countdown.minutes).padStart(2, '0')}m :{' '}
                {String(countdown.seconds).padStart(2, '0')}s
              </span>
            </div>
          )}
        </div>

        {/* Visual Teaser + Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 mb-6 items-center">
          <div className="sm:col-span-6 relative rounded-xl overflow-hidden border border-[#E5B83B]/60 aspect-[4/3]">
            <GrillImage
              src={CAMPAIGN_IMAGES.retadorMystery}
              alt="Corte misterioso en forma de rombo sobre hierro con grasa dorada"
              className="w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#071D54] via-transparent to-transparent"
            />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="font-mono-tabular text-[11px] font-bold uppercase text-[#E5B83B]">
                {isRevealed ? 'NOMBRE OFICIAL: EL CORTE PILSEN' : 'NOMBRE: [¿ ? ¿ ? ¿ ?]'}
              </p>
            </div>
          </div>

          <div className="sm:col-span-6 space-y-3">
            <p className="text-sm text-white/90 leading-relaxed">
              {MYSTERIOUS_CHALLENGER_SPECS.whatIsIt}
            </p>
            <div className="space-y-2 pt-1">
              {MYSTERIOUS_CHALLENGER_SPECS.stats.map((stat) => (
                <div key={stat.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-semibold text-white/85">{stat.label}</span>
                    <span className="font-mono-tabular font-bold text-[#E5B83B]">
                      {stat.value}/100
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#071D54] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D6001C] to-[#E5B83B]"
                      style={{ width: `${stat.value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Characteristics List (No Official Name Mentioned) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
          {MYSTERIOUS_CHALLENGER_SPECS.characteristics.map((item) => (
            <div
              key={item.label}
              className="bg-[#071D54] border border-white/15 rounded-xl p-3.5"
            >
              <p className="font-display text-sm font-bold uppercase text-[#E5B83B] mb-1">
                {item.label}
              </p>
              <p className="text-xs text-white/85 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => {
              onClose();
              onGoVote();
            }}
            className="btn-pilsen-cta flex-1 min-h-[46px] px-4 py-2.5 rounded-xl font-display text-base font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer"
          >
            <Flame className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ir a Votar en el Torneo</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenButcherMode();
            }}
            className="min-h-[46px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-[#071D54] border border-[#E5B83B] text-[#E5B83B] hover:bg-[#E5B83B] hover:text-[#071D54] transition-colors flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Scissors className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Ver dónde se corta (Modo Carnicero)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
