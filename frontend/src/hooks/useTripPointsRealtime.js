import { useEffect, useRef } from 'react';
import { supabase, setSupabaseAuth } from '../services/supabaseClient';

export const useTripPointsRealtime = (tripId, onChange, onPlanLockChange) => {
  const onChangeRef = useRef(onChange);
  const onPlanLockChangeRef = useRef(onPlanLockChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    onPlanLockChangeRef.current = onPlanLockChange;
  }, [onPlanLockChange]);

  useEffect(() => {
    if (!tripId) return;

    const token = localStorage.getItem('supabase_token');
    if (token) setSupabaseAuth(token);

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on('broadcast', { event: 'points_changed' }, () => {
        onChangeRef.current?.();
      })
      .on('broadcast', { event: 'plan_lock_changed' }, ({ payload }) => {
        onPlanLockChangeRef.current?.(payload);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);
};
