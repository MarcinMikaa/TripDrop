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
    <div className={styles.wrapper}>
      <h2>Logowanie</h2>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <label>Email:</label>
        <input type="email" name="email" value={formData.email} onChange={handleChange} required />
        
        <label>Hasło:</label>
        <input type="password" name="password" value={formData.password} onChange={handleChange} required />
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logowanie...' : 'Zaloguj się'}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;
