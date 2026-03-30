import { describe, expect, it, vi, beforeEach } from 'vitest';
import { createAnagramFeature } from './anagrams';
import type { IDictionaryRepository } from '../../ports/dictionary-repository.port';

describe('Anagram feature', () => {
  let mockRepo: IDictionaryRepository;
  let feature: ReturnType<typeof createAnagramFeature>;

  beforeEach(() => {
    mockRepo = {
      fuzzySearch: vi.fn(),
      findEntry: vi.fn(),
      findTranslations: vi.fn(),
      findEntriesByTranslations: vi.fn(),
      findRhymes: vi.fn(),
      findAnagrams: vi.fn().mockResolvedValue([
        {
          entryId: 10,
          headword: 'buang',
          normalizedHead: 'buang',
          pos: 'adj',
          translations: ['crazy']
        }
      ])
    };

    feature = createAnagramFeature(mockRepo);
  });

  it('delegates to repository findAnagrams with normalized input, and returns results', async () => {
    const results = await feature('bangu');
    expect(mockRepo.findAnagrams).toHaveBeenCalledWith('bangu', 25);
    expect(results).toHaveLength(1);
    expect(results[0].normalizedHead).toBe('buang');
  });

  it('returns empty array for empty query', async () => {
    const empty = await feature('   ');
    expect(empty).toEqual([]);
    expect(mockRepo.findAnagrams).not.toHaveBeenCalled();
  });
});
