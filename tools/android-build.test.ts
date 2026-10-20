import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { gradleInvocation } from './android-build';

describe('Android build entry points', () => {
  it('selects the Windows wrapper through cmd without shell interpolation of user input', () => {
    expect(gradleInvocation('win32', 'debug')).toEqual({ command: 'cmd.exe', args: ['/d', '/s', '/c', 'gradlew.bat clean assembleDebug'] });
    expect(() => gradleInvocation('win32', 'debug & whoami')).toThrow();
  });
  it('keeps macOS and Linux on the POSIX wrapper', () => {
    for (const platform of ['darwin', 'linux']) {
      expect(gradleInvocation(platform, 'release')).toEqual({ command: 'sh', args: ['./gradlew', 'clean', 'assembleRelease'] });
    }
  });
  it('uses a portable launcher instead of POSIX-only environment assignments', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(pkg.scripts['android:build-debug']).toBe('npm run android:sync && tsx tools/android-build.ts debug');
    expect(pkg.scripts['android:build-release']).toBe('npm run android:sync && tsx tools/android-build.ts release');
  });
});
