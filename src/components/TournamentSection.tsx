import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  Flame,
  Lock,
  RotateCcw,
  ShieldAlert,
  Swords,
  Trophy,
  UserPlus,
} from 'lucide-react';
import {
  CHALLENGER_REVEAL_TARGET_ISO,
  MEAT_CUTS,
  MYSTERIOUS_CHALLENGER_SPECS,
  WEEKLY_SCHEDULE,
} from '../data/campaignData';
import { CutId, DayNumber, ParrilleroProfile, TournamentState } from '../types';
import {
  canUserVote,
  computeCountdown,
  getCurrentMatchup,
  getTournamentLeaderboard,
  isDayUnlocked,
} from '../utils/parrillaLogic';
import { BracketDiagram } from './BracketDiagram';
import { GrillImage } from './GrillImage';

interface TournamentSectionProps {
  tournament: TournamentState;
  profile: ParrilleroProfile | null;
  isRevealed?: boolean;
  onSelectDay: (day: DayNumber) => void;
  onVoteMatchup: (cutId: CutId) => void;
  onRevealBoss: () => void;
  onVoteFinalBoss: (choice: 'retador' | 'challenger') => void;
  onResetTournament: () => void;
  onOpenButcherMode: () => void;
  onInspectChallenger: () => void;
  onRequestRegistration: () => void;
}

export function TournamentSection({
  tournament,
  profile,
  isRevealed = false,
  onSelectDay,
  onVoteMatchup,
  onRevealBoss,
  onVoteFinalBoss,
  onResetTournament,
  onOpenButcherMode,
  onInspectChallenger,
  onRequestRegistration,
}: TournamentSectionProps) {
  const [shaking, setShaking] = useState(false);

  const revealTargetMs = new Date(CHALLENGER_REVEAL_TARGET_ISO).getTime();
  const [countdown, setCountdown] = useState(() =>
    computeCountdown(revealTargetMs, Date.now())
  );

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(computeCountdown(revealTargetMs, Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [revealTargetMs]);

  const userRegistered = canUserVote(profile);
  const currentMatchup = getCurrentMatchup(tournament);
  const challengerCut = tournament.winners.day7Tradicional
    ? MEAT_CUTS[tournament.winners.day7Tradicional]
    : MEAT_CUTS.tapa;
  const retadorCut = MEAT_CUTS.retador;

  const leaderboard = getTournamentLeaderboard(tournament);

  const handleSelectCandidate = (cutId: CutId) => {
    if (userRegistered && tournament.phase === 'day7_tradicional') {
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    }
    onVoteMatchup(cutId);
  };

  const retadorDuelVotes = tournament.cutVotes.retador;
  const challengerDuelVotes = tournament.cutVotes[challengerCut.id];
  const totalBossDuelVotes = retadorDuelVotes + challengerDuelVotes;
  const retadorPct =
    totalBossDuelVotes > 0 ? Math.round((retadorDuelVotes / totalBossDuelVotes) * 100) : 55;

  return (
    <section
      id="torneo"
      className={`py-14 sm:py-20 pilsen-deep-canvas border-b-4 border-[#D6001C] ${
        shaking ? 'animate-boss-shake' : ''
      }`}
      data-testid="tournament-section"
      data-phase={tournament.phase}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Countdown Banner for Revealing the New Challenger */}
        <div className="mb-10 rounded-2xl bg-[#0B2C7A] border-2 border-[#E5B83B]/75 p-5 sm:p-7 shadow-xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 space-y-2">
              <div className="inline-flex items-center gap-2 bg-[#D6001C] px-3 py-1 rounded text-xs font-bold uppercase tracking-wider text-white">
                {isRevealed ? (
                  <Crown className="w-3.5 h-3.5 shrink-0 text-[#E5B83B]" aria-hidden="true" />
                ) : (
                  <Lock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>
                  {isRevealed
                    ? 'Revelación del Domingo · Identidad Oficial Desbloqueada'
                    : 'Cuenta regresiva oficial · Revelación del Nuevo Retador'}
                </span>
              </div>
              <h2
                className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-tight text-white"
                style={{ textWrap: 'balance' }}
              >
                {isRevealed
                  ? '¡Nuevo Retador Revelado: El Corte Pilsen!'
                  : 'El Nombre del Nuevo Retador se Revela en:'}
              </h2>
              <p className="text-sm text-white/85">
                {isRevealed
                  ? 'Llegó el Domingo de Gran Final. Ya conocés el nombre oficial del 9° corte en forma de rombo: El Corte Pilsen.'
                  : 'Durante esta semana de 7 días votás por los 8 cortes en llaves. Al terminar la cuenta regresiva o al llegar a la final del domingo se revela el nombre oficial del Retador.'}
              </p>
            </div>

            <div className="lg:col-span-6 flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center justify-between gap-4">
              {isRevealed ? (
                <div className="flex-1 bg-[#071D54] border-2 border-[#E5B83B] rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[#E5B83B]">
                      Nombre Oficial del Domingo
                    </p>
                    <p className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
                      EL CORTE PILSEN
                    </p>
                  </div>
                  <Flame className="w-7 h-7 text-[#E5B83B] shrink-0" aria-hidden="true" />
                </div>
              ) : (
                <div
                  className="grid grid-cols-4 gap-2 sm:gap-3 flex-1"
                  aria-label="Cuenta regresiva para revelar al Nuevo Retador"
                >
                  {[
                    { label: 'Días', value: countdown.days },
                    { label: 'Horas', value: countdown.hours },
                    { label: 'Min', value: countdown.minutes },
                    { label: 'Seg', value: countdown.seconds },
                  ].map((unit) => (
                    <div
                      key={unit.label}
                      className="bg-[#071D54] border border-white/20 rounded-xl py-2.5 px-2 text-center"
                    >
                      <span className="block font-mono-tabular text-xl sm:text-3xl font-bold text-[#E5B83B]">
                        {String(unit.value).padStart(2, '0')}
                      </span>
                      <span className="block text-[11px] text-white/75 mt-0.5">{unit.label}</span>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={onInspectChallenger}
                className="btn-pilsen-gold inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-3 rounded-xl font-display text-sm sm:text-base font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
              >
                <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>
                  {isRevealed ? 'Ver ficha de El Corte Pilsen' : 'Ver características (Sin nombre)'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Section Header + Reset */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 mb-6">
          <div>
            <p className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#E5B83B] mb-2">
              Semana de Votación · Lunes a Domingo (8 Cortes + Nuevo Retador)
            </p>
            <h3
              className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold uppercase tracking-tight text-white"
              style={{ textWrap: 'balance' }}
            >
              Las Llaves de la Parrilla
            </h3>
            <p className="text-sm sm:text-base text-white/80 mt-2 max-w-2xl">
              Votá día por día en la semana de llaves. Tus elecciones quedan guardadas en el
              marcador nacional para ver quién está ganando.
            </p>
          </div>

          {tournament.phase !== 'day1' && (
            <button
              type="button"
              onClick={onResetTournament}
              className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#0B2C7A] border border-white/25 text-white hover:border-[#E5B83B] hover:text-[#E5B83B] transition-colors cursor-pointer whitespace-nowrap self-start lg:self-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reiniciar semana</span>
            </button>
          )}
        </div>

        {/* Registration Requirement Callout when Unregistered */}
        {!userRegistered && (
          <div
            className="mb-6 rounded-2xl bg-[#D6001C] border-2 border-[#E5B83B] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg"
            data-testid="registration-required-banner"
          >
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#071D54] flex items-center justify-center text-[#E5B83B] shrink-0">
                <UserPlus className="w-5 h-5" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-lg font-bold uppercase text-white">
                  Registrate antes para habilitar tu voto oficial
                </p>
                <p className="text-xs sm:text-sm text-white/90">
                  Podés recorrer todas las llaves y ver quién va ganando; para emitir tu voto
                  necesitás tu Carnet Parrillero gratuito.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onRequestRegistration}
              className="btn-pilsen-gold inline-flex items-center justify-center gap-2 min-h-[44px] px-5 py-2.5 rounded-xl font-display text-sm sm:text-base font-bold uppercase tracking-wide cursor-pointer whitespace-nowrap shrink-0"
            >
              <UserPlus className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Registrarme para votar</span>
            </button>
          </div>
        )}

        {/* 7-Day Weekly Schedule Selector */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 mb-6"
          role="tablist"
          aria-label="Días de votación de la semana"
        >
          {WEEKLY_SCHEDULE.map((item) => {
            const unlocked = isDayUnlocked(tournament, item.day);
            const isActive = tournament.activeDay === item.day;
            const votedForDay =
              item.day === 1
                ? tournament.userDayVotes.day1
                : item.day === 2
                  ? tournament.userDayVotes.day2
                  : item.day === 3
                    ? tournament.userDayVotes.day3
                    : item.day === 4
                      ? tournament.userDayVotes.day4
                      : item.day === 5
                        ? tournament.userDayVotes.day5
                        : item.day === 6
                          ? tournament.userDayVotes.day6
                          : tournament.userDayVotes.day7Boss ??
                            tournament.userDayVotes.day7Tradicional;

            return (
              <button
                key={item.day}
                type="button"
                role="tab"
                aria-selected={isActive}
                disabled={!unlocked}
                onClick={() => onSelectDay(item.day)}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'bg-[#E5B83B] text-[#071D54] border-[#E5B83B] font-bold cursor-pointer'
                    : unlocked
                      ? 'bg-[#0B2C7A] text-white border-white/20 hover:border-[#E5B83B] cursor-pointer'
                      : 'bg-[#071D54]/60 text-white/45 border-white/10 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between gap-1 text-[11px] uppercase font-bold">
                  <span>
                    Día {item.day} · {item.weekday}
                  </span>
                  {!unlocked ? (
                    <Lock className="w-3 h-3 shrink-0" aria-hidden="true" />
                  ) : votedForDay ? (
                    <CheckCircle2
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-[#071D54]' : 'text-[#E5B83B]'
                      }`}
                      aria-hidden="true"
                    />
                  ) : (
                    <Calendar className="w-3 h-3 shrink-0 opacity-70" aria-hidden="true" />
                  )}
                </div>
                <p className="text-[11px] truncate mt-0.5 opacity-90">{item.stageLabel}</p>
              </button>
            );
          })}
        </div>

        {/* Full World-Cup Style Converging Bracket Diagram */}
        <BracketDiagram
          tournament={tournament}
          isRevealed={isRevealed}
          onSelectDay={onSelectDay}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
          {/* Left 8 Cols: Active Day Matchup / Boss Battle */}
          <div className="xl:col-span-8">
            {currentMatchup && (
              <div className="bg-[#0B2C7A] border border-white/15 rounded-2xl p-5 sm:p-7">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#E5B83B]">
                      {currentMatchup.roundLabel}
                    </p>
                    <h4 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
                      {currentMatchup.title}
                    </h4>
                  </div>
                  <p className="text-xs sm:text-sm text-white/80">
                    {userRegistered
                      ? `Votando como ${profile?.name}`
                      : 'Registrate para emitir tu voto en este cruce'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {[currentMatchup.leftId, currentMatchup.rightId].map((cutId, idx) => {
                    const cut = MEAT_CUTS[cutId];
                    const votes = tournament.cutVotes[cutId];
                    const opponentId =
                      idx === 0 ? currentMatchup.rightId : currentMatchup.leftId;
                    const opponentVotes = tournament.cutVotes[opponentId];
                    const duelTotal = votes + opponentVotes;
                    const duelPct = duelTotal > 0 ? Math.round((votes / duelTotal) * 100) : 50;
                    const isDuelLeader = votes >= opponentVotes;

                    return (
                      <article
                        key={cut.id}
                        className="group flex flex-col bg-[#071D54] border border-white/15 rounded-2xl overflow-hidden hover:border-[#E5B83B] transition-colors"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden">
                          <GrillImage
                            src={cut.image}
                            alt={cut.name}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                          <div
                            aria-hidden="true"
                            className="absolute inset-0 bg-gradient-to-t from-[#071D54] via-[#071D54]/25 to-transparent"
                          />
                          <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                            <div>
                              <p className="text-xs font-semibold text-[#E5B83B]">{cut.nickname}</p>
                              <h5 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
                                {cut.name}
                              </h5>
                            </div>
                            <span className="font-mono-tabular text-xs font-bold text-white bg-[#D6001C] px-2.5 py-1 rounded">
                              {isDuelLeader ? `GANANDO ${duelPct}%` : `${duelPct}%`}
                            </span>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                          <div className="space-y-3">
                            <p className="text-sm text-white/85 leading-relaxed">
                              {cut.description}
                            </p>
                            <div className="text-xs text-white/75 flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span>{cut.regionNote}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono-tabular font-bold text-[#E5B83B]">
                                {votes.toLocaleString('es-PY')} votos
                              </span>
                            </div>
                            <p className="text-xs text-white/80 pt-2 border-t border-white/10">
                              <strong className="text-[#E5B83B]">Tip de brasa:</strong>{' '}
                              {cut.cookingTip}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleSelectCandidate(cut.id)}
                            className={`w-full min-h-[48px] px-5 py-3 rounded-xl font-display text-base sm:text-lg font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer ${
                              userRegistered
                                ? 'btn-pilsen-cta'
                                : 'bg-[#0B2C7A] border-2 border-[#E5B83B] text-[#E5B83B] hover:bg-[#E5B83B] hover:text-[#071D54] transition-colors'
                            }`}
                          >
                            {userRegistered ? (
                              <Swords className="w-4 h-4 shrink-0" aria-hidden="true" />
                            ) : (
                              <Lock className="w-4 h-4 shrink-0" aria-hidden="true" />
                            )}
                            <span>
                              {userRegistered
                                ? `Votar por ${cut.name}`
                                : `Registrate para votar: ${cut.shortLabel}`}
                            </span>
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Boss Alert Phase (Sunday Reveal) */}
            {tournament.phase === 'boss_alert' && (
              <div
                className="bg-[#0B2C7A] border-2 border-[#D6001C] rounded-2xl p-6 sm:p-10 text-center shadow-[0_0_50px_rgba(214,0,28,0.35)]"
                role="alert"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#D6001C] text-white mb-4">
                  <ShieldAlert className="w-8 h-8" aria-hidden="true" />
                </div>

                <p className="font-mono-tabular text-xs sm:text-sm font-bold tracking-wider uppercase text-[#E5B83B] mb-3">
                  Día 7 · Domingo · Tu campeón tradicional es {challengerCut.name}
                </p>

                <h4 className="font-display text-3xl sm:text-5xl font-bold uppercase text-white mb-4 flex flex-wrap items-center justify-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-[#E5B83B]" aria-hidden="true" />
                  <span>⚠️ ¡UN NUEVO RETADOR APARECE EN LA PARRILLA! ⚠️</span>
                  <AlertTriangle className="w-8 h-8 text-[#E5B83B]" aria-hidden="true" />
                </h4>

                <p className="text-base text-white/85 max-w-2xl mx-auto mb-8 leading-relaxed">
                  Su nombre sigue clasificado hasta que termine la cuenta regresiva, pero ya podés
                  inspeccionar sus características y decidir si le gana a {challengerCut.name}.
                </p>

                <button
                  type="button"
                  onClick={onRevealBoss}
                  className="btn-pilsen-cta inline-flex items-center justify-center gap-2.5 min-h-[52px] px-8 py-3.5 rounded-xl font-display text-xl font-bold uppercase tracking-wide cursor-pointer"
                >
                  <Flame className="w-5 h-5" aria-hidden="true" />
                  <span>Ver al Nuevo Retador y Votar</span>
                </button>
              </div>
            )}

            {/* Boss Fight & Final Vote (boss_battle or crowned — Sunday Reveal Active) */}
            {(tournament.phase === 'boss_battle' || tournament.phase === 'crowned') && (
              <div className="bg-[#0B2C7A] border-2 border-[#E5B83B] rounded-2xl overflow-hidden">
                <div className="bg-[#D6001C] px-5 sm:px-7 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-[#E5B83B] shrink-0" aria-hidden="true" />
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-white/90">
                        Día 7 · Domingo · ¡Identidad Oficial Revelada!
                      </p>
                      <h4 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
                        EL CORTE PILSEN vs. {challengerCut.name}
                      </h4>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenButcherMode}
                    className="min-h-[40px] px-4 py-2 rounded-lg text-xs sm:text-sm font-bold bg-[#071D54] border border-[#E5B83B] text-[#E5B83B] hover:bg-[#E5B83B] hover:text-[#071D54] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Ver Mapa Anatómico (Modo Carnicero)
                  </button>
                </div>

                <div className="p-5 sm:p-7 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                  <div className="md:col-span-6 space-y-4">
                    <div className="relative rounded-2xl overflow-hidden border-2 border-[#E5B83B]/70 aspect-[4/3]">
                      <GrillImage
                        src={retadorCut.image}
                        alt="El Corte Pilsen: pieza en forma de rombo jugosa con corona de grasa dorada"
                        className="w-full h-full object-cover"
                      />
                      <div
                        aria-hidden="true"
                        className="absolute inset-0 bg-gradient-to-t from-[#071D54] via-transparent to-transparent"
                      />
                      <div className="absolute top-3 left-3 bg-[#D6001C] px-3 py-1 rounded text-[11px] font-mono-tabular font-bold uppercase text-white inline-flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-[#E5B83B]" aria-hidden="true" />
                        <span>Revelación Oficial · Domingo de Final</span>
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <p className="text-xs font-bold text-[#E5B83B] mb-0.5">
                          RETADOR N° 09 · IDENTIDAD REVELADA
                        </p>
                        <h5 className="font-display text-2xl sm:text-3xl font-bold uppercase text-white">
                          EL CORTE PILSEN
                        </h5>
                      </div>
                    </div>

                    <div className="bg-[#071D54] border border-white/15 rounded-xl p-4">
                      <div className="flex items-center justify-between text-xs sm:text-sm mb-2">
                        <span className="font-display uppercase tracking-wide text-white font-bold">
                          Barra de Sabor &amp; Jugosidad
                        </span>
                        <span className="font-mono-tabular font-bold text-[#E5B83B]">
                          100% / 100%
                        </span>
                      </div>
                      <div className="w-full h-3.5 rounded-full bg-black/30 overflow-hidden p-0.5">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#D6001C] to-[#E5B83B]"
                          style={{ width: '100%' }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-6 space-y-4">
                    <div className="bg-[#071D54] border border-white/15 rounded-2xl p-4 sm:p-5 space-y-3">
                      <h5 className="font-display text-lg font-bold uppercase text-[#E5B83B]">
                        Ficha Técnica de El Corte Pilsen
                      </h5>
                      <p className="text-xs sm:text-sm text-white/90 leading-relaxed">
                        {MYSTERIOUS_CHALLENGER_SPECS.whatIsIt}
                      </p>
                      <ul className="space-y-2 pt-2 border-t border-white/10 text-xs text-white/85">
                        {MYSTERIOUS_CHALLENGER_SPECS.characteristics.map((char) => (
                          <li key={char.label}>
                            <strong className="text-[#E5B83B]">{char.label}:</strong> {char.detail}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-[#071D54] border border-[#E5B83B]/60 rounded-2xl p-4 sm:p-5 space-y-3.5">
                      <div>
                        <p className="text-xs font-bold uppercase text-[#E5B83B] mb-1">
                          Votación Final · Queda tu voto guardado
                        </p>
                        <h5 className="font-display text-xl font-bold uppercase text-white">
                          ¿Tiene lo necesario para ganar la parrilla?
                        </h5>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-mono-tabular">
                          <span className="text-[#E5B83B] font-bold">
                            El Corte Pilsen: {retadorDuelVotes.toLocaleString('es-PY')} ({retadorPct}%)
                          </span>
                          <span className="text-white/80">
                            {challengerCut.name}: {challengerDuelVotes.toLocaleString('es-PY')} (
                            {100 - retadorPct}%)
                          </span>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-white/15 overflow-hidden flex">
                          <div
                            className="h-full bg-[#E5B83B] transition-all duration-300"
                            style={{ width: `${retadorPct}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-2.5">
                        <button
                          type="button"
                          onClick={() => onVoteFinalBoss('retador')}
                          className={`min-h-[46px] px-4 py-2.5 rounded-xl font-display text-base font-bold uppercase tracking-wide flex items-center justify-center gap-2 cursor-pointer transition-all ${
                            tournament.bossChoice === 'retador'
                              ? 'bg-[#E5B83B] text-[#071D54] ring-2 ring-white'
                              : 'btn-pilsen-cta'
                          }`}
                        >
                          <Crown className="w-4 h-4 shrink-0" aria-hidden="true" />
                          <span>
                            {tournament.bossChoice === 'retador'
                              ? 'Tu voto guardado: ¡Gana El Corte Pilsen!'
                              : 'Votar por El Corte Pilsen'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => onVoteFinalBoss('challenger')}
                          className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border transition-colors flex items-center justify-center gap-2 cursor-pointer ${
                            tournament.bossChoice === 'challenger'
                              ? 'bg-[#D6001C] border-white text-white'
                              : 'bg-[#0B2C7A] border-white/25 text-white/90 hover:border-white'
                          }`}
                        >
                          {tournament.bossChoice === 'challenger' && (
                            <CheckCircle2 className="w-4 h-4 text-[#E5B83B]" aria-hidden="true" />
                          )}
                          <span>
                            {tournament.bossChoice === 'challenger'
                              ? `Tu voto guardado: ${challengerCut.name}`
                              : `Prefiero quedarme con ${challengerCut.name}`}
                          </span>
                        </button>
                      </div>

                      {tournament.phase === 'crowned' && (
                        <p
                          className="text-xs text-[#E5B83B] bg-[#0B2C7A] border border-[#E5B83B]/40 rounded-lg p-2.5"
                          role="status"
                        >
                          Voto guardado en el marcador oficial. Mirá quién va ganando en la tabla
                          general.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Cols: Live Leaderboard across all 9 cuts */}
          <aside
            aria-label="Marcador en vivo del torneo"
            className="xl:col-span-4 bg-[#0B2C7A] border border-white/15 rounded-2xl p-5 sm:p-6 space-y-4"
            data-testid="tournament-leaderboard"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/15">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#E5B83B] mb-1">
                  Marcador Nacional en Vivo
                </p>
                <h4 className="font-display text-2xl font-bold uppercase text-white flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-[#E5B83B] shrink-0" aria-hidden="true" />
                  <span>¿Quién está ganando?</span>
                </h4>
              </div>
            </div>

            <div className="space-y-2.5">
              {leaderboard.map((entry, idx) => (
                <div
                  key={entry.id}
                  className={`rounded-xl p-3 border ${
                    entry.isLeading
                      ? 'bg-[#071D54] border-[#E5B83B]'
                      : 'bg-[#071D54]/70 border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="font-mono-tabular text-xs font-bold text-[#E5B83B]">
                        #{idx + 1}
                      </span>
                      <span className="font-semibold text-xs sm:text-sm text-white truncate">
                        {entry.id === 'retador'
                          ? isRevealed
                            ? 'El Corte Pilsen'
                            : 'Nuevo Retador (¿?)'
                          : entry.name}
                      </span>
                    </div>
                    <span className="font-mono-tabular text-xs font-bold text-[#E5B83B] shrink-0">
                      {entry.votes.toLocaleString('es-PY')}
                    </span>
                  </div>

                  <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        entry.isLeading ? 'bg-[#E5B83B]' : 'bg-[#D6001C]'
                      }`}
                      style={{ width: `${Math.max(6, entry.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/75">
                    <span>
                      {entry.isLeading ? 'Ganando el torneo' : `${entry.percentage}% del total`}
                    </span>
                    {entry.userVoted && (
                      <span className="font-bold text-[#E5B83B]">Tu voto guardado</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={onInspectChallenger}
              className="w-full min-h-[44px] px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide bg-[#071D54] border border-[#E5B83B]/70 text-[#E5B83B] hover:bg-[#E5B83B] hover:text-[#071D54] transition-colors cursor-pointer"
            >
              {isRevealed
                ? 'Ver ficha de El Corte Pilsen'
                : 'Inspeccionar características del Retador'}
            </button>
          </aside>
        </div>
      </div>
    </section>
  );
}
