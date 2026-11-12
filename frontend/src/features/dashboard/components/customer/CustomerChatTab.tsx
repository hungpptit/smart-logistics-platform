import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send,
  Bot,
  User,
  Sparkles,
  RotateCcw,
  HelpCircle,
  Paperclip,
  X,
  Maximize2,
  Clock,
  MessageSquarePlus,
  Plus,
  Package,
  Search,
  Truck,
  DollarSign,
  Calculator,
  Building,
  XCircle,
  Edit3,
  Headphones,
  Check,
} from 'lucide-react';
import { CONFIG } from '../../../../config';
import {
  ActionConfirmationCard,
  DraftOrderCard,
  EscalationCard,
  OrderListInteractiveCard,
  OrderPickerModal,
} from './ActionCards';
import type { ActionData } from './ActionCards';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  image?: string;
  timestamp: string;
  toolsUsed?: string[];
  actionData?: ActionData;
}

const QUICK_QUESTIONS = [
  'Đơn hàng của tôi đang ở đâu?',
  'Tôi muốn hủy đơn hàng',
  'Đổi số điện thoại / địa chỉ nhận hàng',
  'Tính phí gửi 2kg khoảng 12km gói Tiêu chuẩn',
  'Tôi muốn gặp nhân viên CSKH',
];

export const CustomerChatTab: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: 'Xin chào quý khách! Em là Trợ lý AI CSKH của Velocity. Em có thể giải đáp mọi thắc mắc của quý khách về quy trình đặt đơn, đổi tài xế, hủy đơn, cách tính cước và chính sách bồi thường theo đúng cẩm nang chính thức. Quý khách có thể bấm nút [+ Chọn đơn hàng] để tra cứu đơn thực tế của mình hoặc đặt câu hỏi bất kỳ nhé!',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isSessionClosed, setIsSessionClosed] = useState<boolean>(false);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const reminderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /**
   * Hủy các bộ đếm thời gian timeout khi người dùng có hoạt động mới
   */
  const clearInactivityTimers = useCallback(() => {
    if (reminderTimeoutRef.current) {
      clearTimeout(reminderTimeoutRef.current);
      reminderTimeoutRef.current = null;
    }
    if (closingTimeoutRef.current) {
      clearTimeout(closingTimeoutRef.current);
      closingTimeoutRef.current = null;
    }
  }, []);

  /**
   * Kích hoạt bộ đếm thời gian không hoạt động (Shopee CSKH Style)
   * - 3 phút (180.000ms): Tự động gửi tin nhắn hỏi thăm còn thắc mắc gì nữa không.
   * - 5 phút (300.000ms): Tự động đóng phiên chat và khóa khung nhập.
   */
  const startInactivityTimers = useCallback(
    (convId: string) => {
      clearInactivityTimers();
      if (!convId || isSessionClosed) return;

      // Mốc 3 phút (180.000ms)
      reminderTimeoutRef.current = setTimeout(async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${CONFIG.API_BASE_URL}/chat/customer/timeout-check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ conversationId: convId, action: 'REMINDER_3M' }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.action === 'REMINDED' && data.message) {
            setMessages((prev) => [...prev, data.message]);
          }
        } catch (err) {
          console.error('Lỗi khi kích hoạt timeout nhắc nhở 3 phút:', err);
        }
      }, 3 * 60 * 1000);

      // Mốc 5 phút (300.000ms)
      closingTimeoutRef.current = setTimeout(async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`${CONFIG.API_BASE_URL}/chat/customer/timeout-check`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ conversationId: convId, action: 'CLOSE_5M' }),
          });
          const data = await res.json();
          if (res.ok && data.success && data.action === 'CLOSED') {
            if (data.message) {
              setMessages((prev) => [...prev, data.message]);
            }
            setIsSessionClosed(true);
          }
        } catch (err) {
          console.error('Lỗi khi kích hoạt timeout đóng phiên 5 phút:', err);
        }
      }, 5 * 60 * 1000);
    },
    [clearInactivityTimers, isSessionClosed]
  );

  /**
   * Tự động tải lại lịch sử cuộc trò chuyện gần nhất từ Database khi mở tab (Phương án A)
   */
  useEffect(() => {
    const fetchActiveConversation = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setInitialLoading(false);
          return;
        }

        const res = await fetch(`${CONFIG.API_BASE_URL}/chat/customer/active`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();
        if (res.ok && data.success && data.data) {
          if (data.data.conversationId) {
            setConversationId(data.data.conversationId);
          }
          if (Array.isArray(data.data.messages) && data.data.messages.length > 0) {
            setMessages(data.data.messages);
          }
          if (data.data.isClosed) {
            setIsSessionClosed(true);
          } else {
            setIsSessionClosed(false);
            if (data.data.conversationId && Array.isArray(data.data.messages) && data.data.messages.length > 0) {
              const last = data.data.messages[data.data.messages.length - 1];
              if (last && last.sender === 'ai') {
                startInactivityTimers(data.data.conversationId);
              }
            }
          }
        }
      } catch (err) {
        console.error('Lỗi khi tải lịch sử cuộc trò chuyện:', err);
      } finally {
        setInitialLoading(false);
      }
    };

    fetchActiveConversation();

    return () => {
      clearInactivityTimers();
    };
  }, [clearInactivityTimers, startInactivityTimers]);

  useEffect(() => {
    if (!initialLoading) {
      scrollToBottom();
    }
  }, [messages, loading, initialLoading]);

  /**
   * Xử lý khi người dùng chọn đính kèm file ảnh
   * Tự động nén kích thước để gửi nhanh và mượt mà qua API
   */
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (PNG, JPG, JPEG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 1200;
        let width = img.width;
        let height = img.height;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedImage(compressedBase64);
        } else {
          setSelectedImage(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    e.target.value = '';
  };

  /**
   * Bắt đầu một phiên trò chuyện mới sạch sẽ
   */
  const handleResetChat = async () => {
    clearInactivityTimers();
    setIsSessionClosed(false);
    setSelectedImage(null);

    let newId: string | null = null;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${CONFIG.API_BASE_URL}/chat/customer/new`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.conversationId) {
        newId = data.data.conversationId;
        setConversationId(newId);
      } else {
        setConversationId(null);
      }
    } catch (err) {
      console.error('Lỗi khi tạo phiên trò chuyện mới:', err);
      setConversationId(null);
    }

    setMessages([
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Cuộc trò chuyện đã được làm mới. Quý khách cần tra cứu hoặc hỗ trợ thông tin gì ạ?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);

    return newId;
  };

  /**
   * Xác nhận thực hiện hành động ghi (Hủy đơn, Đổi thông tin giao hàng, Hẹn ngày giao)
   */
  const handleConfirmAction = async (
    token: string,
    actionType: string
  ): Promise<{ success: boolean; message: string }> => {
    try {
      const authToken = localStorage.getItem('token');
      const res = await fetch(`${CONFIG.API_BASE_URL}/chat/customer/confirm-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ token, actionType }),
      });
      const data = await res.json();
      return {
        success: res.ok && data.success,
        message: data.message || 'Hành động đã được thực hiện thành công trên hệ thống.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Lỗi kết nối khi xác nhận hành động.',
      };
    }
  };

  /**
   * Hủy bỏ yêu cầu hành động (Khi khách hàng bấm nút [Hủy bỏ])
   */
  const handleCancelAction = async (token: string): Promise<void> => {
    try {
      const authToken = localStorage.getItem('token');
      await fetch(`${CONFIG.API_BASE_URL}/chat/customer/cancel-action`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.warn('Lỗi khi gửi yêu cầu hủy bỏ token hành động:', err);
    }
  };

  /**
   * Xử lý khi người dùng chọn một hành động trên đơn hàng từ OrderPicker hoặc OrderListCard
   */
  const handleOrderPickerSelect = (actionText: string, autoSend: boolean = true) => {
    if (autoSend) {
      handleSend(actionText);
    } else {
      setInput(actionText);
    }
  };

  /**
   * Gửi tin nhắn câu hỏi tới AI
   */
  const handleSend = async (questionText?: string) => {
    const textToSend = (questionText || input).trim();
    if ((!textToSend && !selectedImage) || loading) return;

    // Người dùng đã tương tác: hủy mọi timer timeout cũ ngay lập tức
    clearInactivityTimers();

    let targetConvId = conversationId;

    // Nếu phiên trước đó đã bị đóng, tự động tạo mới phiên chat trước khi gửi
    if (isSessionClosed) {
      targetConvId = await handleResetChat();
    }

    const currentImage = selectedImage;
    const displayText =
      textToSend || 'Kiểm tra hình ảnh kiện hàng này giúp tôi và hướng dẫn quy trình bồi thường / khiếu nại.';

    const userMsgId = `user-${Date.now()}`;
    const newMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: displayText,
      image: currentImage || undefined,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    if (!questionText) setInput('');
    setSelectedImage(null);
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${CONFIG.API_BASE_URL}/chat/customer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          message: displayText,
          image: currentImage || undefined,
          conversationId: targetConvId || undefined,
          conversationHistory: messages.slice(-4),
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const updatedConvId = data.data.conversationId || targetConvId;
        if (updatedConvId) {
          setConversationId(updatedConvId);
        }

        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolsUsed: Array.isArray(data.data?.toolsUsed) ? data.data.toolsUsed : undefined,
          actionData: data.data?.actionData || undefined,
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Sau khi AI phản hồi, bắt đầu đếm ngược 3 phút & 5 phút không hoạt động
        if (updatedConvId) {
          startInactivityTimers(updatedConvId);
        }
      } else {
        const errorMsg: ChatMessage = {
          id: `ai-err-${Date.now()}`,
          sender: 'ai',
          text:
            data.message ||
            'Xin lỗi quý khách, hệ thống AI đang bận xử lý. Quý khách vui lòng thử lại sau giây lát ạ!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      console.error('Lỗi kết nối tới AI Service:', err);
      const errorMsg: ChatMessage = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: 'Không thể kết nối đến máy chủ trợ lý AI. Quý khách vui lòng kiểm tra kết nối mạng hoặc thử lại.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Render văn bản Markdown (Tiêu đề ###, In đậm **, danh sách gạch đầu dòng -, inline code)
   */
  const renderFormattedText = (content: string, isUser: boolean) => {
    const lines = content.split('\n');
    return lines.map((line, lineIdx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return <div key={lineIdx} className="h-2" />;
      }

      // Hỗ trợ tiêu đề markdown ### hoặc ##
      if (trimmed.startsWith('### ') || trimmed.startsWith('## ') || trimmed.startsWith('#### ')) {
        const headingText = trimmed.replace(/^#{2,4}\s+/, '');
        return (
          <h4
            key={lineIdx}
            className={`font-extrabold text-sm mt-2 mb-1 ${isUser ? 'text-white' : 'text-[#bc0100]'
              }`}
          >
            {headingText}
          </h4>
        );
      }

      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ');
      const displayLine = isBullet ? trimmed.replace(/^[-*•]\s+/, '') : trimmed;

      // Tách các đoạn in đậm **text** hoặc code `text`
      const parts: React.ReactNode[] = [];
      const regex = /(\*\*.*?\*\*|`.*?`)/g;
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(displayLine)) !== null) {
        if (match.index > lastIndex) {
          parts.push(displayLine.substring(lastIndex, match.index));
        }
        const token = match[0];
        if (token.startsWith('**') && token.endsWith('**')) {
          parts.push(
            <strong
              key={`${lineIdx}-${match.index}`}
              className={isUser ? 'font-bold text-white' : 'font-bold text-[#161D25]'}
            >
              {token.slice(2, -2)}
            </strong>
          );
        } else if (token.startsWith('`') && token.endsWith('`')) {
          parts.push(
            <code
              key={`${lineIdx}-${match.index}`}
              className={
                isUser
                  ? 'bg-black/20 text-white px-1 py-0.5 rounded text-xs font-mono'
                  : 'bg-red-50 text-[#bc0100] px-1 py-0.5 rounded text-xs font-mono font-semibold'
              }
            >
              {token.slice(1, -1)}
            </code>
          );
        }
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < displayLine.length) {
        parts.push(displayLine.substring(lastIndex));
      }

      if (isBullet) {
        return (
          <div key={lineIdx} className="flex items-start gap-2 my-1 pl-1">
            <span
              className={
                isUser ? 'text-white font-bold leading-tight' : 'text-[#bc0100] font-bold leading-tight'
              }
            >
              •
            </span>
            <div className="flex-1 leading-relaxed">{parts}</div>
          </div>
        );
      }

      return (
        <div key={lineIdx} className="my-0.5 leading-relaxed">
          {parts}
        </div>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-45px)] md:h-[calc(100vh-55px)] min-h-[600px] bg-white rounded-lg border border-[#e2e8f0] shadow-soft overflow-hidden font-montserrat">
      {/* Top Banner */}
      <div className="bg-[#161D25] text-white px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#bc0100] flex items-center justify-center text-white shadow-md">
            <Bot size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-sm uppercase tracking-wider text-white">Trợ lý AI Velocity</h3>
              <span className="flex items-center gap-1 text-[10px] font-bold bg-[#bc0100] text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                <Sparkles size={10} /> RAG & Tools
              </span>
              {/* Badge trạng thái phiên trò chuyện */}
              {isSessionClosed ? (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-900/80 text-amber-200 border border-amber-600/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <Clock size={10} /> Đã đóng
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 px-2 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Đang kết nối
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Hỗ trợ tra cứu chính sách và giám định hình ảnh kiện hàng hư hỏng trực tuyến
            </p>
          </div>
        </div>

        <button
          onClick={handleResetChat}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold text-gray-300 hover:text-white hover:bg-gray-800 transition-colors border border-gray-700 cursor-pointer"
          title="Bắt đầu cuộc trò chuyện mới"
        >
          <RotateCcw size={14} />
          <span className="hidden sm:inline">Làm mới</span>
        </button>
      </div>

      {/* Suggested Quick Questions */}
      <div className="bg-[#F8FAFC] border-b border-gray-200 px-6 py-2.5 overflow-x-auto flex items-center gap-2 scrollbar-thin">
        <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <HelpCircle size={13} className="text-[#bc0100]" /> Gợi ý:
        </span>

        {QUICK_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(q)}
            disabled={loading}
            className="shrink-0 text-xs font-medium text-gray-700 bg-white hover:bg-[#bc0100] hover:text-white border border-gray-300 hover:border-[#bc0100] px-3 py-1 rounded-full transition-all cursor-pointer shadow-2xs disabled:opacity-50"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages List Area */}
      <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-[#FBFBFB]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.sender === 'user' ? 'bg-gray-700 text-white' : 'bg-[#bc0100] text-white shadow-xs'
                }`}
            >
              {msg.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
            </div>

            {/* Bubble Content */}
            <div className={`flex flex-col gap-1 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.sender === 'user'
                    ? 'bg-[#bc0100] text-white rounded-tr-none shadow-sm'
                    : 'bg-white text-[#161D25] border border-gray-200 rounded-tl-none shadow-soft'
                  }`}
              >
                {/* Ảnh đính kèm nếu có */}
                {msg.image && (
                  <div
                    className="mb-2 relative group cursor-pointer w-fit overflow-hidden rounded-lg border border-black/10"
                    onClick={() => setPreviewModalImage(msg.image || null)}
                    title="Bấm để xem ảnh phóng to"
                  >
                    <img
                      src={msg.image}
                      alt="Ảnh đính kèm"
                      className="max-h-56 max-w-xs sm:max-w-sm rounded-lg object-cover transition-transform duration-200 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1.5">
                      <Maximize2 size={16} /> Phóng to
                    </div>
                  </div>
                )}

                {/* Hiển thị huy hiệu các công cụ vừa thực thi thời gian thực */}
                {msg.toolsUsed && msg.toolsUsed.length > 0 && (
                  <div className="mb-2.5 flex flex-wrap gap-1.5">
                    {msg.toolsUsed.map((tool, tIdx) => (
                      <span
                        key={tIdx}
                        className="inline-flex items-center gap-1 text-[10px] font-bold bg-red-50 text-[#bc0100] border border-red-200 px-2 py-0.5 rounded-md"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-[#bc0100] animate-pulse" />
                        {tool === 'track_order' && <><Search size={10} className="stroke-[2.5]" /> Tra cứu lộ trình đơn</>}
                        {tool === 'get_customer_orders' && <><Package size={10} className="stroke-[2.5]" /> Danh sách đơn hàng</>}
                        {tool === 'get_order_details' && <><DollarSign size={10} className="stroke-[2.5]" /> Chi tiết kiện & cước</>}
                        {tool === 'get_assigned_shipper' && <><Truck size={10} className="stroke-[2.5]" /> Thông tin shipper</>}
                        {tool === 'estimate_shipping_fee' && <><Calculator size={10} className="stroke-[2.5]" /> Ước tính giá cước</>}
                        {tool === 'find_nearest_station' && <><Building size={10} className="stroke-[2.5]" /> Bưu cục gần nhất</>}
                        {tool === 'cancel_order' && <><XCircle size={10} className="stroke-[2.5]" /> Yêu cầu hủy đơn</>}
                        {tool === 'update_delivery_info' && <><Edit3 size={10} className="stroke-[2.5]" /> Đổi thông tin giao hàng</>}
                        {tool === 'create_draft_order' && <><Package size={10} className="stroke-[2.5]" /> Tạo đơn hàng nháp</>}
                        {tool === 'escalate_to_human' && <><Headphones size={10} className="stroke-[2.5]" /> Chuyển tổng đài CSKH</>}
                        {![
                          'track_order',
                          'get_customer_orders',
                          'get_order_details',
                          'get_assigned_shipper',
                          'estimate_shipping_fee',
                          'find_nearest_station',
                          'cancel_order',
                          'update_delivery_info',
                          'reschedule_delivery',
                          'create_draft_order',
                          'escalate_to_human',
                        ].includes(tool) && tool}
                      </span>
                    ))}
                  </div>
                )}

                {renderFormattedText(msg.text, msg.sender === 'user')}

                {/* Nút bấm Chọn đơn hàng trực tiếp dưới tin nhắn phản hồi của AI nếu chưa có OrderList Card */}
                {msg.sender === 'ai' && !msg.actionData?.isOrderList && !msg.actionData?.requiresConfirmation && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center">
                    <button
                      type="button"
                      onClick={() => setIsOrderPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-[#bc0100] text-[#bc0100] hover:text-white border border-red-200 hover:border-[#bc0100] rounded-lg text-xs font-semibold transition-all shadow-2xs cursor-pointer"
                      title="Mở danh sách đơn hàng thực tế của bạn để chọn thao tác"
                    >
                      <Package size={13} className="stroke-[2.5]" />
                      <span>Chọn đơn hàng của bạn</span>
                    </button>
                  </div>
                )}

                {/* Render Thẻ Xác Nhận Hành Động (Action Confirmation Card 2 bước) */}
                {msg.actionData && msg.actionData.requiresConfirmation && (
                  <ActionConfirmationCard
                    actionData={msg.actionData}
                    onConfirm={handleConfirmAction}
                    onCancel={handleCancelAction}
                  />
                )}

                {/* Render Thẻ Đơn Hàng Nháp (Draft Order Card - khi không yêu cầu xác nhận 2 bước) */}
                {msg.actionData && !msg.actionData.requiresConfirmation && (msg.actionData.isDraft || msg.actionData.isDraftOrder) && (
                  <DraftOrderCard actionData={msg.actionData} />
                )}

                {/* Render Thẻ Chuyển Giao CSKH (Escalation Card) */}
                {msg.actionData && msg.actionData.isEscalation && (
                  <EscalationCard actionData={msg.actionData} />
                )}

                {/* Render Thẻ Danh Sách Đơn Hàng Tương Tác */}
                {msg.actionData && msg.actionData.isOrderList && msg.actionData.orders && (
                  <OrderListInteractiveCard
                    orders={msg.actionData.orders}
                    onSelectAction={handleOrderPickerSelect}
                  />
                )}
              </div>

              <span className="text-[10px] text-gray-400 px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-[#bc0100] text-white shrink-0 flex items-center justify-center shadow-xs">
              <Bot size={16} />
            </div>
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl rounded-tl-none shadow-soft flex items-center gap-2">
              {/* <span className="text-xs text-gray-500 font-medium">Trợ lý AI đang tra cứu cẩm nang và trả lời...</span> */}
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-[#bc0100] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span
                  className="w-2 h-2 rounded-full bg-[#bc0100] animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-[#bc0100] animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Bar / Session Closed Banner */}
      <div className="p-4 bg-white border-t border-gray-200">
        {isSessionClosed ? (
          /* Khối thông báo Đóng phiên trò chuyện (Shopee CSKH Style) */
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-2.5 text-left">
              <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
                <Clock size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Phiên trò chuyện đã tự động kết thúc do không nhận được phản hồi sau 5 phút
                </p>
                <p className="text-[11px] text-amber-700/90 mt-0.5">
                  Quý khách có thể bắt đầu phiên hỗ trợ mới bất cứ lúc nào bằng nút bên cạnh hoặc chọn câu hỏi gợi ý phía trên.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleResetChat}
              className="w-full sm:w-auto px-5 py-2.5 bg-[#bc0100] hover:bg-[#a00100] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer shrink-0"
            >
              <MessageSquarePlus size={15} />
              <span>Bắt đầu cuộc trò chuyện mới</span>
            </button>
          </div>
        ) : (
          /* Khung nhập tin nhắn hoạt động bình thường */
          <>
            {/* Thumbnail Preview khi đã chọn ảnh */}
            {selectedImage && (
              <div className="mb-2 flex items-center gap-2.5 bg-red-50 border border-red-200 p-2 rounded-lg w-fit">
                <div className="relative">
                  <img
                    src={selectedImage}
                    alt="Đã chọn"
                    className="w-14 h-14 object-cover rounded-md border border-red-300"
                  />
                  <button
                    type="button"
                    onClick={() => setSelectedImage(null)}
                    className="absolute -top-1.5 -right-1.5 bg-[#bc0100] text-white rounded-full p-0.5 hover:bg-black transition-colors cursor-pointer shadow"
                    title="Hủy ảnh này"
                  >
                    <X size={12} />
                  </button>
                </div>
                <div className="text-xs text-gray-700">
                  <p className="font-bold text-[#bc0100]">Đã đính kèm 1 ảnh</p>
                  <p className="text-[11px] text-gray-500">
                    AI sẽ phân tích tình trạng kiện hàng hoặc tem vận đơn
                  </p>
                </div>
              </div>
            )}

            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              {/* Nút bấm Đính kèm hình ảnh */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                title="Đính kèm hình ảnh kiện hàng hư hỏng hoặc phiếu giao hàng"
                className="p-3 text-gray-500 hover:text-[#bc0100] hover:bg-red-50 rounded-lg transition-colors border border-gray-300 cursor-pointer disabled:opacity-50 shrink-0"
              >
                <Paperclip size={18} />
              </button>

              {/* Nút bấm [+] Chọn đơn hàng của tôi */}
              <button
                type="button"
                onClick={() => setIsOrderPickerOpen(true)}
                disabled={loading}
                title="Mở danh sách đơn hàng của bạn để tra cứu hoặc xử lý (+)"
                className="p-3 text-gray-600 hover:text-[#bc0100] hover:bg-red-50 rounded-lg transition-colors border border-gray-300 cursor-pointer disabled:opacity-50 shrink-0 flex items-center justify-center gap-1"
              >
                <Plus size={13} className="stroke-[3] -mr-1 text-[#bc0100]" />
                <Package size={17} />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  clearInactivityTimers();
                }}
                placeholder={
                  selectedImage
                    ? 'Nhập mô tả thêm về ảnh (hoặc nhấn Gửi để AI phân tích ngay)...'
                    : 'Nhập câu hỏi của bạn (ví dụ: Làm thế nào để hủy đơn hàng?)...'
                }
                disabled={loading}
                className="flex-1 bg-gray-50 border border-gray-300 focus:border-[#bc0100] focus:ring-1 focus:ring-[#bc0100] rounded-lg px-4 py-3 text-sm text-gray-800 outline-none transition-all placeholder:text-gray-400"
              />

              <button
                type="submit"
                disabled={loading || (!input.trim() && !selectedImage)}
                className="bg-[#bc0100] hover:bg-[#a00100] disabled:bg-gray-300 text-white px-5 py-3 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer shadow-sm disabled:cursor-not-allowed shrink-0"
              >
                <span>Gửi</span>
                <Send size={15} />
              </button>
            </form>

            <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-gray-400">
              <span>* Hỗ trợ hỏi đáp chính sách và phân tích ảnh kiện hàng hư hỏng từ AI Velocity.</span>
              <span className="hidden sm:inline">Nhấn Enter để gửi</span>
            </div>
          </>
        )}
      </div>

      {/* Modal phóng to ảnh */}
      {previewModalImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-xs"
          onClick={() => setPreviewModalImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewModalImage}
              alt="Ảnh chi tiết"
              className="max-h-[85vh] max-w-full rounded-lg object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewModalImage(null)}
              className="absolute -top-3 -right-3 bg-white text-black hover:bg-gray-200 rounded-full p-1.5 shadow-lg cursor-pointer"
              title="Đóng"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Modal Chọn đơn hàng thực tế của khách hàng */}
      <OrderPickerModal
        isOpen={isOrderPickerOpen}
        onClose={() => setIsOrderPickerOpen(false)}
        onSelectAction={handleOrderPickerSelect}
      />
    </div>
  );
};
