import { coverStyle, formatDate, money, tripDays, tripTotal, normalize } from '../lib';

function TripCard({ trip, onOpen, onDelete }) {
  const it = normalize(trip.itinerary_data);
  const total = tripTotal(it);
  const stops = it.days.reduce((n, d) => n + d.activities.length, 0);

  return (
    <article className="trip-card">
      <button className="cover" style={coverStyle(trip.destination)} onClick={() => onOpen(trip)}>
        <span className="cover-name">{trip.destination}</span>
      </button>
      <div className="trip-body">
        <h3>{it.trip_title || `Trip to ${trip.destination}`}</h3>
        <p className="muted">
          {tripDays(trip)} days, {stops} stops
          {total > 0 && <>, about {money(total, it.currency)}</>}
        </p>
        <p className="muted small">Created {formatDate(trip.created_at)}</p>
        <div className="row">
          <button className="btn small" onClick={() => onOpen(trip)}>Open</button>
          <button className="btn small ghost danger" onClick={() => onDelete(trip)}>Delete</button>
        </div>
      </div>
    </article>
  );
}

export default function Dashboard({ trips, loading, error, onRetry, onNew, onOpen, onDelete }) {
  return (
    <div className="page">
      <header className="page-head">
        <div>
          <h1>Your trips</h1>
          <p className="muted">Every itinerary you've generated is saved here.</p>
        </div>
        <button className="btn primary" onClick={onNew}>Plan a new trip</button>
      </header>

      {error && (
        <div className="alert error">
          Couldn't load your trips: {error}{' '}
          <button className="link inline" onClick={onRetry}>Try again</button>
        </div>
      )}

      {loading && trips.length === 0 && (
        <div className="trip-grid" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" />)}
        </div>
      )}

      {!loading && !error && trips.length === 0 && (
        <div className="empty">
          <h2>No trips yet</h2>
          <p>Enter a destination and what you like to do. Your first itinerary takes about 15 seconds.</p>
          <button className="btn primary" onClick={onNew}>Plan your first trip</button>
        </div>
      )}

      {trips.length > 0 && (
        <div className="trip-grid">
          {trips.map((t) => (
            <TripCard key={t.id} trip={t} onOpen={onOpen} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}