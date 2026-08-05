import api from './client'

export function myCourses() {
  return api.get('/courses/mine')
}

export function switchCourse(courseId) {
  return api.post('/courses/switch', { courseId })
}

/**
 * Removes the enrolment only. Lesson progress for that language pair is kept
 * server-side, so re-adding the same pair resumes instead of restarting.
 */
export function deleteCourse(courseId) {
  return api.delete(`/courses/${courseId}`)
}
