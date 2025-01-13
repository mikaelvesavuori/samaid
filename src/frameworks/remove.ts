import { existsSync, unlinkSync } from 'node:fs';

export function remove(filePath: string) {
  if (existsSync(filePath)) unlinkSync(filePath);
}
