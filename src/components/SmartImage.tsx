import { useState } from 'react';
import { Shirt } from 'lucide-react';

interface SmartImageProps {
  src?: string;
  alt: string;
  className?: string;
}

export function SmartImage({ src, alt, className = '' }: SmartImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#F5F3FF] via-[#FDF2F8] to-[#FCE7F3] text-[#6B21A8] p-4 text-center ${className}`}
      >
        <Shirt className="w-8 h-8 mb-2 opacity-60" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#581C87]/80 line-clamp-2 max-w-[16ch]">
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
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
