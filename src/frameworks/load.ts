import { readFileSync } from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import { CLOUDFORMATION_SCHEMA } from 'js-yaml-cloudformation-schema';

/**
 * @description Load an AWS SAM template from disk.
 */
export function load(filePath: string) {
  const templatePath = path.resolve(process.cwd(), filePath);
  const rawText = readFileSync(templatePath, 'utf-8');

  return yaml.load(rawText, {
    schema: CLOUDFORMATION_SCHEMA,
  }) as Record<string, any>;
}
