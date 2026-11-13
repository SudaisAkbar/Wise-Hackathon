// Thin wrapper around the server API. Every call returns parsed JSON or throws
// an ApiError that carries the server's error code.

export class ApiError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(method, path, body) {
  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch {
    throw new ApiError(0, 'offline', 'The server cannot be reached.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    /* empty or non-JSON body */
  }
  if (!response.ok) {
    const { code = 'error', message = 'Something went wrong.', ...details } = data?.error ?? {};
    throw new ApiError(response.status, code, message, details);
  }
  return data;
}

export const api = {
  bootstrap: () => request('GET', '/bootstrap'),
  state: () => request('GET', '/state'),
  quote: (body) => request('POST', '/quotes', body),
  transfer: (id) => request('GET', `/transfers/${id}`),
  confirmTransfer: (id, pin) => request('POST', `/transfers/${id}/confirm`, { pin }),
  assistant: (body) => request('POST', '/assistant/message', body),
  addRecipient: (body) => request('POST', '/helper/recipients', body),
  setVoiceLimit: (voiceLimit) => request('PATCH', '/helper/settings', { voiceLimit }),
  setVoice: (body) => request('PATCH', '/voice', body),
  forgetVoice: () => request('DELETE', '/voice'),
  resetDemo: () => request('POST', '/demo/reset')
};
