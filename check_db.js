import fs from 'fs';
const db = JSON.parse(fs.readFileSync('C:/Users/WIN/.gemini/antigravity/scratch/mobile_billing_app/data/db.json', 'utf8'));

console.log('Interest loans:', JSON.stringify(db.interestLoans, null, 2));
console.log('Purchases:', JSON.stringify(db.purchases, null, 2));
console.log('Sales:', JSON.stringify(db.sales, null, 2));
