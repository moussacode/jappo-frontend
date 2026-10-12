import { MarkdownPipe } from './markdown.pipe';

describe('MarkdownPipe', () => {
  const pipe = new MarkdownPipe();

  it('renders bold markdown as strong text', () => {
    expect(pipe.transform('Une **notion importante**.')).toBe(
      'Une <strong>notion importante</strong>.',
    );
  });

  it('escapes HTML before applying markdown formatting', () => {
    expect(pipe.transform('<img src=x onerror=alert(1)> **sûr**')).toBe(
      '&lt;img src=x onerror=alert(1)&gt; <strong>sûr</strong>',
    );
  });
});
