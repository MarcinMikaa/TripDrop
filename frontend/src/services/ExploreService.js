import apiClient, { toApiError } from './apiClient';

export const exploreService = {
  getTrips: async ({ search, tags, minDays, maxDays, sort, skip = 0, take = 24 } = {}, { signal } = {}) => {
    try {
      const res = await apiClient.get('/explore/trips', {
        params: {
          search: search || undefined,
          tags: tags?.length ? tags.join(',') : undefined,
          minDays,
          maxDays,
          sort: sort || undefined,
          skip,
          take,
        },
        signal,
      });
      return res.data;
    } catch (err) {
      throw toApiError(err, 'Nie udało się pobrać tras.');
    }
  },

  getTrip: async (id, { signal } = {}) => {
    try {
      const res = await apiClient.get(`/explore/trips/${id}`, { signal });
      return res.data;
    } catch (err) {
      throw toApiError(err, 'Nie udało się pobrać trasy.');
    }
  },

  copyTrip: async (id, { name, startDate }) => {
    try {
      const res = await apiClient.post(`/explore/trips/${id}/copy`, { name, startDate });
      return res.data;
    } catch (err) {
      throw toApiError(err, 'Nie udało się skopiować trasy.');
    }
  },
};
