import { expect, test } from 'vitest';
import { lookup } from '../src/index';

test('lookup feature integration', async () => {
  const result = await lookup('adlaw');
  expect(result).toBeDefined();
  // Expect it to return either null (if not in DB) or an object (if found)
  if (result) {
    expect(typeof result).toBe('object');
  }
});
