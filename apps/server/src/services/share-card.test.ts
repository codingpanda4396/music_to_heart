import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { renderShareCard, renderShareHtml } from './share-card.js';

const reflection = {
  content: '<script>alert(1)</script>可以慢一点。',
  shareCode: 'share-code-12345678',
  track: { title: '《哥德堡变奏曲》咏叹调', composer: 'J. S. Bach' },
  mood: { name: '焦虑', slug: 'anxiety' },
};

describe('share rendering', () => {
  it('escapes user content and prevents indexing', () => {
    const html = renderShareHtml(reflection, 'https://pandaprivate.top');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('noindex, nofollow');
    expect(html).toContain('/s/share-code-12345678/card.png');
  });

  it('renders a 900 by 1200 PNG card', async () => {
    const image = await renderShareCard(reflection);
    const metadata = await sharp(image).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(900);
    expect(metadata.height).toBe(1200);
  });
});
