import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactionHistory } from '@/hooks/useTransactionHistory';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { 
  ArrowRight, 
  Download, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Repeat, 
  Gift, 
  Gamepad2,
  FileText,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CalendarIcon,
  Loader2,
  Search,
  X
} from 'lucide-react';
import { format, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { ar, fr } from 'date-fns/locale';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useProfile } from '@/hooks/useProfile';
import DOMPurify from 'dompurify';
import { cn } from '@/lib/utils';

// Helper to escape user data for safe HTML insertion
const escapeHtml = (str: string | null | undefined): string => {
  if (!str) return 'غير متوفر';
  return DOMPurify.sanitize(str, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
};

const ITEMS_PER_PAGE = 10;

const Transactions = () => {
  const navigate = useNavigate();
  const { transactions, loading, totalCount } = useTransactionHistory();
  const { profile } = useProfile();
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportLanguage, setExportLanguage] = useState<'ar' | 'fr'>('ar');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="h-5 w-5" />;
      case 'withdrawal':
        return <ArrowUpRight className="h-5 w-5" />;
      case 'transfer_sent':
      case 'transfer_received':
        return <Repeat className="h-5 w-5" />;
      case 'gift_card':
        return <Gift className="h-5 w-5" />;
      case 'betting':
      case 'game_topup':
        return <Gamepad2 className="h-5 w-5" />;
      case 'digital_card':
        return <CreditCard className="h-5 w-5" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      completed: { label: 'مكتمل', variant: 'default' },
      pending: { label: 'قيد المعالجة', variant: 'secondary' },
      rejected: { label: 'مرفوض', variant: 'destructive' },
      approved: { label: 'موافق عليه', variant: 'default' },
    };

    const config = statusConfig[status] || { label: status, variant: 'outline' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAmountColor = (type: string) => {
    if (type === 'deposit' || type === 'transfer_received' || type === 'gift_card') {
      return 'text-green-600';
    } else if (type === 'withdrawal' || type === 'transfer_sent' || type === 'betting' || type === 'game_topup' || type === 'digital_card') {
      return 'text-red-600';
    }
    return 'text-foreground';
  };

  const getAmountPrefix = (type: string) => {
    if (type === 'deposit' || type === 'transfer_received' || type === 'gift_card') {
      return '+';
    } else if (type === 'withdrawal' || type === 'transfer_sent' || type === 'betting' || type === 'game_topup' || type === 'digital_card') {
      return '-';
    }
    return '';
  };

  // Translation helpers
  const t = (arText: string, frText: string) => exportLanguage === 'ar' ? arText : frText;
  const getLocale = () => exportLanguage === 'ar' ? ar : fr;

  // Status translations
  const getStatusText = (status: string) => {
    const statusMap: Record<string, { ar: string; fr: string }> = {
      completed: { ar: 'مكتمل', fr: 'Terminé' },
      pending: { ar: 'قيد المعالجة', fr: 'En attente' },
      rejected: { ar: 'مرفوض', fr: 'Rejeté' },
      approved: { ar: 'موافق عليه', fr: 'Approuvé' },
    };
    return statusMap[status]?.[exportLanguage] || status;
  };

  // Type translations
  const getTypeText = (description: string) => {
    const typeMap: Record<string, { ar: string; fr: string }> = {
      'إيداع': { ar: 'إيداع', fr: 'Dépôt' },
      'سحب': { ar: 'سحب', fr: 'Retrait' },
      'تحويل مرسل': { ar: 'تحويل مرسل', fr: 'Transfert envoyé' },
      'تحويل مستلم': { ar: 'تحويل مستلم', fr: 'Transfert reçu' },
      'بطاقة هدية': { ar: 'بطاقة هدية', fr: 'Carte cadeau' },
      'شحن ألعاب': { ar: 'شحن ألعاب', fr: 'Recharge jeux' },
      'إيداع مراهنات': { ar: 'إيداع مراهنات', fr: 'Dépôt paris' },
      'بطاقة رقمية': { ar: 'بطاقة رقمية', fr: 'Carte numérique' },
    };
    return typeMap[description]?.[exportLanguage] || description;
  };

  // Filter transactions by date range
  const getFilteredTransactions = () => {
    if (!dateFrom && !dateTo) return transactions;
    
    return transactions.filter(t => {
      const txDate = new Date(t.created_at);
      if (dateFrom && dateTo) {
        return isWithinInterval(txDate, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
      } else if (dateFrom) {
        return txDate >= startOfDay(dateFrom);
      } else if (dateTo) {
        return txDate <= endOfDay(dateTo);
      }
      return true;
    });
  };

  // Search/Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return transactions;
    
    const query = searchQuery.toLowerCase().trim();
    return transactions.filter(t => {
      // Search by transaction ID
      if (t.id.toLowerCase().includes(query)) return true;
      // Search by transaction number (for transfers)
      if (t.transaction_number?.toLowerCase().includes(query)) return true;
      // Search by phone number in description
      if (t.description.includes(query)) return true;
      return false;
    });
  }, [transactions, searchQuery]);

  // Pagination logic
  const totalPages = Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE);
  
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, currentPage]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    
    if (totalPages <= 7) {
      // Show all pages if 7 or less
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);
      
      if (currentPage > 3) {
        pages.push('ellipsis');
      }
      
      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis');
      }
      
      // Always show last page
      pages.push(totalPages);
    }
    
    return pages;
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setExpandedTransaction(null); // Close any expanded transaction
      // Scroll to top of transactions list
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const generatePDF = async () => {
    setExporting(true);
    try {
      const filteredTransactions = getFilteredTransactions();
      const isArabic = exportLanguage === 'ar';
      const perPage = 18;
      const pages = Math.max(1, Math.ceil(filteredTransactions.length / perPage));

      const pdf = new jsPDF('p', 'mm', 'a4');

      for (let p = 0; p < pages; p++) {
        const slice = filteredTransactions.slice(p * perPage, (p + 1) * perPage);

        const container = document.createElement('div');
        container.dir = isArabic ? 'rtl' : 'ltr';
        container.style.width = '794px';
        container.style.padding = '32px';
        container.style.background = '#ffffff';
        container.style.color = '#111827';
        container.style.fontFamily = isArabic 
          ? "'Tajawal','Cairo','Noto Naskh Arabic','Segoe UI', Tahoma, Arial, sans-serif"
          : "'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif";

        const dateRangeText = dateFrom && dateTo 
          ? `${format(dateFrom, 'dd/MM/yyyy')} - ${format(dateTo, 'dd/MM/yyyy')}`
          : dateFrom 
            ? `${t('من', 'À partir du')} ${format(dateFrom, 'dd/MM/yyyy')}`
            : dateTo 
              ? `${t('حتى', "Jusqu'au")} ${format(dateTo, 'dd/MM/yyyy')}`
              : t('جميع المعاملات', 'Toutes les transactions');

        const headerHtml = `
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div>
              <h2 style="margin:0;font-size:22px">${t('كشف الحساب', 'Relevé de compte')}</h2>
              <div style="color:#6b7280;font-size:14px">${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: getLocale() })}</div>
              <div style="color:#6b7280;font-size:12px;margin-top:4px">${dateRangeText}</div>
            </div>
            <div style="text-align:${isArabic ? 'left' : 'right'}">
              <div>${t('الاسم', 'Nom')}: <strong style="color:#111827">${escapeHtml(profile?.full_name)}</strong></div>
              <div>${t('الهاتف', 'Téléphone')}: <strong style="color:#111827">${escapeHtml(profile?.phone)}</strong></div>
            </div>
          </div>
        `;

        const rows = slice.map((tx) => {
          const date = format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm', { locale: getLocale() });
          const amount = `${getAmountPrefix(tx.type)}${Number(tx.amount).toLocaleString(isArabic ? 'ar-DZ' : 'fr-FR')} ${t('دج', 'DZD')}`;
          return `
            <tr>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(date)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(getTypeText(tx.description))}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(amount)}</td>
              <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${escapeHtml(getStatusText(tx.status))}</td>
            </tr>
          `;
        }).join('');

        const textAlign = isArabic ? 'right' : 'left';
        container.innerHTML = `
          ${headerHtml}
          <table style="width:100%;border-collapse:collapse;font-size:13px">
            <thead>
              <tr style="background:#F3F4F6">
                <th style="text-align:${textAlign};padding:10px 12px;border-bottom:1px solid #e5e7eb">${t('التاريخ', 'Date')}</th>
                <th style="text-align:${textAlign};padding:10px 12px;border-bottom:1px solid #e5e7eb">${t('النوع', 'Type')}</th>
                <th style="text-align:${textAlign};padding:10px 12px;border-bottom:1px solid #e5e7eb">${t('المبلغ', 'Montant')}</th>
                <th style="text-align:${textAlign};padding:10px 12px;border-bottom:1px solid #e5e7eb">${t('الحالة', 'Statut')}</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <div style="margin-top:12px;color:#6b7280;font-size:12px">${t('صفحة', 'Page')} ${p + 1} ${t('من', 'sur')} ${pages}</div>
        `;

        document.body.appendChild(container);
        await new Promise((r) => requestAnimationFrame(() => r(null)));

        const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
        const img = canvas.toDataURL('image/png');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

        if (p > 0) pdf.addPage();
        pdf.addImage(img, 'PNG', 0, 0, pdfWidth, pdfHeight);

        document.body.removeChild(container);
      }

      pdf.save(`statement-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      setExportDialogOpen(false);
    } finally {
      setExporting(false);
    }
  };

  const generateSingleTransactionPDF = async (transaction: any) => {
    // Create a temporary RTL receipt node and render it to an image to preserve Arabic shaping
    const container = document.createElement('div');
    container.dir = 'rtl';
    container.style.width = '794px'; // ~A4 width at 96 DPI
    container.style.padding = '32px';
    container.style.background = '#ffffff';
    container.style.color = '#111827';
    container.style.fontFamily = "'Tajawal','Cairo','Noto Naskh Arabic','Segoe UI', Tahoma, Arial, sans-serif";
    
    const amountText = `${getAmountPrefix(transaction.type)}${Number(transaction.amount).toLocaleString('ar-DZ')} دج`;
    const dateText = format(new Date(transaction.created_at), 'EEEE, dd MMMM yyyy - hh:mm:ss a', { locale: ar });

    container.innerHTML = `
      <div style="border:1px solid #e5e7eb;border-radius:12px;padding:24px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
          <h2 style="margin:0;font-size:24px">إيصال المعاملة</h2>
          <span style="background:#EEF2FF;color:#4338CA;padding:6px 12px;border-radius:9999px;font-weight:700">
            ${transaction.transaction_number || transaction.id.slice(0,8).toUpperCase()}
          </span>
        </div>
        <div style="margin-bottom:16px;color:#6b7280">
          <div>اسم صاحب الحساب: <strong style="color:#111827">${escapeHtml(profile?.full_name)}</strong></div>
          <div>رقم الهاتف: <strong style="color:#111827">${escapeHtml(profile?.phone)}</strong></div>
        </div>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:16px 0" />
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;font-size:14px">
          <div>النوع: <strong>${escapeHtml(transaction.description)}</strong></div>
          <div>الحالة: <strong>${escapeHtml(transaction.status)}</strong></div>
          <div>المبلغ: <strong>${escapeHtml(amountText)}</strong></div>
          <div>التاريخ والوقت: <strong>${escapeHtml(dateText)}</strong></div>
        </div>
      </div>
    `;

    document.body.appendChild(container);
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));

    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`receipt-${transaction.transaction_number || transaction.id.slice(0, 8)}.pdf`);

    document.body.removeChild(container);
  };

  return (
    <div className="min-h-screen bg-gradient-background" dir="rtl">
      <div className="container max-w-4xl mx-auto p-4 pb-20 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="rounded-xl"
            >
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">المعاملات</h1>
              <p className="text-sm text-muted-foreground">جميع معاملاتك في مكان واحد</p>
            </div>
          </div>
          
          <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:opacity-90 text-white shadow-glow">
                <Download className="h-4 w-4 ml-2" />
                تصدير PDF
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md" dir="rtl">
              <DialogHeader>
                <DialogTitle>تصدير كشف الحساب</DialogTitle>
                <DialogDescription>
                  اختر التاريخ واللغة للتصدير
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                {/* Language Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">اللغة</Label>
                  <RadioGroup
                    value={exportLanguage}
                    onValueChange={(v) => setExportLanguage(v as 'ar' | 'fr')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="ar" id="lang-ar" />
                      <Label htmlFor="lang-ar" className="cursor-pointer">العربية</Label>
                    </div>
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <RadioGroupItem value="fr" id="lang-fr" />
                      <Label htmlFor="lang-fr" className="cursor-pointer">Français</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Date Range Selection */}
                <div className="space-y-3">
                  <Label className="text-base font-medium">الفترة الزمنية</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">من تاريخ</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-right font-normal",
                              !dateFrom && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "اختر التاريخ"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateFrom}
                            onSelect={setDateFrom}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">إلى تاريخ</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-right font-normal",
                              !dateTo && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="ml-2 h-4 w-4" />
                            {dateTo ? format(dateTo, "dd/MM/yyyy") : "اختر التاريخ"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={dateTo}
                            onSelect={setDateTo}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    اترك الحقول فارغة لتصدير جميع المعاملات
                  </p>
                </div>

                {/* Preview count */}
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    عدد المعاملات: <span className="font-bold text-foreground">{getFilteredTransactions().length}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={generatePDF}
                    disabled={exporting || getFilteredTransactions().length === 0}
                    className="flex-1 bg-gradient-primary hover:opacity-90"
                  >
                    {exporting ? (
                      <>
                        <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                        جاري التصدير...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 ml-2" />
                        تصدير
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateFrom(undefined);
                      setDateTo(undefined);
                    }}
                  >
                    مسح التاريخ
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Transactions List */}
        <Card className="shadow-card border-0 bg-gradient-card backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-foreground">
              <div className="p-2 rounded-xl bg-gradient-primary">
                <FileText className="h-5 w-5 text-white" />
              </div>
              سجل المعاملات ({filteredTransactions.length})
            </CardTitle>
            
            {/* Search Filter */}
            <div className="mt-4 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="البحث بمعرف المعاملة أو رقم المعاملة أو رقم الهاتف..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1); // Reset to first page on search
                }}
                className="pr-10 pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-1 top-1/2 -translate-y-1/2 h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 rounded-xl bg-muted/50 animate-pulse">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-muted rounded-xl"></div>
                        <div className="space-y-2">
                          <div className="w-32 h-4 bg-muted rounded"></div>
                          <div className="w-24 h-3 bg-muted rounded"></div>
                        </div>
                      </div>
                      <div className="w-20 h-6 bg-muted rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">لا توجد معاملات</p>
                <p className="text-sm">ابدأ باستخدام التطبيق لرؤية معاملاتك هنا</p>
              </div>
            ) : (
              <>
                {paginatedTransactions.map((transaction) => (
                  <div key={transaction.id} className="space-y-2">
                    <div 
                      className="group p-4 rounded-xl bg-muted/50 hover:bg-gradient-primary/5 transition-all duration-300 hover:shadow-soft border border-transparent hover:border-primary/10 cursor-pointer"
                      onClick={() => setExpandedTransaction(
                        expandedTransaction === transaction.id ? null : transaction.id
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="p-3 rounded-xl bg-gradient-primary text-white group-hover:scale-110 transition-transform">
                            {getTransactionIcon(transaction.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {transaction.description}
                              {transaction.transaction_number && (
                                <span className="text-xs text-muted-foreground mr-2">
                                  #{transaction.transaction_number}
                                </span>
                              )}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(transaction.created_at), 'dd/MM/yyyy - HH:mm:ss', { locale: ar })}
                              </p>
                              {getStatusBadge(transaction.status)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className={`text-lg font-bold ${getAmountColor(transaction.type)}`}>
                            {getAmountPrefix(transaction.type)}{Math.abs(transaction.amount).toLocaleString('ar-DZ')} دج
                          </p>
                          {expandedTransaction === transaction.id ? (
                            <ChevronUp className="h-5 w-5 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Transaction Details */}
                    {expandedTransaction === transaction.id && (
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 animate-in slide-in-from-top-2">
                        <h4 className="font-semibold text-foreground mb-3">تفاصيل المعاملة</h4>
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          {transaction.transaction_number && (
                            <div className="col-span-2">
                              <p className="text-muted-foreground mb-1">رقم المعاملة</p>
                              <p className="font-mono font-bold text-primary text-lg">
                                #{transaction.transaction_number}
                              </p>
                            </div>
                          )}
                          
                          <div>
                            <p className="text-muted-foreground mb-1">معرف المعاملة</p>
                            <p className="font-mono font-medium text-foreground">
                              {transaction.id.slice(0, 8).toUpperCase()}
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground mb-1">النوع</p>
                            <p className="font-medium text-foreground">{transaction.description}</p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground mb-1">المبلغ</p>
                            <p className={`font-bold ${getAmountColor(transaction.type)}`}>
                              {getAmountPrefix(transaction.type)}{Math.abs(transaction.amount).toLocaleString('ar-DZ')} دج
                            </p>
                          </div>
                          
                          <div>
                            <p className="text-muted-foreground mb-1">الحالة</p>
                            {getStatusBadge(transaction.status)}
                          </div>
                          
                          <div className="col-span-2">
                            <p className="text-muted-foreground mb-1">التاريخ والوقت</p>
                            <p className="font-medium text-foreground">
                              {format(new Date(transaction.created_at), 'EEEE, dd MMMM yyyy - hh:mm:ss a', { locale: ar })}
                            </p>
                          </div>
                        </div>
                        
                        <Separator className="my-4" />
                        
                        <Button
                          onClick={() => generateSingleTransactionPDF(transaction)}
                          className="w-full"
                          variant="outline"
                        >
                          <Download className="ml-2 h-4 w-4" />
                          تحميل إيصال PDF
                        </Button>
                      </div>
                    )}
                  </div>
                ))}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-6">
                    <Pagination dir="ltr">
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            onClick={() => handlePageChange(currentPage - 1)}
                            className={cn(
                              "cursor-pointer",
                              currentPage === 1 && "pointer-events-none opacity-50"
                            )}
                          />
                        </PaginationItem>
                        
                        {getPageNumbers().map((page, index) => (
                          <PaginationItem key={index}>
                            {page === 'ellipsis' ? (
                              <PaginationEllipsis />
                            ) : (
                              <PaginationLink
                                onClick={() => handlePageChange(page)}
                                isActive={currentPage === page}
                                className="cursor-pointer"
                              >
                                {page}
                              </PaginationLink>
                            )}
                          </PaginationItem>
                        ))}
                        
                        <PaginationItem>
                          <PaginationNext 
                            onClick={() => handlePageChange(currentPage + 1)}
                            className={cn(
                              "cursor-pointer",
                              currentPage === totalPages && "pointer-events-none opacity-50"
                            )}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                    
                    <p className="text-center text-sm text-muted-foreground mt-3">
                      صفحة {currentPage} من {totalPages} • إجمالي {totalCount} معاملة
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Transactions;
