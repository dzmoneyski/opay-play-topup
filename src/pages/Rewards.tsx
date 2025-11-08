import React, { useState } from 'react';
import BackButton from '@/components/BackButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useReferrals } from '@/hooks/useReferrals';
import { useToast } from '@/hooks/use-toast';
import {
  Gift,
  Users,
  Trophy,
  TrendingUp,
  Copy,
  CheckCircle,
  Clock,
  Award,
  Sparkles,
  ArrowDownToLine,
  AlertCircle,
  Crown,
  Medal,
  Zap,
  Share2
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const Rewards = () => {
  const { toast } = useToast();
  const {
    referralCode,
    rewards,
    referrals,
    achievements,
    leaderboard,
    loading,
    withdrawRewards,
    withdrawing,
    getWithdrawalFeePercentage,
    getWithdrawableAmount,
  } = useReferrals();

  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      setCopied(true);
      toast({
        title: "تم النسخ!",
        description: "تم نسخ كود الإحالة بنجاح",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    const shareText = `انضم إلى OpaY واحصل على مكافآت رائعة! استخدم كود الإحالة الخاص بي: ${referralCode}`;
    const shareUrl = `${window.location.origin}?ref=${referralCode}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'OpaY - برنامج الإحالة',
        text: shareText,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      toast({
        title: "تم النسخ!",
        description: "تم نسخ رابط الإحالة",
      });
    }
  };

  const handleWithdraw = () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "خطأ",
        description: "الرجاء إدخال مبلغ صحيح",
        variant: "destructive",
      });
      return;
    }

    if (amount > (rewards?.rewards_balance || 0)) {
      toast({
        title: "خطأ",
        description: "المبلغ يتجاوز رصيد المكافآت المتاح",
        variant: "destructive",
      });
      return;
    }

    withdrawRewards(amount);
    setWithdrawAmount('');
  };

  const feePercentage = getWithdrawalFeePercentage(rewards?.active_referrals_count || 0);
  const withdrawableAmount = getWithdrawableAmount();
  const canWithdraw = (rewards?.active_referrals_count || 0) >= 20;

  const getMedalIcon = (type: string) => {
    switch (type) {
      case 'bronze_medal': return <Medal className="h-6 w-6 text-[#CD7F32]" />;
      case 'silver_medal': return <Medal className="h-6 w-6 text-[#C0C0C0]" />;
      case 'gold_medal': return <Medal className="h-6 w-6 text-[#FFD700]" />;
      case 'diamond_medal': return <Award className="h-6 w-6 text-[#B9F2FF]" />;
      case 'legendary_medal': return <Crown className="h-6 w-6 text-[#FF6B6B]" />;
      default: return <Trophy className="h-6 w-6" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4" dir="rtl">
        <BackButton />
        <div className="container mx-auto max-w-4xl mt-8 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20" dir="rtl">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/40 px-4 py-3">
        <BackButton />
      </div>
      
      <div className="container mx-auto max-w-4xl px-4 mt-4 space-y-4">
        {/* Header */}
        <div className="text-center space-y-1 animate-slide-up py-2">
          <div className="flex items-center justify-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">برنامج الإحالة</h1>
          </div>
          <p className="text-sm text-muted-foreground">شارك واربح مكافآت!</p>
        </div>

        {/* Referral Code Card */}
        <Card className="bg-gradient-primary shadow-glow border-0 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <CardContent className="p-4 sm:p-6">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 text-white" />
                <p className="text-white font-medium text-sm">كود الإحالة الخاص بك</p>
              </div>
              
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-3 sm:p-4 space-y-3">
                <p className="text-2xl sm:text-4xl font-bold text-white tracking-wider font-mono break-all">
                  {referralCode || 'جاري التحميل...'}
                </p>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={handleCopyCode}
                    disabled={!referralCode}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-sm h-10"
                  >
                    {copied ? <CheckCircle className="h-4 w-4 ml-1" /> : <Copy className="h-4 w-4 ml-1" />}
                    {copied ? 'تم النسخ!' : 'نسخ'}
                  </Button>
                  <Button
                    onClick={handleShare}
                    disabled={!referralCode}
                    className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0 text-sm h-10"
                  >
                    <Share2 className="h-4 w-4 ml-1" />
                    مشاركة
                  </Button>
                </div>
              </div>

              <p className="text-white/90 text-xs sm:text-sm px-2">
                احصل على <span className="font-bold text-base sm:text-lg">100 دج</span> لكل صديق!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-3 text-center">
              <Gift className="h-6 w-6 mx-auto mb-1 text-primary" />
              <p className="text-lg sm:text-xl font-bold text-foreground">{rewards?.rewards_balance.toFixed(0) || '0'} دج</p>
              <p className="text-xs text-muted-foreground">رصيد المكافآت</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-3 text-center">
              <Users className="h-6 w-6 mx-auto mb-1 text-success" />
              <p className="text-lg sm:text-xl font-bold text-foreground">{rewards?.active_referrals_count || 0}</p>
              <p className="text-xs text-muted-foreground">إحالات</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-3 text-center">
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-gold" />
              <p className="text-lg sm:text-xl font-bold text-foreground">{rewards?.total_earned.toFixed(0) || '0'} دج</p>
              <p className="text-xs text-muted-foreground">إجمالي</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card border-0">
            <CardContent className="p-3 text-center">
              <Trophy className="h-6 w-6 mx-auto mb-1 text-secondary" />
              <p className="text-lg sm:text-xl font-bold text-foreground">{achievements?.length || 0}</p>
              <p className="text-xs text-muted-foreground">أوسمة</p>
            </CardContent>
          </Card>
        </div>

        {/* Withdraw Card */}
        <Card className="bg-gradient-card shadow-card border-0 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <ArrowDownToLine className="h-5 w-5 text-primary" />
              سحب المكافآت إلى الرصيد الرئيسي
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canWithdraw ? (
              <Alert className="bg-gold/10 border-gold/20">
                <AlertCircle className="h-4 w-4 text-gold" />
                <AlertDescription className="text-foreground">
                  تحتاج إلى <span className="font-bold">20 إحالة نشطة</span> على الأقل لسحب المكافآت
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">نسبة السحب المتاحة</span>
                    <span className="text-lg font-bold text-primary">{100 - feePercentage}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">المبلغ القابل للسحب</span>
                    <span className="text-lg font-bold text-success">{withdrawableAmount.toFixed(2)} دج</span>
                  </div>
                  {feePercentage > 0 && (
                    <p className="text-xs text-muted-foreground">
                      * سيتم خصم {feePercentage}% رسوم من المبلغ المسحوب
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Input
                    type="number"
                    placeholder="أدخل المبلغ المراد سحبه"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    className="text-center text-lg"
                    dir="ltr"
                  />
                  <Button
                    onClick={handleWithdraw}
                    disabled={withdrawing || !withdrawAmount}
                    className="w-full bg-gradient-primary text-white"
                  >
                    {withdrawing ? 'جاري السحب...' : 'سحب المكافآت'}
                  </Button>
                </div>

                <div className="bg-primary/5 rounded-xl p-3 space-y-1 text-sm">
                  <p className="font-medium text-foreground">جدول نسب السحب:</p>
                  <ul className="space-y-1 text-muted-foreground mr-4">
                    <li>• 20-49 إحالة: يمكنك سحب 20% من رصيدك</li>
                    <li>• 50-99 إحالة: يمكنك سحب 50% من رصيدك</li>
                    <li>• 100+ إحالة: يمكنك سحب 100% من رصيدك</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <Card className="bg-gradient-card shadow-card border-0 animate-slide-up" style={{ animationDelay: '0.4s' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Award className="h-5 w-5 text-primary" />
                الأوسمة والإنجازات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {achievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="bg-muted/50 rounded-xl p-4 text-center space-y-2 hover:bg-muted transition-colors"
                  >
                    {getMedalIcon(achievement.achievement_type)}
                    <p className="font-bold text-foreground">{achievement.achievement_name}</p>
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      +{achievement.reward_amount} دج
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      {new Date(achievement.unlocked_at).toLocaleDateString('ar-DZ')}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Milestones */}
        <Card className="bg-gradient-gold shadow-glow border-0 animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Zap className="h-5 w-5" />
              المكافآت والإنجازات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { count: 10, medal: 'برونزي', reward: 50, icon: <Medal className="h-5 w-5 text-[#CD7F32]" /> },
              { count: 30, medal: 'فضي', reward: 200, icon: <Medal className="h-5 w-5 text-[#C0C0C0]" /> },
              { count: 50, medal: 'ذهبي', reward: 500, icon: <Medal className="h-5 w-5 text-[#FFD700]" /> },
              { count: 100, medal: 'ألماسي', reward: 1500, icon: <Award className="h-5 w-5 text-[#B9F2FF]" /> },
              { count: 500, medal: 'أسطوري', reward: 10000, icon: <Crown className="h-5 w-5 text-[#FF6B6B]" /> },
            ].map((milestone) => (
              <div
                key={milestone.count}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  {milestone.icon}
                  <div>
                    <p className="font-bold text-white">{milestone.count} إحالة - وسام {milestone.medal}</p>
                    <p className="text-sm text-white/80">مكافأة: {milestone.reward} دج</p>
                  </div>
                </div>
                {(rewards?.active_referrals_count || 0) >= milestone.count && (
                  <CheckCircle className="h-5 w-5 text-white" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Referrals List */}
        <Card className="bg-gradient-card shadow-card border-0 animate-slide-up" style={{ animationDelay: '0.6s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Users className="h-5 w-5 text-primary" />
              قائمة الإحالات ({referrals?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {referrals && referrals.length > 0 ? (
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="bg-muted/50 rounded-xl p-4 flex items-center justify-between hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        referral.status === 'active' ? 'bg-success/10' : 'bg-muted'
                      }`}>
                        {referral.status === 'active' ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <Clock className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {referral.referred_user?.full_name || referral.referred_user?.phone || 'مستخدم جديد'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString('ar-DZ')}
                        </p>
                      </div>
                    </div>
                    <Badge variant={referral.status === 'active' ? 'default' : 'secondary'}>
                      {referral.status === 'active' ? 'نشط' : 'معلق'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد إحالات حتى الآن</p>
                <p className="text-sm mt-2">شارك كود الإحالة الخاص بك مع أصدقائك!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card className="bg-gradient-card shadow-card border-0 animate-slide-up" style={{ animationDelay: '0.7s' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Trophy className="h-5 w-5 text-primary" />
              لوحة المتصدرين - أفضل 10 مستخدمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {leaderboard?.slice(0, 10).map((user, index) => (
                <div
                  key={user.user_id}
                  className={`rounded-xl p-4 flex items-center justify-between ${
                    index < 3 ? 'bg-gradient-gold/10 border border-gold/20' : 'bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-[#FFD700] text-white' :
                      index === 1 ? 'bg-[#C0C0C0] text-white' :
                      index === 2 ? 'bg-[#CD7F32] text-white' :
                      'bg-muted text-foreground'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {user.profile?.full_name || user.profile?.phone || 'مستخدم'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {user.active_referrals_count} إحالة • {user.total_earned.toFixed(0)} دج
                      </p>
                    </div>
                  </div>
                  {index < 3 && <Crown className="h-5 w-5 text-gold" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Rewards;
