// Runs a checker after making sure this Node can: node src/run.js check|check-context file.md ..., check-folder path/to/loupe,
// or check-look path/to/looks.md <look number> name=value ...
// On an old Node it prints one plain "Not checked:" line instead of a syntax error.
import { minimum, tooOld } from './node-version.js';

const [name, ...args] = process.argv.slice(2);
if (tooOld(process.version)) {
  console.log(`Not checked: Node ${process.version} is older than ${minimum}, which the checker needs.`);
  process.exit(3);
}
if (!['check', 'check-context', 'check-folder', 'check-look'].includes(name)) {
  console.error('Usage: node src/run.js check|check-context path/to/file.md ...\n       node src/run.js check-folder path/to/loupe\n       node src/run.js check-look path/to/looks.md <look number> name=value ...');
  process.exit(2);
}
const { main } = await import(`./${name}.ts`);
main(args);
