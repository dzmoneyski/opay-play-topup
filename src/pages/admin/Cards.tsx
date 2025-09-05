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

  // Generate secure random card code for QR
  const generateSecureCardCode = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    
    // Create a secure random string for QR code
    return Array.from(bytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
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

  // Create professional card HTML for PDF export
  const createCardHTML = (card: any) => {
    const qrCode = qrCodes[card.id];
    return `
      <div style="
        width: 340px;
        height: 216px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 20px;
        color: white;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        direction: rtl;
        position: relative;
        box-shadow: 0 10px 25px rgba(0,0,0,0.2);
        overflow: hidden;
      ">
        <!-- Background pattern -->
        <div style="
          position: absolute;
          top: -50px;
          right: -50px;
          width: 150px;
          height: 150px;
          border-radius: 50%;
          background: rgba(255,255,255,0.1);
        "></div>
        <div style="
          position: absolute;
          bottom: -30px;
          left: -30px;
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: rgba(255,255,255,0.05);
        "></div>
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h1 style="margin: 0; font-size: 24px; font-weight: bold;">OpaY</h1>
            <p style="margin: 0; font-size: 14px; opacity: 0.9;">بطاقة شحن رقمية</p>
          </div>
          <div style="
            width: 40px;
            height: 40px;
            background: rgba(255,255,255,0.2);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
          ">💳</div>
        </div>
        
        <!-- Main content -->
        <div style="display: flex; gap: 20px; align-items: center;">
          <!-- QR Code -->
          <div style="
            background: white;
            padding: 8px;
            border-radius: 8px;
            width: 80px;
            height: 80px;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${qrCode ? `<img src="${qrCode}" style="width: 64px; height: 64px;" />` : '<div style="width: 64px; height: 64px; background: #f0f0f0; border-radius: 4px;"></div>'}
          </div>
          
          <!-- Card Info -->
          <div style="flex: 1;">
            <div style="margin-bottom: 12px;">
              <p style="margin: 0; font-size: 12px; opacity: 0.8;">القيمة</p>
              <p style="margin: 0; font-size: 28px; font-weight: bold;">${formatCurrency(card.amount)}</p>
            </div>
            
            <div style="margin-bottom: 8px;">
              <p style="margin: 0; font-size: 10px; opacity: 0.7;">رقم البطاقة</p>
              <p style="margin: 0; font-size: 14px; font-family: 'Courier New', monospace; letter-spacing: 1px;">
                ${card.card_code}
              </p>
            </div>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="
          position: absolute;
          bottom: 16px;
          right: 20px;
          left: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          opacity: 0.8;
        ">
          <span>امسح رمز QR للاستخدام</span>
          <span>${formatDate(card.created_at).split(' ')[0]}</span>
        </div>
      </div>
    `;
  };

  // Export unused gift cards to PDF with professional design
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

      const pdf = new jsPDF('p', 'mm', 'a4');
      const cardsPerPage = 4; // 2x2 grid for better quality
      const cardWidth = 90; // Wider cards
      const cardHeight = 57; // Taller cards
      const marginX = 10;
      const marginY = 15;
      const spacingX = 10;
      const spacingY = 15;

      // Add title page
      pdf.setFontSize(24);
      pdf.text('OpaY Gift Cards', 105, 30, { align: 'center' });
      pdf.setFontSize(16);
      pdf.text(`Total Cards: ${unusedCards.length}`, 105, 45, { align: 'center' });
      pdf.text(`Generated: ${new Date().toLocaleDateString('ar-DZ')}`, 105, 60, { align: 'center' });
      
      for (let i = 0; i < unusedCards.length; i++) {
        const card = unusedCards[i];
        const pageIndex = Math.floor(i / cardsPerPage);
        const cardIndex = i % cardsPerPage;
        
        // Add new page if needed (first page after title, then every cardsPerPage)
        if (i === 0 || cardIndex === 0) {
          pdf.addPage();
        }
        
        // Calculate position - 2x2 grid
        const col = cardIndex % 2;
        const row = Math.floor(cardIndex / 2);
        const x = marginX + col * (cardWidth + spacingX);
        const y = marginY + row * (cardHeight + spacingY);
        
        // Create temporary container for card HTML
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.top = '-9999px';
        tempContainer.style.left = '-9999px';
        tempContainer.innerHTML = createCardHTML(card);
        document.body.appendChild(tempContainer);
        
        try {
          // Convert HTML to canvas
          const canvas = await html2canvas(tempContainer.firstElementChild as HTMLElement, {
            width: 340,
            height: 216,
            scale: 2,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true
          });
          
          // Add canvas to PDF
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', x, y, cardWidth, cardHeight, '', 'FAST');
          
        } catch (error) {
          console.warn('Failed to render card:', error);
          
          // Fallback: simple text-based card
          pdf.setDrawColor(100, 100, 100);
          pdf.setLineWidth(0.5);
          pdf.roundedRect(x, y, cardWidth, cardHeight, 3, 3);
          
          pdf.setFontSize(14);
          pdf.text('OpaY Gift Card', x + cardWidth/2, y + 15, { align: 'center' });
          
          pdf.setFontSize(12);
          pdf.text(`Value: ${formatCurrency(card.amount)}`, x + cardWidth/2, y + 25, { align: 'center' });
          
          pdf.setFontSize(10);
          pdf.text(`Code: ${card.card_code}`, x + cardWidth/2, y + 35, { align: 'center' });
          
          pdf.setFontSize(8);
          pdf.text(`Created: ${formatDate(card.created_at).split(' ')[0]}`, x + cardWidth/2, y + 45, { align: 'center' });
        }
        
        // Clean up
        document.body.removeChild(tempContainer);
      }

      // Save PDF
      const fileName = `opay_gift_cards_${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
      
      toast({
        title: "تم التصدير بنجاح",
        description: `تم تصدير ${unusedCards.length} بطاقة احترافية إلى PDF`,
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
            disabled={exportingPDF || giftCards.filter(c => !c.is_used).length === 0}
          >
            <FileText className="w-4 h-4 mr-2" />
            {exportingPDF ? 'جاري التصدير...' : 'تصدير PDF'}
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
                    <div className="flex-1">
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
                                {showCodes[card.id] ? card.card_code : '••••••••••••••••'}
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
    </div>
  );
}