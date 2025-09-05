import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  Edit
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
  
  // Generation form state
  const [amount, setAmount] = useState<number>(1000);
  const [quantity, setQuantity] = useState<number>(10);
  const [prefix, setPrefix] = useState<string>('');
  const [generating, setGenerating] = useState(false);

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

    setGenerating(true);
    try {
      const cards = [];
      const currentYear = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-6);
      
      for (let i = 1; i <= quantity; i++) {
        const cardCode = prefix 
          ? `${prefix}-${currentYear}-${timestamp}-${i.toString().padStart(3, '0')}`
          : `${amount}-${currentYear}-${timestamp}-${i.toString().padStart(3, '0')}`;
        
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
      setPrefix('');
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

  // Delete gift card
  const deleteGiftCard = async (cardId: string) => {
    try {
      const { error } = await supabase
        .from('gift_cards')
        .delete()
        .eq('id', cardId);

      if (error) throw error;

      toast({
        title: "تم الحذف",
        description: "تم حذف البطاقة بنجاح",
      });
      
      fetchGiftCards();
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast({
        title: "خطأ",
        description: "فشل في حذف البطاقة",
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
            تصدير
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
                <div>
                  <Label htmlFor="prefix">بادئة اختيارية</Label>
                  <Input
                    id="prefix"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    placeholder="مثال: PROMO"
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
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center text-white">
                          <Gift className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm">
                              {showCodes[card.id] ? card.card_code : '••••••••••••'}
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
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(card)}
                      {!card.is_used && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteGiftCard(card.id)}
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