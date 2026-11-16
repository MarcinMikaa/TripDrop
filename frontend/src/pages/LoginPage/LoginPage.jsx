import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import useAuth from '../../hooks/useAuth';
import styles from './LoginPage.module.scss';

const safeReturnPath = (from) =>
  typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/';

const getReturnNotice = (path) => {
  if (path.startsWith('/explore/')) {
    return 'Zaloguj się, żeby skopiować albo ocenić tę trasę. Potem wrócisz na jej stronę.';
  }
  if (path.startsWith('/explore')) return 'Zaloguj się, żeby głosować na trasy. Potem wrócisz do listy.';
  return null;
};

const AlertIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={styles.alertIcon}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4M12 16h.01" />
  </svg>
);

const LoginCollage = () => (
  <div className={styles.collage} aria-hidden="true">
    <div className={`${styles.piece} ${styles.cardA}`}>
      <div className={styles.cardAHead}>
        <div className={styles.tripText}>
          <span className={styles.tripName}>Sylwester w Pradze</span>
          <span className={styles.tripMeta}>3 dni, 10 miejsc</span>
        </div>
        <div className={styles.presence}>
          <div className={styles.people}>
            <span className={`${styles.avatarXs} ${styles.avatarMe}`}>M</span>
            <span className={`${styles.avatarXs} ${styles.avatarOla}`}>O</span>
          </div>
          <span className={styles.live}>
            <span className={styles.pulse} />
            na żywo
          </span>
        </div>
      </div>
      <div className={styles.miniMap}>
        <svg viewBox="0 0 480 240" preserveAspectRatio="xMidYMid slice">
          <rect width="480" height="240" className={styles.mapGround} />
          <path className={styles.mapPark} d="M30 40c30-24 90-20 110 10s-6 66-46 70-80-12-82-40 2-28 18-40z" />
          <path className={styles.mapPark} d="M360 160c30-18 84-8 96 22s-10 52-44 54-70-14-72-38 4-26 20-38z" />
          <path className={styles.mapWater} d="M300 -20 C270 50 320 100 280 150 S200 210 240 260" />
          <path className={styles.mapRoad} d="M-10 140 C90 130 170 160 250 140 S390 110 490 126" />
          <path className={styles.mapRoad} d="M120 -10 C130 70 110 140 130 250" />
          <path className={styles.mapStreet} d="M-10 76 C80 86 160 64 240 76 S380 96 490 72" />
          <path className={styles.mapStreet} d="M400 -10 C394 70 420 140 408 250" />
          <path className={`${styles.route} ${styles.dayOne}`} d="M70 190 C100 160 140 150 170 136 S210 100 214 76" />
          <path className={`${styles.route} ${styles.dayTwo}`} d="M214 76 C270 66 320 80 350 104 S390 150 396 180" />
          {[
            [70, 190, 1, styles.pinOne],
            [170, 136, 2, styles.pinOne],
            [214, 76, 3, styles.pinOne],
            [300, 78, 1, styles.pinTwo],
            [350, 104, 2, styles.pinTwo],
            [396, 180, 3, styles.pinTwo],
          ].map(([x, y, n, cls]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r="10" className={`${styles.mapPin} ${cls}`} />
              <text x={x} y={y} className={styles.mapPinNum}>
                {n}
              </text>
            </g>
          ))}
        </svg>
        <div className={styles.cursor}>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M4 3l7 18 2.5-7.5L21 11z" />
          </svg>
          <span>Ola</span>
        </div>
      </div>
    </div>

    <div className={`${styles.piece} ${styles.cardB}`}>
      <div className={styles.dayHead}>
        <span className={styles.dayBadge}>2</span>
        <div className={styles.dayText}>
          <span className={styles.dayDate}>czw, 31 gru</span>
          <span className={styles.dayCount}>3 miejsca</span>
        </div>
      </div>
      <ol className={styles.pinList}>
        <li className={styles.pinRow}>
          <span className={styles.pinNum}>1</span>Petřín
        </li>
        <li className={`${styles.pinRow} ${styles.pinRowActive}`}>
          <span className={styles.pinNum}>2</span>Mała Strana
          <span className={styles.caret} />
          <span className={styles.editTag}>Ola</span>
        </li>
        <li className={styles.pinRow}>
          <span className={styles.pinNum}>3</span>Plac Wacława
        </li>
      </ol>
    </div>

    <div className={`${styles.piece} ${styles.chip} ${styles.chipActivity}`}>
      <span className={`${styles.avatarXs} ${styles.avatarOla} ${styles.chipAvatar}`}>O</span>
      <span>
        <strong>Ola</strong> zmienia nazwę punktu w dniu 2
      </span>
    </div>

    <div className={`${styles.piece} ${styles.chip} ${styles.chipDark}`}>
      <FontAwesomeIcon icon="lock" className={styles.chipIcon} />
      Plan gotowy, eksport do Google Maps
    </div>
  </div>
);

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = safeReturnPath(location.state?.from);
  const justRegistered = location.state?.registered === true;
  const returnNotice = justRegistered ? null : getReturnNotice(returnTo);

  const [formData, setFormData] = useState(() => ({
    email: typeof location.state?.email === 'string' ? location.state.email : '',
    password: '',
  }));
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setError(null);
    setIsLoading(true);
    try {
      await login(formData.email.trim(), formData.password);
      navigate(returnTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Nie udało się zalogować. Spróbuj ponownie.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <section className={styles.visual}>
        <svg className={styles.contours} viewBox="0 0 900 760" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <path d="M640 140c0-70 60-120 134-118s126 54 120 124-62 116-136 112-118-40-118-118z" />
          <path d="M596 146c2-100 86-170 190-164s176 76 168 178-88 166-192 160-168-56-166-174z" />
          <path d="M552 152c4-128 112-220 246-210s226 100 214 230-114 214-248 206-216-72-212-226z" />
          <path d="M-60 700c70-110 210-150 330-110s190 150 140 250" />
          <path d="M-90 730c90-150 270-200 420-150s240 190 180 320" />
        </svg>

        <div className={styles.visualText}>
          <span className={styles.eyebrow}>Planujcie razem</span>
          <p className={styles.visualTitle}>
            Jedna mapa dla <em>całej ekipy</em>
          </p>
          <p className={styles.visualLead}>
            Wracasz do wypraw, które układacie wspólnie. Zmiany znajomych widzisz od razu, bez odświeżania strony.
          </p>
        </div>

        <LoginCollage />
      </section>

      <div className={styles.formSide}>
        <div className={styles.formInner}>
          {justRegistered && (
            <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
              <FontAwesomeIcon icon="check" className={styles.noticeIcon} />
              <span>Konto utworzone. Zaloguj się, żeby zacząć planować.</span>
            </div>
          )}

          {returnNotice && (
            <div className={styles.notice}>
              <FontAwesomeIcon icon="copy" className={styles.noticeIcon} />
              <span>{returnNotice}</span>
            </div>
          )}

          <div className={styles.heading}>
            <h1 className={styles.title}>Zaloguj się</h1>
            <p className={styles.subtitle}>
              Nie masz konta?{' '}
              <Link to="/register" state={{ from: location.state?.from }} className={styles.switchLink}>
                Załóż je
              </Link>
            </p>
          </div>

          {error && (
            <p className={styles.alert} role="alert">
              <AlertIcon />
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="login-email" className={styles.label}>
                E-mail
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                placeholder="ty@przyklad.pl"
                className={styles.input}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="login-password" className={styles.label}>
                Hasło
              </label>
              <div className={styles.inputGroup}>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  className={styles.groupInput}
                  required
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  aria-controls="login-password">
                  {showPassword ? 'Ukryj' : 'Pokaż'}
                </button>
              </div>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'Logowanie...' : 'Zaloguj się'}
              {!isLoading && (
                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className={styles.arrow}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
