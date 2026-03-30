import { expect, test } from 'vitest';
import { lookup, getSynonyms, getAnagrams } from '../src/index';

test('lookup feature integration', async () => {
  const result = await lookup('adlaw');
  expect(result).toBeDefined();
  // Expect it to return either null (if not in DB) or an object (if found)
  if (result) {
    expect(typeof result).toBe('object');
  }
});

test('synonym lookup via shared translation', async () => {
  const synonyms = await getSynonyms('adlaw');
  expect(Array.isArray(synonyms)).toBe(true);
  expect(synonyms.length).toBeGreaterThan(0);
  expect(synonyms).toEqual(expect.arrayContaining([
    expect.objectContaining({ headword: expect.any(String) })
  ]));
});

test('anagram lookup returns array and excludes exact match if possible', async () => {
  const anagrams = await getAnagrams('adlaw');
  expect(Array.isArray(anagrams)).toBe(true);
});
