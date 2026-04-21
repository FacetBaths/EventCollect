/**
 * Seed initial EventCollect users.
 *
 * Run: npm run seed:users
 *
 * This script uses upsert so it is safe to run multiple times.
 * It does NOT overwrite passwords for existing users — it only sets
 * the password when creating a brand-new record.
 */

import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../src/config/database';
import { User } from '../src/models/User';

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '10');

interface SeedUser {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'standard' | 'bdc';
  leapRepId: number | null;
  leapCallCenterRepId: number | null;
}

const SEED_USERS: SeedUser[] = [
  {
    name: 'Peter Roto',
    email: 'proto@facetrenovations.us',
    password: 'Fr74108520!',
    role: 'admin',
    leapRepId: null,
    leapCallCenterRepId: null,
  },
  {
    name: 'Alex Upshaw',
    email: 'aupshaw@facetrenovations.us',
    password: 'Facet2025!',
    role: 'standard',
    leapRepId: null,
    leapCallCenterRepId: null,
  },
  {
    name: 'Eric Orozco',
    email: 'eorozco@facetrenovations.us',
    password: 'Facet2025!',
    role: 'standard',
    leapRepId: null,
    leapCallCenterRepId: null,
  },
  {
    name: 'Nick Roto',
    email: 'nroto@facetrenovations.us',
    password: 'Facet2025!',
    role: 'standard',
    leapRepId: null,
    leapCallCenterRepId: null,
  },
  {
    name: 'Luka Drca',
    email: 'ldrca@facetrenovations.us',
    password: 'Facet2025!',
    role: 'standard',
    leapRepId: null,
    leapCallCenterRepId: null,
  },
  {
    name: 'Brian Owens',
    email: 'warehouse@facetrenovations.us',
    password: 'Facet2025!',
    role: 'bdc',
    leapRepId: null,
    leapCallCenterRepId: 88443, // BDC rep ID
  },
  {
    name: 'Marcus Ruehmann',
    email: 'mruheman@facetrenovations.us',
    password: 'Facet2025!',
    role: 'bdc',
    leapRepId: null,
    leapCallCenterRepId: 88443, // BDC rep ID
  },
];

async function seed() {
  console.log('Connecting to database…');
  await connectDB();

  let created = 0;
  let skipped = 0;

  for (const u of SEED_USERS) {
    const existing = await User.findOne({ email: u.email });

    if (existing) {
      // Update role and LEAP IDs, but leave password alone
      existing.name = u.name;
      existing.role = u.role;
      existing.leapRepId = u.leapRepId;
      existing.leapCallCenterRepId = u.leapCallCenterRepId;
      // Only call save if something actually changed (avoids re-hashing)
      if (existing.isModified()) await existing.save();
      console.log(`  ⊙ skipped (exists): ${u.email}`);
      skipped++;
    } else {
      const hashed = await bcrypt.hash(u.password, BCRYPT_ROUNDS);
      await User.create({
        name: u.name,
        email: u.email,
        password: hashed,
        role: u.role,
        leapRepId: u.leapRepId,
        leapCallCenterRepId: u.leapCallCenterRepId,
      });
      console.log(`  ✓ created: ${u.email} (${u.role})`);
      created++;
    }
  }

  console.log(`\nDone — ${created} created, ${skipped} already existed.`);
  await mongoose.connection.close();
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
