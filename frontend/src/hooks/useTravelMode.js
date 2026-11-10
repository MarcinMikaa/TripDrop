import { useSyncExternalStore } from 'react';
import { DEFAULT_TRAVEL_MODE, TRAVEL_MODES } from '../utils/tripExport';

const STORAGE_KEY = 'tripdrop.travelMode';
const listeners = new Set();

const isValid = (mode) => TRAVEL_MODES.some((m) => m.key === mode);

const readStored = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isValid(stored) ? stored : DEFAULT_TRAVEL_MODE;
  } catch {
    return DEFAULT_TRAVEL_MODE;
  }
};

let current = readStored();

export const getTravelMode = () => current;

export const setTravelMode = (mode) => {
  if (!isValid(mode) || mode === current) return;
  current = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
  listeners.forEach((listener) => listener());
};

const subscribe = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const useTravelMode = () => [useSyncExternalStore(subscribe, getTravelMode), setTravelMode];
