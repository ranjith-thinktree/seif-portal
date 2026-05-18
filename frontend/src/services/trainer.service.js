import apiClient from "../api/client";

/**
 * Trainer Service
 * API calls for trainer management using axios client
 */

const buildTrainerFormData = (trainerData = {}) => {
  const formData = new FormData();

  Object.entries(trainerData).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    if (["resume", "qualificationCertificate", "idProof"].includes(key)) {
      if (value instanceof File) {
        formData.append(key, value);
      }
      return;
    }

    formData.append(key, value);
  });

  return formData;
};

// Get all trainers
export const getTrainers = async (params = {}) => {
  try {
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(
        ([, v]) => v !== "" && v !== null && v !== undefined,
      ),
    );
    const response = await apiClient.get("/trainers", { params: cleanParams });
    return response.data;
  } catch (error) {
    console.error("Error fetching trainers:", error);
    throw error;
  }
};

// Get single trainer
export const getTrainerById = async (trainerId) => {
  try {
    const response = await apiClient.get(`/trainers/${trainerId}`);
    return response.data;
  } catch (error) {
    console.error("Error fetching trainer:", error);
    throw error;
  }
};

// Create trainer
export const createTrainer = async (trainerData) => {
  try {
    const response = await apiClient.post(
      "/trainers",
      buildTrainerFormData(trainerData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error creating trainer:", error);
    throw error;
  }
};

// Update trainer
export const updateTrainer = async (trainerId, trainerData) => {
  try {
    const response = await apiClient.put(
      `/trainers/${trainerId}`,
      buildTrainerFormData(trainerData),
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Error updating trainer:", error);
    throw error;
  }
};

// Delete trainer
export const deleteTrainer = async (trainerId) => {
  try {
    const response = await apiClient.delete(`/trainers/${trainerId}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting trainer:", error);
    throw error;
  }
};

// Get filter options (partners and centers for dropdowns)
export const getTrainerFilterOptions = async () => {
  try {
    const response = await apiClient.get("/trainers/filter-options");
    return response.data;
  } catch (error) {
    console.error("Error fetching filter options:", error);
    throw error;
  }
};
