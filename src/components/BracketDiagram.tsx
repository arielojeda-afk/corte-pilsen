import { Lock, Trophy } from 'lucide-react';
import { MEAT_CUTS } from '../data/campaignData';
import { CutId, DayNumber, TournamentState } from '../types';
import { isDayUnlocked } from '../utils/parrillaLogic';

interface BracketDiagramProps {
  tournament: TournamentState;
  isRevealed?: boolean;
  onSelectDay: (day: DayNumber) => void;
}

function BracketSlot({
  cutId,
  placeholder,
  isRevealed = false,
  isWinner,
  isUserPick,
  isActive,
}: {
  cutId: CutId | null;
  placeholder: string;
  isRevealed?: boolean;
  isWinner?: boolean;
  isUserPick?: boolean;
  isActive?: boolean;
}) {
  const cut = cutId ? MEAT_CUTS[cutId] : null;
  const label = cut
    ? cut.id === 'retador'
      ? isRevealed
        ? 'Corte Pilsen'
        : 'Nuevo Retador (¿?)'
      : cut.shortLabel
    : placeholder;

  return (
    <div
      className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-2 transition-colors ${
        isWinner
          ? 'bg-[#E5B83B] text-[#071D54] border-[#E5B83B] font-bold'
          : isActive
            ? 'bg-[#0B2C7A] text-white border-[#E5B83B]/70 font-semibold'
            : cut
              ? 'bg-[#071D54] text-white border-white/20 font-medium'
              : 'bg-[#061847]/70 text-white/45 border-white/10'
      }`}
    >
      <span className="truncate">{label}</span>
      {isUserPick && (
        <span
          className={`text-[10px] font-bold uppercase shrink-0 ${
            isWinner ? 'text-[#071D54]' : 'text-[#E5B83B]'
          }`}
        >
          ✓
        </span>
      )}
    </div>
  );
}

export function BracketDiagram({
  tournament,
  isRevealed = false,
  onSelectDay,
}: BracketDiagramProps) {
  const renderMatchBox = (
    day: DayNumber,
    dayLabel: string,
    leftId: CutId | null,
    rightId: CutId | null,
    leftPlaceholder: string,
    rightPlaceholder: string,
    winnerId: CutId | null,
    userPickId: CutId | null
  ) => {
    const unlocked = isDayUnlocked(tournament, day);
    const isActive = tournament.activeDay === day;

    return (
      <button
        type="button"
        disabled={!unlocked}
        onClick={() => onSelectDay(day)}
        className={`w-full text-left rounded-xl p-2.5 border transition-all ${
          isActive
            ? 'bg-[#0E3591] border-2 border-[#E5B83B] shadow-[0_0_20px_rgba(229,184,59,0.25)] cursor-pointer'
            : unlocked
              ? 'bg-[#071D54]/90 border-white/20 hover:border-[#E5B83B]/70 cursor-pointer'
              : 'bg-[#061640]/70 border-white/10 opacity-75 cursor-not-allowed'
        }`}
      >
        <div className="flex items-center justify-between gap-1 mb-1.5">
          <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[#E5B83B]">
            {dayLabel}
          </span>
          {!unlocked && <Lock className="w-3 h-3 text-white/45" aria-hidden="true" />}
        </div>
        <div className="space-y-1">
          <BracketSlot
            cutId={leftId}
            placeholder={leftPlaceholder}
            isWinner={winnerId !== null && winnerId === leftId}
            isUserPick={userPickId !== null && userPickId === leftId}
            isActive={isActive}
          />
          <BracketSlot
            cutId={rightId}
            placeholder={rightPlaceholder}
            isWinner={winnerId !== null && winnerId === rightId}
            isUserPick={userPickId !== null && userPickId === rightId}
            isActive={isActive}
          />
        </div>
      </button>
    );
  };

  return (
    <div
      className="mb-8 rounded-2xl bg-[#071D54] border-2 border-white/15 p-4 sm:p-6 overflow-hidden"
      data-testid="weekly-bracket-diagram"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 pb-3 border-b border-white/15">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#E5B83B]">
            Cuadro Oficial · Semana del Torneo (Lunes a Domingo)
          </p>
          <h4 className="font-display text-xl sm:text-2xl font-bold uppercase text-white">
            Las Llaves Confirmadas
          </h4>
        </div>
        <p className="text-xs text-white/75">
          Tocá cualquier día desbloqueado para votar o revisar tu llave
        </p>
      </div>

      {/* Desktop 5-Column Converging World-Cup Style Bracket */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-2 items-center">
        {/* Column 1: Left Quarterfinals (Lunes & Martes) */}
        <div className="space-y-4">
          {renderMatchBox(
            1,
            'Día 1 · Lunes',
            'costilla',
            'tira_fina',
            'Costilla Ancha',
            'Costilla Fina',
            tournament.winners.day1,
            tournament.userDayVotes.day1
          )}
          {renderMatchBox(
            2,
            'Día 2 · Martes',
            'vacio',
            'entrana',
            'Vacío',
            'Entraña Fina',
            tournament.winners.day2,
            tournament.userDayVotes.day2
          )}
        </div>

        {/* Column 2: Left Semifinal (Viernes) with Connector Lines */}
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="hidden lg:block w-4 h-36 border-y-2 border-r-2 border-[#E5B83B]/45 rounded-r-lg shrink-0"
          />
          <div className="flex-1">
            {renderMatchBox(
              5,
              'Día 5 · Viernes (Semi A)',
              tournament.winners.day1,
              tournament.winners.day2,
              'Ganador Lunes',
              'Ganador Martes',
              tournament.winners.day5,
              tournament.userDayVotes.day5
            )}
          </div>
          <div
            aria-hidden="true"
            className="hidden lg:block w-3 h-0.5 bg-[#E5B83B]/45 shrink-0"
          />
        </div>

        {/* Column 3: Center Trophy & Domingo Gran Final + Retador */}
        <div className="flex flex-col items-center text-center bg-[#0B2C7A] border-2 border-[#E5B83B] rounded-2xl p-4 space-y-3">
          <div className="w-11 h-11 rounded-full bg-[#D6001C] border-2 border-[#E5B83B] flex items-center justify-center text-[#E5B83B]">
            <Trophy className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <p className="font-display text-xs font-bold uppercase tracking-wider text-[#E5B83B]">
              Día 7 · Domingo
            </p>
            <p className="font-display text-lg font-bold uppercase text-white">
              {isRevealed ? 'GRAN FINAL · CORTE PILSEN' : 'GRAN FINAL + RETADOR'}
            </p>
          </div>
          <div className="w-full space-y-1.5 text-left">
            <BracketSlot
              cutId={tournament.winners.day7Tradicional}
              placeholder="Campeón Tradicional"
              isRevealed={isRevealed}
              isWinner={tournament.bossChoice === 'challenger'}
              isUserPick={tournament.userDayVotes.day7Boss === 'challenger'}
            />
            <div className="text-[10px] font-mono-tabular font-bold text-center text-[#E5B83B]">
              VS
            </div>
            <BracketSlot
              cutId={
                isRevealed
                  ? 'retador'
                  : null
              }
              placeholder="Nuevo Retador (¿?)"
              isRevealed={isRevealed}
              isWinner={tournament.bossChoice === 'retador'}
              isUserPick={tournament.userDayVotes.day7Boss === 'retador'}
            />
          </div>
        </div>

        {/* Column 4: Right Semifinal (Sábado) with Connector Lines */}
        <div className="flex items-center gap-2">
          <div
            aria-hidden="true"
            className="hidden lg:block w-3 h-0.5 bg-[#E5B83B]/45 shrink-0"
          />
          <div className="flex-1">
            {renderMatchBox(
              6,
              'Día 6 · Sábado (Semi B)',
              tournament.winners.day3,
              tournament.winners.day4,
              'Ganador Miércoles',
              'Ganador Jueves',
              tournament.winners.day6,
              tournament.userDayVotes.day6
            )}
          </div>
          <div
            aria-hidden="true"
            className="hidden lg:block w-4 h-36 border-y-2 border-l-2 border-[#E5B83B]/45 rounded-l-lg shrink-0"
          />
        </div>

        {/* Column 5: Right Quarterfinals (Miércoles & Jueves) */}
        <div className="space-y-4">
          {renderMatchBox(
            3,
            'Día 3 · Miércoles',
            'colita',
            'bife_chorizo',
            'Colita Cuadril',
            'Bife Chorizo',
            tournament.winners.day3,
            tournament.userDayVotes.day3
          )}
          {renderMatchBox(
            4,
            'Día 4 · Jueves',
            'tapa',
            'ojo_bife',
            'Tapa Cuadril',
            'Ojo de Bife',
            tournament.winners.day4,
            tournament.userDayVotes.day4
          )}
        </div>
      </div>
    </div>
  );
}
