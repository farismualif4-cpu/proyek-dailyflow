import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  CheckSquare,
  Trash2,
  Edit2,
  Calendar,
  X,
} from 'lucide-react';
import { tasksAPI } from '../../services/api';

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'PENDING',
    dueDate: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchTasks = useCallback(async (s = search, st = statusFilter, pr = priorityFilter) => {
    try {
      const params = {};
      if (s?.trim()) params.search = s.trim();
      if (st && st !== 'ALL') params.status = st;
      if (pr && pr !== 'ALL') params.priority = pr;

      const res = await tasksAPI.getAll(params);
      if (res.data.success) {
        setTasks(res.data.data);
      }
    } catch (err) {
      console.error('Fetch tasks error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, priorityFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchTasks(search, statusFilter, priorityFilter);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchTasks, search, statusFilter, priorityFilter]);

  const handleOpenCreateModal = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: 'PENDING',
      dueDate: '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority || 'MEDIUM',
      status: task.status || 'PENDING',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setModalError('Judul tugas wajib diisi.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        priority: formData.priority,
        status: formData.status,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
      };

      if (editingTask) {
        await tasksAPI.update(editingTask.id, payload);
      } else {
        await tasksAPI.create(payload);
      }

      setModalOpen(false);
      fetchTasks();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan tugas.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleToggleStatus = async (task) => {
    try {
      const nextStatus = task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
      // Optimistic update
      setTasks(
        tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
      );
      await tasksAPI.update(task.id, { status: nextStatus });
    } catch (err) {
      console.error('Toggle status error:', err);
      fetchTasks();
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus tugas ini?')) return;
    try {
      setTasks(tasks.filter((t) => t.id !== taskId));
      await tasksAPI.delete(taskId);
    } catch (err) {
      console.error('Delete task error:', err);
      fetchTasks();
    }
  };

  return (
    <div>
      {/* Top Controls Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Cari tugas berdasarkan judul/deskripsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Tambah Tugas
        </button>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        {/* Status Filters */}
        <div className="filter-group">
          {['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
            <button
              key={s}
              className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(s)}
            >
              {s === 'ALL'
                ? 'Semua Status'
                : s === 'IN_PROGRESS'
                ? 'In Progress'
                : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Priority Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Prioritas:
          </span>
          <select
            className="form-select"
            style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="ALL">Semua Prioritas</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      {loading ? (
        <div className="task-list">
          <div className="skeleton-loader" style={{ height: 68 }} />
          <div className="skeleton-loader" style={{ height: 68 }} />
          <div className="skeleton-loader" style={{ height: 68 }} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state">
          <CheckSquare size={48} className="empty-icon" />
          <p className="empty-title">Tidak ada tugas ditemukan</p>
          <p className="empty-description">
            {search || statusFilter !== 'ALL' || priorityFilter !== 'ALL'
              ? 'Coba sesuaikan kata kunci pencarian atau filter Anda.'
              : 'Mulai kelola hari Anda dengan menambahkan tugas pertama.'}
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} /> Tambah Tugas Baru
          </button>
        </div>
      ) : (
        <div className="task-list">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`task-item ${task.status === 'COMPLETED' ? 'completed' : ''}`}
            >
              <div className="task-left">
                <div
                  className={`checkbox-custom ${task.status === 'COMPLETED' ? 'checked' : ''}`}
                  onClick={() => handleToggleStatus(task)}
                  title="Tandai selesai / belum"
                >
                  {task.status === 'COMPLETED' && '✓'}
                </div>
                <div>
                  <div
                    className="task-title"
                    style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}
                  >
                    {task.title}
                  </div>
                  {task.description && (
                    <div
                      style={{
                        fontSize: '0.85rem',
                        color: 'var(--text-secondary)',
                        marginTop: '0.2rem',
                      }}
                    >
                      {task.description}
                    </div>
                  )}
                  <div className="task-meta">
                    <span className={`badge badge-${task.priority.toLowerCase()}`}>
                      {task.priority}
                    </span>
                    <span className={`badge badge-${task.status.toLowerCase().replace('_', '-')}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.dueDate && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Calendar size={13} />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="task-actions">
                <button
                  className="btn-icon-sm"
                  onClick={() => handleOpenEditModal(task)}
                  title="Edit Tugas"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  className="btn-icon-sm"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => handleDeleteTask(task.id)}
                  title="Hapus Tugas"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Modal (Create / Edit) */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editingTask ? 'Edit Tugas' : 'Tambah Tugas Baru'}
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
                  <label className="form-label">Judul Tugas *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Selesaikan laporan mingguan"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Deskripsi</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    placeholder="Rincian catatan tugas opsional..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Prioritas</label>
                    <select
                      className="form-select"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Status</label>
                    <select
                      className="form-select"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Tenggat Waktu (Due Date)</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Tugas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TasksPage;

