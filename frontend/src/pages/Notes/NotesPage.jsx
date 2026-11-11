import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Search,
  FileText,
  Trash2,
  Edit2,
  Tag,
  Clock,
  X,
} from 'lucide-react';
import { notesAPI } from '../../services/api';

const NotesPage = () => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    content: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchNotes = useCallback(async (searchQuery = search, category = categoryFilter) => {
    try {
      const params = {};
      if (searchQuery?.trim()) params.search = searchQuery.trim();
      if (category && category !== 'ALL') params.category = category;

      const res = await notesAPI.getAll(params);
      if (res.data.success) {
        setNotes(res.data.data);
      }
    } catch (err) {
      console.error('Fetch notes error:', err);
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchNotes(search, categoryFilter);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [fetchNotes, search, categoryFilter]);

  // Ekstrak kategori unik
  const uniqueCategories = Array.from(
    new Set(notes.map((n) => n.category).filter(Boolean))
  );

  const handleOpenCreateModal = () => {
    setEditingNote(null);
    setFormData({
      title: '',
      category: '',
      content: '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleOpenEditModal = (note) => {
    setEditingNote(note);
    setFormData({
      title: note.title,
      category: note.category || '',
      content: note.content || '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setModalError('Judul catatan wajib diisi.');
      return;
    }

    setModalSubmitting(true);
    setModalError('');

    try {
      const payload = {
        title: formData.title.trim(),
        category: formData.category.trim() || null,
        content: formData.content || '',
      };

      if (editingNote) {
        await notesAPI.update(editingNote.id, payload);
      } else {
        await notesAPI.create(payload);
      }

      setModalOpen(false);
      fetchNotes();
    } catch (err) {
      const msg = err.response?.data?.message || 'Gagal menyimpan catatan.';
      setModalError(msg);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Hapus catatan ini?')) return;
    try {
      setNotes(notes.filter((n) => n.id !== noteId));
      await notesAPI.delete(noteId);
    } catch (err) {
      console.error('Delete note error:', err);
      fetchNotes();
    }
  };

  return (
    <div>
      {/* Search & Action Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            className="form-input search-input"
            placeholder="Cari catatan berdasarkan judul atau isi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" onClick={handleOpenCreateModal}>
          <Plus size={18} /> Tulis Catatan
        </button>
      </div>

      {/* Category Filter Tags */}
      {uniqueCategories.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <button
            className={`btn btn-sm ${categoryFilter === 'ALL' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setCategoryFilter('ALL')}
          >
            Semua ({notes.length})
          </button>
          {uniqueCategories.map((cat) => (
            <button
              key={cat}
              className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setCategoryFilter(cat)}
            >
              <Tag size={13} /> {cat}
            </button>
          ))}
        </div>
      )}

      {/* Notes Grid */}
      {loading ? (
        <div className="notes-grid">
          <div className="skeleton-loader" style={{ height: 220 }} />
          <div className="skeleton-loader" style={{ height: 220 }} />
          <div className="skeleton-loader" style={{ height: 220 }} />
        </div>
      ) : notes.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} className="empty-icon" />
          <p className="empty-title">Belum ada catatan</p>
          <p className="empty-description">
            {search || categoryFilter !== 'ALL'
              ? 'Tidak ada catatan yang sesuai dengan filter.'
              : 'Tulis ide, referensi, atau ringkasan penting Anda sekarang.'}
          </p>
          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <Plus size={18} /> Tulis Catatan Baru
          </button>
        </div>
      ) : (
        <div className="notes-grid">
          {notes.map((note) => (
            <div key={note.id} className="card note-card">
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                  }}
                >
                  <h4 className="note-card-title">{note.title}</h4>
                  {note.category && (
                    <span className="badge badge-pending" style={{ flexShrink: 0 }}>
                      {note.category}
                    </span>
                  )}
                </div>
                <div className="note-card-content">
                  {note.content || <em style={{ color: 'var(--text-muted)' }}>Tidak ada teks</em>}
                </div>
              </div>

              <div className="note-card-footer">
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Clock size={12} />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>

                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn-icon-sm"
                    onClick={() => handleOpenEditModal(note)}
                    title="Edit Catatan"
                  >
                    <Edit2 size={15} />
                  </button>
                  <button
                    className="btn-icon-sm"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => handleDeleteNote(note.id)}
                    title="Hapus Catatan"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Note Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: '1.15rem' }}>
                {editingNote ? 'Edit Catatan' : 'Tulis Catatan Baru'}
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
                  <label className="form-label">Judul Catatan *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Rencana Arsitektur Cloud"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Kategori (Opsional)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Contoh: Kerja, Ide, Belajar"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Isi Catatan</label>
                  <textarea
                    className="form-textarea"
                    rows={6}
                    placeholder="Tuliskan catatan lengkap di sini..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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
                  {modalSubmitting ? 'Menyimpan...' : 'Simpan Catatan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesPage;

