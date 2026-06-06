import axios from 'axios'
import { getVisitorId } from './visitor'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

api.interceptors.request.use((config) => {
  config.headers['X-Visitor-ID'] = getVisitorId()
  return config
})

export function getActivities(params) {
  return api.get('/activities', { params })
}

export function getActivity(id) {
  return api.get(`/activities/${id}`)
}

export function submitFeedback(data) {
  return api.post('/feedbacks', data)
}

export function trackEvent(eventType, activityId = null) {
  return api.post('/analytics/track', {
    event_type: eventType,
    activity_id: activityId,
    visitor_id: getVisitorId(),
  })
}

export function getMessageWords() {
  return api.get('/message-words')
}

export function getReactions(activityId) {
  return api.get(`/activities/${activityId}/reactions`)
}

export function toggleReaction(activityId, emoji) {
  return api.post(`/activities/${activityId}/reactions`, { emoji })
}

export function getCommunityMessages(activityId, sort = 'time') {
  return api.get(`/activities/${activityId}/messages`, { params: { sort } })
}

export function postCommunityMessage(activityId, data) {
  return api.post(`/activities/${activityId}/messages`, data)
}

export function toggleLike(messageId) {
  return api.post(`/messages/${messageId}/like`)
}
