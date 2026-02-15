import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useP2PMessages, useP2PActions, P2POrder } from '@/hooks/useP2P';
import { useAuth } from '@/hooks/useAuth';
import { Send, Shield, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';

interface P2POrderChatProps {
  order: P2POrder;
  onBack: () => void;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'في الانتظار', color: 'bg-warning/10 text-warning', icon: <Clock className="h-4 w-4" /> },
  escrow_locked: { label: 'تم حجز المبلغ', color: 'bg-primary/10 text-primary', icon: <Shield className="h-4 w-4" /> },
  payment_sent: { label: 'تم إرسال الدفع', color: 'bg-warning/10 text-warning', icon: <Clock className="h-4 w-4" /> },
  payment_confirmed: { label: 'تم تأكيد الدفع', color: 'bg-success/10 text-success', icon: <CheckCircle className="h-4 w-4" /> },
  completed: { label: 'مكتملة', color: 'bg-success/10 text-success', icon: <CheckCircle className="h-4 w-4" /> },
  cancelled: { label: 'ملغاة', color: 'bg-destructive/10 text-destructive', icon: <XCircle className="h-4 w-4" /> },
  disputed: { label: 'نزاع مفتوح', color: 'bg-destructive/10 text-destructive', icon: <AlertTriangle className="h-4 w-4" /> },
};

export const P2POrderChat: React.FC<P2POrderChatProps> = ({ order, onBack, onRefresh }) => {
  const { messages, loading } = useP2PMessages(order.id);
  const { sendMessage, updateOrderStatus } = useP2PActions();
  const { user } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isBuyer = user?.id === order.buyer_id;
  const isSeller = user?.id === order.seller_id;
  const status = statusConfig[order.status] || statusConfig.pending;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    await sendMessage(order.id, newMessage.trim());
    setNewMessage('');
  };

  const handleAction = async (newStatus: string) => {
    setActionLoading(true);
    const result = await updateOrderStatus(order.id, newStatus);
    if (result) onRefresh();
    setActionLoading(false);
  };

  const timeLeft = order.payment_deadline 
    ? Math.max(0, new Date(order.payment_deadline).getTime() - Date.now()) 
    : 0;
  const minutesLeft = Math.floor(timeLeft / 60000);
  const isExpired = timeLeft <= 0 && ['escrow_locked', 'payment_sent'].includes(order.status);

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-h-[600px]">
      {/* Header */}
      <div className="border-b border-border p-3 space-y-2">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}>
            ← رجوع
          </Button>
          <Badge className={`${status.color} border-0 gap-1`}>
            {status.icon}
            {status.label}
          </Badge>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">المبلغ: <strong className="text-foreground">{order.amount.toLocaleString()} د.ج</strong></span>
          {minutesLeft > 0 && !['completed', 'cancelled', 'disputed'].includes(order.status) && (
            <span className="text-warning text-xs flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {minutesLeft} دقيقة متبقية
            </span>
          )}
        </div>

        {/* Action buttons based on status */}
        <div className="flex gap-2">
          {order.status === 'escrow_locked' && isBuyer && (
            <Button size="sm" className="flex-1" onClick={() => handleAction('payment_sent')} disabled={actionLoading}>
              تأكيد إرسال الدفع 💸
            </Button>
          )}
          {order.status === 'payment_sent' && isSeller && (
            <Button size="sm" className="flex-1 bg-success hover:bg-success/90" onClick={() => handleAction('completed')} disabled={actionLoading}>
              تأكيد الاستلام ✅
            </Button>
          )}
          {['escrow_locked', 'payment_sent'].includes(order.status) && (
            <>
              <Button size="sm" variant="outline" className="text-destructive" onClick={() => handleAction('disputed')} disabled={actionLoading}>
                فتح نزاع
              </Button>
              {((isBuyer && order.status === 'escrow_locked') || isExpired) && (
                <Button size="sm" variant="outline" onClick={() => handleAction('cancelled')} disabled={actionLoading}>
                  إلغاء
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.map(msg => {
          const isMe = msg.sender_id === user?.id;
          const isSystem = msg.is_system;

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
                  {msg.message}
                </span>
              </div>
            );
          }

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 ${
                isMe 
                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                  : 'bg-muted rounded-bl-sm'
              }`}>
                <p className="text-sm">{msg.message}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                  {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: ar })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!['completed', 'cancelled', 'dispute_resolved'].includes(order.status) && (
        <div className="border-t border-border p-3 flex gap-2">
          <Input
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="اكتب رسالة..."
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            className="flex-1"
          />
          <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
