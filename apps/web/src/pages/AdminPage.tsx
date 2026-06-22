import { useEffect, useState } from 'react';
import {
  api,
  type AdminMetrics,
  type AdminReflectionItem,
  type AdminTrackListItem,
  type CatalogCoverage,
} from '../api.js';
import { ErrorNotice } from '../components.js';

const blankTrack = {
  title: '',
  composer: '',
  performer: null,
  category: '西方古典',
  period: null,
  durationText: '约 5 分钟',
  bilibiliUrl: 'https://search.bilibili.com/all?keyword=',
  bilibiliBvid: null,
  searchKeywords: '',
  difficulty: 1,
  status: 'DRAFT',
  origins: [],
  needs: [],
  guide: {
    title: '先别急着听懂',
    intro: '',
    firstImpression: '',
    background: '',
    listeningPoints: '',
    emotionalInterpretation: '',
    reflectionQuestion: '',
    takeaway: '',
  },
};

function editableTrack(value: AdminTrackListItem | null) {
  if (!value) return blankTrack;
  return {
    id: value.id,
    title: value.title,
    composer: value.composer,
    performer: value.performer,
    category: value.category,
    period: value.period,
    durationText: value.durationText,
    bilibiliUrl: value.bilibiliUrl,
    bilibiliBvid: value.bilibiliBvid,
    searchKeywords: value.searchKeywords,
    difficulty: value.difficulty,
    status: value.status,
    origins: value.trackOrigins.map((item) => ({
      originId: item.originId,
      weight: item.weight,
      reason: item.reason,
    })),
    needs: value.trackNeeds.map((item) => ({
      needId: item.needId,
      weight: item.weight,
      reason: item.reason,
    })),
    guide: value.guide,
  };
}

export function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [tracks, setTracks] = useState<AdminTrackListItem[]>([]);
  const [reflections, setReflections] = useState<AdminReflectionItem[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [coverage, setCoverage] = useState<CatalogCoverage | null>(null);
  const [editor, setEditor] = useState(JSON.stringify(blankTrack, null, 2));
  const [error, setError] = useState('');
  const load = async () => {
    try {
      const [nextTracks, nextReflections, nextMetrics, nextCoverage] = await Promise.all([
        api.adminTracks(),
        api.adminReflections(),
        api.adminMetrics(),
        api.adminCatalogCoverage(),
      ]);
      setTracks(nextTracks);
      setReflections(nextReflections);
      setMetrics(nextMetrics);
      setCoverage(nextCoverage);
      setAuthenticated(true);
    } catch {
      setAuthenticated(false);
    }
  };
  useEffect(() => {
    // Initial authentication probe is asynchronous and intentionally hydrates this page once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, []);
  const login = async () => {
    try {
      await api.adminLogin(username, password);
      setPassword('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '登录失败');
    }
  };
  const save = async () => {
    try {
      const value = JSON.parse(editor) as { id?: string };
      await api.adminSaveTrack(value, value.id);
      await load();
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '保存失败');
    }
  };
  if (!authenticated)
    return (
      <main className="admin-login">
        <div className="admin-panel">
          <p className="eyebrow">曲径通幽 · 内容后台</p>
          <h1>管理员登录</h1>
          {error && <ErrorNotice message={error} />}
          <label>
            用户名
            <input value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            密码
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button className="primary" onClick={() => void login()}>
            登录
          </button>
        </div>
      </main>
    );
  return (
    <main className="admin">
      <header>
        <div>
          <p className="eyebrow">曲径通幽</p>
          <h1>内容与反馈</h1>
        </div>
        <a href="/">返回前台</a>
      </header>
      {error && <ErrorNotice message={error} />}
      <section className="metric-grid">
        {metrics &&
          Object.entries(metrics).map(([key, value]) => (
            <div key={key}>
              <strong>{String(value)}</strong>
              <span>{key}</span>
            </div>
          ))}
      </section>
      {coverage && (
        <section>
          <h2>组合覆盖</h2>
          <p>
            {coverage.covered} / {coverage.total} 个起点与去向组合拥有至少三首候选。
          </p>
          {coverage.errors.length > 0 && <pre>{coverage.errors.join('\n')}</pre>}
        </section>
      )}
      <div className="admin-columns">
        <section>
          <div className="section-heading">
            <h2>曲目</h2>
            <button onClick={() => setEditor(JSON.stringify(blankTrack, null, 2))}>新增</button>
          </div>
          <div className="track-list">
            {tracks.map((track) => (
              <button
                key={track.id}
                onClick={() => setEditor(JSON.stringify(editableTrack(track), null, 2))}
              >
                <strong>{track.title}</strong>
                <span>{track.status}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="editor">
          <h2>编辑 JSON</h2>
          <p>发布曲目必须同时配置起点与去向关系，权重范围为 1–5。</p>
          <textarea
            aria-label="曲目内容"
            value={editor}
            onChange={(event) => setEditor(event.target.value)}
            spellCheck={false}
          />
          <button className="primary" onClick={() => void save()}>
            保存曲目
          </button>
        </section>
      </div>
      <section>
        <h2>最近听感</h2>
        <div className="reflection-list">
          {reflections.map((item) => (
            <article key={item.id}>
              <p>{item.content}</p>
              <span>{item.track.title}</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
