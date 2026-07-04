import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { toastSuccess, swalError } from '../../utils/swal';
import styles from './RegisterPage.module.scss';

const validate = ({ email, username, password }) => {
  const errors = {};

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) errors.email = 'Podaj prawidłowy adres email.';

  if (username.length < 3) errors.username = 'Nazwa użytkownika musi mieć minimum 3 znaki.';
  else if (username.length > 30) errors.username = 'Nazwa użytkownika może mieć maksymalnie 30 znaków.';
  else if (!/^[a-zA-Z0-9_]+$/.test(username)) errors.username = 'Dozwolone tylko litery, cyfry i podkreślnik (_).';

  if (password.length < 8) errors.password = 'Hasło musi mieć minimum 8 znaków.';
  else if (!/[A-Z]/.test(password)) errors.password = 'Hasło musi zawierać przynajmniej jedną wielką literę.';
  else if (!/[0-9]/.test(password)) errors.password = 'Hasło musi zawierać przynajmniej jedną cyfrę.';

  return errors;
};

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const updated = { ...formData, [e.target.name]: e.target.value };
    setFormData(updated);

    if (touched[e.target.name]) {
      const fieldErrors = validate(updated);
      setErrors((prev) => ({
        ...prev,
        [e.target.name]: fieldErrors[e.target.name],
      }));
    }
  };

  const handleBlur = (e) => {
    const name = e.target.name;
    setTouched((prev) => ({ ...prev, [name]: true }));
    const fieldErrors = validate(formData);
    setErrors((prev) => ({ ...prev, [name]: fieldErrors[name] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setTouched({ email: true, username: true, password: true });
    const validationErrors = validate(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) return;

    setIsLoading(true);
    try {
      await authService.register(formData.email, formData.username, formData.password);
      await toastSuccess('Konto utworzone! Zaloguj się.');
      setFormData({ email: '', username: '', password: '' });
      setErrors({});
      setTouched({});
      navigate('/login');
    } catch (err) {
      await swalError('Błąd rejestracji', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fields = [
    { name: 'email',    label: 'Email',             type: 'email',    autocomplete: 'email' },
    { name: 'username', label: 'Nazwa użytkownika', type: 'text',     autocomplete: 'username' },
    { name: 'password', label: 'Hasło',             type: 'password', autocomplete: 'new-password' },
  ];

  const isFormValid = Object.keys(validate(formData)).length === 0;

  return (
    <div className={styles.split}>
      <div className={styles.visual}>
        <svg
          className={styles.mapSvg}
          viewBox="0 0 500 600"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none">
          <path
            d="M 40 40 Q 150 80 180 180 T 150 320 Q 100 400 200 480 T 380 550"
            stroke="#5b8fa8"
            strokeWidth="2.5"
            fill="none"
            strokeDasharray="6 8"
            opacity="0.5"
          />
          <circle cx="420" cy="120" r="70" stroke="#c8a882" strokeWidth="1" fill="none" opacity="0.15" />
          <circle cx="80" cy="450" r="90" stroke="#5b8fa8" strokeWidth="1" fill="none" opacity="0.12" />
        </svg>

        <div className={styles.pin} style={{ top: '6%', left: '6%' }}>
          <div className={styles.pinGlow} style={{ background: '#5b8fa8' }} />
          <div className={styles.pinDot} style={{ background: '#5b8fa8' }} />
        </div>
        <div className={styles.pin} style={{ top: '30%', left: '34%' }}>
          <div className={styles.pinGlow} style={{ background: '#c8a882' }} />
          <div className={styles.pinDot} style={{ background: '#c8a882' }} />
        </div>
        <div className={styles.pin} style={{ top: '53%', left: '29%' }}>
          <div className={styles.pinGlow} style={{ background: '#5b8fa8' }} />
          <div className={styles.pinDot} style={{ background: '#5b8fa8' }} />
        </div>
        <div className={styles.pin} style={{ top: '80%', left: '40%' }}>
          <div className={styles.pinGlow} style={{ background: '#c8a882' }} />
          <div className={styles.pinDot} style={{ background: '#c8a882' }} />
        </div>
        <div className={styles.pin} style={{ top: '91%', left: '76%' }}>
          <div className={styles.pinGlow} style={{ background: '#5b8fa8' }} />
          <div className={styles.pinDot} style={{ background: '#5b8fa8' }} />
        </div>

        <div className={styles.visualContent}>
          <div className={styles.logo}>TripDrop</div>
          <div className={styles.quote}>
            Zacznij planować
            <br />
            swoją pierwszą wspólną podróż.
          </div>
          <div className={styles.subQuote}>
            Dołącz do znajomych, twórz trasy i planujcie wycieczki razem - od pomysłu do wyjazdu.
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <div className={styles.statNum}>3 kroki</div>
              <div className={styles.statLabel}>do utworzenia konta</div>
            </div>
            <div className={styles.statItem}>
              <div className={styles.statNum}>100%</div>
              <div className={styles.statLabel}>darmowe</div>
            </div>
          </div>
        </div>

        <div className={styles.footerNote}>© 2026 TripDrop</div>
      </div>

      <div className={styles.formSide}>
        <div className={styles.formInner}>
          <h1 className={styles.title}>Utwórz konto</h1>
          <p className={styles.subtitle}>Dołącz do TripDrop i zacznij planować podróże</p>

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            {fields.map(({ name, label, type, autocomplete }) => (
              <div key={name} className={styles.field}>
                <label htmlFor={name}>{label}</label>
                <input
                  id={name}
                  name={name}
                  type={type}
                  value={formData[name]}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete={autocomplete}
                  className={touched[name] && errors[name] ? 'input-error' : ''}
                />
                {touched[name] && errors[name] && <p className="field-error">{errors[name]}</p>}
              </div>
            ))}

            <button type="submit" className={styles.submitBtn} disabled={isLoading}>
              {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
            </button>
          </form>

          <p className={styles.switchLink}>
            Masz już konto? <span onClick={() => navigate('/login')}>Zaloguj się</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
