import { lookup } from '../src/index';

async function main() {
  console.log("Initializing Cebuano Thesaurus...\n");

  const wordToTest = "buang";
  console.log(`Looking up: "${wordToTest}"`);

  const result = await lookup(wordToTest);

  if (result) {
    console.log("✅ Word found!");
    
    console.dir(result, { depth: null, colors: true });
  } else {
    console.log("❌ Word not found.");
  }

  const idToTest = 1571;
  console.log(`Looking up by Entry ID: ${idToTest}`);

  const idResult = await lookup(idToTest);

  if (idResult) {
    console.log("✅ Entry found!");
    console.dir(idResult, { depth: null, colors: true });
  } else {
    console.log("❌ Entry not found.");
  }
}

main().catch(console.error);