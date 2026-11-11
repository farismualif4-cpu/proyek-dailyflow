import { useState, useEffect } from 'react';
import {
  Plus,
  Bell,
  Clock,
  Trash2,
  Edit2,
  Link as LinkIcon,
  X,
} from 'lucide-react';
import { remindersAPI, tasksAPI } from '../../services/api';

const RemindersPage = () => {
  const [reminders, setReminders] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSent, setFilterSent] = useState('ALL'); // ALL, FALSE, TRUE

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    remindAt: '',
    taskId: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchReminders = async () => {
    try {
      const params = {};
      if (filterSent === 'FALSE') params.isSent = 'false';
      if (filterSent === 'TRUE') params.isSent = 'true';

      const res = await remindersAPI.getAll(params);
      if (res.data.success) {
        setReminders(res.data.data);
      }
    } catch (err) {
      console.error('Fetch reminders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasksForSelect = async () => {
    try {
      const res = await tasksAPI.getAll();
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Fetch tasks select error:', err);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadReminders() {
      try {
        const params = {};
        if (filterSent === 'FALSE') params.isSent = 'false';
        if (filterSent === 'TRUE') params.isSent = 'true';

        const res = await remindersAPI.getAll(params);
        if (!ignore && res.data.success) {
          setReminders(res.data.data);
        }
      } catch (err) {
        if (!ignore) {
          console.error('Fetch reminders error:', err);
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }
    loadReminders();
    return () => {
      ignore = true;
    };
  }, [filterSent]);

  const handleOpenCreateModal = () => {
    fetchTasksForSelect();
    setEditingReminder(null);
    setFormData({
      title: '',
      message: '',
      remindAt: '',
      taskId: '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (reminder) => {
    fetchTasksForSelect();
    setEditingReminder(reminder);
    setFormData({
      title: reminder.title,
      message: reminder.message || '',
      remindAt: reminder.remindAt
        ? new Date(reminder.remindAt).toISOString().slice(0, 16)
        : '',
      taskId: reminder.taskId || '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.remindAt) {
      setModalError('Judul dan waktu pengingat wajib diisi.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        title: formData.title.trim(),
        message: formData.message.trim() || null,
        remindAt: new Date(formData.remindAt).toISOString(),
        taskId: formData.taskId || null,
      };

      if (editingReminder) {
        await remindersAPI.update(editingReminder.id, payload);
      } else {
        await remindersAPI.create(payload);
      }

      setModalOpen(false);
      fetchReminders();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan pengingat.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleSent = async (reminder) => {
    try {
      const nextSent = !reminder.isSent;
      setReminders(
        reminders.map((r) =>
          r.id === reminder.id ? { ...r, isSent: nextSent } : r
        )
      );
      await remindersAPI.update(reminder.id, { isSent: nextSent });
    } catch (err) {
      console.error('Toggle isSent error:', err);
      fetchReminders();
    }
  };

  const handleDeleteReminder = async (reminderId) => {
    if (!window.confirm('Hapus pengingat ini?')) return;
    try {
      setReminders(reminders.filter((r) => r.id !== reminderId));
      await remindersAPI.delete(reminderId);
    } catch (err) {
      console.error('Delete reminder error:', err);
      fetchReminders();
    }
  };

  return (
    <div>
      {/* Header & Controls */}
      <div className="filter-bar">
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
            Pengingat & Notifikasi
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Jangan lewatkan jadwal dan deadline penting Anda.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Tambah Pengingat
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="filter-group" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`btn btn-sm ${filterSent === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterSent('ALL')}
        >
          Semua Pengingat
        </button>
        <button
          className={`btn btn-sm ${filterSent === 'FALSE' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterSent('FALSE')}
        >
          Mendatang / Aktif
        </button>
        <button
          className={`btn btn-sm ${filterSent === 'TRUE' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setFilterSent('TRUE')}
        >
          Selesai / Terkirim
        </button>
      </div>

      {/* Reminder List */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="skeleton-loader" style={{ height: 75 }} />
          <div className="skeleton-loader" style={{ height: 75 }} />
          <div className="skeleton-loader" style={{ height: 75 }} />
        </div>
      ) : reminders.length === 0 ? (
        <div className="empty-state">
          <Bell size={48} className="empty-icon" />
          <p className="empty-title">Tidak ada pengingat</p>
          <p className="empty-description">
            {filterSent !== 'ALL'
              ? 'Tidak ada pengingat dalam kategori filter ini.'
              : 'Buat pengingat mandiri atau tautkan dengan salah satu tugas Anda.'}
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} /> Tambah Pengingat Baru
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {reminders.map((reminder) => {
            const isDue = new Date(reminder.remindAt) < new Date();

            return (
              <div
                key={reminder.id}
                className="task-item"
                style={{
                  opacity: reminder.isSent ? 0.7 : 1,
                  borderLeft: `4px solid ${
                    reminder.isSent
                      ? 'var(--success)'
                      : isDue
                      ? 'var(--danger)'
                      : 'var(--accent)'
                  }`,
                }}
              >
                <div className="task-left">
                  <div
                    className={`checkbox-custom ${reminder.isSent ? 'checked' : ''}`}
                    onClick={() => handleToggleSent(reminder)}
                    title={reminder.isSent ? 'Tandai belum selesai' : 'Tandai selesai'}
                  >
                    {reminder.isSent && '✓'}
                  </div>

                  <div>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: '1rem',
                        textDecoration: reminder.isSent ? 'line-through' : 'none',
                      }}
                    >
                      {reminder.title}
                    </div>

                    {reminder.message && (
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-secondary)',
                          marginTop: '0.2rem',
                        }}
                      >
                        {reminder.message}
                      </p>
                    )}

                    <div className="task-meta">
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          color: reminder.isSent
                            ? 'var(--text-muted)'
                            : isDue
                            ? 'var(--danger)'
                            : 'var(--accent)',
                          fontWeight: 500,
                        }}
                      >
                        <Clock size={13} />
                        {new Date(reminder.remindAt).toLocaleString(undefined, {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                        {isDue && !reminder.isSent && ' (Lewat)'}
                      </span>

                      {reminder.task && (
                        <span
                          className="badge badge-pending"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            textTransform: 'none',
                          }}
                        >
                          <LinkIcon size={11} />
                          Tugas: {reminder.task.title}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="task-actions">
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleOpenEditModal(reminder)}
                    title="Edit Pengingat"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    className="btn-icon-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleDeleteReminder(reminder.id)}
                    title="Hapus Pengingat"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Dialog */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editingReminder ? 'Edit Pengingat' : 'Tambah Pengingat Baru'}
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
                  <label className="form-label">Judul Pengingat *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Deadline Kirim Proposal"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Waktu Pengingat (Tanggal & Jam) *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.remindAt}
                    onChange={(e) => setFormData({ ...formData, remindAt: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tautkan dengan Tugas (Opsional)</label>
                  <select
                    className="form-select"
                    value={formData.taskId}
                    onChange={(e) => setFormData({ ...formData, taskId: e.target.value })}
                  >
                    <option value="">-- Tidak Ditautkan --</option>
                    {tasks.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.title} ({t.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Pesan Catatan Tambahan</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Contoh: Pastikan lampiran PDF sudah ditandatangani..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
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
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Pengingat'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RemindersPage;

