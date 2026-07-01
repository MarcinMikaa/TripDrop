import { useRef, useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useAuth from '../hooks/useAuth';
import styles from './Navbar.module.scss';

export default function Navbar() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const displayName = user?.username ?? 'Użytkownik';

  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <NavLink to="/" className={styles.logo}>
          TripDrop
        </NavLink>

        <ul className={styles.links}>
          <li>
            <NavLink to="/" end className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
              Start
            </NavLink>
          </li>
          {isAuthenticated && (
            <>
              <li>
                <NavLink to="/trips" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
                  Wycieczki
                </NavLink>
              </li>
              <li>
                <NavLink to="/planner" className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}>
                  Planer
                </NavLink>
              </li>
            </>
          )}
        </ul>

        <div className={styles.auth}>
          {isAuthenticated ? (
            <>
              <NavLink
                to="/friends"
                className={({ isActive }) => `${styles.iconLink} ${isActive ? styles.active : ''}`}
                aria-label="Znajomi">
                <FontAwesomeIcon icon="users" />
              </NavLink>

              <div className={styles.userMenu} ref={dropdownRef}>
                <button className={styles.userButton} onClick={() => setIsOpen(!isOpen)}>
                  <div className={styles.avatar}>{displayName[0].toUpperCase()}</div>
                  <span className={styles.username}>{displayName}</span>
                  <FontAwesomeIcon
                    icon="chevron-down"
                    className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}
                  />
                </button>

                {isOpen && (
                  <ul className={styles.dropdown}>
                    <li className={`${styles.dropdownItem} ${styles.logout}`} onClick={handleLogout}>
                      Wyloguj się
                    </li>
                  </ul>
                )}
              </div>
            </>
          ) : (
            <ul className={styles.authLinks}>
              <li>
                <NavLink to="/login" className={styles.link}>
                  Logowanie
                </NavLink>
              </li>
              <li>
                <NavLink to="/register" className={styles.link}>
                  Rejestracja
                </NavLink>
              </li>
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}
