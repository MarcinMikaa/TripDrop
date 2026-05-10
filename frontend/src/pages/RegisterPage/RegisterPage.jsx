import { useState } from 'react';
import { authService } from '../../services/AuthService';
import styles from './RegisterPage.module.scss';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
  });

  const [status, setStatus] = useState({ type: '', message: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus({ type: '', message: '' });

    try {
      await authService.register(formData.email, formData.username, formData.password);
      setStatus({ type: 'success', message: 'Konto utworzone! Możesz się teraz zalogować.' });
      setFormData({ email: '', username: '', password: '' });
      window.location.href = '/login';
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <div className={styles.wrapper}>
      <h2>Rejestracja</h2>

      {status.message && (
        <div style={{ color: status.type === 'error' ? 'red' : 'green', marginBottom: '1rem' }}>{status.message}</div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <label>Email:</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} required />

        <label>Nazwa użytkownika:</label>
        <input type="text" name="username" value={formData.username} onChange={handleChange} required />

        <label>Hasło:</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required />

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Rejestrowanie...' : 'Zarejestruj się'}
        </button>
      </form>
    </div>
  );
};

export default RegisterPage;
