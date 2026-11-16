import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { authService } from '../../services/AuthService';
import styles from './RegisterPage.module.scss';

const USERNAME_MIN = 3;
const USERNAME_MAX = 30;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CHECK_DEBOUNCE_MS = 400;
const USERNAME_HINT = `Litery bez polskich znaków, cyfry i _, od ${USERNAME_MIN} do ${USERNAME_MAX} znaków.`;
const PREVIEW_FALLBACK = 'twoja_nazwa';

const PASSWORD_RULES = [
  { id: 'length', label: 'Co najmniej 8 znaków', test: (value) => value.length >= 8 },
  { id: 'upper', label: 'Jedna wielka litera', test: (value) => /[A-Z]/.test(value) },
  { id: 'digit', label: 'Jedna cyfra', test: (value) => /[0-9]/.test(value) },
];

const validateEmail = (email) => (EMAIL_PATTERN.test(email.trim()) ? null : 'Podaj prawidłowy adres e-mail.');

const validateUsername = (username) => {
  if (username.length === 0) return 'Podaj nazwę użytkownika.';
  if (!USERNAME_PATTERN.test(username)) return 'Dozwolone są tylko litery bez polskich znaków, cyfry i _.';
  if (username.length < USERNAME_MIN) return `Za krótka, potrzeba co najmniej ${USERNAME_MIN} znaków.`;
  if (username.length > USERNAME_MAX) return `Za długa, maksymalnie ${USERNAME_MAX} znaków.`;
  return null;
};

const CheckIcon = () => <FontAwesomeIcon icon="check" className={styles.statusIcon} />;

const ProfilePreview = ({ username }) => {
  const name = username || PREVIEW_FALLBACK;
  const initial = name.charAt(0).toUpperCase();

  return (
    <aside className={styles.preview} aria-labelledby="register-preview-title">
      <svg className={styles.contours} viewBox="0 0 900 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <path d="M640 160c0-60 50-104 112-102s104 46 100 106-52 98-114 96-98-34-98-100z" />
        <path d="M600 164c2-86 74-148 160-142s148 66 140 152-76 140-162 134-140-48-138-144z" />
        <path d="M560 170c4-112 98-194 210-186s194 88 182 200-100 184-212 176-184-64-180-190z" />
        <path d="M-40 690c60-100 190-140 300-100s170 140 120 230" />
        <path d="M-70 720c80-140 250-190 390-140s220 180 160 300" />
      </svg>

      <div className={styles.previewInner}>
        <div className={styles.previewText}>
          <h2 id="register-preview-title" className={styles.previewTitle}>
            Tak zobaczą Cię znajomi
          </h2>
          <p className={styles.previewLead}>
            Nazwa użytkownika jest unikalna. Po niej ktoś znajdzie Cię w wyszukiwarce i doda do wspólnej wyprawy.
            E-maila nie widzi nikt poza Tobą.
          </p>
        </div>

        <div className={styles.searchMock} aria-hidden="true">
          <div className={styles.searchBar}>
            <FontAwesomeIcon icon="magnifying-glass" className={styles.searchIcon} />
            <span className={styles.searchValue}>@{name}</span>
            <span className={styles.blink} />
            <span className={styles.searchCrumb}>Znajomi &gt; Dodaj znajomego</span>
          </div>
          <div className={styles.searchResult}>
            <span className={styles.previewAvatar}>{initial}</span>
            <div className={styles.resultText}>
              <span className={styles.resultName}>@{name}</span>
              <span className={styles.resultMeta}>nowe konto</span>
            </div>
            <span className={styles.inviteMock}>
              <FontAwesomeIcon icon="user-plus" />
              Zaproś
            </span>
          </div>
        </div>

        <div className={styles.mapMock} aria-hidden="true">
          <svg viewBox="0 0 520 180" preserveAspectRatio="xMidYMid slice">
            <rect width="520" height="180" className={styles.mapGround} />
            <path className={styles.mapContour} d="M300 70c20-30 80-30 100 0s0 60-50 62-70-30-50-62z" />
            <path className={styles.mapContour} d="M276 64c30-46 116-46 146 2s-2 90-74 92-102-46-72-94z" />
            <path className={styles.mapRoad} d="M-10 130 C100 110 200 150 300 120 S450 80 530 90" />
            <path className={styles.mapRoute} d="M80 140 C130 120 170 100 220 96 S300 70 340 60" />
            <circle cx="80" cy="140" r="11" className={styles.mapPin} />
            <circle cx="220" cy="96" r="11" className={styles.mapPin} />
            <circle cx="340" cy="60" r="11" className={styles.mapPin} />
          </svg>
          <span className={styles.mapTag}>Twój kursor w planerze</span>
          <div className={styles.cursor}>
            <svg viewBox="0 0 24 24" width="22" height="22">
              <path d="M4 3l7 18 2.5-7.5L21 11z" />
            </svg>
            <span>{name}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

const RegisterPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [availability, setAvailability] = useState({ name: null, status: 'unknown' });
  const [serverError, setServerError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const emailError = validateEmail(formData.email);
  const usernameError = validateUsername(formData.username);
  const passwordChecks = PASSWORD_RULES.map((rule) => ({ ...rule, ok: rule.test(formData.password) }));
  const passwordOk = passwordChecks.every((rule) => rule.ok);

  useEffect(() => {
    if (usernameError) return undefined;

    const name = formData.username;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      authService
        .checkUsername(name, { signal: controller.signal })
        .then((available) => {
          let status = 'unknown';
          if (available === true) status = 'available';
          if (available === false) status = 'taken';
          setAvailability({ name, status });
        })
        .catch((err) => {
          if (err.name === 'AbortError') return;
          setAvailability({ name, status: 'unknown' });
        });
    }, CHECK_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [formData.username, usernameError]);

  let usernameStatus = 'checking';
  if (usernameError) usernameStatus = 'invalid';
  else if (availability.name === formData.username) usernameStatus = availability.status;

  const hasBadChars = formData.username.length > 0 && !USERNAME_PATTERN.test(formData.username);

  let usernameMessage = { tone: 'muted', text: USERNAME_HINT };
  if (usernameError && (touched.username || hasBadChars)) {
    usernameMessage = { tone: 'error', text: usernameError };
  } else if (usernameStatus === 'checking') {
    usernameMessage = { tone: 'muted', text: 'Sprawdzam, czy nazwa jest wolna...' };
  } else if (usernameStatus === 'available') {
    usernameMessage = { tone: 'ok', text: `@${formData.username} jest wolna.` };
  } else if (usernameStatus === 'taken') {
    usernameMessage = { tone: 'error', text: `@${formData.username} jest już zajęta.` };
  }

  const showEmailError = touched.email && emailError;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (serverError) setServerError(null);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setTouched({ email: true, username: true, password: true });

    const firstInvalid = [
      [emailError, 'register-email'],
      [usernameError || (usernameStatus === 'taken' ? 'taken' : null), 'register-username'],
      [passwordOk ? null : 'password', 'register-password'],
    ].find(([problem]) => problem);

    if (firstInvalid) {
      document.getElementById(firstInvalid[1])?.focus();
      return;
    }

    setServerError(null);
    setIsLoading(true);
    try {
      const email = formData.email.trim();
      await authService.register(email, formData.username, formData.password);
      navigate('/login', {
        replace: true,
        state: { from: location.state?.from, email, registered: true },
      });
    } catch (err) {
      setServerError(err.message || 'Nie udało się założyć konta. Spróbuj ponownie.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.formSide}>
        <div className={styles.formInner}>
          <div className={styles.heading}>
            <h1 className={styles.title}>Załóż konto</h1>
            <p className={styles.subtitle}>
              Masz już konto?{' '}
              <Link to="/login" state={{ from: location.state?.from }} className={styles.switchLink}>
                Zaloguj się
              </Link>
            </p>
          </div>

          {serverError && (
            <p className={styles.alert} role="alert">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" className={styles.alertIcon}>
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4M12 16h.01" />
              </svg>
              {serverError}
            </p>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.field}>
              <label htmlFor="register-email" className={styles.label}>
                E-mail
              </label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete="email"
                placeholder="ty@przyklad.pl"
                aria-invalid={Boolean(showEmailError)}
                aria-describedby={showEmailError ? 'register-email-error' : undefined}
                className={`${styles.input} ${showEmailError ? styles.inputError : ''}`}
              />
              {showEmailError && (
                <p id="register-email-error" className={`${styles.message} ${styles.messageError}`}>
                  {emailError}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="register-username" className={styles.label}>
                Nazwa użytkownika
              </label>
              <div
                className={`${styles.inputGroup} ${usernameMessage.tone === 'error' ? styles.inputError : ''} ${
                  usernameMessage.tone === 'ok' ? styles.inputOk : ''
                }`}>
                <span className={styles.prefix} aria-hidden="true">
                  @
                </span>
                <input
                  id="register-username"
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="username"
                  spellCheck={false}
                  maxLength={USERNAME_MAX}
                  aria-invalid={usernameMessage.tone === 'error'}
                  aria-describedby="register-username-status"
                  className={`${styles.groupInput} ${styles.groupInputPrefixed}`}
                />
              </div>
              <p
                id="register-username-status"
                aria-live="polite"
                className={`${styles.message} ${
                  usernameMessage.tone === 'error' ? styles.messageError : ''
                } ${usernameMessage.tone === 'ok' ? styles.messageOk : ''}`}>
                {usernameMessage.tone === 'ok' && <CheckIcon />}
                {usernameMessage.text}
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="register-password" className={styles.label}>
                Hasło
              </label>
              <div className={`${styles.inputGroup} ${touched.password && !passwordOk ? styles.inputError : ''}`}>
                <input
                  id="register-password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="new-password"
                  aria-invalid={Boolean(touched.password && !passwordOk)}
                  aria-describedby="register-password-rules"
                  className={styles.groupInput}
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                  aria-controls="register-password">
                  {showPassword ? 'Ukryj' : 'Pokaż'}
                </button>
              </div>
              <ul id="register-password-rules" className={styles.rules}>
                {passwordChecks.map((rule) => {
                  let ruleClass = '';
                  if (rule.ok) ruleClass = styles.ruleOk;
                  else if (touched.password) ruleClass = styles.ruleError;
                  return (
                    <li key={rule.id} className={`${styles.rule} ${ruleClass}`}>
                      {rule.ok ? <CheckIcon /> : <span className={styles.ruleDot} aria-hidden="true" />}
                      {rule.label}
                      <span className={styles.srOnly}>{rule.ok ? ', spełnione' : ', jeszcze nie'}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'Zakładam konto...' : 'Załóż konto'}
              {!isLoading && (
                <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true" className={styles.arrow}>
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </form>
        </div>
      </div>

      <ProfilePreview username={hasBadChars ? '' : formData.username} />
    </div>
  );
};

export default RegisterPage;
