import StateView from './StateView'
import { useTranslate } from '../lib/i18n'
import { useConnection } from '../lib/useConnection'
import { useSlowRequest } from '../lib/useSlowRequest'

/**
 * Renders the right state for a TanStack query, so every screen handles loading,
 * slowness, offline, failure and emptiness the same way.
 *
 * Order matters and is not arbitrary:
 *
 * 1. **Offline first.** "Check your connection" is actionable; "something went
 *    wrong" is not. If the device has no internet, that is the real story
 *    regardless of what the query reports.
 * 2. **Loading**, with a skeleton if one was given.
 * 3. **Slow**, only while still loading, so a long wait explains itself.
 * 4. **Error**, with a retry.
 * 5. **Empty**, which is a success with nothing in it, not a failure.
 *
 * Only the *first* load shows a skeleton (`isPending`, not `isFetching`), so a
 * background refresh never blanks content already on screen.
 *
 * **Pass `children` as a function whenever the content reads `query.data`.**
 * JSX children are built by the parent before this component decides what to
 * render, so `<QueryState>{data.items.map(...)}</QueryState>` throws on the very
 * first render, while data is still undefined. The function form is only called
 * once there is data:
 *
 *     <QueryState query={q}>{(data) => data.items.map(...)}</QueryState>
 */
export default function QueryState({
  query,
  skeleton = null,
  children,
  isEmpty,
  emptyTitle,
  emptyBody,
  emptyIcon = 'empty',
  errorTitle,
  errorBody,
  inline = false,
}) {
  const t = useTranslate()
  const { online } = useConnection()
  // isPending covers the first load; isFetching would also be true for a
  // background refresh, which must not replace content already on screen.
  const slow = useSlowRequest(query.isPending)

  if (!online) {
    return (
      <StateView
        icon="offline"
        tone="warning"
        title={t('m_offline_title')}
        body={t('m_offline_body')}
        actionLabel={t('m_try_again')}
        onAction={() => query.refetch?.()}
        inline={inline}
      />
    )
  }

  if (query.isPending) {
    if (slow) {
      return (
        <StateView
          icon="slow"
          tone="warning"
          title={t('m_slow_title')}
          body={t('m_slow_body')}
          actionLabel={t('m_try_again')}
          onAction={() => query.refetch?.()}
          inline={inline}
        />
      )
    }

    return skeleton
  }

  if (query.isError) {
    return (
      <StateView
        icon="error"
        tone="danger"
        title={errorTitle ?? t('m_error_title')}
        // The translated body wins over `query.error.message`, which used to
        // come first. That message is written by the server and is always in
        // English — "Request failed (500)", "Unauthenticated." — so a learner
        // reading the app in Arabic or Turkish met a wall of English at the one
        // moment they most needed to understand what to do. A failed GET has no
        // message worth surfacing anyway; a mutation's error still reaches the
        // learner through its own toast.
        body={errorBody ?? t('m_error_body')}
        actionLabel={t('m_try_again')}
        onAction={() => query.refetch?.()}
        busy={query.isFetching}
        inline={inline}
      />
    )
  }

  if (isEmpty?.(query.data)) {
    return (
      <StateView
        icon={emptyIcon}
        title={emptyTitle ?? t('m_empty_title')}
        body={emptyBody}
        inline={inline}
      />
    )
  }

  return typeof children === 'function' ? children(query.data) : children
}
