import { useCallback, useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { api, sendEvent } from './api.js';
import { ErrorNotice, Loading } from './components.js';
import { createJourneyStore, type Journey } from './journey.js';
import { AdminPage } from './pages/AdminPage.js';
import { HomePage, type Mood } from './pages/HomePage.js';
import { ListenPage } from './pages/ListenPage.js';
import { RecommendationPage } from './pages/RecommendationPage.js';
import { ReflectPage } from './pages/ReflectPage.js';
import { SharePage } from './pages/SharePage.js';
import { TrackPage } from './pages/TrackPage.js';

function Experience() {
  const store = useMemo(() => createJourneyStore(localStorage), []);
  const navigate = useNavigate();
  const [journey, setJourney] = useState<Journey | null>(() => store.current());
  const [moods, setMoods] = useState<Mood[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    store.anonymousId();
    api
      .moods()
      .then(setMoods)
      .catch((reason: Error) => setError(reason.message));
  }, [store]);
  const begin = (moodId: string, note: string) => {
    const next = store.start(moodId, note);
    setJourney(next);
    sendEvent({
      eventName: 'mood_selected',
      anonymousId: store.anonymousId(),
      journeyId: next.journeyId,
      moodId,
    });
    navigate('/recommend');
  };
  const addShown = useCallback(
    (trackId: string) => {
      store.addShownTrack(trackId);
    },
    [store],
  );
  if (error) return <ErrorNotice message={error} />;
  if (!moods) return <Loading />;
  return (
    <Routes>
      <Route path="/" element={<HomePage moods={moods} onBegin={begin} />} />
      <Route
        path="/recommend"
        element={<RecommendationPage journey={journey} addShown={addShown} />}
      />
      <Route path="/track/:id" element={<TrackPage journey={journey} />} />
      <Route path="/listen/:id" element={<ListenPage journey={journey} />} />
      <Route path="/reflect/:id" element={<ReflectPage journey={journey} />} />
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
