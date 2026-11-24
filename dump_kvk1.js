import fs from 'fs';
import path from 'path';

const dir = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data', 'Default', 'Local Storage', 'leveldb');
const file = path.join(dir, '000660.ldb');

const buf = fs.readFileSync(file);
const str = buf.toString('latin1');

// Look around 112000 - 125000 where kvk-1.onrender.com data was found
const slice = str.slice(110000, 130000);

// Print all readable strings
const clean = slice.replace(/[\x00-\x1f\x7f-\xff]/g, ' ').replace(/\s+/g, ' ');
console.log(clean.slice(0, 4000));
