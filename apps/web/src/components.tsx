import type { PropsWithChildren } from 'react';
import { Link } from 'react-router-dom';

export function Shell({ children, backTo }: PropsWithChildren<{ backTo?: string }>) {
  return (
    <main className="page-shell reading-shell">
      <nav className="topbar">
        {backTo ? <Link to={backTo}>← 返回</Link> : <span />}
        <Link className="brand" to="/">
          曲径通幽
        </Link>
      </nav>
      {children}
    </main>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      让音乐慢慢抵达…
    </div>
  );
}

export function ErrorNotice({ message }: { message: string }) {
  return (
    <div className="error" role="alert">
      {message}
    </div>
  );
}
