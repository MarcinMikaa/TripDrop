import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { swalError } from '../../utils/swal';
import styles from './LoginPage.module.scss';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err) {
      await swalError('Błąd logowania', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.split}>
      <div className={styles.visual}>
        <svg
          className={styles.mapSvg}
          viewBox="0 0 500 560"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none">
          <path
            d="M 60 480 Q 140 420 130 340 T 240 250 T 200 150 Q 220 100 320 90 T 420 180"
            stroke="#c8a882"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 8"
            opacity="0.55"
          />
          <circle cx="90" cy="200" r="60" stroke="#5b8fa8" strokeWidth="1" fill="none" opacity="0.15" />
          <circle cx="380" cy="400" r="90" stroke="#c8a882" strokeWidth="1" fill="none" opacity="0.12" />
        </svg>

        <div className={styles.pin} style={{ top: '85.4%', left: '11%' }}>
          <div className={styles.pinGlow} style={{ background: '#c8a882' }} />
          <div className={styles.pinDot} style={{ background: '#c8a882' }} />
        </div>
        <div className={styles.pin} style={{ top: '59.8%', left: '25%' }}>
          <div className={styles.pinGlow} style={{ background: '#5b8fa8' }} />
          <div className={styles.pinDot} style={{ background: '#5b8fa8' }} />
        </div>
        <div className={styles.pin} style={{ top: '43.7%', left: '47%' }}>
          <div className={styles.pinGlow} style={{ background: '#c8a882' }} />
          <div className={styles.pinDot} style={{ background: '#c8a882' }} />
        </div>
        <div className={styles.pin} style={{ top: '15.2%', left: '63%' }}>
          <div className={styles.pinGlow} style={{ background: '#5b8fa8' }} />
          <div className={styles.pinDot} style={{ background: '#5b8fa8' }} />
        </div>
        <div className={styles.pin} style={{ top: '31.2%', left: '83%' }}>
          <div className={styles.pinGlow} style={{ background: '#c8a882' }} />
          <div className={styles.pinDot} style={{ background: '#c8a882' }} />
        </div>

        <div className={styles.visualContent}>
          <div className={styles.logo}>TripDrop</div>
          <div className={styles.quote}>
            Planujcie razem.
            <br />
            Podróżujcie razem.
          </div>
          <div className={styles.subQuote}>Zarządzaj wspólnymi wycieczkami ze znajomymi w jednym miejscu.</div>
        </div>

        <div className={styles.footerNote}>© 2026 TripDrop</div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formInner}>
          <h1 className={styles.title}>Witaj z powrotem</h1>
          <p className={styles.subtitle}>Zaloguj się, aby zobaczyć swoje wycieczki</p>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Hasło</label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                autoComplete="current-password"
                required
              />
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Nie masz konta? <span onClick={() => navigate('/register')}>Zarejestruj się</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
