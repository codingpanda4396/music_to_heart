import sharp from 'sharp';

interface ShareReflection {
  content: string;
  shareCode: string;
  track?: { title: string; composer: string };
  mood?: { name: string; slug: string };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

function lines(value: string, width = 14): string[] {
  return [...value].reduce<string[]>((result, character) => {
    const current = result.at(-1) ?? '';
    if (current.length >= width || character === '\n')
      result.push(character === '\n' ? '' : character);
    else if (result.length === 0) result.push(character);
    else result[result.length - 1] = current + character;
    return result;
  }, []);
}

export function renderShareHtml(reflection: ShareReflection, origin: string): string {
  const content = escapeHtml(reflection.content);
  const title = `${reflection.mood?.name ?? '此刻'} · 我听见`;
  const cardUrl = `${origin}/s/${reflection.shareCode}/card.png`;
  return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)} | 曲径通幽</title>
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${content}">
<meta property="og:image" content="${cardUrl}"><meta property="og:type" content="article">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#080c0b;color:#eee9dc;font-family:system-ui,sans-serif}.card{box-sizing:border-box;width:min(88vw,420px);aspect-ratio:3/4;padding:34px;background:linear-gradient(155deg,#1b2924,#080c0b);display:flex;flex-direction:column;box-shadow:0 24px 80px #0008}.brand{font-size:11px;letter-spacing:.3em;opacity:.65}.label{margin-top:18%;font-size:12px;color:#b9b3a4}.words{font-family:serif;font-size:clamp(22px,6vw,31px);line-height:1.7;white-space:pre-wrap}.meta{margin-top:auto;padding-top:20px;border-top:1px solid #ffffff25;color:#bbb6aa;font-size:12px;line-height:1.7}.enter{color:#d8d0bf;margin-top:18px}</style></head>
<body><main class="card"><div class="brand">曲径通幽</div><div class="label">我听见</div><p class="words">${content}</p><div class="meta">${escapeHtml(reflection.mood?.name ?? '')} · ${escapeHtml(reflection.track?.composer ?? '')}<br>${escapeHtml(reflection.track?.title ?? '')}</div><a class="enter" href="/">从此刻心境，进入一首音乐 →</a></main></body></html>`;
}

export async function renderShareCard(reflection: ShareReflection): Promise<Buffer> {
  const textLines = lines(reflection.content).slice(0, 7);
  const text = textLines
    .map(
      (line, index) =>
        `<text x="78" y="${330 + index * 82}" class="words">${escapeHtml(line)}</text>`,
    )
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <defs><linearGradient id="night" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1b2924"/><stop offset="1" stop-color="#080c0b"/></linearGradient></defs>
    <rect width="900" height="1200" fill="url(#night)"/>
    <style>.sans{font-family:'Noto Sans CJK SC','PingFang SC',sans-serif}.serif{font-family:'Noto Serif CJK SC','Songti SC',serif}.words{font-family:'Noto Serif CJK SC','Songti SC',serif;font-size:48px;fill:#eee9dc}.muted{fill:#b9b3a4}</style>
    <text x="78" y="90" class="sans muted" font-size="22" letter-spacing="8">曲径通幽</text>
    <text x="78" y="230" class="serif muted" font-size="25">我听见</text>${text}
    <line x1="78" x2="822" y1="1020" y2="1020" stroke="#ffffff" stroke-opacity=".15"/>
    <text x="78" y="1072" class="sans muted" font-size="23">${escapeHtml(reflection.mood?.name ?? '')} · ${escapeHtml(reflection.track?.composer ?? '')}</text>
    <text x="78" y="1112" class="sans muted" font-size="23">${escapeHtml(reflection.track?.title ?? '')}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}
