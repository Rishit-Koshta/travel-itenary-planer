import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import { getUserTrips, deleteTrip, errorMessage } from './api';
import Auth from './components/auth';
import Sidebar from './components/sidebar';
import Dashboard from './components/dashboard';
import TripBuilder from './components/tripBuilder';
import ItineraryView from './components/itineraryView';

function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(false);

  const [trips, setTrips] = useState([]);
  const [tripsLoading, setTripsLoading] = useState(true);
  const [tripsError, setTripsError] = useState('');

  const [view, setView] = useState('dashboard'); // dashboard | builder | trip
  const [activeId, setActiveId] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = useCallback((message, kind = 'ok') => {
    setToast({ message, kind, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (!s) {
        setTrips([]);
        setView('dashboard');
        setActiveId(null);
        setTripsLoading(true);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadTrips = useCallback(async () => {
    setTripsLoading(true);
    setTripsError('');
    try {
      setTrips(await getUserTrips());
    } catch (e) {
      setTripsError(errorMessage(e));
    } finally {
      setTripsLoading(false);
    }
  }, []);

  const userId = session?.user?.id;
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    getUserTrips()
      .then((data) => !cancelled && setTrips(data))
      .catch((e) => !cancelled && setTripsError(errorMessage(e)))
      .finally(() => !cancelled && setTripsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const openTrip = (trip) => {
    setActiveId(trip.id);
    setView('trip');
  };

  const upsertTrip = (row) => {
    setTrips((prev) => {
      const exists = prev.some((t) => t.id === row.id);
      return exists ? prev.map((t) => (t.id === row.id ? row : t)) : [row, ...prev];
    });
  };

  const removeTrip = async (trip) => {
    if (!window.confirm(`Delete your trip to ${trip.destination}? This can't be undone.`)) return;
    try {
      await deleteTrip(trip.id);
      setTrips((prev) => prev.filter((t) => t.id !== trip.id));
      if (activeId === trip.id) {
        setActiveId(null);
        setView('dashboard');
      }
      notify('Trip deleted');
    } catch (e) {
      notify(errorMessage(e), 'error');
    }
  };

  const handleCreated = (row) => {
    upsertTrip(row);
    openTrip(row);
  };

  if (!authReady) return <div className="boot" aria-busy="true" />;
  if (!session) return <Auth />;

  const activeTrip = trips.find((t) => t.id === activeId);

  return (
    <div className="app">
      <Sidebar
        email={session.user.email}
        trips={trips}
        view={view}
        activeId={activeId}
        onHome={() => setView('dashboard')}
        onNew={() => setView('builder')}
        onOpen={openTrip}
        onSignOut={() => supabase.auth.signOut()}
      />
      <main className="main">
        {view === 'dashboard' && (
          <Dashboard
            trips={trips}
            loading={tripsLoading}
            error={tripsError}
            onRetry={loadTrips}
            onNew={() => setView('builder')}
            onOpen={openTrip}
            onDelete={removeTrip}
          />
        )}
        {view === 'builder' && (
          <TripBuilder
            onCancel={() => setView('dashboard')}
            onCreated={handleCreated}
            notify={notify}
          />
        )}
        {view === 'trip' && activeTrip && (
          <ItineraryView
            key={activeTrip.id}
            trip={activeTrip}
            onSaved={upsertTrip}
            onDelete={() => removeTrip(activeTrip)}
            onBack={() => setView('dashboard')}
            notify={notify}
          />
        )}
      </main>
      {toast && (
        <div key={toast.id} className={`toast ${toast.kind}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;