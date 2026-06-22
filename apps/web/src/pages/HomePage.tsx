import { useState } from 'react';

export interface Origin {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface Need extends Origin {
  reflectionPrompt: string;
}

export function HomePage({
  origins,
  needs,
  onBegin,
}: {
  origins: Origin[];
  needs: Need[];
  onBegin: (originId: string, needId: string, note: string) => void;
}) {
  const [originId, setOriginId] = useState('');
  const [needId, setNeedId] = useState('');
  const [step, setStep] = useState<'origin' | 'need'>('origin');
  const [note, setNote] = useState('');
  const options = step === 'origin' ? origins : needs;
  const selectedId = step === 'origin' ? originId : needId;
  return (
    <main className="home page-shell">
      <header className="brand">曲径通幽</header>
      <section className="hero">
        <p className="eyebrow">从此刻出发，向需要的地方走去。</p>
        <h1>{step === 'origin' ? '此刻，你更接近哪一种？' : '此刻，你更需要什么？'}</h1>
        <p className="soft">
          {step === 'origin'
            ? '不必给情绪命名，只选最接近的体验。'
            : '音乐不会催你改变，只陪你靠近一个方向。'}
        </p>
      </section>
      <fieldset className="mood-grid">
        <legend className="sr-only">
          {step === 'origin' ? '选择此刻的体验' : '选择此刻的需要'}
        </legend>
        {options.map((option) => (
          <label
            className={`mood-card ${selectedId === option.id ? 'selected' : ''}`}
            key={option.id}
          >
            <input
              type="radio"
              name={step}
              value={option.id}
              checked={selectedId === option.id}
              onChange={() => {
                if (step === 'origin') {
                  setOriginId(option.id);
                  setStep('need');
                } else setNeedId(option.id);
              }}
            />
            <strong>{option.name}</strong>
            <span>{option.description}</span>
          </label>
        ))}
      </fieldset>
      {step === 'need' && (
        <button
          className="text-button"
          onClick={() => {
            setNeedId('');
            setStep('origin');
          }}
        >
          修改起点
        </button>
      )}
      <label className="note-field">
        <span>也可以留下一句话</span>
        <textarea
          value={note}
          maxLength={200}
          placeholder="我现在……（只保存在这台设备）"
          onChange={(event) => setNote(event.target.value)}
        />
      </label>
      <button
        className="primary"
        disabled={!originId || !needId}
        onClick={() => onBegin(originId, needId, note.trim())}
      >
        为我推荐一首音乐
      </button>
      <p className="safety">这里提供音乐导赏，不替代专业的医疗或心理支持。</p>
    </main>
  );
}
