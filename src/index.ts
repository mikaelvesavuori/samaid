#!/usr/bin/env node

import path from 'path';

import { Samaid } from './domain/Samaid.js';

import { cliParser } from './application/cliParser.js';

/**
 * @description Run Samaid.
 */
async function main(): Promise<void> {
  const isRunFromCommandLine = process.argv[1]?.includes(
    path.join('node_modules', '.bin', 'samaid'),
  );
  if (!isRunFromCommandLine) return;

  try {
    const { templatePath, outputPath, shouldUpdateReadme } = cliParser();

    new Samaid(templatePath).generate(outputPath, shouldUpdateReadme);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }
}

main();

export { Samaid } from './domain/Samaid.js';
