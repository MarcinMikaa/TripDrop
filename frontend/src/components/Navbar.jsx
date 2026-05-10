import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { authService } from '../services/AuthService';
import styles from './Navbar.module.scss';

const NAV_ITEMS = [
  { to: '/',        label: 'Start'      },
  { to: '/trips',   label: 'Wycieczki'  },
  { to: '/planner', label: 'Planer'     },
];

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const username = localStorage.getItem('username') || 'Użytkownik';
  const isAuthenticated = !!localStorage.getItem('jwt_token');

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    authService.logout();
    navigate('/');

    window.location.reload(); 
  };
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <NavLink to="/" className={styles.logo}>TripDrop</NavLink>

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
            <div className={styles.userMenu} ref={dropdownRef}>
              <button 
                className={styles.userButton} 
                onClick={() => setIsOpen(!isOpen)}
              >
                <div className={styles.avatar}>{username[0].toUpperCase()}</div>
                <span className={styles.username}>{username}</span>
                <span className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}>▾</span>
              </button>

              {isOpen && (
                <ul className={styles.dropdown}>
                  <li className={`${styles.dropdownItem} ${styles.logout}`} onClick={handleLogout}>Wyloguj się</li>
                </ul>
              )}
            </div>
          ) : (
            <ul className={styles.authLinks}>
              <li><NavLink to="/login" className={styles.link}>Logowanie</NavLink></li>
              <li><NavLink to="/register" className={styles.link}>Rejestracja</NavLink></li>
            </ul>
          )}
        </div>
      </nav>
    </header>
  );
}
