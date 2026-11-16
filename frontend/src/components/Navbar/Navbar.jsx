import { useRef, useState, useEffect, useCallback } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { friendshipService } from '../../services/FriendshipService';
import { useFriendRequestsRealtime } from '../../hooks/useFriendRequestsRealtime';
import useAuth from '../../hooks/useAuth';
import styles from './Navbar.module.scss';

const MAX_BADGE_COUNT = 99;
const TRIP_SECTION_PATHS = ['/trips', '/planner'];
const WIDE_PATHS = ['/planner/', '/explore/'];
const DARK_PATHS = ['/explore'];
const FRIEND_REQUESTS_EVENT = 'tripdrop:friend-requests-changed';

const isInTripSection = (pathname) =>
  TRIP_SECTION_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

const linkClass = (sectionClass, isActive) => `${styles.link} ${sectionClass} ${isActive ? styles.active : ''}`;

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const menuRef = useRef(null);
  const triggerRef = useRef(null);
  const firstItemRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const closeMenu = useCallback((restoreFocus = false) => {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handlePointerDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      if (triggerRef.current?.contains(e.target)) return;
      closeMenu();
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeMenu(true);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    if (isOpen) firstItemRef.current?.focus();
  }, [isOpen]);

  const refetchPending = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await friendshipService.getPending();
      setPendingCount(data.length);
    } catch {
      return;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    refetchPending();
  }, [refetchPending]);

  useEffect(() => {
    window.addEventListener(FRIEND_REQUESTS_EVENT, refetchPending);
    return () => window.removeEventListener(FRIEND_REQUESTS_EVENT, refetchPending);
  }, [refetchPending]);

  const handleRealtimeChange = useCallback(() => {
    window.dispatchEvent(new Event(FRIEND_REQUESTS_EVENT));
  }, []);

  useFriendRequestsRealtime(user?.id, handleRealtimeChange);

  const handleLogout = () => {
    closeMenu();
    logout();
    navigate('/');
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const displayName = user?.username?.trim() || 'Użytkownik';
  const avatarInitial = displayName.charAt(0).toUpperCase();
  const visibleCount = isAuthenticated ? pendingCount : 0;
  const badgeLabel = visibleCount > MAX_BADGE_COUNT ? `${MAX_BADGE_COUNT}+` : String(visibleCount);
  const tripsActive = isInTripSection(pathname);
  const isDark = DARK_PATHS.includes(pathname);
  const isWide = WIDE_PATHS.some((path) => pathname.startsWith(path));

  const headerClass = [styles.header, isDark && styles.headerDark, isWide && styles.headerWide]
    .filter(Boolean)
    .join(' ');

  return (
    <header className={headerClass}>
      <nav className={styles.nav} aria-label="Nawigacja główna">
        <NavLink to="/" className={styles.logo} aria-label="TripDrop, strona główna">
          <svg className={styles.logoMark} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2c-4.4 0-8 3.4-8 7.8C4 15.6 12 22 12 22s8-6.4 8-12.2C20 5.4 16.4 2 12 2z" />
            <circle cx="12" cy="9.6" r="3" />
          </svg>
          <span className={styles.logoText}>TripDrop</span>
        </NavLink>

        <ul className={styles.links}>
          <li>
            <NavLink to="/" end className={({ isActive }) => linkClass(styles.sectionStart, isActive)}>
              Start
            </NavLink>
          </li>
          {isAuthenticated && (
            <li>
              <NavLink to="/trips" className={() => linkClass(styles.sectionTrips, tripsActive)}>
                Wycieczki
              </NavLink>
            </li>
          )}
          <li>
            <NavLink to="/explore" className={({ isActive }) => linkClass(styles.sectionExplore, isActive)}>
              Odkrywaj
            </NavLink>
          </li>
        </ul>

        <div className={styles.actions}>
          {isAuthenticated ? (
            <>
              <NavLink
                to="/friends"
                className={({ isActive }) => `${styles.iconLink} ${isActive ? styles.iconLinkActive : ''}`}
                aria-label={visibleCount > 0 ? `Znajomi, oczekujące zaproszenia: ${visibleCount}` : 'Znajomi'}>
                <FontAwesomeIcon icon="users" />
                {visibleCount > 0 && (
                  <span className={styles.badge} aria-hidden="true">
                    {badgeLabel}
                  </span>
                )}
              </NavLink>

              <div className={styles.userMenu}>
                <button
                  ref={triggerRef}
                  type="button"
                  className={styles.userButton}
                  aria-haspopup="menu"
                  aria-expanded={isOpen}
                  onClick={() => setIsOpen((v) => !v)}
                  onKeyDown={handleTriggerKeyDown}>
                  <span className={styles.avatar} aria-hidden="true">
                    {avatarInitial}
                  </span>
                  <span className={styles.username}>{displayName}</span>
                  <FontAwesomeIcon
                    icon="chevron-down"
                    className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}
                  />
                </button>

                {isOpen && (
                  <div ref={menuRef} role="menu" className={styles.dropdown}>
                    <button
                      ref={firstItemRef}
                      type="button"
                      role="menuitem"
                      className={`${styles.dropdownItem} ${styles.logout}`}
                      onClick={handleLogout}>
                      <FontAwesomeIcon icon="right-from-bracket" aria-hidden="true" />
                      <span>Wyloguj się</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <NavLink to="/login" className={styles.ghostLink}>
                Logowanie
              </NavLink>
              <NavLink to="/register" className={styles.primaryLink}>
                Załóż konto
              </NavLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
