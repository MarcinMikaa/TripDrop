import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { exploreService } from '../services/ExploreService';
import useAuth from './useAuth';
import { toastError } from '../utils/swal';

export const usePublicationVotes = (updateItem) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pendingVotes, setPendingVotes] = useState(() => new Set());

  const toggleVote = async (trip) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: location.pathname + location.search } });
      return;
    }
    if (pendingVotes.has(trip.id)) return;

    const nextVoted = !trip.hasVoted;

    updateItem(trip.id, { hasVoted: nextVoted, voteCount: trip.voteCount + (nextVoted ? 1 : -1) });
    setPendingVotes((prev) => new Set(prev).add(trip.id));

    try {
      const saved = nextVoted ? await exploreService.vote(trip.id) : await exploreService.unvote(trip.id);
      updateItem(trip.id, { hasVoted: saved.hasVoted, voteCount: saved.voteCount });
    } catch (err) {
      updateItem(trip.id, { hasVoted: trip.hasVoted, voteCount: trip.voteCount });
      toastError(err.message || 'Nie udało się zapisać głosu.');
    } finally {
      setPendingVotes((prev) => {
        const next = new Set(prev);
        next.delete(trip.id);
        return next;
      });
    }
  };

  return { pendingVotes, toggleVote };
};
