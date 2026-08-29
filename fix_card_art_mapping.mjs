import * as fs from 'fs';
import * as path from 'path';

const publicCardArtDir = 'C:/Users/jsnbr/Projects/android_endless_seven/web/public/card-art';
const cardArtPathsFile = 'C:/Users/jsnbr/Projects/android_endless_seven/web/src/cardArtPaths.ts';

// Stale files to remove
const staleFiles = [
  'Avatars of light/valtarious copy.png',
  'Celestial/jophiel.png',
  'Celestial/Metatron copy.png',
  'Celestial/Remiel.png',
  'Daemon/Alistar elren copy.png',
  'Daemon/bogva.png',
  'Daemon/desire copy.png',
  'Lycan/Fenris Lightfoot copy.png',
  'Lycan/Garmr.png',
  'Lycan/lucian blackwood copy.png',
  'Lycan/ulfric thorne copy.png',
  'Lycan/varg greyback copy.png',
  'Vampyre/elowen thornver.png',
  'Vampyre/grelyn copy.png'
];

staleFiles.forEach(f => {
  const full = path.join(publicCardArtDir, f);
  if (fs.existsSync(full)) {
    fs.unlinkSync(full);
    console.log(`Deleted stale file: ${f}`);
  }
});

const correctCardArtPathsContent = `/**
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
  return \`\${PUBLIC_BASE}\${encoded}\`;
}

export const CARD_BACK_PATH = 'card-art/endless seven card back.png';

export const CARD_ART_PATHS: Record<string, string> = {
  // Avatars of Light (7 cards)
  'Dawn': 'card-art/Avatars of light/Dawn copy.png',
  'Bella': 'card-art/Avatars of light/bella copy.png',
  'Calmadious': 'card-art/Avatars of light/calmadious copy.png',
  'Coal': 'card-art/Avatars of light/coal copy.png',
  'Noble The Great': 'card-art/Avatars of light/noble the Great copy.png',
  'Noble the Great': 'card-art/Avatars of light/noble the Great copy.png',
  'Tarkidos': 'card-art/Avatars of light/tarkidos copy.png',
  'Grelyn Zilkos': 'card-art/Avatars of light/grelyn Zilkos copy.png',

  // Celestial (7 cards)
  'Anakim The Wise': 'card-art/Celestial/Anakim The Wise copy.png',
  'Anakim the Wise': 'card-art/Celestial/Anakim The Wise copy.png',
  'Metatron': 'card-art/Celestial/metattron copy.png',
  'Remiel': 'card-art/Celestial/remiel copy.png',
  'Cassiel Haggis': 'card-art/Celestial/cassiel haggis copy.png',
  'Jophiel': 'card-art/Celestial/jophiel copy.png',
  'Oriel The bold': 'card-art/Celestial/oriel the bold copy.png',
  'Oriel the Bold': 'card-art/Celestial/oriel the bold copy.png',
  'Samyaza': 'card-art/Celestial/samyaza copy.png',

  // Lycan (7 cards)
  'Fenris Lightfoot': 'card-art/Lycan/Fenris copy.png',
  'Fenris': 'card-art/Lycan/Fenris copy.png',
  'Luna': 'card-art/Lycan/luna copy.png',
  'Varg Greyback': 'card-art/Lycan/Varg copy.png',
  'Varg Fur-back': 'card-art/Lycan/Varg copy.png',
  'Varg': 'card-art/Lycan/Varg copy.png',
  'Kaelo': 'card-art/Lycan/kaelo copy.png',
  'Valtarious': 'card-art/Lycan/Valtarious copy.png',
  'Ulfric Thorne': 'card-art/Lycan/Ulfric copy.png',
  'Ulfric': 'card-art/Lycan/Ulfric copy.png',
  'Lucian Blackwood': 'card-art/Lycan/Lucian copy.png',
  'Lucian': 'card-art/Lycan/Lucian copy.png',

  // Darkness (7 cards)
  'Golgothane': 'card-art/Darkness/golgothane copy.png',
  'Lycandor': 'card-art/Darkness/lycandor copy.png',
  'Umbarax': 'card-art/Darkness/umbarax copy.png',
  'Nix': 'card-art/Darkness/Nix copy.png',
  'Pazoo': 'card-art/Darkness/pazoo copy.png',
  'Karlyah': 'card-art/Darkness/Karlyah copy.png',
  'Skarados': 'card-art/Darkness/Skarados copy.png',

  // Daemon (7 cards)
  'Bacchus': 'card-art/Daemon/Bacchus copy.png',
  'Desire': 'card-art/Daemon/Desiree copy.png',
  'Desiree': 'card-art/Daemon/Desiree copy.png',
  'Zelus': 'card-art/Daemon/zelus copy.png',
  'Belphegor': 'card-art/Daemon/Belphegor copy.png',
  'Mammon': 'card-art/Daemon/mammon copy.png',
  'Alistar Elren': 'card-art/Daemon/Alistar copy.png',
  'Alistar': 'card-art/Daemon/Alistar copy.png',
  'Bogva': 'card-art/Daemon/BogVa copy.png',

  // Vampyre (7 cards)
  'Cyprian': 'card-art/Vampyre/cyprian copy.png',
  'Valerius Nightshade': 'card-art/Vampyre/valerius nightshade copy.png',
  'Elowen Thornver': 'card-art/Vampyre/elowen thornver copy.png',
  'Kaelarion': 'card-art/Vampyre/kaelarion copy.png',
  'Sulvian Vane': 'card-art/Vampyre/sulvian vane copy.png',
  'Duke Aren Drakos': 'card-art/Vampyre/duke aren drakos copy.png',
  'Lord Alaric': 'card-art/Vampyre/lord Alaric copy.png'
};
`;

fs.writeFileSync(cardArtPathsFile, correctCardArtPathsContent);
console.log('Successfully updated cardArtPaths.ts!');
