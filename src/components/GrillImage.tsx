import { useState } from 'react';
import { Flame } from 'lucide-react';

interface GrillImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClassName?: string;
}

export function GrillImage({ src, alt, className = '', aspectClassName = '' }: GrillImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        className={`relative flex flex-col items-center justify-center bg-gradient-to-br from-[#231B15] via-[#1A1A1A] to-[#121212] text-[#D4AF37]/80 border border-white/10 ${aspectClassName} ${className}`}
        role="img"
        aria-label={alt}
      >
        <Flame className="w-8 h-8 mb-2 text-[#E65100]" aria-hidden="true" />
        <span className="text-xs font-medium text-[#F8F9F9]/75 px-4 text-center line-clamp-2">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      loading="lazy"
      onError={() => setHasError(true)}
      className={`object-cover ${aspectClassName} ${className}`}
    />
  );
}
