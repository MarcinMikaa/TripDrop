import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/AuthService';
import { toastSuccess, swalError } from '../../utils/swal';
import styles from './RegisterPage.module.scss';

const validate = ({ email, username, password }) => {
  const errors = {};

  if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/))
    errors.email = 'Podaj prawidłowy adres email.';

  if (username.length < 3)
    errors.username = 'Nazwa użytkownika musi mieć minimum 3 znaki.';
  else if (username.length > 30)
    errors.username = 'Nazwa użytkownika może mieć maksymalnie 30 znaków.';
  else if (!/^[a-zA-Z0-9_]+$/.test(username))
    errors.username = 'Dozwolone tylko litery, cyfry i podkreślnik (_).';

  if (password.length < 8)
    errors.password = 'Hasło musi mieć minimum 8 znaków.';
  else if (!/[A-Z]/.test(password))
    errors.password = 'Hasło musi zawierać przynajmniej jedną wielką literę.';
  else if (!/[0-9]/.test(password))
    errors.password = 'Hasło musi zawierać przynajmniej jedną cyfrę.';

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
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <h2 className={styles.title}>Zarejestruj się</h2>
        <p className={styles.subtitle}>Dołącz do TripDrop i zacznij planować podróże</p>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          {fields.map(({ name, label, type, autocomplete }) => (
            <div key={name} className={styles.field}>
              <label className={styles.label} htmlFor={name}>{label}</label>
              <input
                id={name}
                name={name}
                type={type}
                value={formData[name]}
                onChange={handleChange}
                onBlur={handleBlur}
                autoComplete={autocomplete}
                className={`${styles.input} ${touched[name] && errors[name] ? styles.inputError : ''} ${touched[name] && !errors[name] && formData[name] ? styles.inputValid : ''}`}
              />
              {touched[name] && errors[name] && (
                <span className={styles.errorMsg} role="alert">{errors[name]}</span>
              )}
            </div>
          ))}

          <button
            type="submit"
            disabled={isLoading}
            className={`${styles.submitBtn} ${!isFormValid && Object.keys(touched).length > 0 ? styles.submitBtnDisabled : ''}`}
          >
            {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterPage;
