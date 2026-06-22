import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, sendEvent, type TrackDetail } from '../api.js';
import { ErrorNotice, Loading, Shell } from '../components.js';
import type { Journey } from '../journey.js';

export function TrackPage({ journey }: { journey: Journey | null }) {
  const { id = '' } = useParams();
  const [track, setTrack] = useState<TrackDetail | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    api
      .track(id)
      .then((value) => {
        setTrack(value);
        if (journey)
          sendEvent({
            eventName: 'track_viewed',
            anonymousId: localStorage.getItem('qj_anonymous_id')!,
            journeyId: journey.journeyId,
            originId: journey.originId,
            needId: journey.needId,
            trackId: id,
          });
      })
      .catch((reason: Error) => setError(reason.message));
  }, [id, journey]);
  if (error)
    return (
      <Shell backTo="/recommend">
        <ErrorNotice message={error} />
      </Shell>
    );
  if (!track) return <Loading />;
  const sections = [
    ['先别急着听懂', track.guide.intro],
    ['第一感受', track.guide.firstImpression],
    ['一点必要知识', track.guide.background],
    ['听的时候注意什么', track.guide.listeningPoints],
    [
      '它与你此刻的关系',
      journey?.recommendedTrackId === track.id && journey.recommendationContext
        ? journey.recommendationContext
        : track.guide.emotionalInterpretation,
    ],
    ['听后问题', track.guide.reflectionQuestion],
  ];
  return (
    <Shell backTo="/recommend">
      <article className="guide">
        <p className="composer">{track.composer}</p>
        <h1>{track.title}</h1>
        {sections.map(([heading, body], index) => (
          <section key={heading}>
            <span className="section-number">0{index + 1}</span>
            <h2>{heading}</h2>
            <p>{body}</p>
          </section>
        ))}
        <blockquote>{track.guide.takeaway}</blockquote>
        <Link className="primary link-button" to={`/listen/${track.id}`}>
          去 B站聆听
        </Link>
      </article>
    </Shell>
  );
}
