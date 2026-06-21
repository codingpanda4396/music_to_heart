// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HomePage } from './HomePage.js';

describe('HomePage', () => {
  it('requires one mood and submits the local note separately', () => {
    const onBegin = vi.fn();
    render(
      <HomePage
        moods={[{ id: 'mood-anxiety', name: '焦虑', slug: 'anxiety', description: '我停不下来' }]}
        onBegin={onBegin}
      />,
    );
    expect(screen.getByRole('button', { name: '为我推荐一首音乐' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: /焦虑/ }));
    fireEvent.change(screen.getByLabelText('也可以留下一句话'), {
      target: { value: '我现在有点乱' },
    });
    fireEvent.click(screen.getByRole('button', { name: '为我推荐一首音乐' }));
    expect(onBegin).toHaveBeenCalledWith('mood-anxiety', '我现在有点乱');
  });
});
