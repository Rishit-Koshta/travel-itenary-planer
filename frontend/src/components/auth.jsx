import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { BRAND } from '../lib';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');
    try {
      if (isSignUp) {
        const { data, error: err } = await supabase.auth.signUp({ email, password });
        if (err) throw err;
        if (!data.session) setNotice('Check your inbox and confirm your email, then sign in.');
      } else {
        const { error: err } = await supabase.auth.signInWithPassword({ email, password });
        if (err) throw err;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <section className="auth-art">
        <div className="brand">{BRAND}</div>
        <div>
          <h1>Tell us where. Get the whole trip, day by day.</h1>
          <p>
            Pick a destination, a budget and what you enjoy. Waypoint writes the itinerary,
            and you can edit any day or ask for a new one.
          </p>
        </div>
      </section>

      <section className="auth-form">
        <form onSubmit={submit}>
          <h2>{isSignUp ? 'Create your account' : 'Welcome back'}</h2>
          {error && <div className="alert error">{error}</div>}
          {notice && <div className="alert ok">{notice}</div>}

          <label className="field">
            <span>Email</span>
            <input
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn primary block" disabled={loading}>
            {loading ? 'Please wait…' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          <button
            type="button"
            className="link"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError('');
              setNotice('');
            }}
          >
            {isSignUp ? 'I already have an account' : 'Create a new account'}
          </button>
        </form>
      </section>
    </div>
  );
}