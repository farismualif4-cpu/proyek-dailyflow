import { useState, useEffect } from 'react';
import {
  User,
  Lock,
  BarChart2,
  CheckCircle,
  AlertCircle,
  Shield,
  Save,
  Clock,
  Sparkles,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { authAPI } from '../../services/api';
import { useAuth } from '../../context/useAuth';

const SettingsPage = () => {
  const { user, updateUser } = useAuth();

  // Profile Form State
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Account Stats State
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Load account statistics
  useEffect(() => {
    let ignore = false;
    async function loadStats() {
      try {
        const res = await authAPI.getStats();
        if (!ignore && res.data.success) {
          setStats(res.data.data.stats);
          if (res.data.data.user?.name) {
            setProfileName(res.data.data.user.name);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Fetch account stats error:', err);
        }
      } finally {
        if (!ignore) {
          setStatsLoading(false);
        }
      }
    }

    loadStats();
    return () => {
      ignore = true;
    };
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim() || profileName.trim().length < 2) {
      setProfileError('Nama minimal 2 karakter.');
      setProfileSuccess('');
      return;
    }

    setProfileSaving(true);
    setProfileError('');
    setProfileSuccess('');

    try {
      const res = await authAPI.updateProfile({ name: profileName.trim() });
      if (res.data.success) {
        updateUser(res.data.user);
        setProfileSuccess('Nama profil berhasil diperbarui!');
        setTimeout(() => setProfileSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal memperbarui profil.';
      setProfileError(msg);
    } finally {
      setProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.oldPassword) {
      setPasswordError('Password saat ini wajib diisi.');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password baru minimal 8 karakter.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Konfirmasi password baru tidak cocok.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError('');
    setPasswordSuccess('');

    try {
      const res = await authAPI.changePassword({
        oldPassword: passwordData.oldPassword,
        newPassword: passwordData.newPassword,
      });

      if (res.data.success) {
        setPasswordSuccess('Password berhasil diperbarui!');
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setTimeout(() => setPasswordSuccess(''), 4000);
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal mengubah password.';
      setPasswordError(msg);
    } finally {
      setPasswordSaving(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="settings-container">
      {/* Profile Card Header */}
      <div className="card settings-header-card">
        <div className="settings-avatar-wrap">
          <div className="settings-avatar">{getInitials(user?.name)}</div>
          <div>
            <h2 className="settings-user-name">{user?.name}</h2>
            <p className="settings-user-email">{user?.email}</p>
            {user?.createdAt && (
              <span className="settings-join-date text-muted">
                <Clock size={14} />
                <span>
                  Anggota sejak{' '}
                  {format(parseISO(user.createdAt), 'd MMMM yyyy')}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="settings-grid">
        {/* Section 1: Edit Profile */}
        <div className="card settings-section">
          <div className="settings-section-header">
            <User size={18} className="text-primary" />
            <h3>Informasi Akun</h3>
          </div>

          {profileSuccess && (
            <div className="alert-success">
              <CheckCircle size={16} />
              <span>{profileSuccess}</span>
            </div>
          )}
          {profileError && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="settings-form">
            <div className="form-group">
              <label htmlFor="settings-name" className="form-label">
                Nama Lengkap
              </label>
              <input
                id="settings-name"
                type="text"
                className="form-input"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Nama Anda"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-email" className="form-label">
                Alamat Email (Permanen)
              </label>
              <input
                id="settings-email"
                type="email"
                className="form-input disabled-input"
                value={user?.email || ''}
                disabled
              />
              <span className="form-hint">
                Email terdaftar digunakan sebagai identitas akun Anda.
              </span>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={profileSaving}
            >
              <Save size={16} />
              <span>{profileSaving ? 'Menyimpan...' : 'Simpan Profil'}</span>
            </button>
          </form>
        </div>

        {/* Section 2: Change Password */}
        <div className="card settings-section">
          <div className="settings-section-header">
            <Lock size={18} className="text-warning" />
            <h3>Keamanan & Password</h3>
          </div>

          {passwordSuccess && (
            <div className="alert-success">
              <CheckCircle size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}
          {passwordError && (
            <div className="alert-error">
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="settings-form">
            <div className="form-group">
              <label htmlFor="settings-old-pass" className="form-label">
                Password Saat Ini
              </label>
              <input
                id="settings-old-pass"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={passwordData.oldPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    oldPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-new-pass" className="form-label">
                Password Baru (Min. 8 karakter)
              </label>
              <input
                id="settings-new-pass"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    newPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="settings-confirm-pass" className="form-label">
                Konfirmasi Password Baru
              </label>
              <input
                id="settings-confirm-pass"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({
                    ...passwordData,
                    confirmPassword: e.target.value,
                  })
                }
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={passwordSaving}
            >
              <Shield size={16} />
              <span>{passwordSaving ? 'Memproses...' : 'Ubah Password'}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Section 3: Account Stats Summary */}
      <div className="card settings-section" style={{ marginTop: '1.5rem' }}>
        <div className="settings-section-header">
          <BarChart2 size={18} className="text-primary" />
          <h3>Ringkasan Aktivitas Akun</h3>
        </div>

        {statsLoading ? (
          <div className="skeleton-container" style={{ marginTop: '1rem' }}>
            <div className="skeleton" style={{ height: '80px' }} />
          </div>
        ) : (
          <div className="settings-stats-grid">
            <div className="settings-stat-item">
              <span className="stat-label">Total Tugas</span>
              <span className="stat-val">{stats?.totalTasks ?? 0}</span>
              <span className="stat-sub text-muted">
                {stats?.completedTasks ?? 0} selesai
              </span>
            </div>
            <div className="settings-stat-item">
              <span className="stat-label">Kebiasaan Aktif</span>
              <span className="stat-val text-warning">{stats?.totalHabits ?? 0}</span>
              <span className="stat-sub text-muted">Habits dilacak</span>
            </div>
            <div className="settings-stat-item">
              <span className="stat-label">Total Catatan</span>
              <span className="stat-val">{stats?.totalNotes ?? 0}</span>
              <span className="stat-sub text-muted">Dokumentasi</span>
            </div>
            <div className="settings-stat-item">
              <span className="stat-label">Pengingat</span>
              <span className="stat-val">{stats?.totalReminders ?? 0}</span>
              <span className="stat-sub text-muted">Jadwal tercatat</span>
            </div>
          </div>
        )}
      </div>

      {/* DailyFlow Brand Footer */}
      <div className="settings-footer text-muted text-sm">
        <Sparkles size={14} className="text-primary" />
        <span>DailyFlow v1.0.0 — Productivity Suite</span>
      </div>
    </div>
  );
};

export default SettingsPage;

