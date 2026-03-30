import { expect, test, vi } from 'vitest';
import { createLookupFeature } from './lookup';

test('lookup delegates to repository with a string', async () => {
  const mockRepo = { findEntry: vi.fn().mockResolvedValue({ ast: true }) } as any;
  const lookup = createLookupFeature(mockRepo);
  
  expect(await lookup('test')).toEqual({ ast: true });
  expect(mockRepo.findEntry).toHaveBeenCalledWith('test');
});

test('lookup delegates to repository with a number', async () => {
  const mockRepo = { findEntry: vi.fn().mockResolvedValue({ ast: true }) } as any;
  const lookup = createLookupFeature(mockRepo);
  
  expect(await lookup(1234)).toEqual({ ast: true });
  expect(mockRepo.findEntry).toHaveBeenCalledWith(1234);
});