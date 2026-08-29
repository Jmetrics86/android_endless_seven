import * as fs from 'fs';
import * as path from 'path';

const projectRoot = 'C:/Users/jsnbr/Projects/android_endless_seven';
const profilePath = path.join(projectRoot, 'simulator/profiles/variant-2026-08-13.json');
const simConstantsPath = path.join(projectRoot, 'simulator/src/constants.ts');
const webConstantsPath = path.join(projectRoot, 'web/src/constants.ts');
const cardArtPathsFile = path.join(projectRoot, 'web/src/cardArtPaths.ts');
const webPublicDir = path.join(projectRoot, 'web/public');
const appAssetsDir = path.join(projectRoot, 'app/src/main/assets/web');

const profile = JSON.parse(fs.readFileSync(profilePath, 'utf-8'));
const simConstants = fs.readFileSync(simConstantsPath, 'utf-8');
const webConstants = fs.readFileSync(webConstantsPath, 'utf-8');
const cardArtPathsContent = fs.readFileSync(cardArtPathsFile, 'utf-8');

console.log('=== CARD POOL AUDIT ===');
console.log('Profile Custom Light Pool count:', profile.customLightPool.length);
console.log('Profile Custom Dark Pool count:', profile.customDarkPool.length);

const lightNames = profile.customLightPool.map(c => c.name);
const darkNames = profile.customDarkPool.map(c => c.name);
const allNames = [...lightNames, ...darkNames];

console.log('Total unique canonical cards:', new Set(allNames).size);

// Check if simulator constants contains all cards
let simMissing = allNames.filter(name => !simConstants.includes(`"${name}"`) && !simConstants.includes(`'${name}'`));
console.log('Simulator constants missing cards:', simMissing);

// Check if web constants contains all cards
let webMissing = allNames.filter(name => !webConstants.includes(`"${name}"`) && !webConstants.includes(`'${name}'`));
console.log('Web constants missing cards:', webMissing);

// Check card art mappings and disk files
const missingInMap = [];
const missingInWebPublic = [];
const missingInAppAssets = [];

for (const name of allNames) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`['"]${escapedName}['"]:\\s*['"]([^'"]+)['"]`, 'i');
  const match = cardArtPathsContent.match(regex);
  if (!match) {
    missingInMap.push(name);
  } else {
    const relPath = match[1];
    const pubFile = path.join(webPublicDir, relPath);
    const appFile = path.join(appAssetsDir, relPath);
    if (!fs.existsSync(pubFile)) missingInWebPublic.push({ name, pubFile });
    if (!fs.existsSync(appFile)) missingInAppAssets.push({ name, appFile });
  }
}

console.log('Missing in CARD_ART_PATHS:', missingInMap);
console.log('Missing in web/public:', missingInWebPublic);
console.log('Missing in app/src/main/assets/web:', missingInAppAssets);

// Faction counts audit
const factionCounts = {};
for (const card of [...profile.customLightPool, ...profile.customDarkPool]) {
  factionCounts[card.faction] = (factionCounts[card.faction] || 0) + 1;
}
console.log('Faction Distribution:', factionCounts);

console.log('=== AUDIT COMPLETE ===');
