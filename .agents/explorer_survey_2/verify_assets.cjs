const fs = require('fs');
const path = require('path');

const projectRoot = 'c:\\Users\\jsnbr\\Projects\\android_endless_seven';
const cardArtContent = fs.readFileSync(path.join(projectRoot, 'web/src/cardArtPaths.ts'), 'utf8');
const constantsContent = fs.readFileSync(path.join(projectRoot, 'web/src/constants.ts'), 'utf8');

const cardRegex = /"name":\s*"([^"]+)"/g;
const cards = [];
let match;
while ((match = cardRegex.exec(constantsContent)) !== null) {
  cards.push(match[1]);
}

console.log('Total cards in constants.ts:', cards.length);

const pathRegex = /'([^']+)':\s*'([^']+)'/g;
const cardMap = {};
while ((match = pathRegex.exec(cardArtContent)) !== null) {
  cardMap[match[1]] = match[2];
}

console.log('Total entries in CARD_ART_PATHS:', Object.keys(cardMap).length);

const missingInMap = [];
for (const card of cards) {
  if (!cardMap[card]) {
    missingInMap.push(card);
  }
}
console.log('Cards missing in CARD_ART_PATHS map:', missingInMap);

const missingInWebPublic = [];
const missingInAndroidAssets = [];

for (const [card, artPath] of Object.entries(cardMap)) {
  const pWeb = path.join(projectRoot, 'web/public', artPath);
  const pAndroid = path.join(projectRoot, 'app/src/main/assets/web', artPath);
  if (!fs.existsSync(pWeb)) {
    missingInWebPublic.push({ card, path: artPath, expected: pWeb });
  }
  if (!fs.existsSync(pAndroid)) {
    missingInAndroidAssets.push({ card, path: artPath, expected: pAndroid });
  }
}

console.log('Missing in web/public:', missingInWebPublic.length, JSON.stringify(missingInWebPublic, null, 2));
console.log('Missing in app/src/main/assets/web:', missingInAndroidAssets.length, JSON.stringify(missingInAndroidAssets, null, 2));

const backPath = 'card-art/endless seven card back.png';
console.log('Card back in web/public:', fs.existsSync(path.join(projectRoot, 'web/public', backPath)));
console.log('Card back in app/src/main/assets/web:', fs.existsSync(path.join(projectRoot, 'app/src/main/assets/web', backPath)));
