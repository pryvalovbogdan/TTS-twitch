import { build } from 'esbuild';
import { builtinModules } from 'module';

build({
  entryPoints: ['index.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'dist/index.js',
  external: [
    ...builtinModules,
    'dotenv',
    'speaker',
    'play-sound',
    'express',
    'tmi.js', // Optional: if it causes similar issues
    '@google-cloud/text-to-speech', // Optional: if used in dynamic ways
  ],
});
