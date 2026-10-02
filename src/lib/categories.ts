export const CATEGORY_COLORS: Record<string, string> = {
  needs: '#7c9a92',
  wants: '#e07a5f',
  culture: '#81b29a',
  unexpected: '#f2cc8f',
};

export function getCatColor(key: string): string {
  return CATEGORY_COLORS[key] ?? '#9ca3af';
}

export function getCatBg(key: string): string {
  const map: Record<string, string> = {
    needs: 'bg-zen-needs',
    wants: 'bg-zen-wants',
    culture: 'bg-zen-culture',
    unexpected: 'bg-zen-unexpected',
  };
  return map[key] ?? 'bg-stone-400';
}

export function getCatText(key: string): string {
  const map: Record<string, string> = {
    needs: 'text-zen-needs',
    wants: 'text-zen-wants',
    culture: 'text-zen-culture',
    unexpected: 'text-zen-unexpected',
  };
  return map[key] ?? 'text-stone-500';
}
