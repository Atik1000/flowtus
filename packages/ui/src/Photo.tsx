'use client';
import { useState } from 'react';

/** Image box with a calm fallback when a photo is missing or fails to load. */
export function Photo({ src, alt = '', ratio = 'r45', placeholder = 'Photo coming soon', eager = false, className = '' }: { src?: string | null; alt?: string; ratio?: 'r45' | 'r43' | 'r11' | ''; placeholder?: string; eager?: boolean; className?: string }) {
  const [bad, setBad] = useState(false);
  return (
    <div className={`photo ${ratio} ${className}`}>
      {src && !bad ? <img src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} onError={() => setBad(true)} /> : <div className="ph">{placeholder}</div>}
    </div>
  );
}
