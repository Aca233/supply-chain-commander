import { describe, expect, it } from 'vitest';

import { SOUND_DEFINITIONS } from '../SoundConfig';

describe('SoundConfig', () => {
  it('ships local audio data instead of relying on remote CDN assets', () => {
    expect(Object.values(SOUND_DEFINITIONS)).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          url: expect.stringMatching(/^https?:\/\//),
        }),
      ]),
    );

    expect(
      Object.values(SOUND_DEFINITIONS).every((definition) => definition.url.startsWith('data:audio/')),
    ).toBe(true);
  });
});
