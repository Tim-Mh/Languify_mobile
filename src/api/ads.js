import api, { reachableUrl } from './client'

/**
 * The ads to show, grouped by placement:
 *
 *   { placements: { homeSidebar: [], lessonComplete: [],
 *     mobileLessonComplete: [] }, settings: { interstitialSeconds, sidebarSeconds } }
 *
 * Each ad is `{ id, url, productName, targetUrl, alt }`, and each list is
 * already in play order: products alternate and the order is reshuffled on
 * every request. Every placement key is always present, empty included, so a
 * caller never has to guard for a missing one. Admins get empty lists.
 *
 * The app uses `mobileLessonComplete`, falling back to `lessonComplete`. The
 * home sidebar is a website layout that has no equivalent on a phone.
 *
 * Image URLs are rewritten on the way in. The backend builds them from
 * `APP_URL`, and a development `APP_URL` of `http://localhost` names the phone
 * itself, so the creative silently fails to load and the interstitial shows its
 * broken-image fallback for ten seconds. Same rewrite the API base URL already
 * gets, for the same reason.
 */
export function ads() {
  return api.get('/ads').then((data) => ({
    ...data,
    placements: Object.fromEntries(
      Object.entries(data?.placements ?? {}).map(([placement, creatives]) => [
        placement,
        (creatives ?? []).map((creative) => ({ ...creative, url: reachableUrl(creative.url) })),
      ]),
    ),
  }))
}

/**
 * View and click pings. Fire-and-forget: an ad never waits on them and a
 * failure is never shown to the learner.
 */
export function recordAdView(id) {
  api.post(`/ads/${id}/view`).catch(() => {})
}

export function recordAdClick(id) {
  api.post(`/ads/${id}/click`).catch(() => {})
}
