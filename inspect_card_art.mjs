import * as fs from 'fs';
import * as path from 'path';

const publicCardArtDir = 'C:/Users/jsnbr/Projects/android_endless_seven/web/public/card-art';

// List all files in publicCardArtDir
function getFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFiles(fullPath));
    } else {
      results.push({ relPath: path.relative(publicCardArtDir, fullPath).replace(/\\/g, '/'), mtime: stat.mtime, size: stat.size });
    }
  });
  return results;
}

const files = getFiles(publicCardArtDir);
console.log("All files in card-art with mtime:");
files.forEach(f => {
  console.log(`${f.relPath} (Size: ${f.size}, Modified: ${f.mtime.toISOString()})`);
});
