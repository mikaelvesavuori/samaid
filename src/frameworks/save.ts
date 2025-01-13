import { writeFileSync } from 'node:fs';

/**
 * @description Persist a file to disk.
 */
export function save(diagram: string, outputPath: string) {
  writeFileSync(outputPath, diagram, 'utf8');
}
