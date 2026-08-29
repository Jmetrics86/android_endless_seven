const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/jsnbr/Projects/android_endless_seven';
const webConstantsFile = path.join(projectRoot, 'web/src/constants.ts');
const cardArtPathsFile = path.join(projectRoot, 'web/src/cardArtPaths.ts');
const androidAssetsDir = path.join(projectRoot, 'app/src/main/assets/web');
const webPublicDir = path.join(projectRoot, 'web/public');

const constantsContent = fs.readFileSync(webConstantsFile, 'utf-8');
const cardArtPathsContent = fs.readFileSync(cardArtPathsFile, 'utf-8');

const nameMatches = [...constantsContent.matchAll(/"name":\s*"([^"]+)"/g)].map(m => m[1]);
const uniqueNames = Array.from(new Set(nameMatches));

console.log(`Found ${uniqueNames.length} unique card names in constants.`);

const missingInArtMap = [];
const missingInWebPublic = [];
const missingInAndroidAssets = [];

for (const name of uniqueNames) {
  const keyRegex = new RegExp(`['"]${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"]:\\s*['"]([^'"]+)['"]`, 'i');
  const match = cardArtPathsContent.match(keyRegex);
  if (!match) {
    missingInArtMap.push(name);
  } else {
    const relPath = match[1];
    const webPath = path.join(webPublicDir, relPath);
    const androidPath = path.join(androidAssetsDir, relPath);

    if (!fs.existsSync(webPath)) {
      missingInWebPublic.push({ name, relPath, webPath });
    }
    if (!fs.existsSync(androidPath)) {
      missingInAndroidAssets.push({ name, relPath, androidPath });
    }
  }
}

console.log(`Missing in cardArtPaths.ts: ${missingInArtMap.length}`, missingInArtMap);
console.log(`Missing in web/public/: ${missingInWebPublic.length}`, missingInWebPublic);
console.log(`Missing in app/src/main/assets/web/: ${missingInAndroidAssets.length}`, missingInAndroidAssets);
