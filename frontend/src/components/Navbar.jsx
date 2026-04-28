import { NavLink } from 'react-router-dom';
import styles from './Navbar.module.scss';

const NAV_ITEMS = [
  { to: '/',        label: 'Start'      },
  { to: '/trips',   label: 'Wycieczki'  },
  { to: '/planner', label: 'Planer'     },
];

export default function Navbar() {
  return (
    <header className={styles.header}>
      <nav className={styles.nav}>
        <NavLink to="/" className={styles.logo}>
          TripDrop
        </NavLink>

        <ul className={styles.links}>
          {NAV_ITEMS.map(({ to, label }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `${styles.link} ${isActive ? styles.active : ''}`
                }
              >
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
