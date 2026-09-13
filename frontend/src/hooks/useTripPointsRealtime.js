import { useEffect, useRef } from 'react';
import { supabase, setSupabaseAuth } from '../services/supabaseClient';

export const useTripPointsRealtime = (tripId, onChange) => {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!tripId) return;

    const token = localStorage.getItem('supabase_token');
    if (token) setSupabaseAuth(token);

    const channel = supabase
      .channel(`trip:${tripId}`)
      .on('broadcast', { event: 'points_changed' }, () => {
        onChangeRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tripId]);
};
