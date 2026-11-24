import fs from 'fs';
import path from 'path';

const dir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));

for (const file of files) {
  const buf = fs.readFileSync(path.join(dir, file));
  const u16 = buf.toString('utf16le');
  
  // Search for interest loans
  let idx = 0;
  while ((idx = u16.indexOf('principalAmount', idx)) !== -1) {
    console.log(`=== Found principalAmount (u16) in ${file} @ ${idx} ===`);
    console.log(u16.slice(Math.max(0, idx - 200), Math.min(u16.length, idx + 400)));
    idx += 15;
  }

  // Search for godown
  idx = 0;
  while ((idx = u16.indexOf('godown', idx)) !== -1) {
    console.log(`=== Found godown (u16) in ${file} @ ${idx} ===`);
    console.log(u16.slice(Math.max(0, idx - 100), Math.min(u16.length, idx + 300)));
    idx += 6;
  }

  // Search for openingBalance > 0
  idx = 0;
  while ((idx = u16.indexOf('openingBalance', idx)) !== -1) {
    const snippet = u16.slice(idx, idx + 40);
    if (!snippet.includes('openingBalance":0') && !snippet.includes('openingBalance": 0') && !snippet.includes('openingBalance":""')) {
      console.log(`=== Found non-zero openingBalance (u16) in ${file} @ ${idx} ===`);
      console.log(u16.slice(Math.max(0, idx - 100), Math.min(u16.length, idx + 300)));
    }
    idx += 14;
  }
}
