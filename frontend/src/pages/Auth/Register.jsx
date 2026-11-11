import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Sparkles, AlertCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '../../context/useAuth';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      await register(formData.name, formData.email, formData.password);
      navigate('/');
    } catch (err) {
      const fieldErrors = err.response?.data?.errors;
      let msg = err.response?.data?.message || 'Registrasi gagal.';
      if (fieldErrors && typeof fieldErrors === 'object') {
        const firstKey = Object.keys(fieldErrors)[0];
        if (Array.isArray(fieldErrors[firstKey])) {
          msg = `${firstKey}: ${fieldErrors[firstKey][0]}`;
        }
      }
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <Sparkles size={28} className="logo-icon" />
            <span>DailyFlow</span>
          </div>
          <p className="auth-subtitle">Mulai kelola aktivitas harian Anda</p>
        </div>

        {errorMessage && (
          <div className="alert-error">
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nama Lengkap</label>
            <input
              type="text"
              name="name"
              className="form-input"
              placeholder="Nama Anda"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              className="form-input"
              placeholder="nama@email.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password (Minimal 8 Karakter)</label>
            <input
              type="password"
              name="password"
              className="form-input"
              placeholder="Buat password aman"
              value={formData.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.75rem' }}
            disabled={loading}
          >
            {loading ? 'Mendaftarkan...' : 'Daftar Sekarang'}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.9rem',
            color: 'var(--text-secondary)',
          }}
        >
          Sudah punya akun?{' '}
          <Link to="/login" style={{ fontWeight: 600 }}>
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;

