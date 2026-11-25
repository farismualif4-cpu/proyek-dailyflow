import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Calendar,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Edit3,
  Trash2,
  PlusCircle,
  Clock,
} from 'lucide-react';
import { aiAPI } from '../../services/api';

const ActionProposalCard = ({ proposal, onProposalUpdated }) => {
  const [loading, setLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(proposal.status);
  const [error, setError] = useState(null);

  const handleApprove = async () => {
    if (loading || currentStatus !== 'PENDING') return;

    setLoading(true);
    setError(null);

    try {
      const res = await aiAPI.approveProposal(proposal.id);
      if (res.data.success) {
        setCurrentStatus('APPROVED');
        if (onProposalUpdated) {
          onProposalUpdated(res.data.data.proposal, res.data.data.result);
        }
      }
    } catch (err) {
      console.error('Gagal menyetujui usulan:', err);
      setError(err.response?.data?.message || 'Gagal menerapkan usulan tindakan.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (loading || currentStatus !== 'PENDING') return;

    setLoading(true);
    setError(null);

    try {
      const res = await aiAPI.rejectProposal(proposal.id);
      if (res.data.success) {
        setCurrentStatus('REJECTED');
        if (onProposalUpdated) {
          onProposalUpdated(res.data.data);
        }
      }
    } catch (err) {
      console.error('Gagal menolak usulan:', err);
      setError(err.response?.data?.message || 'Gagal menolak usulan tindakan.');
    } finally {
      setLoading(false);
    }
  };

  const getTypeMeta = (type) => {
    switch (type) {
      case 'CREATE_TASK':
        return {
          label: 'Buat Tugas Baru',
          icon: PlusCircle,
          color: 'var(--success)',
          bg: 'var(--success-bg)',
        };
      case 'BATCH_CREATE_TASKS':
        return {
          label: 'Pecah Menjadi Subtugas',
          icon: Layers,
          color: 'var(--accent)',
          bg: 'var(--accent-light)',
        };
      case 'UPDATE_TASK':
        return {
          label: 'Pembaruan Tugas',
          icon: Edit3,
          color: 'var(--info)',
          bg: 'var(--info-bg)',
        };
      case 'DELETE_TASK':
        return {
          label: 'Penghapusan Tugas',
          icon: Trash2,
          color: 'var(--danger)',
          bg: 'var(--danger-bg)',
        };
      default:
        return {
          label: 'Usulan AI',
          icon: Sparkles,
          color: 'var(--accent)',
          bg: 'var(--accent-light)',
        };
    }
  };

  const meta = getTypeMeta(proposal.type);
  const TypeIcon = meta.icon;
  const actionData = proposal.actionData || {};

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '1rem',
        margin: '0.75rem 0',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
      }}
    >
      {/* Header Usulan */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: '9999px',
              backgroundColor: meta.bg,
              color: meta.color,
            }}
          >
            <TypeIcon size={13} />
            <span>{meta.label}</span>
          </span>

          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Menunggu Persetujuan
          </span>
        </div>

        {/* Status Badge */}
        {currentStatus === 'APPROVED' && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--success)',
            }}
          >
            <CheckCircle size={14} />
            <span>Telah Diterapkan</span>
          </span>
        )}
        {currentStatus === 'REJECTED' && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-muted)',
            }}
          >
            <XCircle size={14} />
            <span>Ditolak</span>
          </span>
        )}
        {currentStatus === 'EXPIRED' && (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--warning)',
            }}
          >
            <Clock size={14} />
            <span>Kedaluwarsa</span>
          </span>
        )}
      </div>

      {/* Judul & Alasan Usulan */}
      <div>
        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
          {proposal.title}
        </h4>
        {proposal.reason && (
          <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic', display: 'flex', alignItems: 'flex-start', gap: '0.35rem' }}>
            <Sparkles size={13} style={{ flexShrink: 0, marginTop: 2, color: 'var(--accent)' }} />
            <span>Alasan: {proposal.reason}</span>
          </p>
        )}
      </div>

      {/* Detail Data Tindakan */}
      <div
        style={{
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 0.85rem',
          fontSize: '0.82rem',
        }}
      >
        {proposal.type === 'CREATE_TASK' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Prioritas:</span>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                {actionData.priority || 'MEDIUM'}
              </span>
              {actionData.dueDate && (
                <>
                  <span style={{ color: 'var(--border)' }}>•</span>
                  <Calendar size={13} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-secondary)' }}>
                    {new Date(actionData.dueDate).toLocaleDateString()}
                  </span>
                </>
              )}
            </div>
            {actionData.description && (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {actionData.description}
              </p>
            )}
          </div>
        )}

        {proposal.type === 'BATCH_CREATE_TASKS' && (
          <div>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Subtugas yang akan dibuat ({actionData.tasks?.length || 0}):
            </span>
            <ul style={{ paddingLeft: '1.2rem', margin: 0, color: 'var(--text-primary)' }}>
              {actionData.tasks?.map((t, idx) => (
                <li key={idx} style={{ marginBottom: '0.2rem' }}>
                  <span>{t.title}</span>
                  {t.priority && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent)', marginLeft: '0.5rem' }}>
                      ({t.priority})
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {proposal.type === 'UPDATE_TASK' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>
              Perubahan pada ID: <code>{actionData.taskId}</code>
            </span>
            {actionData.priority && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Prioritas baru: </span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{actionData.priority}</span>
              </div>
            )}
            {actionData.status && (
              <div>
                <span style={{ color: 'var(--text-muted)' }}>Status baru: </span>
                <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{actionData.status}</span>
              </div>
            )}
          </div>
        )}

        {proposal.type === 'DELETE_TASK' && (
          <span style={{ color: 'var(--danger)' }}>
            Tugas dengan ID <code>{actionData.taskId}</code> akan dihapus secara permanen.
          </span>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--danger)', fontSize: '0.8rem' }}>
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* Tombol Aksi Persetujuan */}
      {currentStatus === 'PENDING' && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '0.25rem' }}>
          <button
            onClick={handleReject}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.45rem 0.85rem',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-secondary)',
              fontSize: '0.82rem',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <XCircle size={14} />
            <span>Tolak</span>
          </button>

          <button
            onClick={handleApprove}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.45rem 1rem',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              background: 'linear-gradient(135deg, var(--accent) 0%, #4338ca 100%)',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.15s ease',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>Menerapkan...</span>
              </>
            ) : (
              <>
                <CheckCircle size={14} />
                <span>Setujui & Terapkan</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionProposalCard;
