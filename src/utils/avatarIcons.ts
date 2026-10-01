/**
 * Utility to generate vibrant, cute vector student SVG character avatars
 * deterministically based on name and gender.
 */

function hashCode(str: string): number {
  let hash = 0;
  if (!str) return hash;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

const BG_GRADIENTS = [
  { top: '#0d9488', bottom: '#115e59' }, // Teal
  { top: '#0284c7', bottom: '#0369a1' }, // Sky
  { top: '#6366f1', bottom: '#4338ca' }, // Indigo
  { top: '#8b5cf6', bottom: '#6d28d9' }, // Purple
  { top: '#ec4899', bottom: '#be185d' }, // Pink
  { top: '#f59e0b', bottom: '#b45309' }, // Amber
  { top: '#10b981', bottom: '#047857' }, // Emerald
  { top: '#f43f5e', bottom: '#be123c' }, // Rose
  { top: '#3b82f6', bottom: '#1d4ed8' }, // Blue
  { top: '#a855f7', bottom: '#7e22ce' }, // Violet
];

const SKIN_TONES = [
  '#fde047', '#fed7aa', '#fbcfe8', '#fef08a', '#fef3c7', '#fed7d7'
];

const SHIRT_COLORS = [
  '#38bdf8', '#34d399', '#f472b6', '#fbbf24', '#a78bfa', '#fb7185', '#60a5fa', '#4ade80'
];

const HAIR_COLORS = [
  '#1e293b', '#0f172a', '#451a03', '#78350f', '#312e81', '#581c87'
];

export function generateStudentSvgDataUrl(name: string = 'Học sinh', gender?: string): string {
  const hash = hashCode(name || 'Học sinh');
  const isFemale = !!gender && (gender.toLowerCase().includes('nữ') || gender.toLowerCase().includes('female') || gender.toLowerCase() === 'g');

  const bg = BG_GRADIENTS[hash % BG_GRADIENTS.length];
  const skin = SKIN_TONES[(hash >> 2) % SKIN_TONES.length];
  const shirt = SHIRT_COLORS[(hash >> 4) % SHIRT_COLORS.length];
  const hair = HAIR_COLORS[(hash >> 6) % HAIR_COLORS.length];
  const hasGlasses = (hash % 5) === 0;
  const hasCheeks = (hash % 2) === 0;

  const words = (name || 'Học sinh').trim().split(/\s+/);
  const initials = words.length > 1
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : words[0] ? words[0].slice(0, 2).toUpperCase() : 'HS';

  let hairPath = '';
  if (isFemale) {
    const femaleHairType = hash % 3;
    if (femaleHairType === 0) {
      hairPath = `
        <path d="M22,50 C18,30 25,12 50,12 C75,12 82,30 78,50 C75,65 72,75 68,82 C68,82 66,55 64,48 C55,42 45,42 36,48 C34,55 32,82 32,82 C28,75 25,65 22,50 Z" fill="${hair}" />
        <circle cx="22" cy="52" r="7" fill="${hair}" />
        <circle cx="78" cy="52" r="7" fill="${hair}" />
        <path d="M36,46 C42,32 58,32 64,46 C55,38 45,38 36,46 Z" fill="${hair}" />
      `;
    } else if (femaleHairType === 1) {
      hairPath = `
        <path d="M25,48 C20,28 30,14 50,14 C70,14 80,28 75,48 C72,55 70,75 68,82 C68,82 65,50 63,45 C55,38 45,38 37,45 C35,50 32,82 32,82 C30,75 28,55 25,48 Z" fill="${hair}" />
        <path d="M32,28 C42,20 58,20 68,28 C68,28 58,24 50,28 C42,24 32,28 32,28 Z" fill="${hair}" />
      `;
    } else {
      hairPath = `
        <path d="M26,46 C22,28 30,12 50,12 C70,12 78,28 74,46 C71,58 70,68 67,72 C65,50 62,42 38,42 C35,50 33,68 31,72 C29,68 28,58 26,46 Z" fill="${hair}" />
        <path d="M42,16 L58,16 L50,22 Z" fill="#f43f5e" />
        <circle cx="50" cy="18" r="3" fill="#fb7185" />
      `;
    }
  } else {
    const maleHairType = hash % 3;
    if (maleHairType === 0) {
      hairPath = `
        <path d="M28,42 C24,28 32,14 50,14 C68,14 76,28 72,42 C68,30 60,22 50,22 C40,22 32,30 28,42 Z" fill="${hair}" />
        <path d="M35,22 L40,12 L46,20 L52,10 L58,20 L64,12 L67,24 C58,18 42,18 35,22 Z" fill="${hair}" />
      `;
    } else if (maleHairType === 1) {
      hairPath = `
        <path d="M28,42 C25,28 32,15 50,15 C68,15 75,28 72,42 C65,24 55,20 35,26 C30,30 28,38 28,42 Z" fill="${hair}" />
      `;
    } else {
      hairPath = `
        <path d="M28,42 C26,30 32,16 50,16 C68,16 74,30 72,42 C72,42 66,22 50,22 C34,22 28,42 28,42 Z" fill="${hair}" />
        <circle cx="36" cy="20" r="8" fill="${hair}" />
        <circle cx="50" cy="16" r="9" fill="${hair}" />
        <circle cx="64" cy="20" r="8" fill="${hair}" />
      `;
    }
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
  <defs>
    <linearGradient id="bg_${hash}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${bg.top}" />
      <stop offset="100%" stop-color="${bg.bottom}" />
    </linearGradient>
  </defs>

  <!-- Background -->
  <rect width="100" height="100" fill="url(#bg_${hash})" />

  <!-- Initials Badge -->
  <text x="88" y="20" text-anchor="end" fill="#ffffff" opacity="0.18" font-family="sans-serif" font-weight="900" font-size="14">${initials}</text>

  <!-- Shoulders / Shirt -->
  <path d="M20,100 C20,78 32,70 50,70 C68,70 80,78 80,100 Z" fill="${shirt}" />
  <path d="M42,70 L50,80 L58,70 Z" fill="#ffffff" opacity="0.9" />

  <!-- Neck -->
  <rect x="43" y="56" width="14" height="16" rx="4" fill="${skin}" />

  <!-- Head -->
  <ellipse cx="50" cy="46" rx="22" ry="24" fill="${skin}" />

  <!-- Hair Base -->
  ${hairPath}

  <!-- Ears -->
  <circle cx="28" cy="46" r="4.5" fill="${skin}" />
  <circle cx="72" cy="46" r="4.5" fill="${skin}" />

  <!-- Eyes -->
  <ellipse cx="41" cy="44" rx="2.5" ry="3.5" fill="#1e293b" />
  <ellipse cx="59" cy="44" rx="2.5" ry="3.5" fill="#1e293b" />
  <circle cx="42" cy="43" r="1" fill="#ffffff" />
  <circle cx="60" cy="43" r="1" fill="#ffffff" />

  <!-- Cheeks -->
  ${hasCheeks ? `<ellipse cx="36" cy="49" rx="3" ry="1.8" fill="#f43f5e" opacity="0.35" />
  <ellipse cx="64" cy="49" rx="3" ry="1.8" fill="#f43f5e" opacity="0.35" />` : ''}

  <!-- Nose -->
  <path d="M49,47 Q50,50 51,47" stroke="#94a3b8" stroke-width="1.2" stroke-linecap="round" fill="none" />

  <!-- Smile -->
  <path d="M43,53 Q50,60 57,53" stroke="#0f172a" stroke-width="2" stroke-linecap="round" fill="none" />

  <!-- Glasses -->
  ${hasGlasses ? `
    <rect x="34" y="39" width="13" height="10" rx="3" fill="none" stroke="#0f172a" stroke-width="1.8" />
    <rect x="53" y="39" width="13" height="10" rx="3" fill="none" stroke="#0f172a" stroke-width="1.8" />
    <line x1="47" y1="43" x2="53" y2="43" stroke="#0f172a" stroke-width="1.8" />
    <line x1="28" y1="43" x2="34" y2="43" stroke="#0f172a" stroke-width="1.8" />
    <line x1="66" y1="43" x2="72" y2="43" stroke="#0f172a" stroke-width="1.8" />
  ` : ''}
</svg>
  `.trim();

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
