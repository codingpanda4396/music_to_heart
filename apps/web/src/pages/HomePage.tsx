import { useState } from 'react';

export interface Mood {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export function HomePage({
  moods,
  onBegin,
}: {
  moods: Mood[];
  onBegin: (id: string, note: string) => void;
}) {
  const [moodId, setMoodId] = useState('');
  const [note, setNote] = useState('');
  return (
    <main className="home page-shell">
      <header className="brand">曲径通幽</header>
      <section className="hero">
        <p className="eyebrow">从此刻心境，进入一首音乐。</p>
        <h1>此刻，你想把什么交给音乐？</h1>
        <p className="soft">你不必立刻变好。先选择最接近的一种感受。</p>
      </section>
      <fieldset className="mood-grid">
        <legend className="sr-only">选择此刻的心境</legend>
        {moods.map((mood) => (
          <label className={`mood-card ${moodId === mood.id ? 'selected' : ''}`} key={mood.id}>
            <input
              type="radio"
              name="mood"
              value={mood.id}
              checked={moodId === mood.id}
              onChange={() => setMoodId(mood.id)}
            />
            <strong>{mood.name}</strong>
            <span>{mood.description}</span>
          </label>
        ))}
      </fieldset>
      <label className="note-field">
        <span>也可以留下一句话</span>
        <textarea
          value={note}
          maxLength={200}
          placeholder="我现在……（只保存在这台设备）"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button className="primary" disabled={!moodId} onClick={() => onBegin(moodId, note.trim())}>
        为我推荐一首音乐
      </button>
      <p className="safety">这里提供音乐导赏，不替代专业的医疗或心理支持。</p>
    </main>
  );
}
