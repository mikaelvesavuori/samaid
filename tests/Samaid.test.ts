import { readFileSync, writeFileSync } from 'node:fs';
import { afterAll, expect, test } from 'vitest';

import { Samaid } from '../src/domain/Samaid.js';
import { remove } from '../src/frameworks/remove.js';

const filePath = './testdata/api.yml';
const outputPath = '__test_output__.mmd';
const readmePath = '__test_readme__.md';

const expected = `graph TD
  subgraph API
    HttpApi
  end
  subgraph DynamoDB
    example-api
  end
  subgraph Functions
    Demo --> |PutItem| example-api
    Demo --> |Query| example-api
    HttpApi --> |GET| Demo
    Demo2 --> |PutItem| example-api
    Demo2 --> |Query| example-api
    Demo2
  end
  subgraph EventBridge
    bloop --> |Triggers| Demo2
  end
`;

test('It should generate a diagram with all components', () => {
  const mermaidDiagram = new Samaid(filePath).generate();

  expect(mermaidDiagram).toBe(expected);
  expect(readFileSync(outputPath, 'utf-8')).toBe(expected);
});

test('It should generate a diagram with all components and save it', () => {
  const mermaidDiagram = new Samaid(filePath).generate(outputPath);

  expect(mermaidDiagram).toBe(expected);
  expect(readFileSync(outputPath, 'utf-8')).toBe(expected);

  remove(outputPath);
});

test('It should generate a diagram with all components and update the README', () => {
  const readmeContent = `# README test

Test file.

<!-- START DIAGRAM -->
\`\`\`mermaid
graph TD
  subgraph API
    HttpApi
  end
  subgraph DynamoDB
    example-api
  end
  subgraph Functions
    Demo --> |PutItem| example-api
    Demo --> |Query| example-api
    HttpApi --> |GET| Demo
    Demo2 --> |PutItem| example-api
    Demo2 --> |Query| example-api
    Demo2
  end
  subgraph EventBridge
    bloop --> |Triggers| Demo2
  end

\`\`\`
<!-- END DIAGRAM -->

`;

  writeFileSync(readmePath, readmeContent, 'utf8');

  const mermaidDiagram = new Samaid(filePath).generate(outputPath, true);

  expect(mermaidDiagram).toBe(expected);
  expect(readFileSync(outputPath, 'utf-8')).toBe(expected);
  expect(readFileSync(readmePath, 'utf-8')).toBe(readmeContent);

  remove(outputPath);
  remove(readmePath);
});

afterAll(() => remove('samaid.diagram.mmd'));
