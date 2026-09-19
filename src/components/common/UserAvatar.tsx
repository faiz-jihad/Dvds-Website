import React, { useState, useEffect } from 'react';

export interface UserAvatarProps {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const AVATAR_COLORS = [
  'bg-brand-blue text-white',
  'bg-slate-700 text-white',
  'bg-brand-red text-white',
  'bg-slate-800 text-white',
  'bg-blue-700 text-white',
  'bg-slate-900 text-white',
];

export function getInitials(name?: string | null, email?: string | null): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.trim()) {
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    return username.slice(0, 2).toUpperCase() || 'U';
  }
  return 'U';
}

function getAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const SIZE_CLASSES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-11 h-11 text-sm',
  xl: 'w-14 h-14 text-base font-semibold',
};

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  email,
  size = 'md',
  className = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset state if avatar URL changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [avatarUrl]);

  const initials = getInitials(name, email);
  const seed = email || name || 'user';
  const bgColor = getAvatarColor(seed);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const displayName = name || email || 'User Avatar';

  // If no avatarUrl or image failed, render crisp Google-style initials badge
  if (!avatarUrl || hasError) {
    return (
      <div
        className={`relative flex items-center justify-center rounded-full shrink-0 font-bold select-none border border-slate-200/60 shadow-2xs ${sizeClass} ${bgColor} ${className}`}
        title={displayName}
        aria-label={displayName}
      >
        <span>{initials}</span>
      </div>
    );
  }

  // Image present: render with background initials fallback while loading
  // referrerPolicy="no-referrer" is vital to bypass Google user content 403 Forbidden
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 border border-slate-200/80 shadow-2xs select-none ${sizeClass} ${className}`}
      title={displayName}
    >
      <div className={`w-full h-full flex items-center justify-center font-bold select-none ${bgColor}`}>
        <span>{initials}</span>
      </div>
      <img
        src={avatarUrl}
        alt={displayName}
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        loading="lazy"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`absolute inset-0 w-full h-full object-cover rounded-full transition-opacity duration-200 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
