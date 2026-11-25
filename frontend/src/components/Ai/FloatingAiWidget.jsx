import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  X,
  Send,
  Maximize2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Flame,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { aiAPI } from '../../services/api';
import MarkdownRenderer from './MarkdownRenderer';
import '../../pages/Ai/AiChat.css';

let widgetMsgCounter = 0;
const createWidgetTempMsg = (content) => {
  widgetMsgCounter += 1;
  return {
    id: `widget-temp-${widgetMsgCounter}`,
    role: 'user',
    content,
    createdAt: new Date().toISOString(),
  };
};

const FloatingAiWidget = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  const [quota, setQuota] = useState({
    used: 0,
    limit: 30,
    remaining: 30,
  });

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Jangan tampilkan jika belum login atau sedang berada di halaman `/ai`
  const isAiPage = location.pathname === '/ai';

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [isOpen, messages, scrollToBottom]);

  // Muat status kuota ketika widget pertama kali dibuka
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      aiAPI
        .getQuota()
        .then((res) => {
          if (res.data.success) {
            setQuota(res.data.data);
          }
        })
        .catch((err) => console.error('Gagal memuat kuota di widget:', err));
    }
  }, [isOpen, isAuthenticated]);

  if (!isAuthenticated || isAiPage) {
    return null;
  }

  const handleSendMessage = async (text = inputMessage) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    if (quota.remaining <= 0) {
      setError('Kuota AI hari ini telah habis (30/30).');
      return;
    }

    const tempUserMsg = createWidgetTempMsg(trimmed);

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputMessage('');
    setError(null);
    setSending(true);

    try {
      const res = await aiAPI.chat({
        message: trimmed,
        conversationId: conversationId || undefined,
      });

      if (res.data.success) {
        const { conversationId: newConvId, message, quota: newQuota } = res.data.data;
        if (!conversationId) {
          setConversationId(newConvId);
        }
        setMessages((prev) => [...prev, message]);
        if (newQuota) {
          setQuota(newQuota);
        }
      }
    } catch (err) {
      console.error('Widget chat error:', err);
      const resError = err.response?.data;
      setError(
        resError?.message ||
          'Gagal mengirim ke AI. Silakan coba lagi sebentar.'
      );
      if (resError?.quota) {
        setQuota(resError.quota);
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleOpenFullPage = () => {
    setIsOpen(false);
    navigate('/ai');
  };

  return (
    <div className="ai-fab-container">
      {/* Popup Window */}
      {isOpen && (
        <div className="ai-fab-popup">
          {/* Header */}
          <div className="ai-fab-header">
            <div className="ai-fab-title">
              <Sparkles size={18} color="var(--accent)" />
              <span>DailyFlow AI</span>
            </div>

            <div className="ai-fab-header-tools">
              <span
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  backgroundColor: 'var(--bg-primary)',
                  color: quota.remaining === 0 ? 'var(--danger)' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                }}
              >
                Sisa: {quota.remaining}
              </span>

              <button
                className="ai-fab-icon-btn"
                onClick={handleOpenFullPage}
                title="Buka Halaman Penuh AI"
                aria-label="Buka Halaman Penuh AI"
              >
                <Maximize2 size={16} />
              </button>

              <button
                className="ai-fab-icon-btn"
                onClick={() => setIsOpen(false)}
                title="Tutup Widget AI"
                aria-label="Tutup Widget AI"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Messages Body */}
          <div className="ai-fab-body">
            {error && (
              <div
                style={{
                  backgroundColor: 'var(--danger-bg)',
                  border: '1px solid var(--danger)',
                  color: '#fca5a5',
                  padding: '0.5rem 0.75rem',
                  borderRadius: 'var(--radius)',
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                }}
              >
                <AlertCircle size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {messages.length === 0 ? (
              <div
                style={{
                  margin: 'auto',
                  textAlign: 'center',
                  padding: '1rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: 'var(--accent-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--accent)',
                    margin: '0 auto 0.75rem',
                  }}
                >
                  <Sparkles size={22} />
                </div>
                <h4 style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
                  Ada yang bisa saya bantu?
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                  Saya siap menganalisis tugas, catatan, dan kebiasaan Anda.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Apa tugas paling prioritas yang harus saya selesaikan hari ini?'
                      )
                    }
                    style={{
                      textAlign: 'left',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <CheckCircle2 size={15} color="var(--accent)" />
                    <span>Prioritas tugas hari ini</span>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Bagaimana status kebiasaan harian saya hari ini?'
                      )
                    }
                    style={{
                      textAlign: 'left',
                      padding: '0.6rem 0.75rem',
                      borderRadius: 'var(--radius)',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      fontSize: '0.82rem',
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      cursor: 'pointer',
                    }}
                  >
                    <Flame size={15} color="var(--warning)" />
                    <span>Cek status kebiasaan</span>
                  </button>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id || `${msg.role}-${msg.createdAt}`}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                    }}
                  >
                    <div
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: 'var(--radius)',
                        fontSize: '0.86rem',
                        lineHeight: 1.5,
                        backgroundColor: isUser ? 'var(--accent)' : 'var(--bg-card)',
                        color: isUser ? '#ffffff' : 'var(--text-primary)',
                        border: isUser ? 'none' : '1px solid var(--border)',
                        borderBottomRightRadius: isUser ? 2 : 'var(--radius)',
                        borderBottomLeftRadius: !isUser ? 2 : 'var(--radius)',
                      }}
                    >
                      {isUser ? (
                        <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                      ) : (
                        <MarkdownRenderer content={msg.content} />
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  padding: '0.5rem 0.75rem',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)',
                }}
              >
                <Loader2 size={14} className="animate-spin" />
                <span>AI sedang berpikir...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="ai-fab-footer">
            <div className="ai-fab-input-box">
              <input
                ref={inputRef}
                type="text"
                className="ai-fab-input"
                placeholder={
                  quota.remaining <= 0
                    ? 'Kuota harian habis'
                    : 'Tanyakan sesuatu pada AI...'
                }
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={sending || quota.remaining <= 0}
                maxLength={3000}
              />
              <button
                className="ai-send-btn"
                style={{ width: 30, height: 30, borderRadius: 8 }}
                onClick={() => handleSendMessage()}
                disabled={!inputMessage.trim() || sending || quota.remaining <= 0}
                aria-label="Kirim"
              >
                {sending ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Button */}
      <button
        className={`ai-fab-btn ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        title={isOpen ? 'Tutup AI' : 'Tanya AI DailyFlow'}
        aria-label="Toggle AI Assistant"
      >
        {isOpen ? (
          <X size={20} />
        ) : (
          <>
            <Sparkles size={18} />
            <span>Tanya AI</span>
          </>
        )}
      </button>
    </div>
  );
};

export default FloatingAiWidget;
