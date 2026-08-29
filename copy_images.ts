import * as fs from 'fs';
import * as path from 'path';

const srcDir = "G:/My Drive/_Methinks LLC/Dark Arts/cards/Endless 7 Core Set";
const destDir = "c:/Users/jsnbr/Projects/android_endless_seven/web/public/card-art";

function copyImages(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyImages(srcPath, destPath);
    } else if (entry.isFile() && entry.name.endsWith('.png')) {
      fs.copyFileSync(srcPath, destPath);
      console.log(`Copied ${entry.name} to ${destPath}`);
    }
  }
}

try {
  copyImages(srcDir, destDir);
  console.log("Copy complete!");
} catch (err) {
  console.error(err);
}
