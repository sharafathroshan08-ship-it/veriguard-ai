import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

// --------------------------------------------------
// UPLOAD DOCUMENT
// --------------------------------------------------

export async function uploadDocument(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await api.post(
    "/api/documents/upload",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  return response.data;
}

// --------------------------------------------------
// VERIFY DOCUMENT
// --------------------------------------------------

export async function verifyDocument(documentId) {
  const response = await api.post(
    `/api/documents/${documentId}/verify`
  );

  return response.data;
}

// --------------------------------------------------
// OCR
// --------------------------------------------------

export async function runOCR(documentId) {
  const response = await api.post(
    `/api/documents/${documentId}/ocr`
  );

  return response.data;
}

// --------------------------------------------------
// VERIFICATION HISTORY
// --------------------------------------------------

export async function getVerificationHistory(
  limit = 20
) {
  const response = await api.get(
    `/api/verification-history?limit=${limit}`
  );

  return response.data;
}

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

export async function checkBackendHealth() {
  const response = await api.get("/health");

  return response.data;
}

export default api;