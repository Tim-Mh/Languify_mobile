import api from './client'

export function league() {
  return api.get('/league').then((data) => data.league)
}
