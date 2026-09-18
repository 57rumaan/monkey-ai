import { randomBytes } from 'crypto';

console.log('\nGenerated secrets (copy these to your .env):\n');
console.log(`JWT_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`JWT_REFRESH_SECRET=${randomBytes(32).toString('hex')}`);
console.log(`COOKIE_SECRET=${randomBytes(32).toString('hex')}`);
console.log();
