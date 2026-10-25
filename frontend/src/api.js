import axios from 'axios';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

const client = axios.create({ baseURL: API_URL });

// Send the Supabase access token so the backend knows who is asking.
client.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const generateTrip = (payload) =>
  client.post('/api/generate-trip', payload).then((r) => r.data);

export const getUserTrips = () => client.get('/api/trips').then((r) => r.data);

export const saveTrip = (id, itinerary) =>
  client.put(`/api/trips/${id}`, { itinerary }).then((r) => r.data);

export const regenerateDay = (id, day, instruction) =>
  client
    .post(`/api/trips/${id}/regenerate-day`, { day, instruction })
    .then((r) => r.data);

export const deleteTrip = (id) => client.delete(`/api/trips/${id}`).then((r) => r.data);

export const errorMessage = (e) =>
  e?.response?.data?.detail || e?.message || 'Something went wrong';