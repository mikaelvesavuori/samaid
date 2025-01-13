import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

/**
 * @description Update the README with the Mermaid diagram.
 */
export function updateReadme(filePath: string, diagram: string) {
  const readmePath = path.join(process.cwd(), filePath);

  const readmeContent = readFileSync(readmePath, 'utf8');

  const startMarker = '<!-- START DIAGRAM -->';
  const endMarker = '<!-- END DIAGRAM -->';

  const fencedDiagramContent = `\`\`\`mermaid\n${diagram}\n\`\`\``;

  const updatedReadme = readmeContent.replace(
    new RegExp(`${startMarker}[\\s\\S]*?${endMarker}`),
    `${startMarker}\n${fencedDiagramContent}\n${endMarker}`,
  );

  writeFileSync(readmePath, updatedReadme, 'utf8');
}
