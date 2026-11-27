import React, { useCallback, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  AlertTriangle,
  Bot,
  Headphones,
  Loader2,
  MessageSquare,
  RefreshCw,
  Send,
  User,
  X,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { CONFIG } from '../../../config';

export interface SupportChatDriverTarget {
  id: string;
  userId?: string | null;
  fullName: string;
  employeeCode?: string;
  phone?: string;
  user?: {
    id: string;
    username: string;
  } | null;
  assignedFacility?: {
    facilityName: string;
    facilityCode: string;
  } | null;
  homeFacility?: {
    facilityName: string;
    facilityCode: string;
  } | null;
}

interface SupportChatMessageItem {
  id: string;
  conversationId?: string;
  role?: string;
  text: string;
  isUser: boolean;
  time: string;
  status?: string;
  imageUrl?: string;
  toolName?: string;
  senderName?: string;
  createdAt?: string;
}

interface DriverSupportChatModalProps {
  driver: SupportChatDriverTarget | null;
  onClose: () => void;
}

export const DriverSupportChatModal: React.FC<DriverSupportChatModalProps> = ({
  driver,
  onClose,
}) => {
  const { token: authToken } = useAuth();
  const token = authToken || localStorage.getItem('token') || '';
  const driverUserId = driver?.user?.id || driver?.userId || '';

  const [messages, setMessages] = useState<SupportChatMessageItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    });
  }, []);

  const fetchMessages = useCallback(
    async (silent = false) => {
      if (!driver || !driverUserId || !token) return;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const res = await fetch(
          `${CONFIG.API_BASE_URL}/chat/staff/driver/${driverUserId}/messages`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (res.ok && data.success) {
          const list = Array.isArray(data.data?.messages) ? data.data.messages : [];
          setMessages(list);
          setError(null);
          if (!silent) scrollToBottom();
        } else {
          setError(data.message || 'Không thể tải lịch sử trò chuyện với tài xế.');
        }
      } catch (err) {
        console.error('Lỗi tải tin nhắn hỗ trợ tài xế:', err);
        if (!silent) {
          setError('Lỗi kết nối máy chủ khi tải lịch sử hỗ trợ.');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [driver, driverUserId, token, scrollToBottom]
  );

  useEffect(() => {
    if (!driver || !driverUserId || !token) return;

    fetchMessages(false);

    const socketBaseUrl = CONFIG.API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    let socket: Socket | null = null;

    try {
      socket = io(socketBaseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });

      const joinRoom = () => {
        socket?.emit('join:driver_chat', { driverUserId }, (ack?: { success: boolean; message?: string }) => {
          if (ack && !ack.success && ack.message) {
            setError(ack.message);
          }
        });
      };

      socket.on('connect', joinRoom);

      socket.on('chat:driver_error', (payload: { driverUserId?: string; message?: string }) => {
        if (!payload?.driverUserId || payload.driverUserId === driverUserId) {
          setError(payload?.message || 'Không có quyền truy cập kênh hỗ trợ tài xế này.');
        }
      });

      socket.on(
        'chat:staff_driver_message',
        (payload: SupportChatMessageItem & { driverUserId?: string }) => {
          if (payload?.driverUserId && payload.driverUserId !== driverUserId) return;
          if (!payload?.id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === payload.id)) return prev;
            return [...prev, payload];
          });
          scrollToBottom();
        }
      );
    } catch (err) {
      console.error('Không thể kết nối Socket hỗ trợ tài xế:', err);
    }

    // Polling dự phòng mỗi 5 giây khi modal đang mở
    const pollInterval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (socket) {
        socket.emit('leave:driver_chat', { driverUserId });
        socket.off('connect');
        socket.off('chat:driver_error');
        socket.off('chat:staff_driver_message');
        socket.disconnect();
      }
    };
  }, [driver, driverUserId, token, fetchMessages, scrollToBottom]);

  if (!driver) return null;

  const facility = driver.assignedFacility || driver.homeFacility;

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending || !driverUserId || !token) return;

    setSending(true);
    setSendError(null);
    try {
      const res = await fetch(`${CONFIG.API_BASE_URL}/chat/staff/send-to-driver`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          driverUserId,
          message: content,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const created: SupportChatMessageItem | undefined = data.data?.message;
        setDraft('');
        if (created?.id) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === created.id)) return prev;
            return [...prev, created];
          });
        } else {
          await fetchMessages(true);
        }
        scrollToBottom();
      } else {
        setSendError(data.message || 'Gửi tin nhắn thất bại.');
      }
    } catch (err) {
      console.error('Lỗi gửi tin hỗ trợ tài xế:', err);
      setSendError('Lỗi kết nối máy chủ khi gửi tin nhắn.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#161D25]/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl border border-[#e2e8f0] shadow-2xl w-full max-w-2xl h-[78vh] max-h-[680px] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#161D25] text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#0059BA] flex items-center justify-center shrink-0">
              <MessageSquare size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold truncate">
                Hỗ trợ tài xế: {driver.fullName}
              </h3>
              <p className="text-[11px] text-gray-300 truncate">
                {driver.employeeCode || driver.user?.username || 'SHIPPER'}
                {driver.phone ? ` • ${driver.phone}` : ''}
                {facility ? ` • ${facility.facilityName}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => fetchMessages(false)}
              className="p-1.5 rounded hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
              title="Làm mới hội thoại"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded hover:bg-white/10 text-gray-200 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#F8FAFC] space-y-3">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400">
              <Loader2 size={28} className="animate-spin text-[#0059BA]" />
              <span className="text-xs font-semibold">Đang tải hội thoại...</span>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-center px-6">
              <AlertTriangle size={34} className="text-red-500" />
              <p className="text-xs font-bold text-red-600">{error}</p>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-2 text-gray-400 text-center px-6">
              <MessageSquare size={34} className="text-gray-300" />
              <p className="text-xs font-semibold">
                Chưa có tin nhắn nào. Hãy gửi thông báo hoặc hướng dẫn đầu tiên cho tài xế!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isStaffMsg = msg.toolName === 'STAFF_SUPPORT';
              const isDriverMsg = msg.isUser;
              const isStaffReply = msg.toolName === 'STAFF_SUPPORT_REPLY';

              if (isStaffMsg) {
                return (
                  <div key={msg.id} className="flex justify-end">
                    <div className="max-w-[78%] rounded-xl rounded-tr-xs bg-[#0059BA] text-white px-3.5 py-2.5 shadow-sm">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-100 mb-1">
                        <Headphones size={12} />
                        <span>{msg.senderName || 'Nhân viên Kho / Điều phối'}</span>
                      </div>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      <div className="text-[10px] text-blue-100/90 text-right mt-1">{msg.time}</div>
                    </div>
                  </div>
                );
              }

              return (
                <div key={msg.id} className="flex justify-start">
                  <div
                    className={`max-w-[78%] rounded-xl rounded-tl-xs px-3.5 py-2.5 border shadow-xs ${
                      isDriverMsg
                        ? 'bg-white border-[#e2e8f0] text-[#161D25]'
                        : 'bg-gray-100 border-gray-200 text-gray-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] font-bold mb-1 text-gray-500">
                      {isDriverMsg ? <User size={12} className="text-[#bc0100]" /> : <Bot size={12} className="text-gray-600" />}
                      <span>
                        {isDriverMsg
                          ? isStaffReply
                            ? `${driver.fullName} (Trả lời Điều phối)`
                            : `${driver.fullName} (Hỏi Trợ lý AI)`
                          : 'Trợ lý AI'}
                      </span>
                    </div>
                    {msg.imageUrl && (
                      <img
                        src={msg.imageUrl}
                        alt="Ảnh đính kèm từ tài xế"
                        className="max-h-44 rounded border border-gray-200 mb-1.5 object-cover"
                      />
                    )}
                    {msg.text && (
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                    )}
                    <div className="text-[10px] text-gray-400 mt-1">{msg.time}</div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Footer Form */}
        <form
          onSubmit={handleSend}
          className="p-3.5 border-t border-[#e2e8f0] bg-white flex flex-col gap-2 shrink-0"
        >
          {sendError && (
            <div className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              <span>{sendError}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              disabled={sending || Boolean(error)}
              placeholder="Nhập tin nhắn hỗ trợ hoặc điều phối cho tài xế..."
              className="flex-1 px-3.5 py-2 border border-[#e2e8f0] rounded-lg text-xs focus:border-[#0059BA] focus:ring-1 focus:ring-[#0059BA] outline-none disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim() || Boolean(error)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0059BA] hover:bg-[#004899] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>Gửi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
