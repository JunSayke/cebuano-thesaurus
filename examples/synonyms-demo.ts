import { getSynonyms } from '../src/index';

async function main() {
  console.log('=== Cebuano Synonyms Demo ===\n');

  const word = 'buang';
  console.log(`1) Lookup synonyms for '${word}' (via translations from entry):`);

  const synonyms = await getSynonyms(word);
  if (synonyms.length > 0) {
    console.table(synonyms.map(s => ({
      Word: s.headword,
      Normalized: s.normalizedHead,
      POS: s.pos || 'n/a',
      Translations: s.translations.join(', ')
    })));
  } else {
    console.log('No synonyms found for', word);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error('Error in synonyms demo:', err);
  process.exit(1);
});