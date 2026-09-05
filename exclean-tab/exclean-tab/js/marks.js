/**
 * Decorative marks shown above the search box. All shapes are drawn in
 * currentColor so they follow the active theme's accent color.
 */
const SVG_OPEN = '<svg viewBox="0 0 96 96" xmlns="http://www.w3.org/2000/svg">';
const SVG_CLOSE = '</svg>';

export const MARKS = [
  {
    id: 'ring',
    nameKey: 'markRing',
    svg:
      SVG_OPEN +
      '<circle cx="48" cy="48" r="32" fill="none" stroke="currentColor" stroke-width="14"/>' +
      SVG_CLOSE,
  },
  {
    id: 'orbit',
    nameKey: 'markOrbit',
    svg:
      SVG_OPEN +
      '<circle cx="48" cy="48" r="34" fill="none" stroke="currentColor" stroke-width="6" stroke-opacity="0.55"/>' +
      '<circle cx="48" cy="48" r="13" fill="currentColor"/>' +
      '<circle cx="76" cy="28" r="9" fill="currentColor"/>' +
      SVG_CLOSE,
  },
  {
    id: 'cluster',
    nameKey: 'markCluster',
    svg:
      SVG_OPEN +
      '<circle cx="36" cy="36" r="22" fill="currentColor" fill-opacity="0.55"/>' +
      '<circle cx="60" cy="36" r="22" fill="currentColor" fill-opacity="0.55"/>' +
      '<circle cx="36" cy="60" r="22" fill="currentColor" fill-opacity="0.55"/>' +
      '<circle cx="60" cy="60" r="22" fill="currentColor" fill-opacity="0.55"/>' +
      SVG_CLOSE,
  },
  {
    id: 'tile',
    nameKey: 'markTile',
    svg:
      SVG_OPEN +
      '<rect x="22" y="22" width="52" height="52" rx="14" fill="currentColor" transform="rotate(45 48 48)"/>' +
      '<circle cx="48" cy="48" r="9" fill="currentColor" fill-opacity="0.35"/>' +
      SVG_CLOSE,
  },
  {
    id: 'arcs',
    nameKey: 'markArcs',
    svg:
      SVG_OPEN +
      '<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="10">' +
      '<path d="M 24 60 A 14 14 0 0 1 48 44" stroke-opacity="0.45"/>' +
      '<path d="M 15 70 A 27 27 0 0 1 61 40" stroke-opacity="0.7"/>' +
      '<path d="M 6 80 A 40 40 0 0 1 74 36"/>' +
      '</g>' +
      SVG_CLOSE,
  },
  {
    id: 'split',
    nameKey: 'markSplit',
    svg:
      SVG_OPEN +
      '<path d="M 44 14 A 34 34 0 0 0 44 82 Z" fill="currentColor"/>' +
      '<path d="M 52 14 A 34 34 0 0 1 52 82 Z" fill="currentColor" fill-opacity="0.55" transform="translate(0 6)"/>' +
      SVG_CLOSE,
  },
  {
    id: 'bars',
    nameKey: 'markBars',
    svg:
      SVG_OPEN +
      '<g fill="currentColor">' +
      '<rect x="16" y="40" width="16" height="42" rx="8" fill-opacity="0.55"/>' +
      '<rect x="40" y="14" width="16" height="68" rx="8"/>' +
      '<rect x="64" y="28" width="16" height="54" rx="8" fill-opacity="0.75"/>' +
      '</g>' +
      SVG_CLOSE,
  },
];

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function dailyMark(date) {
  const dayNumber = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MILLISECONDS_PER_DAY,
  );
  return MARKS[dayNumber % MARKS.length];
}

export function resolveMark(markSetting, date = new Date()) {
  if (markSetting.mode === 'hidden') {
    return null;
  }
  if (markSetting.mode === 'fixed') {
    const fixed = MARKS.find((mark) => mark.id === markSetting.id);
    if (fixed) {
      return fixed;
    }
  }
  return dailyMark(date);
}
