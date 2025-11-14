import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, Lock, Eye, UserCheck, Phone, Mail } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary/90 to-primary/80">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 text-white mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-white mb-2">سياسة الخصوصية</h1>
          <p className="text-white/80">آخر تحديث: {new Date().toLocaleDateString('ar-DZ')}</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              مقدمة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <p>
              نحن في OpaY نلتزم بحماية خصوصيتك وأمان بياناتك الشخصية. توضح سياسة الخصوصية هذه كيفية جمعنا واستخدامنا وحمايتنا للمعلومات التي تقدمها عند استخدام تطبيقنا.
            </p>
            <p>
              باستخدامك لتطبيق OpaY، فإنك توافق على جمع واستخدام المعلومات وفقاً لهذه السياسة.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              المعلومات التي نجمعها
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <div>
              <h3 className="font-semibold mb-2">1. المعلومات الشخصية:</h3>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>الاسم الكامل</li>
                <li>عنوان البريد الإلكتروني</li>
                <li>رقم الهاتف</li>
                <li>معلومات الهوية الوطنية (للتحقق من الهوية)</li>
                <li>معلومات الحساب البنكي أو المحفظة الإلكترونية</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">2. معلومات المعاملات:</h3>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>تفاصيل الإيداعات والسحوبات</li>
                <li>سجل التحويلات</li>
                <li>معاملات الشراء والشحن</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">3. معلومات الجهاز:</h3>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>نوع الجهاز ونظام التشغيل</li>
                <li>عنوان IP</li>
                <li>معرف الجهاز الفريد</li>
                <li>موقع الجهاز (عند الموافقة)</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              كيفية استخدام المعلومات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <p>نستخدم المعلومات التي نجمعها للأغراض التالية:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>معالجة المعاملات المالية والتحويلات</li>
              <li>التحقق من هويتك وحماية حسابك</li>
              <li>تقديم خدمات الدعم الفني</li>
              <li>تحسين خدماتنا وتجربة المستخدم</li>
              <li>الامتثال للمتطلبات القانونية والتنظيمية</li>
              <li>إرسال إشعارات مهمة حول حسابك</li>
              <li>الكشف عن الاحتيال ومنعه</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              حماية البيانات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <p>
              نتخذ إجراءات أمنية صارمة لحماية معلوماتك الشخصية:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>تشفير البيانات أثناء النقل والتخزين</li>
              <li>خوادم آمنة ومحمية</li>
              <li>مصادقة متعددة العوامل</li>
              <li>مراقبة مستمرة للأنشطة المشبوهة</li>
              <li>وصول محدود للموظفين المصرح لهم فقط</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              مشاركة المعلومات
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <p>
              لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك معلوماتك فقط في الحالات التالية:
            </p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>مع مقدمي خدمات الدفع لمعالجة المعاملات</li>
              <li>عند الطلب القانوني من السلطات المختصة</li>
              <li>لحماية حقوقنا وسلامة مستخدمينا</li>
              <li>مع موافقتك الصريحة</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="w-5 h-5" />
              حقوقك
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <p>لديك الحق في:</p>
            <ul className="list-disc list-inside space-y-2 mr-4">
              <li>الوصول إلى بياناتك الشخصية</li>
              <li>تصحيح البيانات غير الدقيقة</li>
              <li>طلب حذف بياناتك</li>
              <li>الاعتراض على معالجة بياناتك</li>
              <li>نقل بياناتك إلى خدمة أخرى</li>
              <li>سحب موافقتك في أي وقت</li>
            </ul>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              الاتصال بنا
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right" dir="rtl">
            <p>
              إذا كان لديك أي أسئلة أو استفسارات حول سياسة الخصوصية هذه، يمكنك التواصل معنا عبر:
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-end">
                <span>support@opay.dz</span>
                <Mail className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2 justify-end">
                <span>+213 XXX XXX XXX</span>
                <Phone className="w-4 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>التحديثات على السياسة</CardTitle>
          </CardHeader>
          <CardContent className="text-right" dir="rtl">
            <p>
              قد نقوم بتحديث سياسة الخصوصية من وقت لآخر. سيتم إخطارك بأي تغييرات جوهرية عبر البريد الإلكتروني أو إشعار داخل التطبيق. يُنصح بمراجعة هذه الصفحة بشكل دوري للاطلاع على أي تحديثات.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>قبول الشروط</CardTitle>
          </CardHeader>
          <CardContent className="text-right" dir="rtl">
            <p>
              باستخدامك لتطبيق OpaY، فإنك تقر بأنك قد قرأت وفهمت ووافقت على سياسة الخصوصية هذه.
            </p>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="inline-block px-6 py-3 bg-white text-primary rounded-lg hover:bg-white/90 transition-colors font-semibold"
          >
            العودة للرئيسية
          </a>
        </div>
      </div>
    </div>
  );
}
