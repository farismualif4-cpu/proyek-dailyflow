import { useState, useEffect } from 'react';
import {
  Plus,
  Flame,
  Check,
  Trash2,
  Edit2,
  Calendar,
  X,
  History,
  TrendingUp,
} from 'lucide-react';
import { habitsAPI } from '../../services/api';

const HabitsPage = () => {
  const [habits, setHabits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // History Drawer / Modal State
  const [historyHabit, setHistoryHabit] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [habitsRes, statsRes] = await Promise.all([
        habitsAPI.getAll(),
        habitsAPI.getStatistics(),
      ]);

      if (habitsRes.data.success) {
        setHabits(habitsRes.data.data);
      }
      if (statsRes.data.success) {
        setStats(statsRes.data.data);
      }
    } catch (err) {
      console.error('Fetch habits error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadHabits() {
      try {
        const [habitsRes, statsRes] = await Promise.all([
          habitsAPI.getAll(),
          habitsAPI.getStatistics(),
        ]);
        if (!ignore) {
          if (habitsRes.data.success) {
            setHabits(habitsRes.data.data);
          }
          if (statsRes.data.success) {
            setStats(statsRes.data.data);
          }
        }
      } catch (err) {
        if (!ignore) {
          console.error('Fetch habits error:', err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadHabits();
    return () => {
      ignore = true;
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingHabit(null);
    setFormData({ name: '', description: '' });
    setModalError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (habit) => {
    setEditingHabit(habit);
    setFormData({
      name: habit.name,
      description: habit.description || '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setModalError('Nama kebiasaan wajib diisi.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
      };

      if (editingHabit) {
        await habitsAPI.update(editingHabit.id, payload);
      } else {
        await habitsAPI.create(payload);
      }

      setModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan kebiasaan.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCheckInToggle = async (habit) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const isCompletedToday = habit.logs?.some(
      (l) => l.completed && new Date(l.date).toISOString().split('T')[0] === todayStr
    );

    try {
      await habitsAPI.checkIn(habit.id, {
        date: todayStr,
        completed: !isCompletedToday,
      });
      fetchData();
    } catch (err) {
      console.error('Check-in error:', err);
    }
  };

  const handleDeleteHabit = async (habitId) => {
    if (!window.confirm('Hapus kebiasaan ini beserta seluruh riwayatnya?')) return;
    try {
      setHabits(habits.filter((h) => h.id !== habitId));
      await habitsAPI.delete(habitId);
      fetchData();
    } catch (err) {
      console.error('Delete habit error:', err);
      fetchData();
    }
  };

  const handleViewHistory = async (habit) => {
    setHistoryHabit(habit);
    setHistoryLoading(true);
    try {
      const res = await habitsAPI.getHistory(habit.id);
      if (res.data.success) {
        setHistoryLogs(res.data.data);
      }
    } catch (err) {
      console.error('Fetch history error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div>
      {/* Header & Controls */}
      <div className="filter-bar">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Pelacak Kebiasaan Harian
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Bangun konsistensi dan pertahankan streak Anda setiap hari.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Tambah Kebiasaan
        </button>
      </div>

      {/* Statistics Strip */}
      {stats && (
        <div className="stats-grid" style={{ marginBottom: '2rem' }}>
          <div className="card stat-card" style={{ padding: '1rem 1.25rem' }}>
            <div
              className="stat-icon-wrapper"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="stat-val" style={{ fontSize: '1.4rem' }}>
                {stats.totalHabits}
              </div>
              <div className="stat-lbl">Total Kebiasaan</div>
            </div>
          </div>

          <div className="card stat-card" style={{ padding: '1rem 1.25rem' }}>
            <div
              className="stat-icon-wrapper"
              style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}
            >
              <Flame size={22} />
            </div>
            <div>
              <div className="stat-val" style={{ fontSize: '1.4rem' }}>
                {stats.currentStreak} Hari
              </div>
              <div className="stat-lbl">Streak Tertinggi</div>
            </div>
          </div>

          <div className="card stat-card" style={{ padding: '1rem 1.25rem' }}>
            <div
              className="stat-icon-wrapper"
              style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
            >
              <Check size={22} />
            </div>
            <div>
              <div className="stat-val" style={{ fontSize: '1.4rem' }}>
                {stats.todayCheckIns}/{stats.totalHabits}
              </div>
              <div className="stat-lbl">Selesai Hari Ini ({stats.completionRate}%)</div>
            </div>
          </div>
        </div>
      )}

      {/* Habits List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="skeleton-loader" style={{ height: 80 }} />
          <div className="skeleton-loader" style={{ height: 80 }} />
          <div className="skeleton-loader" style={{ height: 80 }} />
        </div>
      ) : habits.length === 0 ? (
        <div className="empty-state">
          <Flame size={48} className="empty-icon" style={{ color: '#f97316' }} />
          <p className="empty-title">Belum ada kebiasaan yang dibuat</p>
          <p className="empty-description">
            Tambahkan rutinitas harian seperti membaca, berolahraga, atau belajar coding.
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} /> Tambah Kebiasaan Baru
          </button>
        </div>
      ) : (
        <div>
          {habits.map((habit) => {
            const isCompletedToday = habit.logs?.some(
              (l) => l.completed && new Date(l.date).toISOString().split('T')[0] === todayStr
            );

            return (
              <div key={habit.id} className="card habit-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
                  <button
                    className={`btn-checkin ${isCompletedToday ? 'done' : 'todo'}`}
                    onClick={() => handleCheckInToggle(habit)}
                  >
                    <Check size={18} />
                    {isCompletedToday ? 'Selesai Hari Ini' : 'Check-in'}
                  </button>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ fontWeight: 600, fontSize: '1.05rem' }}>
                        {habit.name}
                      </span>
                      <span className="habit-streak-badge">
                        <Flame size={14} />
                        {habit.currentStreak || 0} Hari Streak
                      </span>
                    </div>
                    {habit.description && (
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        {habit.description}
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleViewHistory(habit)}
                    title="Lihat Riwayat Check-in"
                  >
                    <History size={15} /> Riwayat
                  </button>
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleOpenEditModal(habit)}
                    title="Edit Kebiasaan"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleDeleteHabit(habit.id)}
                    title="Hapus Kebiasaan"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Habit Create / Edit Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editingHabit ? 'Edit Kebiasaan' : 'Tambah Kebiasaan Baru'}
              </h3>
              <button
                className="btn-icon-sm"
                onClick={() => setModalOpen(false)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="modal-body">
                {modalError && (
                  <div className="alert-error" style={{ marginBottom: '1rem' }}>
                    {modalError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Nama Kebiasaan *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Olahraga 30 Menit"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Contoh: Push-up, lari pagi, atau workout ringan..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={modalSubmitting}>
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Kebiasaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {historyHabit && (
        <div className="modal-overlay" onClick={() => setHistoryHabit(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                Riwayat: {historyHabit.name}
              </h3>
              <button
                className="btn-icon-sm"
                onClick={() => setHistoryHabit(null)}
                aria-label="Tutup"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {historyLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div className="skeleton-loader" style={{ height: 40 }} />
                  <div className="skeleton-loader" style={{ height: 40 }} />
                </div>
              ) : historyLogs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                  Belum ada log check-in tercatat.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {historyLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.65rem 1rem',
                        background: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Calendar size={15} color="var(--text-muted)" />
                        {new Date(log.date).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                      <span
                        className={`badge ${log.completed ? 'badge-completed' : 'badge-pending'}`}
                      >
                        {log.completed ? 'Selesai ✓' : 'Lewat'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setHistoryHabit(null)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HabitsPage;

