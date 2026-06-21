import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, sendEvent, type TrackDetail } from '../api.js';
import { Loading, Shell } from '../components.js';
import type { Journey } from '../journey.js';

export function ReflectPage({ journey }: { journey: Journey | null }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [content, setContent] = useState('');
  const [idempotencyKey] = useState(() => `idempotency-${crypto.randomUUID()}`);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void api.track(id).then(setTrack);
  }, [id]);
  if (!journey) return <Navigate to="/" replace />;
  if (!track) return <Loading />;
  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      const result = await api.reflect({
        trackId: id,
        moodId: journey.moodId,
        anonymousId: localStorage.getItem('qj_anonymous_id')!,
        journeyId: journey.journeyId,
        idempotencyKey,
        content,
      });
      if (result.deletionToken)
        localStorage.setItem(`qj_delete_${result.shareCode}`, result.deletionToken);
      sendEvent({
        eventName: 'reflection_created',
        anonymousId: localStorage.getItem('qj_anonymous_id')!,
        journeyId: journey.journeyId,
        moodId: journey.moodId,
        trackId: id,
        shareCode: result.shareCode,
      });
      navigate(`/share/${result.shareCode}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
      setSaving(false);
    }
  };
  return (
    <Shell backTo={`/listen/${id}`}>
      <section className="reflect">
        <p className="eyebrow">听完之后</p>
        <h1>{track.guide.reflectionQuestion}</h1>
        <p className="soft">不需要写得正确，只需要写得真实。</p>
        <textarea
          aria-label="我的听感"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          maxLength={120}
          placeholder="我听见……"
        />
        <div className="counter">{content.length} / 120</div>
        {error && <p className="error">{error}</p>}
        <button
          className="primary"
          disabled={!content.trim() || saving}
          onClick={() => void submit()}
        >
          {saving ? '正在保存…' : '生成我的听感卡片'}
        </button>
      </section>
    </Shell>
  );
}
