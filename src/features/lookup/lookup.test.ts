import { expect, test, vi } from 'vitest';
import { createLookupFeature } from './lookup';

test('lookup delegates to repository', async () => {
  const mockRepo = { findEntry: vi.fn().mockResolvedValue({ ast: true }) };
  const lookup = createLookupFeature(mockRepo);
  
  expect(await lookup('test')).toEqual({ ast: true });
  expect(mockRepo.findEntry).toHaveBeenCalledWith('test');
});
