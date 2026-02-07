const API_BASE_URL = 'https://trm-referral-backend.onrender.com/api'

export const api = {
  async get(endpoint: string) {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
      },
    })
    return response.json()
  },

  async post(endpoint: string, data: unknown) {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: JSON.stringify(data),
    })
    return response.json()
  },

  async put(endpoint: string, data?: unknown) {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  },

  async delete(endpoint: string, data?: unknown) {
    const token = localStorage.getItem('token')
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
      },
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.json()
  },
}
