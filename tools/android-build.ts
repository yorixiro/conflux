import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function gradleInvocation(platform: string, variant: string) {
  if (variant !== 'debug' && variant !== 'release') throw new Error('Expected debug or release');
  const task = variant === 'debug' ? 'assembleDebug' : 'assembleRelease';
  return platform === 'win32'
    ? { command: 'cmd.exe', args: ['/d', '/s', '/c', `gradlew.bat clean ${task}`] }
    : { command: 'sh', args: ['./gradlew', 'clean', task] };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { command, args } = gradleInvocation(process.platform, process.argv[2]);
  // Preserve JAVA_HOME and Android SDK configuration; Gradle also honors local.properties.
  const result = spawnSync(command, args, {
    cwd: resolve(dirname(fileURLToPath(import.meta.url)), '../android'),
    stdio: 'inherit', env: process.env
  });
  if (result.error) console.error(result.error.message);
  process.exit(result.status ?? 1);
}
