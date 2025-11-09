import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useDigitalCards } from '@/hooks/useDigitalCards';
import { useBalance } from '@/hooks/useBalance';
import QRCode from 'qrcode';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  Gift, 
  Search, 
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  User,
  CreditCard,
  Plus,
  Download,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  FileText,
  ShoppingCart,
  Package,
  Info,
  XCircle
} from 'lucide-react';
import redotpayCard from '@/assets/redotpay-card.png';
import payeerCard from '@/assets/payeer-card.png';
import payeerLogo from '@/assets/payeer-logo.png';
import webmoneyCard from '@/assets/webmoney-card.png';
import skrillCard from '@/assets/skrill-card.png';
import perfectmoneyCard from '@/assets/perfectmoney-card.png';

interface GiftCard {
  id: string;
  card_code: string;
  amount: number;
  is_used: boolean;
  used_by: string | null;
  used_at: string | null;
  created_at: string;
  updated_at: string;
}

export default function CardsPage() {
  // Gift Cards State
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showGenerateDialog, setShowGenerateDialog] = useState(false);
  const [showCodes, setShowCodes] = useState<Record<string, boolean>>({});
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
  
  // Selection and bulk actions state
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  
  // Generation form state
  const [amount, setAmount] = useState<number>(1000);
  const [quantity, setQuantity] = useState<number>(10);
  const [generating, setGenerating] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);

  // Digital Cards State (from Shop)
  const { balance } = useBalance();
  const { cardTypes, feeSettings: digitalFeeSettings, orders, loading: digitalLoading, purchasing, purchaseCard } = useDigitalCards();
  const [selectedDigitalCard, setSelectedDigitalCard] = useState<any>(null);
  const [accountId, setAccountId] = useState('');
  const [amountUsd, setAmountUsd] = useState<string>('');
  const [showBalance, setShowBalance] = useState(true);

  const { toast } = useToast();

  // Fetch gift cards
  const fetchGiftCards = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('gift_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGiftCards(data || []);
    } catch (error) {
      console.error('Error fetching gift cards:', error);
      toast({
        title: "خطأ",
        description: "فشل في تحميل البطاقات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate secure random card code (11 digits + 1 check digit)
  const generateSecureCardCode = () => {
    // Generate 11 random digits
    const digits = [];
    for (let i = 0; i < 11; i++) {
      digits.push(Math.floor(Math.random() * 10));
    }
    
    // Calculate check digit using Luhn algorithm
    const checkDigit = calculateLuhnCheckDigit(digits);
    digits.push(checkDigit);
    
    return digits.join('');
  };

  // Luhn algorithm for check digit calculation
  const calculateLuhnCheckDigit = (digits: number[]) => {
    let sum = 0;
    let isEven = true;
    
    // Process digits from right to left (excluding check digit position)
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = digits[i];
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (10 - (sum % 10)) % 10;
  };

  // Check if card code is unique
  const isCodeUnique = async (code: string) => {
    const { data, error } = await supabase
      .from('gift_cards')
      .select('id')
      .eq('card_code', code)
      .maybeSingle();
    
    return !data; // Returns true if no existing card found
  };

  // Generate gift cards
  const generateGiftCards = async () => {
    if (amount <= 0 || quantity <= 0) {
      toast({
        title: "خطأ",
        description: "القيمة والكمية يجب أن تكون أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    if (quantity > 100) {
      toast({
        title: "خطأ",
        description: "لا يمكن إنشاء أكثر من 100 بطاقة في المرة الواحدة",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const cards = [];
      const generatedCodes = new Set<string>();
      
      // Generate unique codes
      for (let i = 0; i < quantity; i++) {
        let cardCode: string;
        let attempts = 0;
        const maxAttempts = 10;
        
        // Ensure uniqueness (both locally and in database)
        do {
          cardCode = generateSecureCardCode();
          attempts++;
          
          if (attempts > maxAttempts) {
            throw new Error('فشل في إنشاء كود فريد بعد محاولات متعددة');
          }
        } while (
          generatedCodes.has(cardCode) || 
          !(await isCodeUnique(cardCode))
        );
        
        generatedCodes.add(cardCode);
        cards.push({
          card_code: cardCode,
          amount: amount,
        });
      }

      const { data, error } = await supabase
        .from('gift_cards')
        .insert(cards)
        .select();

      if (error) throw error;

      toast({
        title: "نجح الأمر",
        description: `تم إنشاء ${quantity} بطاقة بنجاح`,
      });

      setShowGenerateDialog(false);
      setAmount(1000);
      setQuantity(10);
      fetchGiftCards();
    } catch (error) {
      console.error('Error generating gift cards:', error);
      toast({
        title: "خطأ",
        description: "فشل في إنشاء البطاقات",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Generate QR code for a card
  const generateQRCode = async (cardCode: string): Promise<string> => {
    try {
      const qrDataURL = await QRCode.toDataURL(cardCode, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      return qrDataURL;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return '';
    }
  };

  // Load QR codes for cards
  const loadQRCodes = async (cards: GiftCard[]) => {
    const newQrCodes: Record<string, string> = {};
    
    for (const card of cards) {
      const qrCode = await generateQRCode(card.card_code);
      newQrCodes[card.id] = qrCode;
    }
    
    setQrCodes(prev => ({ ...prev, ...newQrCodes }));
  };

  // Create professional front card design (without QR code)
  const createFrontCardHTML = (card: any) => {
    return `
      <div style="
        width: 340px;
        height: 215px;
        background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);
        border-radius: 16px;
        position: relative;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(79, 70, 229, 0.3);
      ">
        <!-- Background Pattern -->
        <div style="
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
            radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%);
        "></div>
        
        <!-- Chip -->
        <div style="
          position: absolute;
          top: 24px;
          left: 24px;
          width: 40px;
          height: 30px;
          background: linear-gradient(145deg, #FFD700, #FFA500);
          border-radius: 6px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        "></div>
        
        <!-- Top Section -->
        <div style="
          position: absolute;
          top: 24px;
          right: 24px;
          text-align: right;
        ">
          <h1 style="
            margin: 0;
            font-size: 32px;
            font-weight: 700;
            letter-spacing: -1px;
            text-shadow: 0 2px 4px rgba(0,0,0,0.3);
          ">OpaY</h1>
          <p style="
            margin: 0;
            font-size: 14px;
            opacity: 0.9;
            font-weight: 500;
          ">بطاقة شحن رقمية</p>
        </div>
        
        <!-- Main Amount - Centered -->
        <div style="
          position: absolute;
          left: 24px;
          right: 24px;
          top: 50%;
          transform: translateY(-50%);
          text-align: center;
        ">
          <p style="
            margin: 0;
            font-size: 48px;
            font-weight: 900;
            line-height: 1;
            text-shadow: 0 4px 8px rgba(0,0,0,0.4);
          ">${formatCurrency(card.amount)}</p>
        </div>
        
        <!-- Holographic Effect -->
        <div style="
          position: absolute;
          inset: 0;
          background: linear-gradient(
            45deg,
            transparent 30%,
            rgba(255,255,255,0.1) 50%,
            transparent 70%
          );
          border-radius: 16px;
        "></div>
      </div>
    `;
  };

  // Fee settings state
  const [feeSettings, setFeeSettings] = useState({
    companyFee: 1, // 1% للشركة
    merchantFee: 2 // 2% للتاجر
  });

  // Calculate pricing based on card value and current fee settings
  const calculatePricing = (cardValue: number) => {
    // Company sells to merchant: face value + company commission
    const merchantCost = cardValue + (cardValue * (feeSettings.companyFee / 100));
    // Merchant sells to customer: face value + total commission (company + merchant)
    const customerPrice = cardValue + (cardValue * ((feeSettings.companyFee + feeSettings.merchantFee) / 100));
    
    return {
      merchantCost: Math.round(merchantCost),
      customerPrice: Math.round(customerPrice),
      faceValue: cardValue, // User gets full face value when redeeming
      totalFeePercent: feeSettings.companyFee + feeSettings.merchantFee
    };
  };

  // Format code as 11 digits + '-' + check digit
  const formatCardCode = (code: string) => {
    const digits = (code || '').replace(/\D/g, '');
    if (digits.length >= 2) return `${digits.slice(0, -1)}-${digits.slice(-1)}`;
    return digits;
  };

  // Create professional back card design (with QR code and pricing)
  const createBackCardHTML = (card: any) => {
    const qrCode = qrCodes[card.id];
    const pricing = calculatePricing(card.amount);
    const formattedCardCode = formatCardCode(card.card_code);
    
    return `
      <div style="
        width: 340px;
        height: 215px;
        background: linear-gradient(135deg, #1F2937 0%, #374151 50%, #4B5563 100%);
        border-radius: 16px;
        position: relative;
        color: white;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        overflow: hidden;
        box-shadow: 0 20px 40px rgba(31, 41, 55, 0.3);
      ">
        <!-- Magnetic Strip with Pricing -->
        <div style="
          position: absolute;
          top: 40px;
          left: 0;
          right: 0;
          height: 40px;
          background: linear-gradient(90deg, #000000 0%, #1a1a1a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="
            color: #ffffff;
            font-size: 18px;
            font-weight: 800;
            text-align: center;
            direction: rtl;
            font-family: 'Arial', sans-serif;
            text-shadow: 0 1px 2px rgba(0,0,0,0.5);
          ">بيع: ${pricing.customerPrice} دج</div>
        </div>
        
        <!-- QR Code Section -->
        <div style="
          position: absolute;
          right: 24px;
          top: 90px;
          width: 100px;
          height: 100px;
          background: white;
          border-radius: 12px;
          padding: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        ">
          ${qrCode ? `<img src="${qrCode}" style="width: 84px; height: 84px; border-radius: 4px;" />` : '<div style="width: 84px; height: 84px; background: #f3f4f6; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 12px;">QR CODE</div>'}
        </div>
        
        <!-- Card Code Section -->
        <div style="
          position: absolute;
          bottom: 60px;
          left: 24px;
          right: 140px;
        ">
          <p style="
            margin: 0;
            font-size: 16px;
            font-family: 'Courier New', monospace;
            letter-spacing: 2px;
            font-weight: 600;
            background: rgba(255,255,255,0.1);
            padding: 12px;
            border-radius: 8px;
            backdrop-filter: blur(10px);
            text-align: center;
          ">${formattedCardCode}</p>
        </div>
        
        <!-- Footer -->
        <div style="
          position: absolute;
          bottom: 20px;
          left: 24px;
          right: 24px;
          text-align: center;
          font-size: 10px;
          opacity: 0.7;
        ">
          <span>OpaY Algeria</span>
        </div>
      </div>
    `;
  };

  // Export unused gift cards to PDF with ultra-professional design
  const exportToPDF = async () => {
    setExportingPDF(true);
    try {
      const unusedCards = giftCards.filter(card => !card.is_used);
      
      if (unusedCards.length === 0) {
        toast({
          title: "لا توجد بطاقات للتصدير",
          description: "جميع البطاقات مستخدمة أو لا توجد بطاقات",
          variant: "destructive",
        });
        return;
      }

      const pdf = new jsPDF('landscape', 'mm', 'a4'); // Landscape for better card layout
      const cardWidth = 85.6; // Standard credit card width in mm
      const cardHeight = 53.98; // Standard credit card height in mm
      const margin = 20;
      const spacing = 10;
      const cardsPerRow = 3; // 3 cards per row in landscape
      const rowsPerPage = 3; // 3 rows per page
      const cardsPerPage = cardsPerRow * rowsPerPage;

      // Add cover page
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.text('OpaY Gift Cards Collection', pdf.internal.pageSize.width / 2, 40, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Cards: ${unusedCards.length}`, pdf.internal.pageSize.width / 2, 60, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleDateString('ar-DZ', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pdf.internal.pageSize.width / 2, 75, { align: 'center' });
      
      pdf.setFontSize(10);
      pdf.text('Each card includes front design with QR code and back with security features', pdf.internal.pageSize.width / 2, 95, { align: 'center' });

      for (let i = 0; i < unusedCards.length; i++) {
        const card = unusedCards[i];
        const cardIndex = i % cardsPerPage;
        
        // Add new page for every new batch (front sides)
        if (cardIndex === 0) {
          pdf.addPage('landscape');
          // Add page header
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Gift Cards - Front Side (Page ${Math.floor(i / cardsPerPage) + 1})`, margin, 15);
        }
        
        // Calculate position
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;
        const x = margin + col * (cardWidth + spacing);
        const y = 25 + row * (cardHeight + spacing);
        
        // Create and render front card
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = createFrontCardHTML(card);
        document.body.appendChild(tempContainer);
        
        try {
          const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
            width: 340,
            height: 215,
            scale: 3, // Higher scale for better quality
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            logging: false
          });
          
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight, '', 'FAST');
          
        } catch (error) {
          console.warn('Failed to render front card:', error);
        }
        
        document.body.removeChild(tempContainer);
      }

      // Add back sides
      for (let i = 0; i < unusedCards.length; i++) {
        const card = unusedCards[i];
        const cardIndex = i % cardsPerPage;
        
        // Add new page for every new batch (back sides)
        if (cardIndex === 0) {
          pdf.addPage('landscape');
          // Add page header
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Gift Cards - Back Side (Page ${Math.floor(i / cardsPerPage) + 1})`, margin, 15);
        }
        
        // Calculate position
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;
        const x = margin + col * (cardWidth + spacing);
        const y = 25 + row * (cardHeight + spacing);
        
        // Create and render back card
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = createBackCardHTML(card);
        document.body.appendChild(tempContainer);
        
        try {
          const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
            width: 340,
            height: 215,
            scale: 3, // Higher scale for better quality
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
            logging: false
          });
          
          const imgData = canvas.toDataURL('image/png', 1.0);
          pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight, '', 'FAST');
          
        } catch (error) {
          console.warn('Failed to render back card:', error);
        }
        
        document.body.removeChild(tempContainer);
      }

      // Save with professional filename
      const timestamp = new Date().toISOString().split('T')[0];
      const fileName = `OpaY_Gift_Cards_Professional_${timestamp}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${unusedCards.length} بطاقة احترافية مع الوجه الأمامي والخلفي`,
      });
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير البطاقات إلى PDF",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
    }
  };

  // Delete gift card with confirmation
  const deleteGiftCard = async (cardId: string, cardCode: string) => {
    // Show confirmation dialog
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف البطاقة؟\n\nالكود: ${cardCode}\n\n⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه وسيتم حذف البطاقة نهائياً من قاعدة البيانات.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: "تم الحذف نهائياً",
        description: `تم حذف البطاقة ${cardCode} من قاعدة البيانات`,
      });
      
      // Refresh the list to reflect the deletion
      fetchGiftCards();
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast({
        title: "خطأ في الحذف",
        description: "فشل في حذف البطاقة من قاعدة البيانات",
        variant: "destructive",
      });
    }
  };

  // Bulk selection functions
  const handleSelectCard = (cardId: string, checked: boolean) => {
    setSelectedCards(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(cardId);
      } else {
        newSet.delete(cardId);
      }
      return newSet;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // Only select unused cards (as they can be deleted)
      const unusedCardIds = filteredCards
        .filter(card => !card.is_used)
        .map(card => card.id);
      setSelectedCards(new Set(unusedCardIds));
    } else {
      setSelectedCards(new Set());
    }
  };

  const bulkDeleteCards = async () => {
    if (selectedCards.size === 0) return;

    const selectedCardsList = Array.from(selectedCards);
    const cardsToDelete = giftCards.filter(card => selectedCardsList.includes(card.id));
    
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف ${selectedCards.size} بطاقة؟\n\n⚠️ تحذير: هذا الإجراء لا يمكن التراجع عنه وسيتم حذف البطاقات نهائياً من قاعدة البيانات.`
    );

    if (!confirmed) return;

    setBulkDeleteLoading(true);
    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .in('id', selectedCardsList);

      if (error) throw error;

      toast({
        title: "تم الحذف المتعدد بنجاح",
        description: `تم حذف ${selectedCards.size} بطاقة من قاعدة البيانات`,
      });

      setSelectedCards(new Set());
      fetchGiftCards();
    } catch (error) {
      console.error('Error bulk deleting cards:', error);
      toast({
        title: "خطأ في الحذف المتعدد",
        description: "فشل في حذف البطاقات المحددة",
        variant: "destructive",
      });
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  // Export gift cards
  const exportGiftCards = () => {
    const csvContent = [
      ['الكود', 'القيمة', 'الحالة', 'تاريخ الإنشاء'].join(','),
      ...filteredCards.map(card => [
        card.card_code,
        card.amount,
        card.is_used ? 'مستخدمة' : 'غير مستخدمة',
        new Date(card.created_at).toLocaleDateString('ar-DZ')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `gift_cards_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter cards
  const filteredCards = giftCards.filter(card => {
    const matchesSearch = 
      card.card_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      card.amount.toString().includes(searchTerm);
    
    const matchesStatus = 
      selectedStatus === 'all' || 
      (selectedStatus === 'used' && card.is_used) ||
      (selectedStatus === 'unused' && !card.is_used);
    
    return matchesSearch && matchesStatus;
  });

  // Statistics
  const totalCards = giftCards.length;
  const usedCards = giftCards.filter(c => c.is_used).length;
  const unusedCards = giftCards.filter(c => !c.is_used).length;
  const totalValue = giftCards.reduce((sum, card) => sum + (card.is_used ? 0 : card.amount), 0);
  
  // Selection statistics
  const selectableCards = filteredCards.filter(card => !card.is_used);
  const isAllSelected = selectableCards.length > 0 && selectedCards.size === selectableCards.length;
  const isPartiallySelected = selectedCards.size > 0 && selectedCards.size < selectableCards.length;

  React.useEffect(() => {
    fetchGiftCards();
  }, []);

  React.useEffect(() => {
    if (giftCards.length > 0) {
      loadQRCodes(giftCards);
    }
  }, [giftCards]);

  const toggleCodeVisibility = (cardId: string) => {
    setShowCodes(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toFixed(2)} دج`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ar-DZ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (card: GiftCard) => {
    if (card.is_used) {
      return (
        <Badge className="bg-red-100 text-red-800 border-red-200">
          <CheckCircle className="w-3 h-3 mr-1" />
          مستخدمة
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800 border-green-200">
          <Gift className="w-3 h-3 mr-1" />
          متاحة
        </Badge>
      );
    }
  };

  // Digital Cards Helper Functions
  const calculateTotal = (amount: number, exchangeRate: number) => {
    const amountDzd = amount * exchangeRate;
    let feeAmount = 0;
    
    if (digitalFeeSettings) {
      if (digitalFeeSettings.fee_type === 'percentage') {
        feeAmount = (amountDzd * digitalFeeSettings.fee_value) / 100;
      } else {
        feeAmount = digitalFeeSettings.fee_value;
      }
      
      if (digitalFeeSettings.min_fee) {
        feeAmount = Math.max(feeAmount, digitalFeeSettings.min_fee);
      }
      if (digitalFeeSettings.max_fee) {
        feeAmount = Math.min(feeAmount, digitalFeeSettings.max_fee);
      }
    }
    
    return {
      amountDzd,
      feeAmount,
      totalDzd: amountDzd + feeAmount
    };
  };

  const handleDigitalCardClick = (cardType: any) => {
    setSelectedDigitalCard(cardType);
    setAccountId('');
    setAmountUsd('');
  };

  const handleConfirmPurchase = async () => {
    if (!selectedDigitalCard || !accountId || !amountUsd) return;

    const amount = parseFloat(amountUsd);
    const result = await purchaseCard(selectedDigitalCard.id, accountId, amount);
    
    if (result.success) {
      setSelectedDigitalCard(null);
      setAccountId('');
      setAmountUsd('');
    }
  };

  const getDigitalStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-success/10 text-success border-success/20"><CheckCircle className="h-3 w-3 ml-1" />مكتمل</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />قيد المعالجة</Badge>;
      case 'processing':
        return <Badge variant="secondary"><Clock className="h-3 w-3 ml-1" />جاري المعالجة</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 ml-1" />فشل</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getProviderGradient = (provider: string) => {
    const gradients: { [key: string]: string } = {
      redotpay: 'from-red-500 via-red-600 to-red-700',
      payeer: 'from-blue-500 via-blue-600 to-blue-700',
      webmoney: 'from-purple-500 via-purple-600 to-purple-700',
      perfectmoney: 'from-yellow-500 via-yellow-600 to-yellow-700',
      skrill: 'from-violet-500 via-violet-600 to-violet-700',
    };
    return gradients[provider] || 'from-primary via-primary to-primary';
  };

  const getProviderLogo = (provider: string) => {
    const logos: { [key: string]: string } = {
      redotpay: redotpayCard,
      payeer: payeerCard,
      webmoney: webmoneyCard,
      perfectmoney: perfectmoneyCard,
      skrill: skrillCard,
    };
    return logos[provider];
  };

  const digitalAmount = parseFloat(amountUsd) || 0;
  const digitalTotals = selectedDigitalCard && digitalAmount > 0 ? calculateTotal(digitalAmount, selectedDigitalCard.exchange_rate) : null;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">بطاقات USD</h1>
          <p className="text-muted-foreground mt-2">
            إدارة بطاقات الهدايا والبطاقات الرقمية
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportGiftCards} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            تصدير CSV
          </Button>
          <Button 
            onClick={exportToPDF} 
            variant="outline"
            disabled={exportingPDF || giftCards.filter(c => !c.is_used).length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
          </Button>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                إنشاء بطاقات هدايا
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>إنشاء بطاقات جديدة</DialogTitle>
                <DialogDescription>
                  قم بتحديد قيمة وعدد البطاقات المراد إنشاؤها
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="amount">قيمة البطاقة (دج)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">عدد البطاقات</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    min="1"
                    max="100"
                  />
                </div>
                <Button 
                  onClick={generateGiftCards} 
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? 'جاري الإنشاء...' : 'إنشاء البطاقات'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tabs for different card types */}
      <Tabs defaultValue="gift-cards" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="gift-cards" className="gap-2">
            <Gift className="h-4 w-4" />
            بطاقات الهدايا
          </TabsTrigger>
          <TabsTrigger value="digital-cards" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            البطاقات الرقمية USD
          </TabsTrigger>
        </TabsList>

        {/* Gift Cards Tab */}
        <TabsContent value="gift-cards" className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">إجمالي البطاقات</CardTitle>
            <CreditCard className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCards}</div>
            <p className="text-xs text-muted-foreground">بطاقة منشأة</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">غير مستخدمة</CardTitle>
            <Gift className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{unusedCards}</div>
            <p className="text-xs text-muted-foreground">متاحة للبيع</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">مستخدمة</CardTitle>
            <CheckCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{usedCards}</div>
            <p className="text-xs text-muted-foreground">تم استردادها</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">القيمة المتاحة</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalValue)}
            </div>
            <p className="text-xs text-muted-foreground">في البطاقات المتاحة</p>
          </CardContent>
        </Card>
      </div>

      {/* Fee Settings Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-bold">إعدادات الرسوم</CardTitle>
          <p className="text-sm text-muted-foreground">
            تحكم في نسب الرسوم للشركة والتاجر
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="companyFee">رسوم الشركة (%)</Label>
              <Input
                id="companyFee"
                type="number"
                value={feeSettings.companyFee}
                onChange={(e) => setFeeSettings({
                  ...feeSettings,
                  companyFee: Math.max(0, Math.min(10, Number(e.target.value)))
                })}
                min="0"
                max="10"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="merchantFee">رسوم التاجر (%)</Label>
              <Input
                id="merchantFee"
                type="number"
                value={feeSettings.merchantFee}
                onChange={(e) => setFeeSettings({
                  ...feeSettings,
                  merchantFee: Math.max(0, Math.min(10, Number(e.target.value)))
                })}
                min="0"
                max="10"
                step="0.1"
              />
            </div>
            <div className="space-y-2">
              <Label>إجمالي الرسوم</Label>
              <div className="p-2 bg-muted rounded-md text-center font-bold">
                {(feeSettings.companyFee + feeSettings.merchantFee).toFixed(1)}%
              </div>
            </div>
          </div>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>مثال على بطاقة 1000 دج:</strong><br/>
              • سعر الشركة للتاجر: {calculatePricing(1000).merchantCost} دج<br/>
              • سعر التاجر للمستخدم: {calculatePricing(1000).customerPrice} دج<br/>
              • المستخدم يحصل على: 1000 دج (القيمة كاملة)
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>البحث والتصفية</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="البحث بالكود أو القيمة..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 border border-input rounded-md bg-background"
            >
              <option value="all">جميع الحالات</option>
              <option value="unused">غير مستخدمة</option>
              <option value="used">مستخدمة</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Gift Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>البطاقات ({filteredCards.length})</CardTitle>
          <CardDescription>
            عرض جميع بطاقات الشحن المنشأة
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Bulk Selection Controls */}
          {selectableCards.length > 0 && (
            <div className="mb-4 p-4 bg-muted/30 rounded-lg border border-dashed">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = isPartiallySelected;
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm font-medium">
                      {selectedCards.size > 0 
                        ? `تم اختيار ${selectedCards.size} من ${selectableCards.length} بطاقة`
                        : `اختيار الكل (${selectableCards.length} بطاقة متاحة)`
                      }
                    </span>
                  </label>
                </div>
                
                {selectedCards.size > 0 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCards(new Set())}
                    >
                      إلغاء التحديد
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={bulkDeleteCards}
                      disabled={bulkDeleteLoading}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {bulkDeleteLoading ? 'جاري الحذف...' : `حذف المحدد (${selectedCards.size})`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">جاري التحميل...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCards.map((card) => (
                <div key={card.id} className="border rounded-lg p-4 hover:bg-muted/20 transition-colors">
                  <div className="flex items-center justify-between">
                    {/* Selection checkbox */}
                    {!card.is_used && (
                      <div className="flex items-center mr-3">
                        <input
                          type="checkbox"
                          checked={selectedCards.has(card.id)}
                          onChange={(e) => handleSelectCard(card.id, e.target.checked)}
                          className="rounded border-gray-300"
                        />
                      </div>
                    )}
                    
                    <div className={`flex-1 ${card.is_used ? 'mr-0' : 'mr-3'}`}>
                      <div className="flex items-start gap-4 mb-2">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white">
                          <Gift className="h-5 w-5" />
                        </div>
                        <div className="flex items-start gap-4 flex-1">
                          {qrCodes[card.id] ? (
                            <div className="w-16 h-16 border rounded">
                              <img 
                                src={qrCodes[card.id]} 
                                alt="QR Code" 
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 border rounded bg-muted animate-pulse"></div>
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-mono text-xs">
                                {showCodes[card.id] ? formatCardCode(card.card_code) : '••••••••••••-•'}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => toggleCodeVisibility(card.id)}
                                className="h-6 w-6 p-0"
                              >
                                {showCodes[card.id] ? (
                                  <EyeOff className="h-3 w-3" />
                                ) : (
                                  <Eye className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">
                                {formatCurrency(card.amount)}
                              </span>
                              <span>•</span>
                              <span>
                                {formatDate(card.created_at)}
                              </span>
                              {card.used_at && (
                                <>
                                  <span>•</span>
                                  <span>
                                    استُخدمت: {formatDate(card.used_at)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(card)}
                      {!card.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGiftCard(card.id, card.card_code)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredCards.length === 0 && !loading && (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">لا توجد بطاقات</h3>
              <p className="text-muted-foreground">
                لم يتم العثور على بطاقات تطابق معايير البحث
              </p>
            </div>
          )}
        </CardContent>
      </Card>
        </TabsContent>

        {/* Digital Cards Tab */}
        <TabsContent value="digital-cards" className="space-y-6">
          {/* Digital Cards Content */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">أنواع البطاقات</CardTitle>
                <CreditCard className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cardTypes.length}</div>
                <p className="text-xs text-muted-foreground">بطاقة متاحة</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">إجمالي الطلبات</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{orders.length}</div>
                <p className="text-xs text-muted-foreground">طلب</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">الطلبات المعلقة</CardTitle>
                <Clock className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">
                  {orders.filter(o => o.status === 'pending' || o.status === 'processing').length}
                </div>
                <p className="text-xs text-muted-foreground">بانتظار المعالجة</p>
              </CardContent>
            </Card>
          </div>

          {/* Shop and Orders Tabs */}
          <Tabs defaultValue="shop" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="shop" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                المتجر
              </TabsTrigger>
              <TabsTrigger value="orders" className="gap-2">
                <Package className="h-4 w-4" />
                الطلبات ({orders.length})
              </TabsTrigger>
            </TabsList>

            {/* Shop Sub-Tab */}
            <TabsContent value="shop" className="space-y-6">
              {digitalLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse h-64">
                      <div className="h-full bg-muted/20" />
                    </Card>
                  ))}
                </div>
              ) : cardTypes.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <ShoppingBag className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">لا توجد بطاقات متاحة حالياً</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cardTypes.map((cardType) => {
                    const providerLogo = getProviderLogo(cardType.provider);
                    
                    return (
                      <div 
                        key={cardType.id} 
                        className="group cursor-pointer transition-all duration-300 hover:scale-105"
                        onClick={() => handleDigitalCardClick(cardType)}
                      >
                        <div className="relative w-full aspect-[1.586/1] rounded-xl shadow-xl overflow-hidden border border-white/10">
                          {providerLogo ? (
                            <img 
                              src={providerLogo} 
                              alt={cardType.name}
                              className="absolute inset-0 w-full h-full object-cover brightness-105"
                            />
                          ) : (
                            <div className={`absolute inset-0 bg-gradient-to-br ${getProviderGradient(cardType.provider)}`}></div>
                          )}
                          
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                          
                          <div className="relative z-10 h-full p-4 flex flex-col justify-between">
                            {cardType.provider === 'payeer' && (
                              <div className="flex justify-start">
                                <img 
                                  src={payeerLogo} 
                                  alt="Payeer"
                                  className="w-12 h-12 object-contain drop-shadow-lg rounded-full"
                                  style={{ mixBlendMode: 'multiply' }}
                                />
                              </div>
                            )}
                            
                            <div className="mt-auto space-y-3">
                              <div className="space-y-1">
                                <h3 className="text-2xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] [text-shadow:_2px_2px_4px_rgb(0_0_0_/_80%)]">
                                  {cardType.name}
                                </h3>
                              </div>
                              
                              <div className="grid grid-cols-3 gap-2 bg-black/70 backdrop-blur-md rounded-xl p-3 border-2 border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.5)]">
                                <div className="space-y-1">
                                  <p className="text-white/90 text-xs font-medium">سعر الصرف:</p>
                                  <p className="text-white font-bold text-sm drop-shadow-md">{cardType.exchange_rate} دج/$</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-white/90 text-xs font-medium">الحد الأدنى:</p>
                                  <p className="text-white font-bold text-sm drop-shadow-md">${cardType.min_amount}</p>
                                </div>
                                <div className="space-y-1">
                                  <p className="text-white/90 text-xs font-medium">الحد الأقصى:</p>
                                  <p className="text-white font-bold text-sm drop-shadow-md">${cardType.max_amount}</p>
                                </div>
                              </div>
                              
                              <Button 
                                className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border border-white/30 font-bold gap-2 shadow-lg transition-all group-hover:bg-white/40"
                              >
                                <Eye className="h-5 w-5" />
                                عرض التفاصيل
                              </Button>
                            </div>
                          </div>
                          
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent"></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Orders Sub-Tab */}
            <TabsContent value="orders" className="space-y-4">
              {orders.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">لا توجد طلبات</p>
                  </CardContent>
                </Card>
              ) : (
                orders.map((order) => {
                  const cardType = cardTypes.find(c => c.id === order.card_type_id);
                  
                  return (
                    <Card key={order.id} className="border-0 shadow-card">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-lg bg-gradient-to-br ${cardType ? getProviderGradient(cardType.provider) : 'from-primary to-primary'}`}>
                              <CreditCard className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">
                                {cardType?.name_ar || 'بطاقة'}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                ${order.amount_usd} - {order.total_dzd} دج
                              </p>
                              <p className="text-sm text-muted-foreground">
                                الحساب: {order.account_id}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(order.created_at).toLocaleString('ar-DZ')}
                              </p>
                            </div>
                          </div>
                          {getDigitalStatusBadge(order.status)}
                        </div>
                        
                        {order.status === 'completed' && (
                          <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/20">
                            <p className="text-sm font-semibold text-success mb-1">✓ تم إرسال المبلغ إلى حسابك</p>
                            {order.admin_notes && (
                              <p className="text-xs text-muted-foreground">{order.admin_notes}</p>
                            )}
                          </div>
                        )}
                        
                        {order.status === 'failed' && order.admin_notes && (
                          <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                            <p className="text-xs text-muted-foreground">{order.admin_notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>

      {/* Digital Card Purchase Dialog */}
      <Dialog open={!!selectedDigitalCard} onOpenChange={() => setSelectedDigitalCard(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {selectedDigitalCard?.name_ar}
            </DialogTitle>
            <DialogDescription>
              أدخل معلومات حسابك والمبلغ المطلوب
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="accountId">معرف الحساب ({selectedDigitalCard?.provider})</Label>
              <Input
                id="accountId"
                placeholder={`أدخل معرف حسابك في ${selectedDigitalCard?.name_ar}`}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="amountUsd">المبلغ بالدولار ($)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="amountUsd"
                  type="number"
                  placeholder={`من ${selectedDigitalCard?.min_amount} إلى ${selectedDigitalCard?.max_amount}`}
                  value={amountUsd}
                  onChange={(e) => setAmountUsd(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>

            {digitalTotals && (
              <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ:</span>
                  <span className="font-semibold">{digitalTotals.amountDzd.toFixed(2)} دج</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الرسوم:</span>
                  <span className="font-semibold">{digitalTotals.feeAmount.toFixed(2)} دج</span>
                </div>
                <div className="flex justify-between text-base font-bold pt-2 border-t">
                  <span>الإجمالي:</span>
                  <span className="text-primary">{digitalTotals.totalDzd.toFixed(2)} دج</span>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              onClick={handleConfirmPurchase} 
              disabled={purchasing || !accountId || !amountUsd}
              className="w-full"
            >
              {purchasing ? 'جاري المعالجة...' : 'تأكيد الطلب'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}