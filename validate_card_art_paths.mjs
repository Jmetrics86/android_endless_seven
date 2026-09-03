import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const webConstantsFile = path.resolve(__dirname, 'web/src/constants.ts');
const cardArtPathsFile = path.resolve(__dirname, 'web/src/cardArtPaths.ts');
const publicDir = path.resolve(__dirname, 'web/public');

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

if (missingInPaths.length > 0 || missingFiles.length > 0) {
  console.error("Card art path validation failed!");
  process.exit(1);
} else {
  console.log("Card art path validation passed successfully!");
}
