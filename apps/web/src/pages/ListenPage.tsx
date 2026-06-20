import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, sendEvent, type TrackDetail } from '../api.js';
import { Loading, Shell } from '../components.js';
import type { Journey } from '../journey.js';

export function ListenPage({ journey }: { journey: Journey | null }) {
  const { id = '' } = useParams();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  useEffect(() => {
    void api.track(id).then(setTrack);
  }, [id]);
  if (!track) return <Loading />;
  const eventBase = journey
    ? {
        anonymousId: localStorage.getItem('qj_anonymous_id')!,
        journeyId: journey.journeyId,
        moodId: journey.moodId,
        trackId: id,
      }
    : null;
  return (
    <Shell backTo={`/track/${id}`}>
      <section className="ritual">
        <p className="eyebrow">即将前往 B站聆听</p>
        <h1>{track.title}</h1>
        <ul>
          <li>戴上耳机</li>
          <li>不要倍速</li>
          <li>先听三分钟</li>
          <li>不用急着喜欢它</li>
        </ul>
        <a
          className="primary link-button"
          href={track.bilibiliUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => eventBase && sendEvent({ eventName: 'bilibili_clicked', ...eventBase })}
        >
          打开 B站
        </a>
        <details>
          <summary>链接没有打开？</summary>
          <p>复制搜索词：{track.searchKeywords}</p>
          <button
            className="ghost"
            onClick={() => void navigator.clipboard.writeText(track.searchKeywords)}
          >
            复制搜索词
          </button>
          <button
            className="text-button"
            onClick={() =>
              eventBase && sendEvent({ eventName: 'broken_link_reported', ...eventBase })
            }
          >
            报告链接失效
          </button>
        </details>
        <Link className="ghost link-button" to={`/reflect/${id}`}>
          我已经听完
        </Link>
      </section>
    </Shell>
  );
}
