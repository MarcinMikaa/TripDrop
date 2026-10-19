import apiClient, { toApiError } from './apiClient';

export const publicationService = {
  getForTrip: async (tripId) => {
    try {
      const res = await apiClient.get(`/trips/${tripId}/publication`);
      return res.status === 204 ? null : res.data;
    } catch (err) {
      throw toApiError(err, 'Nie udało się pobrać publikacji.');
    }
  },

  publish: async (tripId, data) => {
    try {
      const res = await apiClient.put(`/trips/${tripId}/publication`, data);
      return res.data;
    } catch (err) {
      throw toApiError(err, 'Nie udało się opublikować wycieczki.');
    }
  },
};
