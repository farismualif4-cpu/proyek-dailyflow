import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  MessageSquare,
  Trash2,
  Menu,
  X,
  AlertCircle,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Flame,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { aiAPI } from '../../services/api';
import MarkdownRenderer from '../../components/Ai/MarkdownRenderer';
import './AiChat.css';

const QUICK_PROMPTS = [
  {
    icon: CheckCircle2,
    title: 'Prioritas Tugas Hari Ini',
    subtitle: 'Analisis tugas mana yang harus diselesaikan terlebih dahulu',
    prompt: 'Berdasarkan tugas aktif saya, apa saja yang memiliki prioritas paling tinggi untuk diselesaikan hari ini?',
  },
  {
    icon: Flame,
    title: 'Evaluasi Kebiasaan',
    subtitle: 'Cek streak dan kebiasaan yang belum dicentang',
    prompt: 'Bagaimana status kebiasaan harian saya hari ini? Apakah ada kebiasaan yang belum saya check-in?',
  },
  {
    icon: FileText,
    title: 'Rangkuman Catatan',
    subtitle: 'Sintesis catatan terbaru menjadi poin tindakan',
    prompt: 'Tolong rangkum catatan-catatan terbaru saya dan berikan rekomendasi aksi berdasarkan isinya.',
  },
  {
    icon: Calendar,
    title: 'Rekomendasi Jadwal',
    subtitle: 'Susun rencana kerja berdasarkan tenggat & pengingat',
    prompt: 'Bantu saya menyusun jadwal kerja produktif untuk hari ini dengan mempertimbangkan tenggat tugas dan pengingat yang ada.',
  },
];

let tempMsgCounter = 0;
const createTempUserMessage = (content) => {
  tempMsgCounter += 1;
  return {
    id: `temp-${tempMsgCounter}`,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  };
};

const AiChatPage = () => {
  const { user } = useAuth();

  // State Utama
  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');

  // Status Loading & Error
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Status Kuota Harian
  const [quota, setQuota] = useState({
    used: 0,
    limit: 30,
    remaining: 30,
    isExceeded: false,
  });

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    conversation: null,
    isDeleting: false,
  });
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto scroll ke pesan terbawah
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Muat Daftar Percakapan
  const fetchConversations = useCallback(async () => {
    try {
      setLoadingConversations(true);
      const res = await aiAPI.getConversations();
      if (res.data.success) {
        setConversations(res.data.data);
      }
    } catch (err) {
      console.error('Gagal mengambil riwayat percakapan:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, []);

  // Inisialisasi halaman
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const [quotaRes, convRes] = await Promise.all([
          aiAPI.getQuota(),
          aiAPI.getConversations(),
        ]);
        if (isMounted) {
          if (quotaRes.data.success) {
            setQuota(quotaRes.data.data);
          }
          if (convRes.data.success) {
            setConversations(convRes.data.data);
          }
        }
      } catch (err) {
        console.error('Gagal inisialisasi AI Chat:', err);
      } finally {
        if (isMounted) {
          setLoadingConversations(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  // Buka percakapan tertentu
  const handleSelectConversation = async (convId) => {
    if (convId === activeConversationId || sending) return;

    setActiveConversationId(convId);
    setError(null);
    setLoadingMessages(true);
    setSidebarOpen(false);

    try {
      const res = await aiAPI.getConversationById(convId);
      if (res.data.success) {
        setMessages(res.data.data.messages || []);
      }
    } catch (err) {
      console.error('Gagal membuka percakapan:', err);
      setError('Gagal memuat percakapan. Percakapan mungkin telah dihapus.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // Buat Percakapan Baru
  const handleStartNewChat = () => {
    if (sending) return;
    setActiveConversationId(null);
    setMessages([]);
    setError(null);
    setInputMessage('');
    setSidebarOpen(false);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  // Kirim Pesan ke AI
  const handleSendMessage = async (textToSend = inputMessage) => {
    const trimmed = textToSend.trim();
    if (!trimmed || sending) return;

    if (quota.remaining <= 0) {
      setError(
        'Batas kuota AI harian Anda telah habis (30/30). Kuota akan direset otomatis pukul 00:00 UTC.'
      );
      return;
    }

    const tempUserMessage = createTempUserMessage(trimmed);

    setMessages((prev) => [...prev, tempUserMessage]);
    setInputMessage('');
    setError(null);
    setSending(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await aiAPI.chat({
        message: trimmed,
        conversationId: activeConversationId || undefined,
      });

      if (res.data.success) {
        const { conversationId, message, quota: updatedQuota } = res.data.data;

        // Jika sebelumnya belum ada activeConversationId, jadikan ini aktif
        if (!activeConversationId) {
          setActiveConversationId(conversationId);
        }

        setMessages((prev) => [...prev, message]);

        if (updatedQuota) {
          setQuota(updatedQuota);
        }

        // Refresh riwayat percakapan di sidebar
        fetchConversations();
      }
    } catch (err) {
      console.error('AI Chat error:', err);
      const resError = err.response?.data;

      if (err.response?.status === 429) {
        setError(
          resError?.message ||
            'Batas kuota harian atau rate limit AI tercapai. Harap tunggu beberapa saat.'
        );
        if (resError?.quota) {
          setQuota(resError.quota);
        }
      } else {
        setError(
          resError?.message ||
            'Terjadi kesalahan saat berkomunikasi dengan AI. Pastikan server terhubung dan coba lagi.'
        );
      }
    } finally {
      setSending(false);
    }
  };

  // Hapus Percakapan
  const confirmDeleteConversation = async () => {
    const conv = deleteModal.conversation;
    if (!conv) return;

    setDeleteModal((prev) => ({ ...prev, isDeleting: true }));

    try {
      await aiAPI.deleteConversation(conv.id);

      // Jika yang dihapus sedang aktif, reset chat
      if (activeConversationId === conv.id) {
        handleStartNewChat();
      }

      await fetchConversations();
      setDeleteModal({ isOpen: false, conversation: null, isDeleting: false });
    } catch (err) {
      console.error('Gagal menghapus percakapan:', err);
      alert('Gagal menghapus percakapan.');
      setDeleteModal((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  // Handle Enter key untuk kirim pesan
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto resize textarea
  const handleTextareaChange = (e) => {
    setInputMessage(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  };

  // Salin teks ke clipboard
  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Dapatkan Judul Percakapan Aktif
  const activeTitle =
    conversations.find((c) => c.id === activeConversationId)?.title ||
    'Percakapan Baru';

  const quotaPercent = Math.min(100, Math.round((quota.used / (quota.limit || 30)) * 100));
  const quotaStatusClass =
    quota.remaining === 0 ? 'danger' : quota.remaining <= 5 ? 'warning' : '';

  return (
    <div className="ai-page-container">
      {/* Mobile Backdrop */}
      {sidebarOpen && (
        <div
          className="modal-overlay"
          style={{ zIndex: 15 }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* --- Sidebar Riwayat Percakapan --- */}
      <aside className={`ai-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="ai-sidebar-header">
          <button
            className="ai-new-chat-btn"
            onClick={handleStartNewChat}
            disabled={sending}
          >
            <Plus size={18} />
            <span>Percakapan Baru</span>
          </button>

          {/* Indikator Kuota Harian */}
          <div className="ai-quota-card">
            <div className="ai-quota-header">
              <span>Kuota Harian AI</span>
              <span className={`ai-quota-badge ${quotaStatusClass}`}>
                {quota.used} / {quota.limit}
              </span>
            </div>
            <div className="ai-quota-progress-track">
              <div
                className={`ai-quota-progress-fill ${quotaStatusClass}`}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
            <span className="ai-quota-subtext">
              {quota.remaining > 0
                ? `Tersisa ${quota.remaining} permintaan hari ini`
                : 'Kuota harian Anda telah habis'}
            </span>
          </div>
        </div>

        <div className="ai-sidebar-content">
          <span className="ai-section-title">Riwayat Percakapan</span>

          {loadingConversations ? (
            <div className="ai-conv-empty">
              <Loader2 size={20} className="animate-spin" style={{ margin: 'auto' }} />
              <p style={{ marginTop: '0.5rem' }}>Memuat riwayat...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="ai-conv-empty">
              <MessageSquare size={24} style={{ opacity: 0.4, margin: 'auto' }} />
              <p style={{ marginTop: '0.5rem' }}>Belum ada riwayat percakapan</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={`ai-conv-item ${
                  activeConversationId === conv.id ? 'active' : ''
                }`}
                onClick={() => handleSelectConversation(conv.id)}
              >
                <div className="ai-conv-info">
                  <MessageSquare size={16} style={{ flexShrink: 0 }} />
                  <span className="ai-conv-title" title={conv.title}>
                    {conv.title}
                  </span>
                </div>
                <button
                  className="ai-conv-delete-btn"
                  title="Hapus percakapan"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteModal({
                      isOpen: true,
                      conversation: conv,
                      isDeleting: false,
                    });
                  }}
                  aria-label="Hapus percakapan"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* --- Main Chat Stage --- */}
      <section className="ai-chat-stage">
        {/* Header Chat */}
        <div className="ai-chat-header">
          <div className="ai-chat-header-title">
            <button
              className="ai-mobile-menu-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka riwayat percakapan"
            >
              <Menu size={18} />
            </button>
            <Sparkles size={20} color="var(--accent)" />
            <span>{activeTitle}</span>
          </div>

          <div className="ai-chat-header-actions">
            <div className="ai-header-pill" title="Sisa kuota AI hari ini">
              <Clock size={14} />
              <span>Sisa: {quota.remaining}</span>
            </div>
            {activeConversationId && (
              <button
                className="ai-header-pill"
                onClick={handleStartNewChat}
                style={{ cursor: 'pointer' }}
                title="Buka percakapan baru"
              >
                <Plus size={14} />
                <span>Chat Baru</span>
              </button>
            )}
          </div>
        </div>

        {/* Messages Stream */}
        <div className="ai-messages-container">
          {error && (
            <div className="ai-error-banner">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                style={{ color: 'inherit', cursor: 'pointer' }}
                aria-label="Tutup notifikasi error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {loadingMessages ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={32} className="animate-spin" style={{ margin: 'auto' }} />
              <p style={{ marginTop: '0.75rem', fontSize: '0.9rem' }}>
                Memuat pesan percakapan...
              </p>
            </div>
          ) : messages.length === 0 ? (
            /* --- Empty State / Welcome Screen --- */
            <div className="ai-empty-welcome">
              <div className="ai-hero-icon-wrapper">
                <Sparkles size={34} />
              </div>
              <h2 className="ai-welcome-title">
                Halo, {user?.name || 'Pengguna'}!
              </h2>
              <p className="ai-welcome-desc">
                Saya adalah asisten AI DailyFlow Anda. Saya memiliki akses aman
                ke seluruh tugas, catatan, kebiasaan, dan pengingat Anda untuk
                membantu merencanakan dan meningkatkan produktivitas harian Anda.
              </p>

              <div className="ai-prompt-grid">
                {QUICK_PROMPTS.map((qp, idx) => {
                  const Icon = qp.icon;
                  return (
                    <div
                      key={idx}
                      className="ai-prompt-card"
                      onClick={() => handleSendMessage(qp.prompt)}
                    >
                      <div className="ai-prompt-title">
                        <Icon size={17} color="var(--accent)" />
                        <span>{qp.title}</span>
                      </div>
                      <span className="ai-prompt-subtitle">{qp.subtitle}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* --- Message Thread --- */
            messages.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id || `${msg.role}-${msg.createdAt}`}
                  className={`ai-message-row ${isUser ? 'user' : 'assistant'}`}
                >
                  <div className="ai-msg-avatar">
                    {isUser ? (
                      user?.name?.slice(0, 2).toUpperCase() || 'ME'
                    ) : (
                      <Sparkles size={18} />
                    )}
                  </div>
                  <div className="ai-msg-bubble">
                    {isUser ? (
                      <p style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                    ) : (
                      <MarkdownRenderer content={msg.content} />
                    )}

                    <div className="ai-msg-footer">
                      <span>
                        {msg.createdAt
                          ? new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''}
                      </span>
                      {!isUser && (
                        <button
                          className="ai-msg-copy-btn"
                          onClick={() => handleCopyText(msg.content, msg.id)}
                          title="Salin jawaban AI"
                        >
                          {copiedId === msg.id ? (
                            <>
                              <Check size={12} color="var(--success)" />
                              <span style={{ color: 'var(--success)' }}>Tersalin</span>
                            </>
                          ) : (
                            <>
                              <Copy size={12} />
                              <span>Salin</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {/* Typing Indicator saat AI sedang berpikir */}
          {sending && (
            <div className="ai-message-row assistant">
              <div className="ai-msg-avatar">
                <Sparkles size={18} />
              </div>
              <div className="ai-typing-indicator">
                <div className="ai-dots-bounce">
                  <span />
                  <span />
                  <span />
                </div>
                <span>AI sedang menganalisis data produktivitas Anda...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="ai-chat-input-wrapper">
          <div className="ai-input-box">
            <textarea
              ref={textareaRef}
              rows={1}
              className="ai-textarea"
              placeholder={
                quota.remaining <= 0
                  ? 'Batas kuota harian telah tercapai (30/30)'
                  : 'Tanyakan apa saja tentang tugas, catatan, atau kebiasaan Anda...'
              }
              value={inputMessage}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              disabled={sending || quota.remaining <= 0}
              maxLength={3000}
            />
            <button
              className="ai-send-btn"
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim() || sending || quota.remaining <= 0}
              title="Kirim pesan (Enter)"
              aria-label="Kirim pesan"
            >
              {sending ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>

          <div className="ai-input-footer">
            <span>Enter untuk mengirim, Shift + Enter untuk baris baru</span>
            <span>{inputMessage.length} / 3000 karakter</span>
          </div>
        </div>
      </section>

      {/* --- Modal Konfirmasi Hapus Percakapan --- */}
      {deleteModal.isOpen && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal-content" style={{ maxWidth: 440 }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Trash2 size={18} color="var(--danger)" />
                <span>Hapus Percakapan</span>
              </h3>
              <button
                className="btn-icon-sm"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    conversation: null,
                    isDeleting: false,
                  })
                }
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '1rem 0' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                Apakah Anda yakin ingin menghapus percakapan{' '}
                <strong style={{ color: 'var(--text-primary)' }}>
                  "{deleteModal.conversation?.title}"
                </strong>
                ? Seluruh riwayat pesan di dalamnya akan dihapus permanen.
              </p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn-secondary"
                onClick={() =>
                  setDeleteModal({
                    isOpen: false,
                    conversation: null,
                    isDeleting: false,
                  })
                }
                disabled={deleteModal.isDeleting}
              >
                Batal
              </button>
              <button
                className="btn-danger"
                onClick={confirmDeleteConversation}
                disabled={deleteModal.isDeleting}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backgroundColor: 'var(--danger)',
                  color: '#fff',
                  padding: '0.55rem 1rem',
                  borderRadius: 'var(--radius)',
                }}
              >
                {deleteModal.isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Menghapus...</span>
                  </>
                ) : (
                  <span>Hapus Permanen</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AiChatPage;
