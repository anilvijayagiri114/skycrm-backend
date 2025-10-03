import dotenv from 'dotenv';
dotenv.config();

const mask = (s) => {
  if (!s) return '(not set)';
  try {
    // show only first 20 chars and last 10 for URIs
    if (s.length > 30) return s.slice(0, 20) + '...' + s.slice(-10);
    return s;
  } catch (e) {
    return '(error)';
  }
};

console.log('--- ENV CHECK ---');
console.log('NODE_ENV:', process.env.NODE_ENV || '(not set)');
console.log('PORT:', process.env.PORT || '(not set)');

const mongo = process.env.MONGODB_URI;
console.log('MONGODB_URI present:', !!mongo);
if (mongo) {
  const lower = mongo.toLowerCase();
  console.log('MONGODB_URI (masked):', mask(mongo));
  if (lower.includes('localhost') || lower.includes('127.0.0.1')) {
    console.log('Detected: local MongoDB (localhost)');
  } else if (lower.includes('mongodb.net') || lower.includes('atlas')) {
    console.log('Detected: Atlas / remote MongoDB');
  } else if (lower.startsWith('mongodb+srv')) {
    console.log('Detected: SRV connection (likely Atlas)');
  } else {
    console.log('Detected: remote/on-prem MongoDB (unknown host)');
  }
} else {
  console.log('MONGODB_URI is not set');
}

console.log('JWT_SECRET present:', !!process.env.JWT_SECRET);
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN || '(not set)');
console.log('\nInstructions:');
console.log(' - If this shows NODE_ENV=production and a remote MongoDB, login will attempt to use that DB.');
console.log(" - To force local testing, set MONGODB_URI to your local DB and NODE_ENV=development before starting the server.");
console.log('\nExample PowerShell commands:');
console.log("$env:MONGODB_URI='mongodb://localhost:27017/skycrm'; $env:NODE_ENV='development'; node src/server.js");
console.log('--- END ---');
