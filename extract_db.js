import fs from 'fs';
import path from 'path';

const dir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));

for (const f of files) {
  const content = fs.readFileSync(path.join(dir, f), 'latin1');
  
  // Look for interestLoans, godowns, customers, purchases, sales
  const keywords = ['interestLoans', 'interest_loans', 'godowns', 'quickbill_'];
  for (const kw of keywords) {
    let pos = 0;
    while ((pos = content.indexOf(kw, pos)) !== -1) {
      const snippet = content.slice(Math.max(0, pos - 100), Math.min(content.length, pos + 400));
      console.log(`=== File: ${f} @ ${pos} (kw: ${kw}) ===`);
      console.log(snippet.replace(/[\x00-\x1f]/g, ' '));
      pos += kw.length;
      if (pos > 500000) break; // limit
    }
  }
}
