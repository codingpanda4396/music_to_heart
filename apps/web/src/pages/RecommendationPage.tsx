import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { api, sendEvent, type TrackSummary } from '../api.js';
import { ErrorNotice, Loading, Shell } from '../components.js';
import type { Journey } from '../journey.js';

export function RecommendationPage({
  journey,
  addShown,
  saveContext,
}: {
  journey: Journey | null;
  addShown: (id: string) => void;
  saveContext: (trackId: string, reason: string) => void;
}) {
  const [result, setResult] = useState<{ track: TrackSummary; reason: string } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [exhausted, setExhausted] = useState(false);
  const shown = useRef<string[]>(journey?.shownTrackIds ?? []);
  const hasResult = useRef(false);
  const load = useCallback(async () => {
    if (!journey) return;
    setLoading(true);
    setError('');
    try {
      const next = await api.recommend({
        originId: journey.originId,
        needId: journey.needId,
        journeyId: journey.journeyId,
        excludeTrackIds: shown.current,
      });
      setResult(next);
      hasResult.current = true;
      setExhausted(false);
      saveContext(next.track.id, next.reason);
      if (!shown.current.includes(next.track.id)) shown.current = [...shown.current, next.track.id];
      addShown(next.track.id);
      sendEvent({
        eventName: 'recommend_generated',
        anonymousId: localStorage.getItem('qj_anonymous_id')!,
        journeyId: journey.journeyId,
        originId: journey.originId,
        needId: journey.needId,
        trackId: next.track.id,
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : '暂时无法推荐';
      if (hasResult.current && message === '适合这段旅程的曲目已经看完了') setExhausted(true);
      else setError(message);
    } finally {
      setLoading(false);
    }
  }, [addShown, journey, saveContext]);
  useEffect(() => {
    // One initial recommendation is loaded when the route becomes active.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);
  if (!journey) return <Navigate to="/" replace />;
  return (
    <Shell backTo="/">
      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorNotice message={error} />
      ) : result ? (
        <article className="recommend-card">
          <p className="eyebrow">此刻推荐</p>
          <p className="composer">{result.track.composer}</p>
          <h1>{result.track.title}</h1>
          <p className="category">
            {result.track.category} · {result.track.durationText}
          </p>
          <div className="reason">
            <span>为什么是它</span>
            <p>{result.reason}</p>
          </div>
          <Link className="primary link-button" to={`/track/${result.track.id}`}>
            进入导赏
          </Link>
          <button className="ghost" disabled={exhausted} onClick={() => void load()}>
            {exhausted ? '适合你的推荐已经看完了' : '换一首'}
          </button>
        </article>
      ) : null}
    </Shell>
  );
}
