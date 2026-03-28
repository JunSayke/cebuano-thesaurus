import { expect, describe, it, vi, beforeEach } from 'vitest';
import { RhymeFeature } from './rhyme';
import type { IDictionaryRepository } from '../../ports/dictionary-repository.port';

describe('RhymeFeature', () => {
  let feature: RhymeFeature;
  let mockRepo: IDictionaryRepository;

  beforeEach(() => {
    mockRepo = {
      fuzzySearch: vi.fn(),
      findEntry: vi.fn(),
      findRhymes: vi.fn().mockResolvedValue([
        { 
          entryId: 1, 
          headword: 'tabang', 
          normalizedHead: 'tabang', 
          score: 105, 
          syllableCount: 2, 
          rhymeType: 'perfect', 
          rhyme: { syllable: 'bang', onset: 'b', nucleus: 'a', coda: 'ng' } 
        },
        { 
          entryId: 2, 
          headword: 'buang', 
          normalizedHead: 'buang', 
          score: 100, 
          syllableCount: 2, 
          rhymeType: 'perfect', 
          rhyme: { syllable: 'ang', onset: '', nucleus: 'a', coda: 'ng' } 
        }
      ])
    };
    feature = new RhymeFeature(mockRepo);
  });

  it('correctly prepares search parameters for the repository', async () => {
    await feature.getRhymes('buang');
    expect(mockRepo.findRhymes).toHaveBeenCalled();
  });

  it('filters out the input word from results', async () => {
    const results = await feature.getRhymes('buang');
    expect(results.find(r => r.normalizedHead === 'buang')).toBeUndefined();
  });

  it('applies jitter when randomness is requested', async () => {
    const resultsNoJitter = await feature.getRhymes('dagat', { randomness: 0 });
    const resultsWithJitter = await feature.getRhymes('dagat', { randomness: 1.0 });

    expect(resultsNoJitter.length).toBeGreaterThan(0);
    expect(resultsWithJitter.length).toBeGreaterThan(0);

    // FIXED: Access the score on the first element of the array
    const scoreWithoutJitter = resultsNoJitter[0].score;
    const scoreWithJitter = resultsWithJitter[0].score;

    expect(scoreWithJitter).not.toBe(scoreWithoutJitter);
  });
});
