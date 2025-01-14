/**
 * @description Parse CLI arguments.
 */
export function cliParser() {
  const args = process.argv.slice(2);

  const parsed = {
    templatePath: 'template.yml',
    outputPath: '',
    shouldUpdateReadme: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Handle template
    if (arg === '--template' || arg === '-t') {
      const nextArg = args[i + 1];
      if (nextArg && /\.(yml|yaml)$/i.test(nextArg)) {
        parsed.templatePath = nextArg;
        i++; // skip next argument since it's consumed
      } else {
        throw new Error(
          'Invalid or missing file name for --template/-t argument.',
        );
      }
    }
    // Handle output file
    else if (arg === '--output' || arg === '-o') {
      const nextArg = args[i + 1];
      if (nextArg && nextArg.endsWith('.mmd')) {
        parsed.outputPath = nextArg;
        i++; // skip next argument since it's consumed
      } else {
        throw new Error(
          'Invalid or missing file name for --output/-o argument.',
        );
      }
    }
    // Handle README
    else if (arg === '--readme') {
      parsed.shouldUpdateReadme = true;
    }
  }

  return parsed;
}
