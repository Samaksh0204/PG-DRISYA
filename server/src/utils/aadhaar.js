const crypto = require('crypto');

// Verhoeff checksum — real Aadhaar numbers satisfy it, so random 12-digit input is rejected.
const V_D = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const V_P = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];

function verhoeffValid(num) {
  if (typeof num !== 'string' || !/^\d+$/.test(num)) return false;
  let c = 0;
  const digits = num.split('').reverse().map(Number);
  digits.forEach((d, i) => { c = V_D[c][V_P[i % 8][d]]; });
  return c === 0;
}

// Structural check only: 12 digits, can't start with 0/1, valid checksum.
function isPlausibleAadhaar(num) {
  return typeof num === 'string' && /^[2-9]\d{11}$/.test(num) && verhoeffValid(num);
}

// Keyed one-way hash (raw number is never stored).
function hashAadhaar(number) {
  const pepper = process.env.AADHAAR_PEPPER || process.env.JWT_SECRET;
  return crypto.createHmac('sha256', pepper).update(number).digest('hex');
}

module.exports = { verhoeffValid, isPlausibleAadhaar, hashAadhaar };
