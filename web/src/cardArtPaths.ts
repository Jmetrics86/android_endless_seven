/**
 * Paths to card art under public/card-art. Keys are card names (must match constants).
 * Used to load face textures. Back is shared: endless seven card back.png
 */

/** Base URL for public assets (Vite: '' or e.g. '/my-app/'). No trailing slash. */
const PUBLIC_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '';

/**
 * Returns a full URL for a path under public/, with path segments encoded so spaces and special chars work.
 */
export function cardArtUrl(path: string): string {
  const encoded = path.split('/').map(segment => encodeURIComponent(segment)).join('/');
  return `${PUBLIC_BASE}${encoded}`;
}

export const CARD_BACK_PATH = 'card-art/endless seven card back.png';

export const CARD_ART_PATHS: Record<string, string> = {
  // Avatars of Light
  'Dawn': 'card-art/Avatars of light/Dawn copy.png',
  'Bella': 'card-art/Avatars of light/bella copy.png',
  'Calmadious': 'card-art/Avatars of light/calmadious copy.png',
  'Coal': 'card-art/Avatars of light/coal copy.png',
  'Noble The Great': 'card-art/Avatars of light/noble the Great copy.png',
  'Noble the Great': 'card-art/Avatars of light/noble the Great copy.png',
  'Tarkidos': 'card-art/Avatars of light/tarkidos copy.png',
  'Grelyn Zilkos': 'card-art/Avatars of light/grelyn Zilkos copy.png',
  'Valtarious': 'card-art/Lycan/Valtarious copy.png',
  // Celestial
  'Anakim The Wise': 'card-art/Celestial/Anakim The Wise copy.png',
  'Anakim the Wise': 'card-art/Celestial/Anakim The Wise copy.png',
  'Metatron': 'card-art/Celestial/Metatron copy.png',
  'Remiel': 'card-art/Celestial/Remiel.png',
  'Cassiel Haggis': 'card-art/Celestial/cassiel haggis copy.png',
  'Jophiel': 'card-art/Celestial/jophiel.png',
  'Oriel The bold': 'card-art/Celestial/oriel the bold copy.png',
  'Oriel the Bold': 'card-art/Celestial/oriel the bold copy.png',
  'Samyaza': 'card-art/Celestial/samyaza copy.png',
  // Lycan
  'Fenris Lightfoot': 'card-art/Lycan/Fenris Lightfoot copy.png',
  'Garmr': 'card-art/Lycan/Garmr.png',
  'Kaelo': 'card-art/Lycan/kaelo copy.png',
  'Lucian Blackwood': 'card-art/Lycan/lucian blackwood copy.png',
  'Luna': 'card-art/Lycan/luna copy.png',
  'Ulfric Thorne': 'card-art/Lycan/ulfric thorne copy.png',
  'Varg Fur-back': 'card-art/Lycan/varg greyback copy.png',
  'Varg Greyback': 'card-art/Lycan/varg greyback copy.png',
  // Darkness
  'Karlyah': 'card-art/Darkness/Karlyah copy.png',
  'Nix': 'card-art/Darkness/Nix copy.png',
  'Skarados': 'card-art/Darkness/Skarados copy.png',
  'Golgothane': 'card-art/Darkness/golgothane copy.png',
  'Lycandor': 'card-art/Darkness/lycandor copy.png',
  'Pazoo': 'card-art/Darkness/pazoo copy.png',
  'Umbarax': 'card-art/Darkness/umbarax copy.png',
  // Daemon
  'Alistar Elren': 'card-art/Daemon/Alistar elren copy.png',
  'Bacchus': 'card-art/Daemon/Bacchus copy.png',
  'Belphegor': 'card-art/Daemon/Belphegor copy.png',
  'Bogva': 'card-art/Daemon/bogva.png',
  'Desire': 'card-art/Daemon/desire copy.png',
  'Mammon': 'card-art/Daemon/mammon copy.png',
  'Zelus': 'card-art/Daemon/zelus copy.png',
  // Vampyre
  'Cyprian': 'card-art/Vampyre/cyprian copy.png',
  'Duke Aren Drakos': 'card-art/Vampyre/duke aren drakos copy.png',
  'Elowen Thornver': 'card-art/Vampyre/elowen thornver.png',
  'Kaelarion': 'card-art/Vampyre/grelyn copy.png',
  'Lord Alaric': 'card-art/Vampyre/lord Alaric copy.png',
  'Sulvian Vane': 'card-art/Vampyre/sulvian vane copy.png',
  'Valerius Nightshade': 'card-art/Vampyre/valerius nightshade copy.png',
};
