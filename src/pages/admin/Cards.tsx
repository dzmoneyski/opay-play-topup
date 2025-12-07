import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  FileText
} from 'lucide-react';

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

  // Check which codes already exist in database (batch check)
  const getExistingCodes = async (codes: string[]): Promise<Set<string>> => {
    const { data, error } = await supabase
      .from('gift_cards')
      .select('card_code')
      .in('card_code', codes);
    
    if (error) throw error;
    return new Set(data?.map(c => c.card_code) || []);
  };

  // Generate gift cards - OPTIMIZED for speed
  const generateGiftCards = async () => {
    if (amount <= 0 || quantity <= 0) {
      toast({
        title: "خطأ",
        description: "القيمة والكمية يجب أن تكون أكبر من صفر",
        variant: "destructive",
      });
      return;
    }

    if (quantity > 1000) {
      toast({
        title: "خطأ",
        description: "لا يمكن إنشاء أكثر من 1000 بطاقة في المرة الواحدة",
        variant: "destructive",
      });
      return;
    }

    setGenerating(true);
    try {
      const generatedCodes = new Set<string>();
      
      // Generate all codes locally first (very fast)
      while (generatedCodes.size < quantity) {
        const cardCode = generateSecureCardCode();
        generatedCodes.add(cardCode);
      }
      
      // Check all codes at once in database (single query)
      const existingCodes = await getExistingCodes(Array.from(generatedCodes));
      
      // Remove any existing codes and regenerate
      for (const code of existingCodes) {
        generatedCodes.delete(code);
      }
      
      // Generate replacements for any duplicates found
      let attempts = 0;
      while (generatedCodes.size < quantity && attempts < 100) {
        const cardCode = generateSecureCardCode();
        if (!existingCodes.has(cardCode)) {
          generatedCodes.add(cardCode);
        }
        attempts++;
      }
      
      if (generatedCodes.size < quantity) {
        throw new Error('فشل في إنشاء أكواد كافية');
      }
      
      // Create cards array
      const cards = Array.from(generatedCodes).map(code => ({
        card_code: code,
        amount: amount,
      }));

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
          right: 55px;
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

  // Export state for progress
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState('');
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportCardsCount, setExportCardsCount] = useState(100);

  // Draw front card directly on PDF (NO html2canvas - 10x faster)
  const drawFrontCard = (pdf: jsPDF, card: GiftCard, x: number, y: number, width: number, height: number) => {
    // Draw gradient background (purple to pink)
    pdf.setFillColor(79, 70, 229); // Primary purple
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Draw chip (golden rectangle)
    pdf.setFillColor(255, 215, 0);
    pdf.roundedRect(x + 5, y + 5, 10, 7, 1, 1, 'F');
    
    // OpaY logo text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OpaY', x + width - 5, y + 10, { align: 'right' });
    
    // Subtitle
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Digital Top-up Card', x + width - 5, y + 15, { align: 'right' });
    
    // Amount (centered, large)
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    const amountText = `${card.amount.toLocaleString('ar-DZ')} DA`;
    pdf.text(amountText, x + width / 2, y + height / 2 + 3, { align: 'center' });
  };

  // Draw back card directly on PDF (NO html2canvas - 10x faster)
  const drawBackCard = async (pdf: jsPDF, card: GiftCard, x: number, y: number, width: number, height: number) => {
    const pricing = calculatePricing(card.amount);
    
    // Dark background
    pdf.setFillColor(31, 41, 55);
    pdf.roundedRect(x, y, width, height, 3, 3, 'F');
    
    // Magnetic strip
    pdf.setFillColor(0, 0, 0);
    pdf.rect(x, y + 8, width, 10, 'F');
    
    // Price on strip
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${pricing.customerPrice} DA`, x + width / 2, y + 15, { align: 'center' });
    
    // QR Code
    const qrDataURL = await QRCode.toDataURL(card.card_code, { width: 150, margin: 1 });
    pdf.addImage(qrDataURL, 'PNG', x + width - 28, y + 22, 23, 23);
    
    // Card code box
    pdf.setFillColor(55, 65, 81);
    pdf.roundedRect(x + 5, y + 28, width - 35, 12, 2, 2, 'F');
    
    // Card code text
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('courier', 'normal');
    const formattedCode = formatCardCode(card.card_code);
    pdf.text(formattedCode, x + 5 + (width - 35) / 2, y + 35, { align: 'center' });
    
    // Footer
    pdf.setFontSize(6);
    pdf.setTextColor(156, 163, 175);
    pdf.text('OpaY Algeria', x + width / 2, y + height - 3, { align: 'center' });
  };

  // Export unused gift cards to PDF - ULTRA FAST (no html2canvas)
  const exportToPDF = async () => {
    const unusedCards = giftCards.filter(card => !card.is_used);
    
    if (unusedCards.length === 0) {
      toast({
        title: "لا توجد بطاقات للتصدير",
        description: "جميع البطاقات مستخدمة أو لا توجد بطاقات",
        variant: "destructive",
      });
      return;
    }

    setShowExportDialog(true);
  };

  const startExport = async () => {
    const unusedCards = giftCards.filter(card => !card.is_used);
    const cardsToExport = unusedCards.slice(0, exportCardsCount);
    
    setExportingPDF(true);
    setExportProgress(0);
    setExportStatus('جاري التحضير...');
    
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      const cardWidth = 85.6;
      const cardHeight = 53.98;
      const margin = 20;
      const spacing = 10;
      const cardsPerRow = 3;
      const rowsPerPage = 3;
      const cardsPerPage = cardsPerRow * rowsPerPage;
      const totalSteps = cardsToExport.length * 2;

      // Add cover page
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text('OpaY Gift Cards Collection', pdf.internal.pageSize.width / 2, 40, { align: 'center' });
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Total Cards: ${cardsToExport.length}`, pdf.internal.pageSize.width / 2, 60, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleDateString('ar-DZ', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}`, pdf.internal.pageSize.width / 2, 75, { align: 'center' });

      // Process front sides - DIRECT DRAW (super fast)
      setExportStatus('جاري إنشاء الوجه الأمامي...');
      for (let i = 0; i < cardsToExport.length; i++) {
        const card = cardsToExport[i];
        const cardIndex = i % cardsPerPage;
        
        if (cardIndex === 0) {
          pdf.addPage('landscape');
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`Gift Cards - Front Side (Page ${Math.floor(i / cardsPerPage) + 1})`, margin, 15);
        }
        
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;
        const x = margin + col * (cardWidth + spacing);
        const y = 25 + row * (cardHeight + spacing);
        
        drawFrontCard(pdf, card, x, y, cardWidth, cardHeight);
        setExportProgress(Math.round(((i + 1) / totalSteps) * 100));
        
        // Allow UI to update every 50 cards (much less frequent since it's fast now)
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Process back sides - DIRECT DRAW (super fast)
      setExportStatus('جاري إنشاء الوجه الخلفي...');
      for (let i = 0; i < cardsToExport.length; i++) {
        const card = cardsToExport[i];
        const cardIndex = i % cardsPerPage;
        
        if (cardIndex === 0) {
          pdf.addPage('landscape');
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(0, 0, 0);
          pdf.text(`Gift Cards - Back Side (Page ${Math.floor(i / cardsPerPage) + 1})`, margin, 15);
        }
        
        const row = Math.floor(cardIndex / cardsPerRow);
        const col = cardIndex % cardsPerRow;
        const x = margin + col * (cardWidth + spacing);
        const y = 25 + row * (cardHeight + spacing);
        
        await drawBackCard(pdf, card, x, y, cardWidth, cardHeight);
        setExportProgress(Math.round(((cardsToExport.length + i + 1) / totalSteps) * 100));
        
        if (i % 50 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1));
        }
      }

      // Save PDF
      setExportStatus('جاري حفظ الملف...');
      const timestamp = new Date().toISOString().split('T')[0];
      pdf.save(`OpaY_Gift_Cards_${timestamp}.pdf`);
      
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${cardsToExport.length} بطاقة`,
      });
      
      setShowExportDialog(false);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast({
        title: "خطأ في التصدير",
        description: "فشل في تصدير البطاقات إلى PDF",
        variant: "destructive",
      });
    } finally {
      setExportingPDF(false);
      setExportProgress(0);
      setExportStatus('');
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">إدارة البطاقات</h1>
          <p className="text-muted-foreground mt-2">
            إنشاء وإدارة بطاقات الشحن
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
            disabled={giftCards.filter(c => !c.is_used).length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            تصدير PDF ({giftCards.filter(c => !c.is_used).length})
          </Button>
          <Dialog open={showGenerateDialog} onOpenChange={setShowGenerateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                إنشاء بطاقات
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

      {/* Statistics Cards */}
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

      {/* Export PDF Dialog */}
      <Dialog open={showExportDialog} onOpenChange={(open) => !exportingPDF && setShowExportDialog(open)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تصدير البطاقات إلى PDF</DialogTitle>
            <DialogDescription className="text-right">
              {!exportingPDF 
                ? 'اختر عدد البطاقات التي تريد تصديرها'
                : 'جاري التصدير، يرجى الانتظار...'
              }
            </DialogDescription>
          </DialogHeader>
          
          {!exportingPDF ? (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-right">
                <div className="flex justify-between">
                  <span className="font-bold text-primary">{giftCards.filter(c => !c.is_used).length}</span>
                  <span className="text-muted-foreground">البطاقات المتاحة</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold">{giftCards.filter(c => c.is_used).length}</span>
                  <span className="text-muted-foreground">البطاقات المستخدمة</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="exportCount" className="text-right block">عدد البطاقات للتصدير</Label>
                <Input
                  id="exportCount"
                  type="number"
                  value={exportCardsCount}
                  onChange={(e) => setExportCardsCount(Math.min(Number(e.target.value), giftCards.filter(c => !c.is_used).length))}
                  min="1"
                  max={giftCards.filter(c => !c.is_used).length}
                  className="text-center"
                />
                <p className="text-xs text-muted-foreground text-right">
                  الحد الأقصى الموصى به: 100 بطاقة لتجنب بطء المتصفح
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-right">
                <p className="text-sm text-amber-800">
                  ⚠️ تصدير عدد كبير من البطاقات قد يستغرق وقتاً طويلاً
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  إلغاء
                </Button>
                <Button onClick={startExport} className="bg-gradient-primary">
                  <FileText className="w-4 h-4 mr-2" />
                  بدء التصدير
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary animate-pulse" />
                </div>
                <p className="text-lg font-semibold text-foreground">{exportStatus}</p>
                <p className="text-3xl font-bold text-primary mt-2">{exportProgress}%</p>
              </div>
              
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300 ease-out" 
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              
              <p className="text-xs text-muted-foreground text-center">
                لا تغلق هذه النافذة حتى اكتمال التصدير
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}