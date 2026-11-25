import { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Loader2,
  AlertCircle,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { aiAPI } from '../../services/api';
import ActionProposalCard from './ActionProposalCard';

const SAMPLE_GOALS = [
  'Bantu buatkan rencana tugas prioritas tinggi untuk diselesaikan hari ini.',
  'Pecah proyek peluncuran fitur baru menjadi 3 subtugas terarah.',
  'Susun jadwal kerja produktif berdasarkan tenggat tugas yang paling mendesak.',
];

const SmartTaskPlannerModal = ({
  isOpen,
  onClose,
  onTasksChanged,
  targetTask = null,
}) => {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [planResult, setPlanResult] = useState(null);

  if (!isOpen) return null;

  const handleGeneratePlan = async (goalText = goal) => {
    const textToSubmit = goalText.trim() || (targetTask ? `Pecah dan rencanakan tugas: ${targetTask.title}` : '');
    if (!textToSubmit || loading) return;

    setLoading(true);
    setError(null);

    try {
      const res = await aiAPI.planSmartTasks({
        goal: textToSubmit,
        taskId: targetTask?.id || undefined,
      });

      if (res.data.success) {
        setPlanResult(res.data.data);
      }
    } catch (err) {
      console.error('Smart Planner Error:', err);
      const resErr = err.response?.data;
      setError(
        resErr?.message ||
          'Terjadi kesalahan saat merencanakan tugas dengan AI. Coba lagi sebentar.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProposalUpdated = (updatedProposal, result) => {
    // Beri tahu parent (TasksPage) agar me-refresh daftar tugas
    if (onTasksChanged) {
      onTasksChanged(updatedProposal, result);
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 65 }}>
      <div className="modal-content" style={{ maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header Modal */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: '8px',
                backgroundColor: 'var(--accent-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ fontSize: '1.1rem' }}>
                AI Smart Task Planner
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {targetTask
                  ? `Memecah tugas: "${targetTask.title}"`
                  : 'Rencanakan tugas & jadwal harian Anda secara otomatis'}
              </p>
            </div>
          </div>

          <button className="btn-icon-sm" onClick={onClose} aria-label="Tutup">
            <X size={18} />
          </button>
        </div>

        {/* Body Modal */}
        <div className="modal-body" style={{ overflowY: 'auto', padding: '1.25rem 0', flex: 1 }}>
          {/* Target / Sasaran Input */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
              Target atau Sasaran Perencanaan:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                className="input-field"
                placeholder={
                  targetTask
                    ? `Contoh: Pecah tugas "${targetTask.title}" menjadi langkah teknis`
                    : 'Contoh: Bantu buat rencana kerja hari ini berdasarkan tugas mendesak'
                }
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGeneratePlan()}
                disabled={loading}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-primary)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius)',
                }}
              />
              <button
                className="btn-primary"
                onClick={() => handleGeneratePlan()}
                disabled={(!goal.trim() && !targetTask) || loading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.65rem 1.1rem',
                  whiteSpace: 'nowrap',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menganalisis...</span>
                  </>
                ) : (
                  <>
                    <Send size={15} />
                    <span>Rencanakan</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Chips jika belum ada hasil */}
            {!planResult && !loading && (
              <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Contoh cepat:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {SAMPLE_GOALS.map((sg, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setGoal(sg);
                        handleGeneratePlan(sg);
                      }}
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.3rem 0.6rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      {sg}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger)',
                color: '#fca5a5',
                padding: '0.65rem 0.85rem',
                borderRadius: 'var(--radius)',
                fontSize: '0.82rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Hasil Rencana AI */}
          {planResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Analisis AI */}
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '1rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <Sparkles size={16} color="var(--accent)" />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Analisis Prioritas & Rekomendasi
                  </h4>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {planResult.analysis}
                </p>
                {planResult.scheduleRecommendation && (
                  <div
                    style={{
                      marginTop: '0.75rem',
                      paddingTop: '0.65rem',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.4rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <Calendar size={14} style={{ flexShrink: 0, marginTop: 2, color: 'var(--info)' }} />
                    <span><strong>Jadwal:</strong> {planResult.scheduleRecommendation}</span>
                  </div>
                )}
              </div>

              {/* Action Proposals Section */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Layers size={16} color="var(--accent)" />
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Usulan Tindakan ({planResult.proposals?.length || 0})
                    </h4>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Pilih Setujui untuk menerapkan ke Tasks
                  </span>
                </div>

                {planResult.proposals?.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    Tidak ada usulan tindakan tambahan yang diperlukan.
                  </p>
                ) : (
                  planResult.proposals?.map((prop) => (
                    <ActionProposalCard
                      key={prop.id}
                      proposal={prop}
                      onProposalUpdated={handleProposalUpdated}
                    />
                  ))
                )}
              </div>
            </div>
          )}

          {/* Info Banner */}
          <div
            style={{
              marginTop: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              padding: '0.5rem 0.75rem',
              borderRadius: 'var(--radius-sm)',
            }}
          >
            <HelpCircle size={14} style={{ flexShrink: 0 }} />
            <span>
              Perubahan pada daftar tugas hanya akan terjadi setelah Anda menekan tombol "Setujui & Terapkan" pada masing-masing usulan.
            </span>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default SmartTaskPlannerModal;
