import { useNavigate, useParams } from 'react-router-dom';
import { api, sendEvent } from '../api.js';
import { Shell } from '../components.js';
import type { Journey } from '../journey.js';

export function SharePage({ journey }: { journey: Journey | null }) {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const shareUrl = `${location.origin}/s/${code}`;
  const imageUrl = `/s/${code}/card.png`;
  const record = () =>
    journey &&
    sendEvent({
      eventName: 'share_intent',
      anonymousId: localStorage.getItem('qj_anonymous_id')!,
      journeyId: journey.journeyId,
      originId: journey.originId,
      needId: journey.needId,
      shareCode: code,
    });
  const share = async () => {
    record();
    if (navigator.share) await navigator.share({ title: '曲径通幽 · 我听见', url: shareUrl });
    else await navigator.clipboard.writeText(shareUrl);
  };
  const deletionToken = localStorage.getItem(`qj_delete_${code}`);
  const remove = async () => {
    if (!deletionToken || !window.confirm('确认删除这条听感？分享链接将立即失效。')) return;
    await api.deleteReflection(code, deletionToken);
    localStorage.removeItem(`qj_delete_${code}`);
    navigate('/');
  };
  return (
    <Shell backTo="/">
      <section className="share-result">
        <p className="eyebrow">你的听感卡片</p>
        <h1>这一刻，已经被好好留下。</h1>
        <img src={imageUrl} alt="我的曲径通幽听感卡片" />
        <button className="primary" onClick={() => void share()}>
          分享这张卡片
        </button>
        <a className="ghost link-button" href={imageUrl} download onClick={record}>
          保存图片
        </a>
        <button
          className="text-button"
          onClick={() => {
            record();
            void navigator.clipboard.writeText(shareUrl);
          }}
        >
          复制分享链接
        </button>
        <p className="soft">分享页仅持链接可见，不会进入公开广场。</p>
        {deletionToken && (
          <button className="text-button danger" onClick={() => void remove()}>
            删除这条听感
          </button>
        )}
      </section>
    </Shell>
  );
}
