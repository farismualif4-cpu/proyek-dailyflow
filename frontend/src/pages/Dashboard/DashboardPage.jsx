import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckSquare,
  FileText,
  Flame,
  Bell,
  ArrowRight,
  TrendingUp,
  Clock,
  Plus,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { dashboardAPI, tasksAPI } from '../../services/api';
import { useAuth } from '../../context/useAuth';

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getData();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Fetch dashboard error:', err);
      setError('Gagal memuat data dashboard.');
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const res = await dashboardAPI.getData();
        if (!ignore && res.data.success) {
          setData(res.data.data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Fetch dashboard error:', err);
          setError('Gagal memuat data dashboard.');
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleToggleTask = async (taskId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      await tasksAPI.update(taskId, { status: newStatus });
      fetchDashboard();
    } catch (err) {
      console.error('Toggle task error:', err);
    }
  };

  if (loading) {
    return (
      <div>
        <div className="stats-grid">
          <div className="skeleton-loader" style={{ height: 100 }} />
          <div className="skeleton-loader" style={{ height: 100 }} />
          <div className="skeleton-loader" style={{ height: 100 }} />
          <div className="skeleton-loader" style={{ height: 100 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr', gap: '1.5rem' }}>
          <div className="skeleton-loader" style={{ height: 350 }} />
          <div className="skeleton-loader" style={{ height: 350 }} />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="empty-state">
        <p className="empty-title">{error}</p>
        <button className="btn btn-primary" onClick={fetchDashboard}>
          Coba Lagi
        </button>
      </div>
    );
  }

  const tasks = data?.tasks || { total: 0, pending: 0, inProgress: 0, completed: 0, completionRate: 0 };
  const habits = data?.habits || { total: 0, todayCheckIns: 0, completionRate: 0, currentStreak: 0 };
  const upcomingReminders = data?.upcomingReminders || [];
  const recentTasks = data?.recentTasks || [];
  const recentNotes = data?.recentNotes || [];

  const chartData = [
    { name: 'Pending', count: tasks.pending, color: '#9ca3af' },
    { name: 'In Progress', count: tasks.inProgress, color: '#f59e0b' },
    { name: 'Completed', count: tasks.completed, color: '#10b981' },
  ];

  return (
    <div>
      {/* Welcome Banner */}
      <div
        style={{
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            Halo, {user?.name || 'Teman'}! 👋
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            Berikut adalah ringkasan produktivitas harian Anda.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Link to="/tasks" className="btn btn-primary btn-sm">
            <Plus size={16} /> Tambah Tugas
          </Link>
          <Link to="/notes" className="btn btn-secondary btn-sm">
            <Plus size={16} /> Tulis Catatan
          </Link>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="stats-grid">
        <div className="card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            <CheckSquare size={26} />
          </div>
          <div>
            <div className="stat-val">{tasks.total}</div>
            <div className="stat-lbl">
              Total Tugas ({tasks.completionRate}% Selesai)
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.15)', color: '#f97316' }}
          >
            <Flame size={26} />
          </div>
          <div>
            <div className="stat-val">{habits.currentStreak} Hari</div>
            <div className="stat-lbl">
              Current Streak ({habits.todayCheckIns}/{habits.total} Hari Ini)
            </div>
          </div>
        </div>

        <div className="card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: 'var(--info-bg)', color: 'var(--info)' }}
          >
            <Bell size={26} />
          </div>
          <div>
            <div className="stat-val">{upcomingReminders.length}</div>
            <div className="stat-lbl">Pengingat Mendatang</div>
          </div>
        </div>

        <div className="card stat-card">
          <div
            className="stat-icon-wrapper"
            style={{ backgroundColor: 'var(--success-bg)', color: 'var(--success)' }}
          >
            <TrendingUp size={26} />
          </div>
          <div>
            <div className="stat-val">{recentNotes.length}</div>
            <div className="stat-lbl">Catatan Aktif</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Charts & Recent Activity */}
      <div className="dashboard-sections-grid">
        {/* Left Column: Visual Chart & Recent Tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Status Breakdown Chart */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">
                <CheckSquare size={18} className="logo-icon" /> Distribusi Status Tugas
              </span>
            </div>
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} tickLine={false} />
                  <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--bg-secondary)',
                      borderColor: 'var(--border)',
                      borderRadius: 8,
                      color: 'var(--text-primary)',
                    }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Tasks */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">
                <CheckSquare size={18} /> Tugas Terbaru
              </span>
              <Link to="/tasks" className="btn btn-secondary btn-sm">
                Lihat Semua <ArrowRight size={14} />
              </Link>
            </div>

            {recentTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p className="empty-description">Belum ada tugas dibuat.</p>
                <Link to="/tasks" className="btn btn-primary btn-sm">
                  + Buat Tugas Pertama
                </Link>
              </div>
            ) : (
              <div className="task-list">
                {recentTasks.map((t) => (
                  <div
                    key={t.id}
                    className={`task-item ${t.status === 'COMPLETED' ? 'completed' : ''}`}
                    style={{ padding: '0.75rem 1rem' }}
                  >
                    <div className="task-left">
                      <div
                        className={`checkbox-custom ${t.status === 'COMPLETED' ? 'checked' : ''}`}
                        onClick={() => handleToggleTask(t.id, t.status)}
                      >
                        {t.status === 'COMPLETED' && '✓'}
                      </div>
                      <div>
                        <span className="task-title" style={{ fontSize: '0.95rem' }}>
                          {t.title}
                        </span>
                        <div className="task-meta">
                          <span className={`badge badge-${t.priority.toLowerCase()}`}>
                            {t.priority}
                          </span>
                          {t.dueDate && (
                            <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Upcoming Reminders & Recent Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Upcoming Reminders */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">
                <Bell size={18} /> Pengingat Mendatang
              </span>
              <Link to="/reminders" className="btn btn-secondary btn-sm">
                Semua <ArrowRight size={14} />
              </Link>
            </div>

            {upcomingReminders.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p className="empty-description">Tidak ada pengingat mendatang.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {upcomingReminders.map((rem) => (
                  <div
                    key={rem.id}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rem.title}</div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                        marginTop: '0.25rem',
                      }}
                    >
                      <Clock size={13} />
                      <span>{new Date(rem.remindAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Notes Preview */}
          <div className="card">
            <div className="section-header">
              <span className="section-title">
                <FileText size={18} /> Catatan Terbaru
              </span>
              <Link to="/notes" className="btn btn-secondary btn-sm">
                Semua <ArrowRight size={14} />
              </Link>
            </div>

            {recentNotes.length === 0 ? (
              <div className="empty-state" style={{ padding: '1.5rem' }}>
                <p className="empty-description">Belum ada catatan.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {recentNotes.map((note) => (
                  <div
                    key={note.id}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{note.title}</span>
                      {note.category && (
                        <span className="badge badge-pending" style={{ fontSize: '0.7rem' }}>
                          {note.category}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

