/**
 * Converter API service (TRD §10.7, §10.8).
 * All conversion requests are session-scoped so guest jobs remain pollable
 * without an account.
 */

const API_BASE = '/api';

export class ConverterApiError extends Error {
  constructor(message, status, code, details) {
    super(message);
    this.name = 'ConverterApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

async function request(endpoint, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${endpoint}`, {
      credentials: 'include',
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
  } catch {
    throw new ConverterApiError('Could not reach the conversion server.', 0, 'NETWORK_ERROR');
  }

  const data = await parseBody(response);

  if (!response.ok) {
    throw new ConverterApiError(
      data?.message || `Request failed with status ${response.status}`,
      response.status,
      data?.error,
      data?.details,
    );
  }

  return data;
}

export function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE}/converter/upload`);
    xhr.withCredentials = true;
    xhr.responseType = 'text';

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onerror = () => reject(new ConverterApiError('Upload failed. Check your connection.', 0, 'UPLOAD_FAILED'));
    xhr.onload = () => {
      let data = null;
      try {
        data = xhr.responseText ? JSON.parse(xhr.responseText) : null;
      } catch {
        data = { message: xhr.responseText };
      }

      if (xhr.status >= 200 && xhr.status < 300 && data?.file) {
        resolve(data.file);
        return;
      }

      reject(
        new ConverterApiError(
          data?.message || 'The file could not be uploaded.',
          xhr.status,
          data?.error,
        ),
      );
    };

    const body = new FormData();
    body.append('file', file);
    xhr.send(body);
  });
}

export function discardUpload(tempId) {
  return request('/converter/discard', {
    method: 'POST',
    body: JSON.stringify({ tempId }),
  });
}

export function inspectWorkbook(tempId, originalName) {
  return request('/converter/inspect', {
    method: 'POST',
    body: JSON.stringify({ tempId, originalName }),
  });
}

export function createJob(payload) {
  return request('/converter/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function retryJob(jobId, overrides = []) {
  return request(`/converter/jobs/${jobId}/retry`, {
    method: 'POST',
    body: JSON.stringify({ overrides }),
  });
}

export function getJob(jobId) {
  return request(`/jobs/status/${jobId}`, { method: 'GET' });
}

export function cancelJob(jobId) {
  return request(`/jobs/cancel/${jobId}`, { method: 'POST' });
}

function filenameFromDisposition(disposition, fallback) {
  if (!disposition) return fallback;
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) return decodeURIComponent(utf8Match[1]);
  const match = disposition.match(/filename="?([^";]+)"?/i);
  return match ? match[1] : fallback;
}

export async function fetchJobOutput(jobId) {
  let response;
  try {
    response = await fetch(`${API_BASE}/jobs/download/${jobId}`, {
      credentials: 'include',
    });
  } catch {
    throw new ConverterApiError('Could not download the converted output.', 0, 'NETWORK_ERROR');
  }

  if (!response.ok) {
    const data = await parseBody(response);
    throw new ConverterApiError(
      data?.message || 'The converted output is not available.',
      response.status,
      data?.error,
    );
  }

  const blob = await response.blob();
  const filename = filenameFromDisposition(
    response.headers.get('Content-Disposition'),
    `converted-${jobId}`,
  );

  return { blob, filename };
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}