import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase, setSupabaseAuth } from '../services/supabaseClient';

const CURSOR_THROTTLE_MS = 80;

export const useTripPresence = (tripId, currentUser) => {
  const [present, setPresent] = useState([]);
  const [cursors, setCursors] = useState({});

  const channelRef = useRef(null);
  const lastSentRef = useRef(0);
  const lastPosRef = useRef({ lat: null, lng: null });

  useEffect(() => {
    if (!tripId || !currentUser?.id) return;

    const token = localStorage.getItem('supabase_token');
    if (token) setSupabaseAuth(token);

    const channel = supabase.channel(`collab:trip:${tripId}`, {
      config: {
        presence: { key: currentUser.id },
        broadcast: { self: false },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const list = Object.entries(state)
          .filter(([key]) => key !== currentUser.id)
          .map(([key, metas]) => ({
            userId: key,
            username: metas[metas.length - 1]?.username,
          }));
        setPresent(list);

        const alive = new Set(list.map((p) => p.userId));
        setCursors((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => alive.has(id))));
      })
      .on('broadcast', { event: 'cursor' }, ({ payload }) => {
        if (!payload?.userId || payload.userId === currentUser.id) return;
        setCursors((prev) => ({
          ...prev,
          [payload.userId]: { username: payload.username, lat: payload.lat, lng: payload.lng },
        }));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username: currentUser.username });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [tripId, currentUser?.id, currentUser?.username]);

  const updateCursor = useCallback(
    (lat, lng) => {
      const now = Date.now();
      if (now - lastSentRef.current < CURSOR_THROTTLE_MS) return;

      const prev = lastPosRef.current;
      if (prev.lat !== null && Math.abs(lat - prev.lat) < 0.00005 && Math.abs(lng - prev.lng) < 0.00005) return;

      lastSentRef.current = now;
      lastPosRef.current = { lat, lng };

      channelRef.current?.send({
        type: 'broadcast',
        event: 'cursor',
        payload: { userId: currentUser?.id, username: currentUser?.username, lat, lng },
      });
    },
    [currentUser?.id, currentUser?.username],
  );

  const clearCursor = useCallback(() => {
    console.log('CLEAR CURSOR');
    lastPosRef.current = { lat: null, lng: null };
    lastSentRef.current = 0;

    channelRef.current?.send({
      type: 'broadcast',
      event: 'cursor',
      payload: { userId: currentUser?.id, username: currentUser?.username, lat: null, lng: null },
    });
  }, [currentUser?.id, currentUser?.username]);

  const others = Object.entries(cursors).map(([userId, c]) => ({ userId, ...c }));

  return { present, others, updateCursor, clearCursor };
};
