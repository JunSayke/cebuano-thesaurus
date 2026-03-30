import { getAnagrams } from '../src/index';

async function main() {
  console.log('=== Cebuano Anagram Demo ===\n');

  const wordsToTest = ['buang', 'adlaw', 'tagas'];

  for (const word of wordsToTest) {
    console.log(`Finding anagrams for: "${word}"`);
    const results = await getAnagrams(word, 20);

    if (results.length > 0) {
      console.table(results.map(r => ({
        entryId: r.entryId,
        word: r.headword,
        normalized: r.normalizedHead,
        pos: r.pos || '',
        translations: r.translations.join('; ')
      })));
    } else {
      console.log('No anagrams found.');
    }

    console.log('\n');
  }

  console.log('Demo complete.');
}

main().catch(console.error);
