#!/usr/bin/env node

import { Samaid } from './domain/Samaid.js';

/**
 * @description Run Samaid.
 */
async function main(): Promise<void> {
  const isRunFromCommandLine = process.argv[1]?.includes(
    'node_modules/.bin/samaid',
  );
  if (!isRunFromCommandLine) return;

  const [, , ...args] = process.argv;
  const templatePath = 'template.yml';
  const outputPath =
    args.find((value) => value.endsWith('.mmd')) || 'samaid.diagram.mmd';
  const shouldUpdateReadme = args.includes('--readme');

  try {
    new Samaid(templatePath).generate(outputPath, shouldUpdateReadme);
  } catch (error: any) {
    console.error(error);
  }
}

main();

export { Samaid } from './domain/Samaid.js';
