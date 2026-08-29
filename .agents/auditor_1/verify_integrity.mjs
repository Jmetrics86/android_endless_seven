import fs from 'fs';

const simContent = fs.readFileSync('C:/Users/jsnbr/Projects/android_endless_seven/simulator/src/constants.ts', 'utf-8');
const webContent = fs.readFileSync('C:/Users/jsnbr/Projects/android_endless_seven/web/src/constants.ts', 'utf-8');

// Match everything between { and } that has "name": "..."
const cardBlocksSim = simContent.split(/{\s*"name":\s*"/).slice(1).map(b => '{\n    "name": "' + b.split(/},\s*{|},\s*];/)[0] + '}');
const cardBlocksWeb = webContent.split(/{\s*"name":\s*"/).slice(1).map(b => '{\n    "name": "' + b.split(/},\s*{|},\s*];/)[0] + '}');

console.log(`Raw card blocks found: Sim=${cardBlocksSim.length}, Web=${cardBlocksWeb.length}`);

let mismatches = 0;
for (let i = 0; i < cardBlocksSim.length; i++) {
  const simBlock = cardBlocksSim[i].trim();
  const webBlock = cardBlocksWeb[i].trim();
  
  // Clean whitespace/trailing commas for direct comparison
  const cleanSim = simBlock.replace(/,\s*}/g, '}').replace(/\s+/g, ' ');
  const cleanWeb = webBlock.replace(/,\s*}/g, '}').replace(/\s+/g, ' ');
  
  if (cleanSim !== cleanWeb) {
    console.log(`Mismatch at index ${i}:`);
    console.log('SIM:', cleanSim);
    console.log('WEB:', cleanWeb);
    mismatches++;
  }
}

console.log(`Total block-level mismatches: ${mismatches}`);
