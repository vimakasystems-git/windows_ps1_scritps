// Operator-only utility. Never package a private signing key with the app.
import fs from 'node:fs/promises';
import crypto from 'node:crypto';
const [keyFile,installation,plan,expires]=process.argv.slice(2);
if(!keyFile||!installation||!['advanced','technician'].includes(plan)||!Number.isFinite(Date.parse(expires))||Date.parse(expires)<=Date.now())throw Error('Uso: node issue-license.mjs private.pem installation advanced|technician ISO-expiry');
const claim={product:'vimaka-care',installation,plan,expires};
const payload=Buffer.from(JSON.stringify(claim)).toString('base64url');
console.log(payload+'.'+crypto.sign(null,Buffer.from(payload),await fs.readFile(keyFile,'utf8')).toString('base64url'));
