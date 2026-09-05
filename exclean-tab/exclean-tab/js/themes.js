/**
 * Reproduces how Chrome derives its new tab page colors.
 *
 * Chrome does not ship a color table. Each "Color" option in the customize
 * panel is a seed color plus a scheme variant
 * (chrome/browser/ui/webui/cr_components/theme_color_picker/customize_chrome_colors.cc).
 * The seed is expanded into HCT tonal palettes
 * (ui/color/dynamic_color/palette_factory.cc), and UI tokens pick a tone from
 * those palettes (ui/color/sys_color_mixer.cc, chrome/browser/ui/color/*).
 * This module follows the same three steps so every color in the page is a
 * token, not a literal.
 */
import { Hct, TonalPalette, argbFromRgb, hexFromArgb } from './vendor/material-color-utilities.js';

const CACHE_KEY = 'themeCache';

/** Seeds and variants from customize_chrome_colors.cc, in Chrome's order. */
export const THEMES = [
  { id: 'default', nameKey: 'themeDefault', baseline: true },
  { id: 'blue', nameKey: 'themeBlue', seed: [140, 171, 228], variant: 'tonalSpot' },
  { id: 'coolGrey', nameKey: 'themeCoolGrey', seed: [140, 171, 228], variant: 'neutral' },
  { id: 'grey', nameKey: 'themeGrey', seed: [136, 136, 136], variant: 'neutral' },
  { id: 'aqua', nameKey: 'themeAqua', seed: [38, 166, 154], variant: 'tonalSpot' },
  { id: 'green', nameKey: 'themeGreen', seed: [0, 255, 0], variant: 'tonalSpot' },
  { id: 'viridian', nameKey: 'themeViridian', seed: [135, 186, 129], variant: 'neutral' },
  { id: 'citron', nameKey: 'themeCitron', seed: [250, 223, 115], variant: 'tonalSpot' },
  { id: 'orange', nameKey: 'themeOrange', seed: [255, 128, 0], variant: 'tonalSpot' },
  { id: 'apricot', nameKey: 'themeApricot', seed: [252, 219, 201], variant: 'neutral' },
  { id: 'rose', nameKey: 'themeRose', seed: [243, 178, 190], variant: 'tonalSpot' },
  { id: 'pink', nameKey: 'themePink', seed: [243, 178, 190], variant: 'neutral' },
  { id: 'fuchsia', nameKey: 'themeFuchsia', seed: [255, 0, 255], variant: 'tonalSpot' },
  { id: 'violet', nameKey: 'themeViolet', seed: [229, 213, 252], variant: 'tonalSpot' },
];

/**
 * Chrome's baseline palette (ui/color/ref_color_mixer.cc, AddBaselinePalette).
 * Used when no seed color is chosen; upstream defines it as fixed tones rather
 * than deriving it from a seed, so it is transcribed rather than computed.
 */
const BASELINE_TONES = {
  primary: { 10: '#041e49', 30: '#0842a0', 40: '#0b57d0', 80: '#a8c7fa', 90: '#d3e3fd' },
  secondary: { 15: '#002845', 25: '#003f66', 30: '#004a77', 90: '#c2e7ff' },
  neutral: { 10: '#1f1f1f', 15: '#282828', 25: '#3c3c3c', 30: '#474747', 40: '#5e5e5e', 80: '#c7c7c7', 90: '#e3e3e3', 94: '#efeded', 98: '#faf9f8', 99: '#fdfcfb', 100: '#ffffff' },
  neutralVariant: { 30: '#444746', 90: '#e1e3e1' },
};

/** Chroma values per variant from palette_factory.cc GeneratePalette(). */
function paletteConfig(variant, hue) {
  if (variant === 'neutral') {
    // Primary chroma depends on hue: {0: 12, 260: 12, 315: 20, 360: 12},
    // looked up with lower_bound on the hue.
    const primaryChroma = hue > 260 && hue <= 315 ? 20 : 12;
    return { primary: primaryChroma, secondary: 8, neutral: 2, neutralVariant: 2 };
  }
  return { primary: 40, secondary: 16, neutral: 6, neutralVariant: 8 };
}

function buildPalettes(theme) {
  if (theme.baseline) {
    return {
      primary: (tone) => BASELINE_TONES.primary[tone],
      secondary: (tone) => BASELINE_TONES.secondary[tone],
      neutral: (tone) => BASELINE_TONES.neutral[tone],
      neutralVariant: (tone) => BASELINE_TONES.neutralVariant[tone],
    };
  }
  const hue = Hct.fromInt(argbFromRgb(...theme.seed)).hue;
  const chroma = paletteConfig(theme.variant, hue);
  const palette = (c) => {
    const tonal = TonalPalette.fromHueAndChroma(hue, c);
    return (tone) => hexFromArgb(tonal.tone(tone));
  };
  return {
    primary: palette(chroma.primary),
    secondary: palette(chroma.secondary),
    neutral: palette(chroma.neutral),
    neutralVariant: palette(chroma.neutralVariant),
  };
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((channel) => channel.toString(16).padStart(2, '0')).join('');
}

/** Paints `overlay` at `alpha` (0..255) over `base`, like ui::AlphaBlend. */
function alphaBlend(overlay, base, alpha) {
  const o = hexToRgb(overlay);
  const b = hexToRgb(base);
  const a = alpha / 255;
  return rgbToHex(b.map((channel, i) => Math.round(channel * (1 - a) + o[i] * a)));
}

/**
 * Maps palettes to the tokens the new tab page uses, following
 * sys_color_mixer.cc (AddSysColorMixer + AddThemedSysColorOverrides) and the
 * material_*_color_mixer.cc files under chrome/browser/ui/color.
 */
function resolveTokens(theme, dark) {
  const p = buildPalettes(theme);
  const themed = !theme.baseline;

  const surface = dark ? p.neutral(10) : themed ? p.neutral(99) : p.neutral(100);
  const primary = dark ? p.primary(80) : p.primary(40);
  // kColorSysSurface4: SurfaceNumberedForeground at 0x1E over Surface.
  const surfaceNumberedForeground = themed ? primary : dark ? '#d1e1ff' : '#6991d6';
  const surface4 = alphaBlend(surfaceNumberedForeground, surface, 0x1e);

  const base = dark ? (themed ? p.secondary(25) : p.neutral(25)) : themed ? p.neutral(98) : p.neutral(100);
  const baseContainer = dark ? (themed ? p.secondary(15) : p.neutral(15)) : surface4;
  const onSurface = dark ? p.neutral(90) : p.neutral(10);
  const onSurfaceSubtle = dark ? p.neutral(80) : p.neutral(30);
  const surfaceVariant = dark ? p.neutralVariant(30) : p.neutralVariant(90);
  const tonalContainer = dark ? (themed ? p.primary(30) : p.secondary(30)) : p.primary(90);
  const onTonalContainer = dark ? p.secondary(90) : p.primary(10);
  // kColorSysStateHoverOnSubtle: Neutral 99 (dark) / Neutral 10 (light) at 0x1A.
  const hoverTint = dark ? p.neutral(99) : p.neutral(10);
  // Chrome paints the realbox pure white in both modes. On dark backgrounds
  // that edge is harsh on OLED panels, so the box uses Neutral 94 from the
  // theme's own palette instead: still a light surface, tinted toward the
  // theme, with less peak luminance against the page.
  const searchBackground = dark ? p.neutral(94) : p.neutral(100);
  const searchForeground = p.neutral(10);
  const searchPlaceholder = p.neutral(40);

  return {
    // kColorNewTabPageBackground, kColorToolbar, kColorBookmarkBarBackground
    '--background': base,
    // kColorNewTabPagePrimaryForeground
    '--foreground': onSurface,
    // kColorNewTabPageSecondaryForeground, kColorBookmarkBarForeground
    '--foreground-subtle': onSurfaceSubtle,
    // kColorNewTabPageMostVisitedTileBackground
    '--tile': baseContainer,
    // kColorNewTabPageLogo
    '--accent': primary,
    // kColorNewTabPageButtonBackground / Foreground
    '--tonal': tonalContainer,
    '--on-tonal': onTonalContainer,
    // Realbox: background, text, placeholder.
    '--search-background': searchBackground,
    '--search-foreground': searchForeground,
    '--search-placeholder': searchPlaceholder,
    // kColorMenuBackground
    '--surface': surface,
    '--menu-background': surface,
    // kColorToolbarContentAreaSeparator
    '--separator': surfaceVariant,
    // Hover states painted over their respective surfaces.
    '--hover': alphaBlend(hoverTint, base, 0x1a),
    '--hover-strong': alphaBlend(hoverTint, base, 0x24),
    '--menu-hover': alphaBlend(hoverTint, surface, 0x1a),
    '--surface-border': alphaBlend(hoverTint, base, 0x24),
  };
}

const darkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');

export function getTheme(id) {
  return THEMES.find((theme) => theme.id === id) ?? THEMES[0];
}

export function resolveScheme(scheme) {
  if (scheme === 'light' || scheme === 'dark') {
    return scheme;
  }
  return darkSchemeQuery.matches ? 'dark' : 'light';
}

export function onSystemSchemeChange(callback) {
  darkSchemeQuery.addEventListener('change', callback);
}

/** Tokens for a theme in a given scheme, e.g. for swatches in the panel. */
export function getThemeTokens(themeId, colorScheme) {
  return resolveTokens(getTheme(themeId), colorScheme === 'dark');
}

export function applyTheme(themeId, scheme) {
  const colorScheme = resolveScheme(scheme);
  const variables = getThemeTokens(themeId, colorScheme);
  const root = document.documentElement;

  for (const [name, value] of Object.entries(variables)) {
    if (root.style.getPropertyValue(name) !== value) {
      root.style.setProperty(name, value);
    }
  }
  if (root.style.colorScheme !== colorScheme) {
    root.style.colorScheme = colorScheme;
  }
  root.dataset.scheme = colorScheme;

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ variables, colorScheme }));
  } catch {
    // Cache is an optimization only; the theme is already applied.
  }
}
