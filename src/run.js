// Runs a checker after making sure this Node can: node src/run.js check|check-context file.md ...
// On an old Node it prints one plain "Not checked:" line instead of a syntax error.
import { minimum, tooOld } from './node-version.js';

const [name, ...args] = process.argv.slice(2);
if (tooOld(process.version)) {
  console.log(`Not checked: Node ${process.version} is older than ${minimum}, which the checker needs.`);
  process.exit(3);
}
if (name !== 'check' && name !== 'check-context') {
  console.error('Usage: node src/run.js check|check-context path/to/file.md ...');
  process.exit(2);
}
const { main } = await import(`./${name}.ts`);
main(args);
