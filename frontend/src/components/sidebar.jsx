import { BRAND, tripDays } from '../lib';

export default function Sidebar({ email, trips, view, activeId, onHome, onNew, onOpen, onSignOut }) {
  return (
    <aside className="sidebar">
      <button className="brand" onClick={onHome}>{BRAND}</button>

      <button className="btn sun block" onClick={onNew}>New trip</button>

      <nav className="side-nav" aria-label="Main">
        <button
          className={view === 'dashboard' ? 'active' : ''}
          onClick={onHome}
        >
          All trips
          <span className="count">{trips.length}</span>
        </button>
      </nav>

      <div className="side-trips">
        {trips.slice(0, 8).map((t) => (
          <button
            key={t.id}
            className={view === 'trip' && activeId === t.id ? 'active' : ''}
            onClick={() => onOpen(t)}
          >
            <span className="name">{t.destination}</span>
            <span className="sub">{tripDays(t)} days</span>
          </button>
        ))}
      </div>

      <div className="side-user">
        <span title={email}>{email}</span>
        <button onClick={onSignOut}>Sign out</button>
      </div>
    </aside>
  );
}