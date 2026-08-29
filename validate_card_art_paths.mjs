import * as fs from 'fs';
import * as path from 'path';

const webConstantsFile = 'C:/Users/jsnbr/Projects/android_endless_seven/web/src/constants.ts';
const cardArtPathsFile = 'C:/Users/jsnbr/Projects/android_endless_seven/web/src/cardArtPaths.ts';
const publicDir = 'C:/Users/jsnbr/Projects/android_endless_seven/web/public';

// Read constants
const constantsContent = fs.readFileSync(webConstantsFile, 'utf-8');
const cardArtPathsContent = fs.readFileSync(cardArtPathsFile, 'utf-8');

// Simple regex to extract names from constants
const nameMatches = [...constantsContent.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1]);
const uniqueNames = Array.from(new Set(nameMatches));

console.log(`Found ${uniqueNames.length} unique card names in constants:`);

const missingInPaths = [];
const missingFiles = [];

for (const name of uniqueNames) {
  // Check if name is in cardArtPaths
  const keyRegex = new RegExp(`['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
  const match = cardArtPathsContent.match(keyRegex);
  if (!match) {
    missingInPaths.push(name);
  } else {
    const relPath = match[1];
    const fullPath = path.join(publicDir, relPath);
    if (!fs.existsSync(fullPath)) {
      missingFiles.push({ name, relPath });
    }
  }
}

console.log("Missing from CARD_ART_PATHS:", missingInPaths);
console.log("Files missing on disk:", missingFiles);
