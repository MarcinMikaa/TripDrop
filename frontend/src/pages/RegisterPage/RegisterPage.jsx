import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import styles from './RegisterPage.module.scss';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ email: '', username: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      await register(formData.email, formData.username, formData.password);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2>Rejestracja</h2>
      
      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}
      
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
