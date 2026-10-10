import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: false,
});

export default api;

export const registerUser = async (data) => {
  try {
    const response = await api.post("/users/register", data);
    return response.data.user;
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

const userRequestConfig = () => ({
  headers: {
    Authorization: `Bearer ${sessionStorage.getItem("revesrv-token")}`,
  },
});

export const readUsers = async (page = 1, limit = 20) => {
  try {
    const response = await api.get("/users", {
      ...userRequestConfig(),
      params: { page, limit },
    });
    return response.data.users;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

export const readUserById = async (id) => {
  try {
    const response = await api.get(`/users/${id}`, userRequestConfig());
    return response.data.user;
  } catch (error) {
    console.error("Error fetching user:", error);
    throw error;
  }
};

export const createUser = async (data) => {
  try {
    const response = await api.post("/users", data, userRequestConfig());
    return response.data.user;
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

export const updateUser = async (id, data) => {
  try {
    const response = await api.patch(`/users/${id}`, data, userRequestConfig());
    return response.data.user;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

export const deleteUser = async (id) => {
  try {
    await api.delete(`/users/${id}`, userRequestConfig());
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

export const readFacilities = async (page = 1, limit = 20) => {
  const response = await api.get('/facilities', { params: { page, limit } });
  return response.data;
};

export const readFacilityById = async (id) => {
  const response = await api.get(`/facilities/${id}`);
  return response.data.facility;
};

const facilityRequestConfig = (data) => ({
  ...userRequestConfig(),
  headers: {
    ...userRequestConfig().headers,
    ...(data instanceof FormData ? { 'Content-Type': undefined } : {}),
  },
});

export const createFacility = async (data) => {
  const response = await api.post('/facilities', data, facilityRequestConfig(data));
  return response.data.facility;
};

export const updateFacility = async (id, data) => {
  const response = await api.patch(`/facilities/${id}`, data, facilityRequestConfig(data));
  return response.data.facility;
};

export const deleteFacility = async (id) => {
  await api.delete(`/facilities/${id}`, userRequestConfig());
};

export const facilityImageUrl = (url) => {
  if (!url) return '';
  try {
    const base = new URL(api.defaults.baseURL, window.location.origin);
    const image = new URL(url, base);
    return ['http:', 'https:'].includes(image.protocol) ? image.href : '';
  } catch { return ''; }
};

export const readFacilityReferences = async (kind, page = 1, limit = 20) => {
  const response = await api.get(`/facility-${kind}`, { params: { page, limit, sort_by: 'name' } });
  return response.data;
};

export const readAllFacilityReferences = async (kind) => {
  const records = [];
  let page = 1;
  let data;
  do {
    data = await readFacilityReferences(kind, page++, 100);
    records.push(...data[kind]);
  } while (data.has_next);
  return records;
};

export const saveFacilityReference = async (kind, name, id) => {
  const path = `/facility-${kind}${id ? `/${id}` : ''}`;
  const response = id
    ? await api.patch(path, { name }, userRequestConfig())
    : await api.post(path, { name }, userRequestConfig());
  return response.data;
};

export const deleteFacilityReference = async (kind, id) => {
  await api.delete(`/facility-${kind}/${id}`, userRequestConfig());
};

export const readReports = async (params = {}) => {
  const response = await api.get('/reports', { ...userRequestConfig(), params });
  return response.data;
};

export const readReportById = async (id) => {
  const response = await api.get(`/reports/${id}`, userRequestConfig());
  return response.data.report;
};

export const createReport = async (data) => {
  const response = await api.post('/reports', data, facilityRequestConfig(data));
  return response.data.report;
};

export const updateReport = async (id, data, { clearReason = false } = {}) => {
  const response = await api.patch(`/reports/${id}`, data, facilityRequestConfig(data));
  if (clearReason) {
    try {
      const cleared = await api.patch(`/reports/${id}`, { reason: null }, userRequestConfig());
      return cleared.data.report;
    } catch {
      throw new Error('Report and photo saved, but the reason could not be cleared. Reload the report and try clearing the reason again.');
    }
  }
  return response.data.report;
};

export const deleteReport = async (id) => {
  await api.delete(`/reports/${id}`, userRequestConfig());
};

export const reportImageUrl = facilityImageUrl;

export const readReportCategories = async (page = 1, limit = 20) => {
  const response = await api.get('/report-categories', {
    ...userRequestConfig(), params: { page, limit, sort_by: 'name' },
  });
  return response.data;
};

export const readAllReportCategories = async () => {
  const categories = [];
  let page = 1;
  let data;
  do {
    data = await readReportCategories(page++, 100);
    categories.push(...data.categories);
  } while (data.has_next);
  return categories;
};

export const readAllFacilities = async () => {
  const facilities = [];
  let page = 1;
  let data;
  do {
    data = await readFacilities(page++, 100);
    facilities.push(...data.facilities);
  } while (data.has_next);
  return facilities;
};

export const saveReportCategory = async (name, id) => {
  const path = `/report-categories${id ? `/${id}` : ''}`;
  const response = id
    ? await api.patch(path, { name }, userRequestConfig())
    : await api.post(path, { name }, userRequestConfig());
  return response.data;
};

export const deleteReportCategory = async (id) => {
  await api.delete(`/report-categories/${id}`, userRequestConfig());
};

export const readReservations = async (params = {}) => {
  const response = await api.get('/reservations', { ...userRequestConfig(), params });
  return response.data;
};

export const readReservationById = async (id) => {
  const response = await api.get(`/reservations/${id}`, userRequestConfig());
  return response.data.reservation;
};

export const createReservation = async (data) => {
  const response = await api.post('/reservations', data, userRequestConfig());
  return response.data.reservation;
};

export const updateReservation = async (id, data) => {
  const response = await api.patch(`/reservations/${id}`, data, userRequestConfig());
  return response.data.reservation;
};

export const deleteReservation = async (id) => {
  await api.delete(`/reservations/${id}`, userRequestConfig());
};

export const readAllUsers = async () => {
  const users = [];
  let page = 1;
  let batch;
  do {
    batch = await readUsers(page++, 100);
    users.push(...batch);
  } while (batch.length === 100);
  return users;
};
