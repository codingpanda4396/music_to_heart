// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage.js';

describe('HomePage', () => {
  afterEach(cleanup);
  it('collects an origin and a need in two steps and keeps the note separate', () => {
    const onBegin = vi.fn();
    render(
      <HomePage
        origins={[
          {
            id: 'origin-racing',
            name: '脑子一直停不下来',
            slug: 'racing',
            description: '念头很多',
          },
        ]}
        needs={[
          {
            id: 'need-calm',
            name: '先安静下来',
            slug: 'calm',
            description: '让过快的部分慢一点',
            reflectionPrompt: '现在有什么安静了一点？',
          },
        ]}
        onBegin={onBegin}
      />,
    );
    expect(screen.getByRole('button', { name: '为我推荐一首音乐' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /脑子一直停不下来/ }));
    expect(screen.getByRole('heading', { name: '此刻，你更需要什么？' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('radio', { name: /先安静下来/ }));
    fireEvent.change(screen.getByLabelText('也可以留下一句话'), {
      target: { value: '我现在有点乱' },
    });
    fireEvent.click(screen.getByRole('button', { name: '为我推荐一首音乐' }));
    expect(onBegin).toHaveBeenCalledWith('origin-racing', 'need-calm', '我现在有点乱');
  });

  it('allows returning to change the origin', () => {
    render(
      <HomePage
        origins={[
          {
            id: 'origin-racing',
            name: '脑子一直停不下来',
            slug: 'racing',
            description: '念头很多',
          },
        ]}
        needs={[
          {
            id: 'need-calm',
            name: '先安静下来',
            slug: 'calm',
            description: '慢一点',
            reflectionPrompt: '现在呢？',
          },
        ]}
        onBegin={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('radio', { name: /脑子一直停不下来/ }));
    fireEvent.click(screen.getByRole('button', { name: '修改起点' }));
    expect(screen.getByRole('heading', { name: '此刻，你更接近哪一种？' })).toBeInTheDocument();
  });
});
