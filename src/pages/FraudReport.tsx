import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, Printer } from 'lucide-react';

// ====================== DATA ======================
const REPORT_DATE = '18 فبراير 2026';
const PERIOD = 'من 25 جانفي 2026 إلى 18 فبراير 2026';
const PLATFORM_NAME = 'منصة OpaY';
const PLATFORM_CONTACT = 'opay-play-topup.lovable.app';

const suspects = [
  {
    rank: 1,
    role: 'الرأس المدبر / مسرّب أكواد البطاقات (كان مشرفاً)',
    name: 'دعلاش وافي',
    phone: '0660873714',
    email: 'wafi.dalach@hotmail.fr',
    nationalId: '119947234',
    cards: 23,
    cardsAmount: 26500,
    transfers: 'استقبل تحويلات بأكثر من 144,000 دج من الشبكة',
    firstActivity: '25 جانفي 2026',
    lastActivity: '15 فبراير 2026',
    notes: 'كان يملك صلاحيات المشرف (Admin) على المنصة. استغل صلاحياته للاطلاع على أكواد بطاقات الهدايا وتسريبها لأعضاء الشبكة منذ 6 ديسمبر 2025.',
  },
  {
    rank: 2,
    role: 'المنفذ الرئيسي / أكبر مستفيد',
    name: 'بوخملة لينا (Llinabou)',
    phone: '0562335622',
    email: 'bigbotscd236@gmail.com',
    nationalId: '1219600865',
    cards: 96,
    cardsAmount: 118500,
    transfers: 'حوّلت مبالغ لـ iden HAZAR بانتظام',
    firstActivity: '29 جانفي 2026',
    lastActivity: '14 فبراير 2026',
    notes: 'المستفيد الأكبر في الشبكة. صرفت 96 بطاقة بمبلغ إجمالي 118,500 دج. كانت تحوّل المبالغ إلى HAZAR التي بدورها تحوّلها لوافي دعلاش.',
  },
  {
    rank: 3,
    role: 'وسيط مالي رئيسي',
    name: 'ناصر الدين (Nceredinn)',
    phone: '0562697991',
    email: 'zizok1992@gmail.com',
    nationalId: '308147696',
    cards: 52,
    cardsAmount: 69000,
    transfers: 'كان يوزع الأموال على Llinabou وiden HAZAR',
    firstActivity: '08 فبراير 2026',
    lastActivity: '16 فبراير 2026',
    notes: 'وسيط مالي. كان يستقبل التحويلات من خروف ديب ثم يوزعها على باقي أعضاء الشبكة. حساب مفتوح حديثاً (7 فبراير 2026).',
  },
  {
    rank: 4,
    role: 'وسيطة مالية / محوّلة للأموال',
    name: 'بوخملة هزار (iden HAZAR)',
    phone: '0656187381',
    email: 'boukhamlahazar@gmail.com',
    nationalId: '120091329',
    cards: 36,
    cardsAmount: 42000,
    transfers: 'كانت تستقبل من Llinabou وNceredinn وتحوّل لوافي دعلاش',
    firstActivity: '25 جانفي 2026',
    lastActivity: '13 فبراير 2026',
    notes: 'الوسيطة الرئيسية لتحويل الأموال لوافي دعلاش. حوّلت له مبالغ تجاوزت 56,000 دج. محتملة أن تكون قريبة من وافي دعلاش (نفس اللقب).',
  },
  {
    rank: 5,
    role: 'منفذ ميداني / سكيكدة',
    name: 'خروف ديب',
    phone: '0550850609',
    email: 'khrif2026@gmail.com',
    nationalId: '119630758000031705',
    cards: 40,
    cardsAmount: 48000,
    transfers: 'كان يحوّل لـ Nceredinn بعد كل عملية صرف',
    firstActivity: '15 فبراير 2026',
    lastActivity: '17 فبراير 2026',
    notes: 'واصل نشاطه حتى بعد حظر وافي دعلاش (17 فبراير). صرف 15 بطاقة في دقيقتين (06:52-06:53 صباحاً). يملك أكواد محزّنة مسبقاً.',
  },
  {
    rank: 6,
    role: 'عضو شبكة / سكيكدة',
    name: 'عيساوي يوسف',
    phone: '0556219320',
    email: '—',
    nationalId: '—',
    cards: 0,
    cardsAmount: 0,
    transfers: 'استقبل تحويلات من وافي دعلاش بأكثر من 290,000 دج، وزّعها خارج المنصة',
    firstActivity: '—',
    lastActivity: '—',
    notes: 'لم يصرف بطاقات مباشرة لكنه كان يستقبل الأموال من وافي دعلاش ويحوّلها لجهات خارجية (حرقات راشد، صلاح الدين، وغيرهم).',
  },
  {
    rank: 7,
    role: 'عضو شبكة / سكيكدة',
    name: 'بغريش نذير',
    phone: '0553573135',
    email: 'nadirskikda901@gmail.com',
    nationalId: '109920751037260001',
    cards: 12,
    cardsAmount: 14500,
    transfers: '—',
    firstActivity: '25 جانفي 2026',
    lastActivity: '03 فبراير 2026',
    notes: 'عضو في الشبكة، صرف 12 بطاقة.',
  },
  {
    rank: 8,
    role: 'عضو شبكة / سكيكدة',
    name: 'بوكرفة إسلام',
    phone: '0558884334',
    email: 'islambarceloe@gmail.com',
    nationalId: '109930751002290007',
    cards: 11,
    cardsAmount: 12000,
    transfers: '—',
    firstActivity: '26 جانفي 2026',
    lastActivity: '02 فبراير 2026',
    notes: 'عضو في الشبكة، صرف 11 بطاقة.',
  },
  {
    rank: 9,
    role: 'عضو شبكة',
    name: 'دعلاش رمزي',
    phone: '0542655090',
    email: 'ramzidalach@gmail.com',
    nationalId: '109940751000970004',
    cards: 7,
    cardsAmount: 7000,
    transfers: '—',
    firstActivity: '08 فبراير 2026',
    lastActivity: '14 فبراير 2026',
    notes: 'يحمل نفس اللقب "دعلاش" مما يرجح صلة قرابة بالرأس المدبر وافي دعلاش.',
  },
];

const transferFlow = [
  { from: 'خروف ديب (0550850609)', to: 'Nceredinn (0562697991)', amount: '~31,000 دج', date: 'فبراير 2026' },
  { from: 'Nceredinn (0562697991)', to: 'Llinabou (0562335622)', amount: '~28,000 دج', date: 'فبراير 2026' },
  { from: 'Nceredinn (0562697991)', to: 'iden HAZAR (0656187381)', amount: '~24,000 دج', date: 'فبراير 2026' },
  { from: 'Llinabou (0562335622)', to: 'iden HAZAR (0656187381)', amount: '~13,000 دج', date: 'فبراير 2026' },
  { from: 'iden HAZAR (0656187381)', to: 'وافي دعلاش (0660873714)', amount: '~56,000 دج', date: 'جانفي - فبراير 2026' },
  { from: 'وافي دعلاش (0660873714)', to: 'عيساوي يوسف (0556219320)', amount: '~144,000 دج', date: 'جانفي - فبراير 2026' },
  { from: 'عيساوي يوسف (0556219320)', to: 'حسابات خارجية (حرقات، صلاح الدين، إلخ)', amount: '~290,000 دج', date: 'جانفي - فبراير 2026' },
];

const FraudReport = () => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: html2canvas } = await import('html2canvas');
    
    if (!reportRef.current) return;

    const element = reportRef.current;
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.8);
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`تقرير-احتيال-سكيكدة-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const totalCards = suspects.reduce((sum, s) => sum + s.cards, 0);
  const totalAmount = suspects.reduce((sum, s) => sum + s.cardsAmount, 0);

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4">
      {/* Action Buttons - NOT printed */}
      <div className="max-w-4xl mx-auto mb-6 flex gap-4 print:hidden">
        <Button onClick={handleDownloadPDF} className="bg-red-700 hover:bg-red-800 text-white gap-2">
          <FileDown className="w-4 h-4" />
          تحميل PDF
        </Button>
        <Button onClick={handlePrint} variant="outline" className="gap-2">
          <Printer className="w-4 h-4" />
          طباعة
        </Button>
      </div>

      {/* REPORT CONTENT */}
      <div
        ref={reportRef}
        dir="rtl"
        className="max-w-4xl mx-auto bg-white shadow-2xl"
        style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', color: '#1a1a1a' }}
      >
        {/* HEADER */}
        <div style={{ background: '#1a1a2e', color: 'white', padding: '30px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: '11px', letterSpacing: '2px', marginBottom: '8px', color: '#aaa' }}>
            الجمهورية الجزائرية الديمقراطية الشعبية
          </div>
          <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '6px' }}>
            تقرير جريمة احتيال إلكتروني
          </div>
          <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '16px' }}>
            شبكة الاحتيال - منصة {PLATFORM_NAME}
          </div>
          <div style={{
            display: 'inline-block',
            background: '#c0392b',
            color: 'white',
            padding: '6px 24px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 'bold'
          }}>
            سري - مقدَّم للجهات الأمنية
          </div>
          <div style={{ marginTop: '16px', fontSize: '11px', color: '#bbb' }}>
            تاريخ التقرير: {REPORT_DATE} | الفترة المشمولة: {PERIOD}
          </div>
          <div style={{ fontSize: '11px', color: '#bbb', marginTop: '4px' }}>
            المنصة: {PLATFORM_CONTACT}
          </div>
        </div>

        <div style={{ padding: '30px 40px' }}>

          {/* SUMMARY BOXES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '30px' }}>
            {[
              { label: 'إجمالي الأشخاص المشتبه بهم', value: '9 أشخاص', color: '#c0392b' },
              { label: 'إجمالي البطاقات المسرَّقة', value: `${totalCards} بطاقة`, color: '#e67e22' },
              { label: 'إجمالي المبالغ المسروقة', value: `${totalAmount.toLocaleString()} دج`, color: '#c0392b' },
              { label: 'الأموال الخارجة من المنصة', value: '~44,700 دج', color: '#8e44ad' },
            ].map((box, i) => (
              <div key={i} style={{ background: '#f8f9fa', border: `2px solid ${box.color}`, borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: box.color }}>{box.value}</div>
                <div style={{ fontSize: '10px', color: '#555', marginTop: '4px' }}>{box.label}</div>
              </div>
            ))}
          </div>

          {/* SECTION 1: Introduction */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '8px 16px', fontWeight: 'bold', fontSize: '13px', borderRadius: '4px 4px 0 0' }}>
              أولاً: ملخص الجريمة
            </div>
            <div style={{ border: '1px solid #ddd', borderTop: 'none', padding: '16px', borderRadius: '0 0 4px 4px', lineHeight: '1.8' }}>
              <p>
                تعرّضت منصة <strong>OpaY</strong> للدفع الإلكتروني لعملية احتيال منظّمة نفّذتها شبكة من 9 أشخاص يقيم معظمهم في ولاية <strong>سكيكدة</strong>.
                اعتمدت الجريمة على تسريب أكواد بطاقات الهدايا الرقمية من قِبَل أحد المشرفين السابقين (<strong>دعلاش وافي</strong>) لأعضاء الشبكة،
                الذين قاموا باستعمال هذه الأكواد للحصول على رصيد داخل المنصة ثم تحويله لحسابات خارجية.
              </p>
              <p style={{ marginTop: '10px' }}>
                البطاقات المسرَّبة كانت قد أُنشئت في <strong>6 ديسمبر 2025</strong> على يد المشرف دعلاش وافي، وتمت عملية الاستغلال بين
                <strong> 25 جانفي 2026</strong> و<strong>17 فبراير 2026</strong>.
              </p>
            </div>
          </div>

          {/* SECTION 2: Suspects */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '8px 16px', fontWeight: 'bold', fontSize: '13px', borderRadius: '4px 4px 0 0' }}>
              ثانياً: قائمة المشتبه بهم التفصيلية
            </div>
            <div style={{ border: '1px solid #ddd', borderTop: 'none', borderRadius: '0 0 4px 4px' }}>
              {suspects.map((s, i) => (
                <div key={i} style={{
                  borderBottom: i < suspects.length - 1 ? '1px solid #eee' : 'none',
                  padding: '16px',
                  background: i % 2 === 0 ? '#fff' : '#fafafa'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <span style={{
                        background: '#c0392b',
                        color: 'white',
                        borderRadius: '50%',
                        width: '22px',
                        height: '22px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        marginLeft: '8px'
                      }}>{s.rank}</span>
                      <strong style={{ fontSize: '14px' }}>{s.name}</strong>
                    </div>
                    <span style={{ background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '4px', padding: '2px 10px', fontSize: '10px', fontWeight: 'bold', color: '#856404' }}>
                      {s.role}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', fontSize: '11px', marginBottom: '8px' }}>
                    <div><span style={{ color: '#666' }}>📱 الهاتف: </span><strong>{s.phone}</strong></div>
                    <div><span style={{ color: '#666' }}>🪪 رقم الهوية: </span><strong>{s.nationalId}</strong></div>
                    <div><span style={{ color: '#666' }}>📧 الإيميل: </span>{s.email}</div>
                    {s.cards > 0 && <>
                      <div><span style={{ color: '#666' }}>🎫 البطاقات: </span><strong style={{ color: '#c0392b' }}>{s.cards} بطاقة</strong></div>
                      <div><span style={{ color: '#666' }}>💰 المبلغ: </span><strong style={{ color: '#c0392b' }}>{s.cardsAmount.toLocaleString()} دج</strong></div>
                    </>}
                    <div><span style={{ color: '#666' }}>📅 أول نشاط: </span>{s.firstActivity}</div>
                  </div>
                  <div style={{ background: '#fff8f0', border: '1px solid #f0c070', borderRadius: '4px', padding: '8px', fontSize: '11px', color: '#555' }}>
                    <strong>الدور: </strong>{s.notes}
                  </div>
                  {s.transfers !== '—' && (
                    <div style={{ background: '#f0f8ff', border: '1px solid #b0d4f0', borderRadius: '4px', padding: '8px', fontSize: '11px', color: '#2c5f8a', marginTop: '6px' }}>
                      <strong>التحويلات: </strong>{s.transfers}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: Money Flow */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '8px 16px', fontWeight: 'bold', fontSize: '13px', borderRadius: '4px 4px 0 0' }}>
              ثالثاً: مسار تدفق الأموال
            </div>
            <div style={{ border: '1px solid #ddd', borderTop: 'none', padding: '16px', borderRadius: '0 0 4px 4px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                <thead>
                  <tr style={{ background: '#f0f0f0' }}>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>المُرسِل</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'right' }}>المُستقبِل</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>المبلغ</th>
                    <th style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>الفترة</th>
                  </tr>
                </thead>
                <tbody>
                  {transferFlow.map((t, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.from}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd' }}>{t.to}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center', color: '#c0392b', fontWeight: 'bold' }}>{t.amount}</td>
                      <td style={{ padding: '8px', border: '1px solid #ddd', textAlign: 'center' }}>{t.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 4: Evidence */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: '#1a1a2e', color: 'white', padding: '8px 16px', fontWeight: 'bold', fontSize: '13px', borderRadius: '4px 4px 0 0' }}>
              رابعاً: الأدلة الإلكترونية المتوفرة
            </div>
            <div style={{ border: '1px solid #ddd', borderTop: 'none', padding: '16px', borderRadius: '0 0 4px 4px', lineHeight: '2' }}>
              <ul style={{ paddingRight: '20px', listStyleType: 'disc' }}>
                <li>سجلات قاعدة بيانات كاملة تُثبت استعمال الأكواد مع التوقيت الدقيق (ميلي ثانية)</li>
                <li>سجلات التحويلات الداخلية بين أعضاء الشبكة مع أرقام المعاملات</li>
                <li>أرقام الهاتف، عناوين الإيميل، وأرقام بطاقات الهوية الوطنية لكل مشتبه به</li>
                <li>دليل على أن الأكواد المستعملة في فبراير 2026 كانت قد أُنشئت في 6 ديسمبر 2025 (تسريب مسبق)</li>
                <li>خروف ديب واصل الاستغلال بعد حظر وافي دعلاش في 17 فبراير 2026 - دليل على حيازة أكواد مُحزَّنة</li>
                <li>مُعرِّفات فريدة (User IDs) لكل حساب في قاعدة البيانات</li>
              </ul>
            </div>
          </div>

          {/* SECTION 5: Requests */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ background: '#c0392b', color: 'white', padding: '8px 16px', fontWeight: 'bold', fontSize: '13px', borderRadius: '4px 4px 0 0' }}>
              خامساً: المطالب القانونية
            </div>
            <div style={{ border: '1px solid #ddd', borderTop: 'none', padding: '16px', borderRadius: '0 0 4px 4px', lineHeight: '2' }}>
              <p style={{ marginBottom: '10px' }}>تطلب منصة <strong>OpaY</strong> من الجهات الأمنية المختصة:</p>
              <ol style={{ paddingRight: '20px' }}>
                <li>فتح تحقيق جنائي في جريمة الاحتيال الإلكتروني وفق أحكام القانون 09-04 المتعلق بالوقاية من الجرائم المتصلة بتكنولوجيا المعلومات.</li>
                <li>استدعاء المشتبه بهم وفق أرقام هواتفهم وبطاقات هوياتهم المذكورة أعلاه.</li>
                <li>مصادرة الأجهزة الإلكترونية المستعملة في ارتكاب الجريمة.</li>
                <li>تتبع مسار الأموال الخارجة من المنصة عبر الحسابات البنكية والمحافظ الإلكترونية.</li>
              </ol>
            </div>
          </div>

          {/* FOOTER */}
          <div style={{ borderTop: '2px solid #1a1a2e', paddingTop: '20px', textAlign: 'center', color: '#666', fontSize: '10px' }}>
            <p style={{ fontWeight: 'bold', color: '#1a1a2e', fontSize: '12px', marginBottom: '8px' }}>
              منصة OpaY للدفع الإلكتروني
            </p>
            <p>{PLATFORM_CONTACT}</p>
            <p style={{ marginTop: '6px' }}>
              هذا التقرير مُعدٌّ آلياً من سجلات قاعدة البيانات وله قيمة قانونية بوصفه وثيقة رقمية رسمية.
            </p>
            <p style={{ marginTop: '6px', color: '#c0392b', fontWeight: 'bold' }}>
              تاريخ الإصدار: {REPORT_DATE} — سري ومحجوز للجهات الأمنية
            </p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body { margin: 0; padding: 0; background: white; }
          .print\\:hidden { display: none !important; }
          @page { margin: 0; size: A4; }
        }
      `}</style>
    </div>
  );
};

export default FraudReport;
