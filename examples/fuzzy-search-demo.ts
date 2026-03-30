import { fuzzySearch } from '../src/index';

async function main() {
  console.log("Initializing Cebuano Thesaurus...\n");

  const wordToTest = "baga";
  console.log(`Searching up: "${wordToTest}"`);

  const result = await fuzzySearch(wordToTest);

  if (result) {
    console.log("✅ Word found!");
    
    console.dir(result, { depth: null, colors: true });
  } else {
    console.log("❌ Word not found.");
  }
}

main().catch(console.error);