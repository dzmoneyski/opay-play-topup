import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Banknote,
  Send,
  Camera,
  Upload,
  PartyPopper,
  HelpCircle,
  Smartphone,
  AlertTriangle,
  CheckCircle,
  ArrowDown,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import flexyStep1 from '@/assets/flexy-step1-amount.png';
import flexyStep2 from '@/assets/flexy-step2-send.png';
import flexyStep3 from '@/assets/flexy-step3-screenshot.png';
import flexyStep4 from '@/assets/flexy-step4-upload.png';
import flexyStep5 from '@/assets/flexy-step5-done.png';

interface FlexyTutorialProps {
  onClose: () => void;
  onStartDeposit: () => void;
}

const TUTORIAL_STEPS = [
  {
    id: 1,
    icon: Banknote,
    image: flexyStep1,
    title: 'اختر المبلغ',
    subtitle: 'الخطوة الأولى',
    description: 'حدد المبلغ الذي تريد إيداعه في رصيدك. يمكنك اختيار مبلغ سريع أو إدخال مبلغ مخصص.',
    details: [
      'المبلغ يكون بين 100 و 5000 د.ج',
      'سيتم إضافة رقم فريد صغير للمبلغ (مثلاً 1003 بدل 1000)',
      'الرقم الفريد يساعدنا في التعرف على عمليتك بسرعة',
    ],
    tip: 'المبلغ الفريد هو ما سترسله فعلياً كفليكسي',
    color: 'hsl(var(--success))',
  },
  {
    id: 2,
    icon: Smartphone,
    image: flexyStep2,
    title: 'أرسل الفليكسي',
    subtitle: 'الخطوة الثانية',
    description: 'افتح تطبيق موبيليس أو اطلب الكود *600# ثم أرسل فليكسي بالمبلغ الفريد المحدد إلى الرقم الذي سيظهر لك.',
    details: [
      'انسخ الرقم المُستقبِل من التطبيق',
      'أرسل المبلغ الفريد بالضبط (مثلاً 1003 وليس 1000)',
      'تأكد أن الفليكسي تم إرساله بنجاح',
    ],
    tip: 'أرسل المبلغ الفريد بالضبط كما هو — أي فرق سيُعطّل العملية',
    warning: true,
    color: 'hsl(142, 76%, 36%)',
  },
  {
    id: 3,
    icon: Camera,
    image: flexyStep3,
    title: 'التقط صورة التأكيد',
    subtitle: 'الخطوة الثالثة',
    description: 'بعد إرسال الفليكسي، ستصلك رسالة تأكيد SMS. التقط لقطة شاشة (Screenshot) لهذه الرسالة.',
    details: [
      'الرسالة تأتي من موبيليس تؤكد إرسال الفليكسي',
      'التقط صورة واضحة تظهر المبلغ والرقم',
      'يمكنك أيضاً تصوير من سجل العمليات في تطبيق موبيليس',
    ],
    tip: 'الصورة يجب أن تكون واضحة وتظهر تفاصيل العملية',
    color: 'hsl(217, 91%, 60%)',
  },
  {
    id: 4,
    icon: Upload,
    image: flexyStep4,
    title: 'ارفع الصورة وأكمل الطلب',
    subtitle: 'الخطوة الرابعة',
    description: 'عُد إلى التطبيق وأدخل رقم هاتفك الذي أرسلت منه الفليكسي، ثم ارفع صورة التأكيد.',
    details: [
      'أدخل رقم هاتف موبيليس (يبدأ بـ 06)',
      'ارفع لقطة الشاشة التي التقطتها',
      'اضغط "تأكيد الإيداع" لإرسال الطلب',
    ],
    tip: 'تأكد أن رقم الهاتف هو نفسه الذي أرسلت منه الفليكسي',
    color: 'hsl(262, 83%, 58%)',
  },
  {
    id: 5,
    icon: PartyPopper,
    image: flexyStep5,
    title: 'تمت العملية!',
    subtitle: 'الخطوة الأخيرة',
    description: 'بعد إرسال الطلب، سيقوم فريقنا بمراجعته وتأكيده. عادةً ما يتم ذلك خلال دقائق.',
    details: [
      'ستتلقى إشعاراً عند تأكيد الإيداع',
      'يتم خصم رسوم 5% فقط من المبلغ المُرسل',
      'الرصيد المتبقي يُضاف مباشرة لحسابك',
    ],
    tip: 'يمكنك متابعة حالة طلبك من قسم "سجل المعاملات"',
    color: 'hsl(45, 93%, 47%)',
  },
];

const FlexyTutorial: React.FC<FlexyTutorialProps> = ({ onClose, onStartDeposit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = TUTORIAL_STEPS[currentStep];

  const goNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

  return (
    <Card className="bg-card border border-border/30 shadow-elevated overflow-hidden animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-l from-[hsl(var(--success)/0.08)] to-transparent border-b border-border/30 px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[hsl(var(--success)/0.1)]">
            <HelpCircle className="h-5 w-5 text-[hsl(var(--success))]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">كيف يعمل إيداع الفليكسي؟</h2>
            <p className="text-xs text-muted-foreground">دليل شامل خطوة بخطوة</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl h-9 w-9">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Progress bar */}
      <div className="px-5 pt-4">
        <div className="flex items-center gap-1.5">
          {TUTORIAL_STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentStep(i)}
              className="flex-1 h-1.5 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                backgroundColor: i <= currentStep ? step.color : 'hsl(var(--border))',
              }}
            />
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          {currentStep + 1} من {TUTORIAL_STEPS.length}
        </p>
      </div>

      <CardContent className="p-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* Step image */}
            <div className="flex justify-center">
              <div
                className="relative w-44 h-44 rounded-3xl flex items-center justify-center overflow-hidden"
                style={{ backgroundColor: `${step.color}10` }}
              >
                <img
                  src={step.image}
                  alt={step.title}
                  className="w-36 h-36 object-contain"
                  loading="lazy"
                  width={144}
                  height={144}
                />
                {/* Step number badge */}
                <div
                  className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: step.color }}
                >
                  {step.id}
                </div>
              </div>
            </div>

            {/* Step content */}
            <div className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: step.color }}>
                {step.subtitle}
              </p>
              <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>

            {/* Details list */}
            <div className="space-y-2.5 bg-muted/40 rounded-xl p-4">
              {step.details.map((detail, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: step.color }} />
                  <p className="text-sm text-foreground leading-relaxed">{detail}</p>
                </div>
              ))}
            </div>

            {/* Tip / Warning */}
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-2.5 ${
                step.warning
                  ? 'bg-[hsl(var(--warning)/0.08)] border-[hsl(var(--warning)/0.2)]'
                  : 'bg-[hsl(var(--success)/0.06)] border-[hsl(var(--success)/0.15)]'
              }`}
            >
              {step.warning ? (
                <AlertTriangle className="h-4 w-4 text-[hsl(var(--warning))] flex-shrink-0 mt-0.5" />
              ) : (
                <HelpCircle className="h-4 w-4 text-[hsl(var(--success))] flex-shrink-0 mt-0.5" />
              )}
              <p className="text-xs text-foreground leading-relaxed">
                <strong>{step.warning ? 'تنبيه:' : 'نصيحة:'}</strong> {step.tip}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex gap-3 mt-6">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={goPrev}
              className="flex-1 h-12 rounded-xl font-bold"
            >
              <ChevronRight className="h-4 w-4 ml-1" />
              السابق
            </Button>
          )}

          {isLastStep ? (
            <Button
              onClick={onStartDeposit}
              className="flex-[2] h-12 rounded-xl font-bold bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-[hsl(var(--success-foreground))]"
            >
              <ArrowDown className="h-4 w-4 ml-2" />
              ابدأ الإيداع الآن
            </Button>
          ) : (
            <Button
              onClick={goNext}
              className="flex-[2] h-12 rounded-xl font-bold bg-[hsl(var(--success))] hover:bg-[hsl(var(--success)/0.9)] text-[hsl(var(--success-foreground))]"
            >
              التالي
              <ChevronLeft className="h-4 w-4 mr-1" />
            </Button>
          )}
        </div>

        {/* Skip link */}
        {!isLastStep && (
          <button
            onClick={onStartDeposit}
            className="w-full text-center text-xs text-muted-foreground hover:text-foreground mt-3 transition-colors"
          >
            تخطي الشرح والبدء مباشرة
          </button>
        )}
      </CardContent>
    </Card>
  );
};

export default FlexyTutorial;
