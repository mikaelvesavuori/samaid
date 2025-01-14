import { describe, expect, test } from 'vitest';

import { cliParser } from '../src/application/cliParser.js';

describe('Default values', () => {
  test('It should use default values when no arguments are provided', () => {
    process.argv = ['node', 'script.js'];
    const result = cliParser();
    expect(result).toEqual({
      templatePath: 'template.yml',
      outputPath: '',
      shouldUpdateReadme: false,
    });
  });
});

describe('Template handling', () => {
  test('It should parse --template/-t argument with valid .yml file', () => {
    process.argv = ['node', 'script.js', '--template', 'custom.yml'];
    const result = cliParser();
    expect(result.templatePath).toBe('custom.yml');
  });

  test('It should parse --template/-t argument with valid .yaml file', () => {
    process.argv = ['node', 'script.js', '-t', 'custom.yaml'];
    const result = cliParser();
    expect(result.templatePath).toBe('custom.yaml');
  });

  test('It should throw an error if --template/-t is provided without a file', () => {
    process.argv = ['node', 'script.js', '--template'];
    expect(() => cliParser()).toThrow(
      'Invalid or missing file name for --template/-t argument.',
    );
  });

  test('It should throw an error if --template/-t is provided with an invalid file', () => {
    process.argv = ['node', 'script.js', '--template', 'invalid.txt'];
    expect(() => cliParser()).toThrow(
      'Invalid or missing file name for --template/-t argument.',
    );
  });
});

describe('Output handling', () => {
  test('It should parse --output/-o argument with valid .mmd file', () => {
    process.argv = ['node', 'script.js', '--output', 'output.mmd'];
    const result = cliParser();
    expect(result.outputPath).toBe('output.mmd');
  });

  test('It should throw an error if --output/-o is provided without a file', () => {
    process.argv = ['node', 'script.js', '--output'];
    expect(() => cliParser()).toThrow(
      'Invalid or missing file name for --output/-o argument.',
    );
  });

  test('It should throw an error if --output/-o is provided with an invalid file', () => {
    process.argv = ['node', 'script.js', '--output', 'invalid.txt'];
    expect(() => cliParser()).toThrow(
      'Invalid or missing file name for --output/-o argument.',
    );
  });
});

describe('README handling', () => {
  test('It should parse --readme flag correctly', () => {
    process.argv = ['node', 'script.js', '--readme'];
    const result = cliParser();
    expect(result.shouldUpdateReadme).toBe(true);
  });
});

describe('Multiple arguments', () => {
  test('It should handle multiple arguments correctly', () => {
    process.argv = [
      'node',
      'script.js',
      '--template',
      'custom.yml',
      '--output',
      'output.mmd',
      '--readme',
    ];
    const result = cliParser();
    expect(result).toEqual({
      templatePath: 'custom.yml',
      outputPath: 'output.mmd',
      shouldUpdateReadme: true,
    });
  });
});
