import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma.js';

const appRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');

export async function bootstrapDatabase() {
  try {
    const count = await prisma.user.count();
    if (count > 0) {
      console.log(`Database ready (${count} users).`);
      return;
    }

    console.log('Database empty — seeding demo data (password123 for all accounts)...');
    execSync('npx tsx prisma/seed.ts', { stdio: 'inherit', cwd: appRoot });
    console.log('Demo seed completed.');
  } catch (err) {
    console.error('Database bootstrap failed:', err);
  }
}
