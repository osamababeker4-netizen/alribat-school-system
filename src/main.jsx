import React, {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import './styles.css';

const modules = [
  ['الرئيسية','⌂'],['الطلاب','🎓'],['الرسوم والتحصيل','💳'],['المصروفات','🧾'],['الموظفون','👥'],
  ['الحضور','✓'],['المخزون','▣'],['الطلبات والموافقات','↔'],['التقارير','▤'],['المستخدمون والصلاحيات','⚙']
];

const cards = [
  ['الطلاب النشطون','—','بيانات تشغيلية بعد الربط'],['إجمالي الرسوم','—','جنيه سوداني'],
  ['المتحصل','—','يُحتسب من حركات الدفع'],['الرصيد','—','يُحسب تلقائيًا']
];

function Dashboard(){
  return <>
    <div className="hero"><div><span className="eyebrow">النظام المالي والإداري</span><h1>مدرسة الرباط</h1><p>لوحة تشغيل موحّدة للمالية والإدارة والمخزون والمتابعة.</p></div><div className="hero-badge">2026</div></div>
    <div className="cards">{cards.map((c,i)=><div className="card" key={i}><span>{c[0]}</span><strong>{c[1]}</strong><small>{c[2]}</small></div>)}</div>
    <div className="grid2">
      <section className="panel"><div className="panel-title"><h3>تنبيهات تشغيلية</h3><span className="pill warn">2</span></div><div className="notice warnBox"><b>سلامة مالية</b><span>تتحقق النسخة الإنتاجية من مطابقة الرسوم والمدفوعات قبل إغلاق الفترة المالية.</span></div><div className="notice"><b>الصلاحيات</b><span>هيكل الأدوار جاهز لمدير النظام، مدير المدرسة، المحاسب، أمين المستودع، والمشرف/المعلم.</span></div></section>
      <section className="panel"><div className="panel-title"><h3>اختصارات سريعة</h3></div><div className="quick"><button>+ طالب جديد</button><button>+ إيصال قبض</button><button>+ مصروف</button><button>+ طلب مخزون</button></div></section>
    </div>
  </>
}

const sectionCopy = {
 'الطلاب':'إدارة ملفات الطلاب، التسجيل، الحالة، بيانات ولي الأمر، والبحث السريع.',
 'الرسوم والتحصيل':'إدارة الرسوم والأقساط والإيصالات مع مطابقة الرصيد تلقائيًا.',
 'المصروفات':'تسجيل المصروفات وتصنيفها وتتبع طرق الدفع والمستفيدين.',
 'الموظفون':'ملفات الموظفين والوظائف والرواتب والحالة الوظيفية.',
 'الحضور':'متابعة الحضور والغياب والتأخير والأذونات.',
 'المخزون':'الأصناف والأرصدة وحد إعادة الطلب وحركات الاستلام والصرف.',
 'الطلبات والموافقات':'طلبات التوريد والخصومات ومسارات الاعتماد والإشعارات.',
 'التقارير':'تقارير مالية وإدارية ومخزنية قابلة للطباعة والتصدير.',
 'المستخدمون والصلاحيات':'إدارة المستخدمين والأدوار والصلاحيات وحالة الحساب.'
};
function Generic({name}){
 return <section className="panel pagePanel"><div className="panel-title"><div><span className="eyebrow">مدرسة الرباط</span><h2>{name}</h2></div><button className="primary">+ إضافة جديد</button></div><p className="muted">{sectionCopy[name]}</p><div className="toolbar"><input placeholder="بحث..."/><button>تصفية</button><button>تصدير</button><button>طباعة</button></div><div className="empty"><div className="emptyIcon">▤</div><b>واجهة الوحدة جاهزة للربط بقاعدة البيانات</b><span>سيتم نقل السجلات الحالية وربط العمليات بعد إنشاء مستودع GitHub وتحديد قاعدة البيانات الإنتاجية.</span></div></section>
}

function App(){
 const [active,setActive]=useState('الرئيسية');
 const title=useMemo(()=>active,[active]);
 return <div className="app">
   <aside className="sidebar"><div className="brand"><div className="logo">ر</div><div><b>مدرسة الرباط</b><span>الإدارة والمالية</span></div></div><nav>{modules.map(([n,ic])=><button key={n} className={active===n?'active':''} onClick={()=>setActive(n)}><i>{ic}</i><span>{n}</span></button>)}</nav><div className="sideFoot"><span>الإصدار</span><b>GitHub Migration v0.1</b></div></aside>
   <main><header><div><span className="mobileTitle">مدرسة الرباط</span><h2>{title}</h2></div><div className="user"><div className="avatar">أ</div><div><b>مدير المدرسة</b><span>صلاحية إدارية</span></div></div></header><div className="content">{active==='الرئيسية'?<Dashboard/>:<Generic name={active}/>}</div></main>
 </div>
}

createRoot(document.getElementById('root')).render(<App/>);
