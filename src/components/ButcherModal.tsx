import { Check, QrCode, Scissors, X } from 'lucide-react';
import { useState } from 'react';
import { CAMPAIGN_IMAGES } from '../data/campaignData';
import { AllyLocation } from '../types';

interface ButcherModalProps {
  isOpen: boolean;
  isRevealed?: boolean;
  onClose: () => void;
}

export function ButcherModal({ isOpen, isRevealed = false, onClose }: ButcherModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="butcher-modal-title"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#072468] border-2 border-[#E5B83B] rounded-2xl p-5 sm:p-8 text-white">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#E5B83B] mb-1">
              Guía Anatómica para Mostrar en el Mostrador
            </p>
            <h3
              id="butcher-modal-title"
              className="font-display text-2xl sm:text-3xl font-bold uppercase text-white flex items-center gap-2.5"
            >
              <Scissors className="w-6 h-6 text-[#E5B83B] shrink-0" aria-hidden="true" />
              <span>
                {isRevealed
                  ? 'Modo Carnicero · Ubicación del Corte Pilsen'
                  : 'Modo Carnicero · Ubicación del Nuevo Retador (¿?)'}
              </span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar Modo Carnicero"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#071D54] border border-white/20 text-white/85 hover:text-[#E5B83B] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Uploaded Bovine Anatomical Chart + Transparent Diamond Outline */}
        <div className="bg-white border-2 border-[#E5B83B] rounded-2xl p-2 sm:p-3 mb-5 shadow-xl">
          <div className="relative w-full aspect-[518/367] overflow-hidden rounded-xl bg-white">
            <img
              src={CAMPAIGN_IMAGES.despieceBovino}
              alt="Diagrama de despiece bovino con nombres de cortes paraguayos señalando la ubicación en rombo entre Colita de Cuadril, Cuadrada y Peceto"
              className="w-full h-full object-contain select-none"
            />
            <svg
              viewBox="0 0 518 367"
              className="absolute inset-0 w-full h-full pointer-events-none"
              role="img"
              aria-label={
                isRevealed
                  ? 'Diagrama anatómico paraguayo con rombo rojo en el cuarto trasero y cartel CORTE PILSEN · EN CUÑA'
                  : 'Diagrama anatómico paraguayo con rombo rojo en el cuarto trasero y cartel NUEVO RETADOR (¿?) · EN CUÑA'
              }
            >
              {/* Erase standalone white "Tapa" circle above the rombo and reconnect cut divider lines cleanly */}
              <g aria-hidden="true">
                <circle cx="418" cy="135" r="20.2" fill="#999999" />
                <line
                  x1="396"
                  y1="131"
                  x2="438"
                  y2="130.5"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <path
                  d="M 433 111 Q 427 119 420 130.5"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
                <line
                  x1="416.5"
                  y1="131"
                  x2="415.5"
                  y2="156"
                  stroke="#FFFFFF"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>

              {/* Mask old Spanish labels with exact silhouette fill (#999999) inside cut boundaries & render Paraguayan butcher names */}
              <g fontFamily="Inter, system-ui, -apple-system, sans-serif" fill="#FFFFFF" textAnchor="middle">
                {/* Solomillo -> Lomito */}
                <rect x="318" y="77" width="42" height="10" rx="2" fill="#999999" />
                <text x="338" y="85" fontSize="8" fontWeight="600">
                  Lomito
                </text>

                {/* Cadera -> Cuadril */}
                <rect x="374" y="83" width="69" height="19" rx="2" fill="#999999" />
                <text x="408" y="98" fontSize="15.5" fontWeight="500">
                  Cuadril
                </text>

                {/* Tapilla -> Tapa Cuadril */}
                <rect x="438" y="110" width="30" height="11" rx="2" fill="#999999" />
                <text x="453" y="113" fontSize="7.4" fontWeight="600">
                  Tapa
                </text>
                <text x="453" y="121" fontSize="7.4" fontWeight="600">
                  Cuadril
                </text>

                {/* Babilla -> Bola de Lomo */}
                <rect x="363" y="144" width="45" height="14" rx="2" fill="#999999" />
                <text x="385" y="150" fontSize="9.2" fontWeight="500">
                  Bola de
                </text>
                <text x="385" y="160" fontSize="9.2" fontWeight="500">
                  Lomo
                </text>

                {/* Rabillo de cadera -> Colita de Cuadril */}
                <rect x="369" y="182" width="45" height="18" rx="2" fill="#999999" />
                <text x="391" y="189" fontSize="8.2" fontWeight="500">
                  Colita de
                </text>
                <text x="391" y="198" fontSize="8.2" fontWeight="500">
                  Cuadril
                </text>

                {/* Contra -> Cuadrada */}
                <rect x="415" y="180" width="41" height="14" rx="2" fill="#999999" />
                <text x="435" y="195" fontSize="9.2" fontWeight="600">
                  Cuadrada
                </text>

                {/* Redondo -> Peceto */}
                <rect x="458" y="145" width="13" height="41" rx="2" fill="#999999" />
                <text
                  transform="translate(466, 168) rotate(-90)"
                  fontSize="8.5"
                  fontWeight="600"
                >
                  Peceto
                </text>

                {/* Costillar -> Tira Ancha */}
                <rect x="229" y="181" width="50" height="13" rx="2" fill="#999999" />
                <text x="254" y="191" fontSize="9.5" fontWeight="500">
                  Tira Ancha
                </text>

                {/* Falda -> Vacío */}
                <rect x="291" y="178" width="63" height="23" rx="2" fill="#999999" />
                <text x="322" y="196" fontSize="19" fontWeight="500">
                  Vacío
                </text>
              </g>

              {/* Exact same Red Translucent Rombo (Diamond) Position */}
              <polygon
                points="431,148 458,167 431,186 404,167"
                fill="rgba(214, 0, 28, 0.18)"
                stroke="#D6001C"
                strokeWidth="2.5"
              />
              <polygon
                points="431,152 452,167 431,182 410,167"
                fill="none"
                stroke="#E5B83B"
                strokeWidth="1.2"
                strokeDasharray="3 2"
              />

              {/* Leader Line routed cleanly outside the cow into upper-right white sky */}
              <circle cx="458" cy="167" r="3.5" fill="#D6001C" stroke="#FFFFFF" strokeWidth="1.2" />
              <polyline
                points="458,167 505,136 505,52"
                fill="none"
                stroke="#D6001C"
                strokeWidth="2"
                strokeDasharray="4 3"
              />

              {/* Callout placed strictly in blank top-right white space */}
              <rect
                x="272"
                y="6"
                width="240"
                height="46"
                rx="9"
                fill="#071D54"
                stroke="#E5B83B"
                strokeWidth="2"
              />
              <text x="284" y="25" fill="#E5B83B" fontSize="11" fontWeight="800">
                {isRevealed ? 'CORTE PILSEN · EN CUÑA' : 'NUEVO RETADOR (¿?) · EN CUÑA'}
              </text>
              <text x="284" y="41" fill="#FFFFFF" fontSize="9.2" fontWeight="600">
                Unión Colita de Cuadril / Peceto · 1,1 – 1,4 kg
              </text>
            </svg>
          </div>
        </div>

        {/* Diamond Shape Geometry + How to Cut Instructions */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-[#071D54] border border-white/15 rounded-2xl p-4 sm:p-5 mb-5">
          <div className="sm:col-span-4 flex flex-col items-center justify-center bg-[#0B2C7A] border border-[#E5B83B]/50 rounded-xl p-3 text-center">
            <svg
              viewBox="0 0 180 110"
              className="w-36 h-24"
              role="img"
              aria-label="Silueta del corte en forma de rombo como el emblema clásico"
            >
              {/* Outer Fat Cap ("Espuma") */}
              <polygon
                points="90,10 166,55 90,100 14,55"
                fill="#FFF4D6"
                stroke="#E5B83B"
                strokeWidth="2.5"
              />
              {/* Inner Marbled Meat Diamond */}
              <polygon
                points="90,18 154,55 90,92 26,55"
                fill="#B81D2B"
                stroke="#FFFFFF"
                strokeWidth="1.2"
              />
              {/* Subtle marbling lines */}
              <path
                d="M55 48 Q85 40 115 52 M48 60 Q90 68 128 58"
                stroke="rgba(255,244,214,0.55)"
                strokeWidth="1.6"
                fill="none"
              />
              <text
                x="90"
                y="59"
                textAnchor="middle"
                fill="#FFFFFF"
                fontSize="11"
                fontWeight="800"
                letterSpacing="1.2"
              >
                EN CUÑA
              </text>
            </svg>
            <p className="text-[11px] font-bold uppercase text-[#E5B83B] mt-1">
              Corte en Forma de Rombo
            </p>
            <p className="text-[11px] text-white/75">Tercio superior · Colita y Peceto</p>
          </div>

          <div className="sm:col-span-8 space-y-2.5 text-xs sm:text-sm text-white/90">
            <h4 className="font-display text-lg font-bold uppercase text-[#E5B83B]">
              ¿Cómo cortar y qué decirle a tu carnicero?
            </h4>
            <ol className="space-y-1.5 list-decimal list-inside">
              <li>
                <strong className="text-white">Marcar estrictamente el tercio superior:</strong>{' '}
                Señalar en el mapa el vértice superior donde se juntan la{' '}
                <strong className="text-[#E5B83B]">Colita de Cuadril</strong>, la{' '}
                <strong className="text-[#E5B83B]">Cuadrada</strong> y el{' '}
                <strong className="text-[#E5B83B]">Peceto</strong>, sin bajar hacia la pierna.
              </li>
              <li>
                <strong className="text-white">Tallar en cuña o rombo (1,1 a 1,4 kg):</strong>{' '}
                Realizar cuatro cortes diagonales simétricos para sacar la pieza entera, o
                fraccionarla en <strong className="text-[#E5B83B]">medallones anchos de 3 a 4 cm</strong>.
              </li>
              <li>
                <strong className="text-white">No limpiar la cobertura externa:</strong> Conservar
                intacta la capa natural de grasa blanca pegada al cuero (7–9 mm) y cocinar con sal
                gruesa a punto jugoso o a punto medio.
              </li>
            </ol>
          </div>
        </div>

        {/* Technical Grill Truth Section */}
        <div className="bg-[#0B2C7A] border-2 border-[#E5B83B]/75 rounded-2xl p-4 sm:p-5 mb-6 space-y-3.5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#E5B83B] mb-1">
              La Verdad Técnica de Parrilla
            </p>
            <h4 className="font-display text-lg sm:text-xl font-bold uppercase text-white">
              ¿Da realmente para asado?
            </h4>
            <p className="text-xs sm:text-sm text-white/95 mt-1 leading-relaxed">
              <strong className="text-[#E5B83B]">Sí, da perfectamente para asado</strong>, siempre
              que se respeten dos reglas clave de carnicería:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-[#071D54] border border-white/15 rounded-xl p-3.5 space-y-1.5">
              <p className="font-display text-sm font-bold uppercase text-[#E5B83B]">
                1. Estrictamente el tercio superior (donde marca el rombo)
              </p>
              <p className="text-xs text-white/85 leading-relaxed">
                Si el carnicero corta muy abajo hacia la pierna, la cuadrada y el peceto se vuelven
                cortes magros y fibrosos (mejores para milanesa o horno). En cambio, en ese vértice
                superior exacto el músculo tiene mucho menos trabajo físico, es más tierno y se funde
                con la grasa de la colita de cuadril.
              </p>
            </div>

            <div className="bg-[#071D54] border border-white/15 rounded-xl p-3.5 space-y-1.5">
              <p className="font-display text-sm font-bold uppercase text-[#E5B83B]">
                2. Conservar la grasa externa y no pasarlo de punto
              </p>
              <p className="text-xs text-white/85 leading-relaxed">
                Como esa zona está pegada al cuero en el cuarto trasero, tiene una capa de grasa
                blanca natural. Al tirarlo a la parrilla entera (o en medallones anchos de 3 a 4 cm)
                con sal gruesa y cocinarlo a punto jugoso o a punto medio, esa grasa se derrite sobre
                la fibra magra y logra exactamente el perfil de una tapa cuadril: crocante por fuera,
                tierno y limpio por dentro.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="btn-pilsen-gold w-full min-h-[48px] px-5 py-3 rounded-xl font-bold cursor-pointer"
        >
          Entendido, listo para pedir en la carnicería
        </button>
      </div>
    </div>
  );
}

interface PromoQrModalProps {
  ally: AllyLocation | null;
  onClose: () => void;
}

export function PromoQrModal({ ally, onClose }: PromoQrModalProps) {
  const [copied, setCopied] = useState(false);

  if (!ally) return null;

  const handleCopyCode = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(ally.promoCode).catch(() => {});
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="promo-qr-title"
    >
      <div className="w-full max-w-md bg-[#072468] border-2 border-[#E5B83B] rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-bold uppercase text-[#E5B83B]">
              {ally.zone} · {ally.neighborhood}
            </p>
            <h3 id="promo-qr-title" className="font-display text-2xl font-bold uppercase">
              {ally.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar código promocional"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-[#071D54] border border-white/20 text-white/85 hover:text-[#E5B83B] cursor-pointer"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        <div className="bg-white text-[#071D54] rounded-2xl p-6 flex flex-col items-center justify-center mb-5">
          <svg
            viewBox="0 0 120 120"
            className="w-40 h-40 mb-3"
            role="img"
            aria-label={`Código QR promocional ${ally.promoCode}`}
          >
            <rect width="120" height="120" fill="#FFFFFF" />
            <rect x="8" y="8" width="28" height="28" fill="#072468" />
            <rect x="14" y="14" width="16" height="16" fill="#FFFFFF" />
            <rect x="18" y="18" width="8" height="8" fill="#072468" />

            <rect x="84" y="8" width="28" height="28" fill="#072468" />
            <rect x="90" y="14" width="16" height="16" fill="#FFFFFF" />
            <rect x="94" y="18" width="8" height="8" fill="#072468" />

            <rect x="8" y="84" width="28" height="28" fill="#072468" />
            <rect x="14" y="90" width="16" height="16" fill="#FFFFFF" />
            <rect x="18" y="94" width="8" height="8" fill="#072468" />

            <rect x="44" y="12" width="10" height="10" fill="#072468" />
            <rect x="62" y="12" width="12" height="12" fill="#072468" />
            <rect x="48" y="30" width="18" height="8" fill="#072468" />
            <rect x="12" y="46" width="14" height="10" fill="#072468" />
            <rect x="34" y="46" width="16" height="16" fill="#D6001C" />
            <rect x="58" y="46" width="20" height="10" fill="#072468" />
            <rect x="86" y="46" width="22" height="12" fill="#072468" />
            <rect x="12" y="66" width="22" height="10" fill="#072468" />
            <rect x="44" y="68" width="14" height="14" fill="#072468" />
            <rect x="68" y="64" width="14" height="18" fill="#072468" />
            <rect x="92" y="68" width="16" height="16" fill="#072468" />
            <rect x="46" y="92" width="16" height="16" fill="#072468" />
            <rect x="70" y="90" width="12" height="12" fill="#072468" />
            <rect x="90" y="92" width="20" height="18" fill="#072468" />
          </svg>
          <p className="font-mono-tabular text-base font-bold tracking-wider text-[#072468]">
            {ally.promoCode}
          </p>
        </div>

        <p className="text-sm text-white/90 leading-relaxed mb-5 text-center">
          {ally.promoText}
        </p>

        <button
          type="button"
          onClick={handleCopyCode}
          className="btn-pilsen-gold w-full min-h-[48px] px-4 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" aria-hidden="true" />
              <span>¡Código copiado! Mostralo en caja</span>
            </>
          ) : (
            <>
              <QrCode className="w-4 h-4" aria-hidden="true" />
              <span>Copiar código {ally.promoCode}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
