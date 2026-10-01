import React, { useState } from 'react';
import { generateStudentSvgDataUrl } from '../utils/avatarIcons';

interface AvatarProps {
  name: string;
  avatar?: string;
  gender?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatar,
  gender,
  size = 'md',
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);

  const sizeClasses = {
    xs: 'w-8 h-8 text-xs rounded-lg',
    sm: 'w-10 h-10 text-xs rounded-xl',
    md: 'w-14 h-14 text-base rounded-xl',
    lg: 'w-20 h-20 text-xl rounded-2xl',
    xl: 'w-28 h-28 text-3xl rounded-3xl',
    '2xl': 'w-36 h-36 text-4xl rounded-[2.5rem]',
    '3xl': 'w-48 h-48 text-5xl rounded-[3rem]'
  }[size];

  // Check if avatar is a custom uploaded photo or base64
  const isCustomImage =
    avatar &&
    !imgError &&
    (avatar.startsWith('data:') ||
      avatar.startsWith('http://') ||
      avatar.startsWith('https://') ||
      avatar.startsWith('blob:') ||
      avatar.startsWith('/'));

  if (isCustomImage) {
    return (
      <div
        className={`relative overflow-hidden flex-shrink-0 shadow-md border-2 border-amber-300/90 bg-slate-100 transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      >
        <img
          src={avatar}
          alt={name}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
        />
      </div>
    );
  }

  // Check if avatar is an emoji preset
  if (avatar && !imgError && avatar.length <= 4) {
    return (
      <div
        className={`relative flex items-center justify-center flex-shrink-0 shadow-md border-2 border-amber-300/90 bg-gradient-to-br from-teal-50 to-sky-100 select-none transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      >
        <span className="leading-none">{avatar}</span>
      </div>
    );
  }

  // Default: Auto-generate vibrant vector student SVG character avatar!
  const defaultSvgUrl = generateStudentSvgDataUrl(name, gender);

  return (
    <div
      className={`relative overflow-hidden flex-shrink-0 shadow-md border-2 border-amber-300/90 bg-slate-900 transition-transform hover:scale-105 ${sizeClasses} ${className}`}
      title={name}
    >
      <img
        src={defaultSvgUrl}
        alt={name}
        className="w-full h-full object-cover select-none"
      />
    </div>
  );
};
