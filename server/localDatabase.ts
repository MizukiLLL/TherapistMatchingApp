import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

const writableRoot = process.env.VERCEL ? os.tmpdir() : path.resolve(process.cwd(), 'server', 'data');

export const databaseDirectory = process.env.VERCEL ? path.join(writableRoot, 'therapist-matcher-data') : writableRoot;
export const databaseFilePath = path.join(databaseDirectory, 'therapist-matcher-db.json');

function ensureDatabaseDirectory(): void {
  if (!existsSync(databaseDirectory)) {
    mkdirSync(databaseDirectory, { recursive: true });
  }
}

export function readDatabase<T extends Record<string, unknown>>(initialData: T): T {
  ensureDatabaseDirectory();

  if (!existsSync(databaseFilePath)) {
    writeDatabase(initialData);
    return initialData;
  }

  try {
    const rawDatabase = readFileSync(databaseFilePath, 'utf8');
    const parsedDatabase = JSON.parse(rawDatabase) as Partial<T>;

    return {
      ...initialData,
      ...parsedDatabase,
    };
  } catch {
    return initialData;
  }
}

export function writeDatabase<T extends Record<string, unknown>>(data: T): void {
  ensureDatabaseDirectory();

  const temporaryFilePath = `${databaseFilePath}.tmp`;
  writeFileSync(temporaryFilePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  renameSync(temporaryFilePath, databaseFilePath);
}
