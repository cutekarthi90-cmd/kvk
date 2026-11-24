import fs from 'fs';
import path from 'path';

const dir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ldb') || f.endsWith('.log'));

for (const f of files) {
  const buf = fs.readFileSync(path.join(dir, f));
  // In Chrome LevelDB, string values in localstorage are often UTF-16LE or UTF-8.
  // When stored as UTF-16LE, characters alternate with \x00.
  const strUtf8 = buf.toString('utf8');
  const strUtf16 = buf.toString('utf16le');
  const strLatin1 = buf.toString('latin1');

  for (const [encoding, str] of [['utf8', strUtf8], ['utf16le', strUtf16], ['latin1', strLatin1]]) {
    const regex = /quickbill_([a-zA-Z0-9_]+)/g;
    let match;
    while ((match = regex.exec(str)) !== null) {
      const key = match[1];
      const start = match.index;
      // find next [ or {
      const jsonStart = str.indexOf('[', start);
      const objStart = str.indexOf('{', start);
      let s = -1;
      if (jsonStart !== -1 && objStart !== -1) s = Math.min(jsonStart, objStart);
      else if (jsonStart !== -1) s = jsonStart;
      else if (objStart !== -1) s = objStart;

      if (s !== -1 && s - start < 100) {
        console.log(`[${f} - ${encoding}] Key: quickbill_${key} @ ${start}`);
      }
    }
  }
}
