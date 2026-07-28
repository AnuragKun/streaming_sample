import axios from 'axios';

// Create a reusable axios instance with the API base URL.
// In development, Vite's proxy forwards /api to localhost:8000.
// In production, this would point to your actual API domain.
const api = axios.create({
  baseURL: '/api/v1',
});

/**
 * Fetch all videos from the backend.
 * GET /api/v1/videos/
 * @returns {Promise<Array>} Array of video objects
 */
export const getVideos = async () => {
  const response = await api.get('/videos/');
  return response.data;
};

/**
 * Fetch a single video by ID.
 * GET /api/v1/videos/{id}
 * @param {string} id - The video UUID
 * @returns {Promise<Object>} Video object
 */
export const getVideo = async (id) => {
  const response = await api.get(`/videos/${id}`);
  return response.data;
};

/**
 * Upload a new video with a title and file.
 * POST /api/v1/videos/upload
 *
 * Uses FormData because we're sending both text (title) and binary (file).
 * The Content-Type header is automatically set to multipart/form-data by axios
 * when it detects a FormData body.
 *
 * @param {string} title - Video title
 * @param {File} file - The video file from an <input type="file">
 * @returns {Promise<Object>} Created video object (status=PENDING)
 */
export const uploadVideo = async (title, file) => {
  const formData = new FormData();
  formData.append('title', title);
  formData.append('file', file);

  const response = await api.post('/videos/upload', formData);
  return response.data;
};

/**
 * Rename a video.
 * PATCH /api/v1/videos/{id}
 * @param {string} id - The video UUID
 * @param {string} title - The new title
 * @returns {Promise<Object>} Updated video object
 */
export const renameVideo = async (id, title) => {
  const response = await api.patch(`/videos/${id}`, { title });
  return response.data;
};

/**
 * Delete a video and its R2 assets.
 * DELETE /api/v1/videos/{id}
 * @param {string} id - The video UUID
 * @returns {Promise<void>}
 */
export const deleteVideo = async (id) => {
  await api.delete(`/videos/${id}`);
};

export default api;
