import { spawnSync } from 'node:child_process';

const result = spawnSync(process.execPath, ['--experimental-strip-types', 'tests/matching.test.ts'], {
  stdio: 'inherit',
  shell: false,
});

process.exit(result.status ?? 1);
