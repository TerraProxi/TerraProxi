import { NavLink } from 'react-router-dom'
import { useNotifications } from '../../contexts/NotificationsContext'

/** Cloche de l'en-tête : lien vers /notifications, compteur annoncé quand il change. */
export function NotificationBell() {
  const { unreadCount } = useNotifications()
  const label = unreadCount > 0 ? `${unreadCount} notification${unreadCount > 1 ? 's' : ''} non lue${unreadCount > 1 ? 's' : ''}` : ''

  return (
    <>
      <NavLink to="/notifications" className="tp-nav-link">
        <span aria-hidden="true">🔔</span>
        <span className="tp-nav-link__text">Notifications</span>
        {unreadCount > 0 && (
          <span className="tp-nav-badge tp-nav-badge--alert">
            {unreadCount}<span className="sr-only"> non lue(s)</span>
          </span>
        )}
      </NavLink>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{label}</span>
    </>
  )
}
