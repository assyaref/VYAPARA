/* src/branding.ts — branding (logo, icon, colors, font, app name) shared across Login & App shell */
import defaultLogo from './assets/logo.png';

export type Branding = {
  appName: string;
  tagline: string;
  primaryColor: string;
  sidebarColor: string;
  accentColor: string;
  logoPath: string | null;
  iconPath: string | null;
  fontFamily: string;
  receiptFooter: string;
  logoDataUrl: string | null;
};

const DEFAULTS: Branding = {
  appName: 'VYAPARA',
  tagline: 'SISTEM MANAJEMEN USAHA TERPADU',
  primaryColor: '#0D47A1',
  sidebarColor: '#0B3B73',
  accentColor: '#FF8F00',
  logoPath: null,
  iconPath: null,
  fontFamily: "'Inter', ui-sans-serif, system-ui, sans-serif",
  receiptFooter: 'Terima kasih atas kunjungan Anda',
  logoDataUrl: null,
};

let cache: Branding = { ...DEFAULTS };
let defaultLogoRef: string = defaultLogo;
const listeners = new Set<(b: Branding) => void>();

export const FONT_OPTIONS = [
  { label: 'Inter (Modern)', value: "'Inter', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Segoe UI (Windows)', value: "'Segoe UI', system-ui, sans-serif" },
  { label: 'Poppins (Geometric)', value: "'Poppins', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Roboto (Android)', value: "'Roboto', ui-sans-serif, system-ui, sans-serif" },
  { label: 'Georgia (Serif / Legal)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Courier New (Retro)', value: "'Courier New', Courier, monospace" },
  { label: 'Monospace (Teknis)', value: "ui-monospace, 'Cascadia Mono', Consolas, monospace" },
];

export function getBranding(): Branding {
  return cache;
}

export function defaultLogoSrc(): string {
  return defaultLogoRef;
}

export function logoSrc(b: Branding = cache): string {
  return b.logoDataUrl || defaultLogoRef;
}

export async function loadBranding(): Promise<Branding> {
  try {
    const res = await (window as any).vyapara?.getBranding?.();
    if (res?.ok && res.data) {
      cache = { ...DEFAULTS, ...res.data };
    }
  } catch {
    // keep current cache
  }
  applyToDocument(cache);
  listeners.forEach((l) => l(cache));
  return cache;
}

export function subscribeBranding(l: (b: Branding) => void): () => void {
  listeners.add(l);
  l(cache);
  return () => listeners.delete(l);
}

/** Apply branding to :root CSS variables (font + colors) and document title. */
function applyToDocument(b: Branding) {
  const root = document.documentElement;
  root.style.setProperty('--brand-primary', b.primaryColor);
  root.style.setProperty('--brand-sidebar', b.sidebarColor);
  root.style.setProperty('--brand-accent', b.accentColor);
  root.style.setProperty('--font-inter', b.fontFamily);
  if (b.appName) document.title = b.appName + ' POS';
}
