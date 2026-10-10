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
