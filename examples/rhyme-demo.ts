import { getRhymes } from '../src/index';

async function main() {
  const wordsToTest = ["buang", "dagat", "adlaw"];
  
  console.log("=== Cebuano Rhyme Engine Demo ===\n");

  for (const word of wordsToTest) {
    console.log(`Finding rhymes for: "${word}"...`);
    
    // We'll search with a small syllable offset to find words of similar length
    const results = await getRhymes(word, { 
      limit: 5, 
      maxSyllableOffset: 1 
    });

    if (results.length > 0) {
      console.table(results.map(r => ({
        Word: r.headword,
        Type: r.rhymeType,
        Score: r.score,
        Syllables: r.syllableCount,
        Match: `${r.rhyme.nucleus}${r.rhyme.coda}`
      })));
    } else {
      console.log("No rhymes found.\n");
    }
    console.log("\n");
  }

  // Demonstrate Jitter/Randomness
  console.log("Demonstrating Jitter (randomness: 0.5) for 'buang':");
  const jittered = await getRhymes("buang", { limit: 3, randomness: 0.5 });
  jittered.forEach(r => console.log(`- ${r.headword} (Score: ${r.score.toFixed(2)})`));
}

main().catch(console.error);
