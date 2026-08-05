import api, { reachableUrl } from './client'

/**
 * The admin-managed creative pools, grouped by placement:
 *
 *   { placements: { homePrimary: [], homeSecondary: [], lessonComplete: [] },
 *     settings: { interstitialSeconds } }
 *
 * Each creative is `{ id, url, productName, targetUrl }` and arrives in the
 * order the admin put them in. Every placement key is always present, empty
 * included, so a caller never has to guard for a missing one.
 *
 * The app only uses `lessonComplete` — the two home slots are a web-sidebar
 * layout that has no equivalent on a phone.
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
