import { useEffect, useRef } from 'react';
import { supabase, setSupabaseAuth } from '../services/supabaseClient';

export const useFriendRequestsRealtime = (userId, onChange) => {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!userId) return;

    const token = localStorage.getItem('supabase_token');
    if (token) setSupabaseAuth(token);

    const channel = supabase
      .channel(`user:${userId}`)
      .on('broadcast', { event: 'friend_requests_changed' }, () => {
        onChangeRef.current();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
};
