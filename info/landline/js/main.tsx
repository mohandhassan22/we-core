import { useState } from 'react';

function App() {
  const [activeTab, setActiveTab] = useState('packages');

  const tabs = [
    { id: 'packages', label: 'الباقات', icon: 'fa-solid fa-layer-group' },
    { id: 'extras', label: 'الباقات الإضافية', icon: 'fa-solid fa-plus-circle' },
    { id: 'contract', label: 'التعاقد', icon: 'fa-solid fa-file-contract' },
    { id: 'details', label: 'التفاصيل والشروط', icon: 'fa-solid fa-circle-info' },
  ];

  return (
    <div className="we-page">
      {/* HEADER */}
      <div className="header">
        <div className="logo"><i className="fa-solid fa-phone"></i></div>
        <div className="main-title">WE الأرضي</div>
        <div className="prepaid-badge">📞 مسبق الدفع</div>
        <div className="sub-title">باقات WE أرضي مسبق الدفع – الدليل الشامل</div>
      </div>

      {/* TABS NAV */}
      <div className="tabs-nav">
        <div className="tabs-nav-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            >
              <i className={tab.icon}></i> {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="container">
        {/* INTRO */}
        <div className="intro-box">
          <div className="intro-icon"><i className="fa-solid fa-phone"></i></div>
          <p>
            يقدم هذا الدليل تفاصيل شاملة ومبسطة عن <strong>باقات WE الأرضي مسبق الدفع</strong> مع أنظمة سداد مرنة (شهري، ربع سنوي، أو سنوي)، والباقات الإضافية (إكسترا)، والخدمات المضافة لتسهيل اختيار الأنسب لك.
          </p>
        </div>

        {/* TAB CONTENT */}
        {activeTab === 'packages' && <PackagesTab />}
        {activeTab === 'extras' && <ExtrasTab />}
        {activeTab === 'contract' && <ContractTab />}
        {activeTab === 'details' && <DetailsTab />}
      </div>

      {/* FOOTER */}
      <footer>
        <p><span>WE</span> Core Team &copy; 2026</p>
      </footer>
    </div>
  );
}

// ==================== PACKAGES TAB ====================
function PackagesTab() {
  return (
    <>
      <div className="section-title">
        <i className="fa-solid fa-layer-group" style={{ color: 'var(--purple-main)' }}></i> باقات WE أرضي الأساسية
      </div>

      <div className="plans-grid">
        {/* PLAN 40 */}
        <div className="plan-card basic">
          <div className="plan-header">
            <div className="plan-icon"><i className="fa-solid fa-phone-volume"></i></div>
            <div className="plan-name">أرضي WE 40</div>
            <div className="plan-price">40<small>ج.م/شهر</small></div>
          </div>
          <div className="plan-accent"></div>
          <div className="plan-body">
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-val">600 دقيقة</div>
                <div className="stat-label">محلي + محافظات شهرياً</div>
              </div>
            </div>
            <ul className="feature-list">
              <li><div className="fi fi-purple"><i className="fa-solid fa-check"></i></div>السعر شامل الضريبة: <strong>140 ج.م</strong></li>
              <li><div className="fi fi-purple"><i className="fa-solid fa-location-dot"></i></div>مكالمات محلي + محافظات</li>
              <li><div className="fi fi-red"><i className="fa-solid fa-xmark"></i></div>موبايل WE: غير متاح</li>
              <li><div className="fi fi-red"><i className="fa-solid fa-xmark"></i></div>شبكات أخرى: غير متاح</li>
              <li><div className="fi fi-green"><i className="fa-solid fa-check"></i></div>إظهار الرقم: <strong>نعم</strong></li>
              <li><div className="fi fi-green"><i className="fa-solid fa-check"></i></div>خدمة التتبع: <strong>نعم</strong></li>
              <li><div className="fi fi-purple"><i className="fa-solid fa-calendar"></i></div>صلاحية الباقة: <strong>90 يوم</strong></li>
            </ul>
            <div className="payment-options">
              <div className="payment-label"><i className="fa-solid fa-calendar"></i> أنظمة السداد</div>
              <div className="payment-chips">
                <span className="payment-chip">شهري</span>
                <span className="payment-chip">ربع سنوي</span>
                <span className="payment-chip">سنوي</span>
              </div>
            </div>
          </div>
        </div>

        {/* PLAN 50 */}
        <div className="plan-card standard">
          <div className="plan-header">
            <div className="plan-icon"><i className="fa-solid fa-phone"></i></div>
            <div className="plan-name">أرضي WE 50</div>
            <div className="plan-price">50<small>ج.م/شهر</small></div>
          </div>
          <div className="plan-accent"></div>
          <div className="plan-body">
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-val">3750 دقيقة</div>
                <div className="stat-label">محلي + محافظات شهرياً</div>
              </div>
            </div>
            <ul className="feature-list">
              <li><div className="fi fi-blue"><i className="fa-solid fa-check"></i></div>السعر شامل الضريبة: <strong>172 ج.م</strong></li>
              <li><div className="fi fi-blue"><i className="fa-solid fa-location-dot"></i></div>مكالمات محلي + محافظات</li>
              <li><div className="fi fi-red"><i className="fa-solid fa-xmark"></i></div>موبايل WE: غير متاح</li>
              <li><div className="fi fi-red"><i className="fa-solid fa-xmark"></i></div>شبكات أخرى: غير متاح</li>
              <li><div className="fi fi-green"><i className="fa-solid fa-check"></i></div>إظهار الرقم: <strong>نعم</strong></li>
              <li><div className="fi fi-green"><i className="fa-solid fa-check"></i></div>خدمة التتبع: <strong>نعم</strong></li>
              <li><div className="fi fi-blue"><i className="fa-solid fa-calendar"></i></div>صلاحية الباقة: <strong>90 يوم</strong></li>
            </ul>
            <div className="payment-options">
              <div className="payment-label"><i className="fa-solid fa-calendar"></i> أنظمة السداد</div>
              <div className="payment-chips">
                <span className="payment-chip">شهري</span>
                <span className="payment-chip">ربع سنوي</span>
                <span className="payment-chip">سنوي</span>
              </div>
            </div>
          </div>
        </div>

        {/* PLAN 80 */}
        <div className="plan-card premium">
          <div className="plan-header">
            <div className="plan-icon"><i className="fa-solid fa-crown"></i></div>
            <div className="plan-name">أرضي WE 80</div>
            <div className="plan-price">80<small>ج.م/شهر</small></div>
          </div>
          <div className="plan-accent"></div>
          <div className="plan-body">
            <div className="stats-row">
              <div className="stat-box">
                <div className="stat-val">3750 + 250 دقيقة</div>
                <div className="stat-label">محلي/محافظات + جميع شبكات الموبايل</div>
              </div>
            </div>
            <ul className="feature-list">
              <li><div className="fi fi-pink"><i className="fa-solid fa-check"></i></div>السعر شامل الضريبة: <strong>275 ج.م</strong></li>
              <li><div className="fi fi-pink"><i className="fa-solid fa-location-dot"></i></div>3750 دقيقة محلي + محافظات</li>
              <li><div className="fi fi-pink"><i className="fa-solid fa-mobile-screen"></i></div>250 دقيقة لجميع شبكات الموبايل</li>
              <li><div className="fi fi-pink"><i className="fa-solid fa-star"></i></div>الباقة الأشمل</li>
              <li><div className="fi fi-green"><i className="fa-solid fa-check"></i></div>إظهار الرقم: <strong>نعم</strong></li>
              <li><div className="fi fi-green"><i className="fa-solid fa-check"></i></div>خدمة التتبع: <strong>نعم</strong></li>
              <li><div className="fi fi-pink"><i className="fa-solid fa-calendar"></i></div>صلاحية الباقة: <strong>90 يوم</strong></li>
            </ul>
            <div className="payment-options">
              <div className="payment-label"><i className="fa-solid fa-calendar"></i> أنظمة السداد</div>
              <div className="payment-chips">
                <span className="payment-chip">شهري</span>
                <span className="payment-chip">ربع سنوي</span>
                <span className="payment-chip">سنوي</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SERVICES */}
      <div className="services-section">
        <h3><i className="fa-solid fa-cogs"></i> الخدمات المضافة والمميزة</h3>
        <div className="services-grid">
          <div className="service-card">
            <div className="scard-icon"><i className="fa-solid fa-eye"></i></div>
            <div className="scard-text">
              <h4>إظهار رقم الطالب</h4>
              <p>معرفة رقم المتصل – متاحة في جميع الباقات</p>
            </div>
          </div>
          <div className="service-card">
            <div className="scard-icon"><i className="fa-solid fa-route"></i></div>
            <div className="scard-text">
              <h4>خاصية التتبع</h4>
              <p>تحويل المكالمات الواردة للأرضي إلى موبايل أو رقم آخر – متاحة في جميع الباقات</p>
            </div>
          </div>
          <div className="service-card">
            <div className="scard-icon"><i className="fa-solid fa-hand-holding-dollar"></i></div>
            <div className="scard-text">
              <h4>خدمة سلفني</h4>
              <p>تمنح 40 وحدة مقابل 2 جنيه صالحة للإستخدام لمدة 30 يوم – يمكن إستخدامها مرة واحدة في الشهر</p>
            </div>
          </div>
        </div>
      </div>

      {/* MANAGEMENT */}
      <div className="management-box">
        <div className="management-content">
          <h3><i className="fa-solid fa-mobile-screen"></i> طرق الاشتراك والإدارة</h3>
          <div className="management-grid">
            <div className="mgmt-item"><i className="fa-solid fa-mobile"></i><span>تطبيق My WE</span></div>
            <div className="mgmt-item"><i className="fa-solid fa-globe"></i><span>my.te.eg</span></div>
            <div className="mgmt-item"><i className="fa-solid fa-headset"></i><span>خدمة العملاء 111</span></div>
            <div className="mgmt-item"><i className="fa-solid fa-building"></i><span>فروع WE</span></div>
          </div>
        </div>
      </div>

      <div className="note-box">
        <i className="fa-solid fa-triangle-exclamation"></i>
        يمكنك متابعة استهلاكك، شحن رصيدك، أو الاشتراك في الباقات الإضافية عبر تطبيق My WE أو الموقع الإلكتروني.
      </div>
    </>
  );
}

// ==================== EXTRAS TAB ====================
function ExtrasTab() {
  return (
    <>
      <div className="extra-section">
        <h3><i className="fa-solid fa-plus-circle"></i> باقات إكسترا WE الإضافية</h3>
        <div className="extra-note">
          <i className="fa-solid fa-circle-info"></i>
          يرجى العلم ان مدة الباقة الإضافية 30 يوم فقط و يتم إضافتها من خلال سيستم BSS
        </div>

        {/* Extra Ardy */}
        <div className="subsection-title">
          <i className="fa-solid fa-phone" style={{ color: 'var(--purple-main)' }}></i>
          باقات إكسترا للأرضي والمحافظات
        </div>
        <div className="extra-grid">
          <div className="extra-card">
            <h4><i className="fa-solid fa-box"></i> إكسترا 10</h4>
            <div className="extra-minutes">250 دقيقة</div>
            <div className="extra-detail">للاتصال بالأرضي</div>
            <div className="extra-tax"><i className="fa-solid fa-percent"></i> الضريبة: 1.14%</div>
            <div className="extra-price">11.4 ج.م شامل الضريبة</div>
            <div className="extra-desc"><i className="fa-solid fa-calendar-day"></i> صلاحية الباقة: 30 يوم</div>
          </div>
          <div className="extra-card">
            <h4><i className="fa-solid fa-box"></i> إكسترا 20</h4>
            <div className="extra-minutes">700 دقيقة</div>
            <div className="extra-detail">للاتصال بالأرضي</div>
            <div className="extra-tax"><i className="fa-solid fa-percent"></i> الضريبة: 1.14%</div>
            <div className="extra-price">22.8 ج.م شامل الضريبة</div>
            <div className="extra-desc"><i className="fa-solid fa-calendar-day"></i> صلاحية الباقة: 30 يوم</div>
          </div>
        </div>

        {/* Extra Mobile */}
        <div className="subsection-title">
          <i className="fa-solid fa-mobile-screen" style={{ color: 'var(--blue)' }}></i>
          باقات إكسترا للموبايل
        </div>
        <div className="extra-grid">
          <div className="extra-card mobile">
            <h4><i className="fa-solid fa-mobile"></i> إكسترا 5 موبايل WE</h4>
            <div className="extra-minutes">100 دقيقة</div>
            <div className="extra-detail">لموبايل WE فقط</div>
            <div className="extra-tax"><i className="fa-solid fa-percent"></i> الضريبة: 23.12%</div>
            <div className="extra-price">6.16 ج.م شامل الضريبة</div>
            <div className="extra-desc"><i className="fa-solid fa-calendar-day"></i> صلاحية الباقة: 30 يوم</div>
          </div>
          <div className="extra-card mobile">
            <h4><i className="fa-solid fa-mobile"></i> إكسترا 15 موبايل شبكات أخرى</h4>
            <div className="extra-minutes">125 دقيقة</div>
            <div className="extra-detail">لجميع الشبكات الأخرى</div>
            <div className="extra-tax"><i className="fa-solid fa-percent"></i> الضريبة: 23.12%</div>
            <div className="extra-price">18.47 ج.م شامل الضريبة</div>
            <div className="extra-desc"><i className="fa-solid fa-calendar-day"></i> صلاحية الباقة: 30 يوم</div>
          </div>
          <div className="extra-card mobile">
            <h4><i className="fa-solid fa-mobile"></i> إكسترا 25 موبايل شبكات أخرى</h4>
            <div className="extra-minutes">225 دقيقة</div>
            <div className="extra-detail">لجميع الشبكات الأخرى</div>
            <div className="extra-tax"><i className="fa-solid fa-percent"></i> الضريبة: 23.12%</div>
            <div className="extra-price">30.78 ج.م شامل الضريبة</div>
            <div className="extra-desc"><i className="fa-solid fa-calendar-day"></i> صلاحية الباقة: 30 يوم</div>
          </div>
        </div>
      </div>

      {/* After Package Billing */}
      <div className="info-section">
        <h3><i className="fa-solid fa-money-bill-wave"></i> المحاسبة بعد انتهاء الباقة</h3>
        <div className="billing-table-wrapper">
          <table className="billing-table">
            <thead>
              <tr>
                <th>التفاصيل</th>
                <th>سعر الدقيقة</th>
                <th>رسوم فتح المكالمة</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><i className="fa-solid fa-phone" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> الدقيقة للأرضي – موبايل WE</td>
                <td><strong>3 قروش</strong></td>
                <td><strong>10 قروش</strong></td>
              </tr>
              <tr>
                <td><i className="fa-solid fa-mobile" style={{ color: 'var(--blue)', marginLeft: '8px' }}></i> الدقيقة شبكات أخرى موبايل</td>
                <td><strong>14 قرش</strong></td>
                <td><strong>10 قروش</strong></td>
              </tr>
              <tr>
                <td><i className="fa-solid fa-hashtag" style={{ color: 'var(--green)', marginLeft: '8px' }}></i> أرقام مختصرة</td>
                <td><strong>10 قروش</strong></td>
                <td><strong>10 قروش</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="note-box">
        <i className="fa-solid fa-triangle-exclamation"></i>
        لن يتم ترحيل الدقائق غير المستخدمة داخل الباقة للشهر التالي
      </div>
    </>
  );
}

// ==================== CONTRACT TAB ====================
function ContractTab() {
  return (
    <>
      {/* Contract Costs */}
      <div className="info-section">
        <h3><i className="fa-solid fa-file-invoice-dollar"></i> تفاصيل قيمة التعاقد</h3>
        <div className="billing-table-wrapper">
          <table className="billing-table contract-table">
            <thead>
              <tr>
                <th>البند</th>
                <th>الأسعار</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><i className="fa-solid fa-file-lines" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> مصاريف الطلب</td>
                <td><strong>50 ج.م</strong></td>
              </tr>
              <tr>
                <td><i className="fa-solid fa-screwdriver-wrench" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> مصاريف التركيب</td>
                <td><strong>150 ج.م</strong></td>
              </tr>
              <tr>
                <td><i className="fa-solid fa-calculator" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> إجمالي مصاريف الطلب والتركيب بدون الضريبة</td>
                <td><strong>167.5 ج.م</strong></td>
              </tr>
              <tr>
                <td><i className="fa-solid fa-stamp" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> ضريبة الدمغة</td>
                <td><strong>10.9 ج.م</strong></td>
              </tr>
              <tr>
                <td><i className="fa-solid fa-percent" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> ضريبة القيمة المضافة</td>
                <td><strong>24.98 ج.م</strong></td>
              </tr>
              <tr className="total-row">
                <td><i className="fa-solid fa-receipt" style={{ color: 'var(--purple-main)', marginLeft: '8px' }}></i> إجمالي مصاريف التركيب بالضريبة والدمغة</td>
                <td><strong>203 ج.م</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Total Contract */}
      <div className="info-section">
        <h3><i className="fa-solid fa-handshake"></i> استكمال التعاقد (شامل اشتراك 3 شهور مقدماً + مصاريف التركيب)</h3>
        <div className="contract-totals-grid">
          <div className="contract-total-card">
            <div className="contract-total-name">WE أرضي 40</div>
            <div className="contract-total-price">322 L.E</div>
            <div className="contract-total-desc">شامل اشتراك 3 شهور مقدماً + مصاريف التركيب</div>
          </div>
          <div className="contract-total-card">
            <div className="contract-total-name">WE أرضي 50</div>
            <div className="contract-total-price">440 L.E</div>
            <div className="contract-total-desc">شامل اشتراك 3 شهور مقدماً + مصاريف التركيب</div>
          </div>
          <div className="contract-total-card">
            <div className="contract-total-name">WE أرضي 80</div>
            <div className="contract-total-price">510 L.E</div>
            <div className="contract-total-desc">شامل اشتراك 3 شهور مقدماً + مصاريف التركيب</div>
          </div>
        </div>
      </div>

      {/* Cut/Raise Rules */}
      <div className="info-section">
        <h3><i className="fa-solid fa-scissors"></i> قواعد القطع والرفع في حالة عدم تجديد الباقة الأساسية</h3>
        <div className="billing-table-wrapper">
          <table className="billing-table">
            <thead>
              <tr>
                <th>الباقة</th>
                <th>الشهرية</th>
                <th>الربع سنوية</th>
                <th>السنوية</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>صلاحية الباقة</strong></td>
                <td>شهري</td>
                <td>ربع سنوي</td>
                <td>سنوي</td>
              </tr>
              <tr>
                <td><strong>استقبال فقط</strong></td>
                <td>—</td>
                <td>7 أيام ابتداءً من اليوم التالي لتاريخ التجديد</td>
                <td>7 أيام ابتداءً من اليوم التالي لتاريخ التجديد</td>
              </tr>
              <tr>
                <td><strong>إيقاف مؤقت</strong></td>
                <td>يتم إيقاف الخط الأرضي ابتداءً من اليوم التالي من تاريخ التجديد</td>
                <td>ابتداءً من اليوم الرابع من تاريخ التجديد</td>
                <td>ابتداءً من اليوم الثامن من تاريخ التجديد</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="note-box">
        <i className="fa-solid fa-triangle-exclamation"></i>
        مصاريف الاستعلام 50 جنية
      </div>
    </>
  );
}

// ==================== DETAILS TAB ====================
function DetailsTab() {
  const details = [
    { icon: 'fa-solid fa-rotate', title: 'تجديد الباقات', text: 'تجديد باقات WE أرضي كل 90 يوم. سيتم تجديد الباقة تلقائياً في ميعادها في حالة وجود رصيد كافي في حساب العميل.' },
    { icon: 'fa-solid fa-ban', title: 'عدم ترحيل الدقائق', text: 'لن يتم ترحيل الدقائق غير المستخدمة داخل الباقة للشهر التالي.' },
    { icon: 'fa-solid fa-exclamation-triangle', title: 'عدم وجود رصيد كافٍ', text: 'في حالة عدم وجود رصيد كافٍ لتغطية قيمة اشتراك الباقة الأساسية، سيتم تحويل الخط الأرضي إلى استقبال فقط لمدة ثلاثة أيام، وفي حالة الاستمرار في عدم الشحن لتجديد الباقة الأساسية، سيتم رفع الخط مؤقتاً من الخدمة لمدة 210 يوم.' },
    { icon: 'fa-solid fa-clock', title: 'مدة التعاقد', text: 'المدة المتاحة للتعاقد هي 14 يوم بدءاً من وقت الحصول على الإمكانية الفنية، وفي حالة عدم استكمال إجراءات التعاقد في المدة المحددة سيتم إلغاء هذه الإمكانية.' },
    { icon: 'fa-solid fa-redo', title: 'تجديد طلب الخط', text: 'يمكن للعميل تجديد طلب الخط للحصول على الإمكانية الفنية مرتين بدون أي مقابل خلال عام من تاريخ تقديم الطلب، وبعد انتهاء هذه المدة يتم إلغاء الطلب.' },
    { icon: 'fa-solid fa-server', title: 'عدم وجود إمكانية فنية', text: 'في حالة عدم وجود إمكانية فنية يتم الاحتفاظ بطلب العميل لمدة سنتين من تاريخ تقديم الطلب بنفس رقم المسلسل وسيتم تعديله بدون أي مقابل.' },
    { icon: 'fa-solid fa-money-bill-transfer', title: 'استرداد المصاريف', text: 'يحق للعميل استرداد مصاريف التعاقد شاملة الضرائب باستثناء رسوم الطلب بالضرائب والاحتفاظ بطلب الخط لمدة عامين من تاريخ الطلب.' },
    { icon: 'fa-solid fa-user-slash', title: 'العملاء المدرجون (Blacklist)', text: 'يحق للعميل المدرج في القائمة السوداء طلب الحصول على خط أرضي جديد، ولكن لن يتم استكمال إجراءات التعاقد إلا بعد تسوية وضع العميل وسداد أي مديونيات.' },
    { icon: 'fa-solid fa-copy', title: 'التعاقد على أكثر من خط', text: 'يحق للعميل التعاقد على خط واحد أو الاثنين معاً على أن يتم إخطاره بأنه في حالة عدم الحصول على الخط الثاني أثناء التعاقد لن يتمكن من التعاقد عليه فيما بعد.' },
    { icon: 'fa-solid fa-xmark', title: 'عدم تركيب الخط', text: 'في حالة عدم تركيب الخط الأرضي بعد التعاقد يتم إلغاء أمر شغل التعاقد أوتوماتيكياً خلال 60 يوم من تاريخ التعاقد ويمكن تجديد الإمكانية بناءً على طلب العميل مرة أخرى.' },
    { icon: 'fa-solid fa-file-circle-xmark', title: 'إلغاء التعاقد واسترداد المصاريف', text: 'يحق للعميل استرداد مصاريف التعاقد في حالة قيامه بطلب إلغاء التعاقد وعدم استكمال تركيب الخط الأرضي وما يرتبط بها من ضرائب، ولا يحق للعميل استرداد مصاريف الطلب وما يرتبط بها من ضرائب. وفي حالة رغبة العميل التعاقد مرة أخرى يتم تقديم طلب جديد برسوم جديدة.' },
  ];

  return (
    <>
      <div className="info-section">
        <h3><i className="fa-solid fa-circle-info"></i> تفاصيل وشروط هامة</h3>
        <div className="details-list">
          {details.map((item, index) => (
            <div className="detail-item" key={index}>
              <div className="detail-icon"><i className={item.icon}></i></div>
              <div className="detail-content">
                <h4>{item.title}</h4>
                <p>{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="note-box">
        <i className="fa-solid fa-triangle-exclamation"></i>
        سعر اشتراك الباقات الأساسية غير شامل ضريبة القيمة المضافة ولا ضريبة الجدول للباقات التي تشمل دقائق موبايل
      </div>
    </>
  );
}

export default App;
