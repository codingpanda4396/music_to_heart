import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, sendEvent } from './api.js';
import { ErrorNotice, Loading } from './components.js';
import { createJourneyStore, type Journey } from './journey.js';
import { AdminPage } from './pages/AdminPage.js';
import { HomePage, type Need, type Origin } from './pages/HomePage.js';
import { ListenPage } from './pages/ListenPage.js';
import { RecommendationPage } from './pages/RecommendationPage.js';
import { ReflectPage } from './pages/ReflectPage.js';
import { SharePage } from './pages/SharePage.js';
import { TrackPage } from './pages/TrackPage.js';

function Experience() {
  const store = useMemo(() => createJourneyStore(localStorage), []);
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(() => store.current());
  const [origins, setOrigins] = useState<Origin[] | null>(null);
  const [needs, setNeeds] = useState<Need[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    store.anonymousId();
    Promise.all([api.origins(), api.needs()])
      .then(([nextOrigins, nextNeeds]) => {
        setOrigins(nextOrigins);
        setNeeds(nextNeeds);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [store]);
  const begin = (originId: string, needId: string, note: string) => {
    const next = store.start(originId, needId, note);
    setJourney(next);
    sendEvent({
      eventName: 'origin_selected',
      anonymousId: store.anonymousId(),
      journeyId: next.journeyId,
      originId,
    });
    sendEvent({
      eventName: 'need_selected',
      anonymousId: store.anonymousId(),
      journeyId: next.journeyId,
      originId,
      needId,
    });
    navigate('/recommend');
  };
  const addShown = useCallback(
    (trackId: string) => {
      store.addShownTrack(trackId);
    },
    [store],
  );
  const saveRecommendationContext = useCallback(
    (trackId: string, reason: string) => {
      store.setRecommendationContext(trackId, reason);
      setJourney(store.current());
    },
    [store],
  );
  if (error) return <ErrorNotice message={error} />;
  if (!origins || !needs) return <Loading />;
  return (
    <Routes>
      <Route path="/" element={<HomePage origins={origins} needs={needs} onBegin={begin} />} />
      <Route
        path="/recommend"
        element={
          <RecommendationPage
            journey={journey}
            addShown={addShown}
            saveContext={saveRecommendationContext}
          />
        }
      />
      <Route path="/track/:id" element={<TrackPage journey={journey} />} />
      <Route path="/listen/:id" element={<ListenPage journey={journey} />} />
      <Route
        path="/reflect/:id"
        element={
          <ReflectPage
            journey={journey}
            need={needs.find((item) => item.id === journey?.needId) ?? null}
          />
        }
      />
      <Route path="/share/:code" element={<SharePage journey={journey} />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/*" element={<Experience />} />
      </Routes>
    </BrowserRouter>
  );
}
