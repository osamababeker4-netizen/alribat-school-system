import{centralEnabled,inviteSchoolUser}from"./central.js";
import React,{useEffect,useMemo,useRef,useState}from"react";
import{audit,backup,balance,clear,csv,fstatus,id,load,money,paid,restore,save,total}from"./store.js";
import"./styles.css";
import{LETTERHEAD_IMAGE}from"./letterhead.js";

const MODS=[["الرئيسية","⌂"],["الطلاب","🎓"],["الرسوم والتحصيل","💳"],["المصروفات","🧾"],["الموظفون","👥"],["الحضور","✓"],["المخزون","▣"],["الطلبات والموافقات","↔"],["التقارير","▤"],["المستخدمون والصلاحيات","⚙"]];
const PERMS={"مدير النظام":MODS.map(x=>x[0]),"مدير المدرسة":MODS.map(x=>x[0]),"محاسب":["الرئيسية","الطلاب","الرسوم والتحصيل","المصروفات","التقارير"],"أمين المستودع":["الرئيسية","المخزون","الطلبات والموافقات","التقارير"],"مشرف/معلم":["الرئيسية","الطلاب","الحضور","الطلبات والموافقات"]};
const ROLES=Object.keys(PERMS),today=()=>new Date().toISOString().slice(0,10),num=x=>Number(x||0);
function S({children,tone="neutral"}){return <span className={"status "+tone}>{children}</span>}
function Empty({text="لا توجد بيانات حتى الآن"}){return <div className="empty"><div className="emptyIcon">▤</div><b>{text}</b><span>استخدم زر الإضافة لبدء التسجيل.</span></div>}
function Head({title,desc,add,onAdd,search,setSearch,extra}){return <><div className="panel-title"><div><span className="eyebrow">مدرسة الرباط</span><h2>{title}</h2></div>{add&&<button className="primary" onClick={onAdd}>+ {add}</button>}</div><p className="muted">{desc}</p>{setSearch&&<div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..."/>{extra}</div>}</>}
function Modal({title,close,children}){return <div className="modalWrap" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modalHead"><h3>{title}</h3><button className="iconBtn" onClick={close}>×</button></div>{children}</div></div>}
function F({label,children,full}){return <label className={full?"full":""}><span>{label}</span>{children}</label>}
function Actions({close}){return <div className="formActions full"><button type="button" onClick={close}>إلغاء</button><button className="primary" type="submit">حفظ</button></div>}
function Metric({t,v,s,icon="•",tone="blue"}){return <div className={"card metricCard "+tone}><div className="metricIcon">{icon}</div><div><span>{t}</span><strong>{v}</strong><small>{s}</small></div></div>}
function printReceipt(x,school){
 const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
 const w=window.open("","_blank","width=900,height=900");
 if(!w)return;
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>إيصال ${esc(x.receipt)}</title><style>
 @page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;font-family:Tahoma,Arial,sans-serif;color:#17202a}.sheet{position:relative;width:210mm;height:297mm;overflow:hidden}.bg{position:absolute;inset:0;width:210mm;height:297mm;object-fit:fill}.body{position:absolute;top:62mm;right:18mm;left:18mm;bottom:30mm;z-index:2}.title{text-align:center;color:#0b345e;font-size:22pt;font-weight:800;margin:0 0 8mm}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.field{background:#ffffffde;border:1px solid #d6d0c7;border-radius:3mm;padding:4mm;min-height:24mm}.field b{display:block;color:#6b6258;font-size:8pt;margin-bottom:2mm}.field span{font-size:13pt;font-weight:700}.amount{margin-top:6mm;background:#ffffffde;border:1px solid #d0a646;border-radius:3mm;padding:5mm;text-align:center}.amount small{display:block;color:#6b6258;font-size:8pt}.amount strong{display:block;color:#0b345e;font-size:24pt;margin-top:2mm}.meta{position:absolute;right:0;bottom:0;font-size:7.5pt;color:#5f5851}.printbtn{position:fixed;top:12px;left:12px;z-index:20;padding:10px 16px;border:0;border-radius:9px;background:#0b345e;color:#fff;font:inherit}@media print{.printbtn{display:none}}
 </style></head><body><button class="printbtn" onclick="window.print()">طباعة / حفظ PDF</button><div class="sheet"><img class="bg" src="${LETTERHEAD_IMAGE}"><div class="body"><div class="title">إيصال قبض</div><div class="grid"><div class="field"><b>رقم الإيصال</b><span>${esc(x.receipt)}</span></div><div class="field"><b>التاريخ</b><span>${esc(x.date)}</span></div><div class="field"><b>اسم الطالب</b><span>${esc(x.studentName)}</span></div><div class="field"><b>طريقة الدفع</b><span>${esc(x.method)}</span></div></div><div class="amount"><small>المبلغ المستلم</small><strong>${money(x.amount)} ${esc(school.currency)}</strong></div><div class="meta">مستند صادر إلكترونيًا من النظام المالي والإداري المركزي</div></div></div></body></html>`);
 w.document.close();
}
function PrintBrand(){
 return <div className="printBrand" aria-hidden="true">
  <div className="printHeader"><img src="./alribat-seal.svg"/><div><b>مدرسة الرباط الأساسية المختلطة الخاصة</b><span>AL-RIBAT PRIVATE CO-ED BASIC SCHOOL</span><small>PORT SUDAN • تأسست 2000م</small></div></div>
  <img className="printWatermark" src="./alribat-seal.svg"/>
  <div className="printStamp"><img src="./alribat-stamp.svg"/><span>الختم الرسمي</span></div>
  <div className="printFooter"><b>مدرسة الرباط الأساسية المختلطة الخاصة</b><span>نظام مالي وإداري مركزي • مستند صادر من النظام</span></div>
 </div>
}

function App(){
 const[db,setDb]=useState(load),[active,setActive]=useState("الرئيسية"),[search,setSearch]=useState(""),[modal,setModal]=useState(null),[uidx,setUidx]=useState("u-admin");const fileRef=useRef();
 useEffect(()=>save(db),[db]);
 const user=db.users.find(x=>x.id===uidx&&x.active)||db.users.find(x=>x.active)||{name:"مدير النظام",role:"مدير النظام"};
 const allowed=PERMS[user.role]||["الرئيسية"];useEffect(()=>{if(!allowed.includes(active))setActive("الرئيسية")},[user.role,active]);
 const mutate=(fn,a,m,d)=>setDb(p=>{const n=fn(p);return{...n,audit:[audit(a,m,d,user.name),...(n.audit||[])].slice(0,1000)}});
 const notify=(title,message)=>setDb(p=>({...p,notifications:[{id:id("n"),title,message,at:new Date().toISOString(),read:false},...p.notifications].slice(0,100)}));
 const nav=MODS.filter(x=>allowed.includes(x[0]));
 return <div className="app"><aside className="sidebar"><div className="brand"><div className="logo"><img src="./alribat-seal.svg" alt="شعار مدرسة الرباط"/></div><div><b>مدرسة الرباط</b><span>الإدارة والمالية</span></div></div><nav>{nav.map(x=><button key={x[0]} className={active===x[0]?"active":""} onClick={()=>{setActive(x[0]);setSearch("")}}><i>{x[1]}</i><span>{x[0]}</span></button>)}</nav><div className="sideFoot"><span>الإصدار</span><b>Central v1.2</b></div></aside><main><header><div className="headerTitle"><span className="mobileTitle">مدرسة الرباط</span><h2>{active}</h2><small>النظام المالي والإداري المركزي</small></div><div className="headerActions"><button className="bell" onClick={()=>setModal({type:"notes"})}>🔔{db.notifications.some(x=>!x.read)&&<em>{db.notifications.filter(x=>!x.read).length}</em>}</button><div className="user"><div className="avatar">{(user.name||"م")[0]}</div><div><b>{user.name}</b><span>{user.role}</span></div></div></div></header><div className="content">
 {active==="الرئيسية"&&<Dashboard db={db} go={setActive} user={user}/>}
 {active==="الطلاب"&&<Students db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الرسوم والتحصيل"&&<Finance db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} notify={notify}/>}
 {active==="المصروفات"&&<Expenses db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الموظفون"&&<Staff db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الحضور"&&<Attendance db={db} mutate={mutate}/>}
 {active==="المخزون"&&<Inventory db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} notify={notify}/>}
 {active==="الطلبات والموافقات"&&<Requests db={db} mutate={mutate} setModal={setModal} user={user}/>}
 {active==="التقارير"&&<Reports db={db}/>}
 {active==="المستخدمون والصلاحيات"&&<Users db={db} mutate={mutate} setModal={setModal} user={user} uidx={uidx} setUidx={setUidx} fileRef={fileRef} setDb={setDb}/>}
 </div></main>
 <Dialogs modal={modal} setModal={setModal} db={db} mutate={mutate} notify={notify} user={user}/>
 <PrintBrand/>\n <input ref={fileRef} hidden type="file" accept="application/json" onChange={async e=>{try{setDb(await restore(e.target.files[0]));alert("تم استيراد النسخة الاحتياطية")}catch(x){alert(x.message)}e.target.value=""}}/>
 </div>
}

function Dashboard({db,go,user}){
 const fees=total(db.fees),cash=total(db.payments),exp=total(db.expenses),low=db.inventory.filter(x=>num(x.quantity)<=num(x.reorderLevel)),pending=db.requests.filter(x=>x.status==="قيد المراجعة");
 const recent=[...db.notifications].slice(0,4);
 return <>
  <section className="dashHero">
   <div className="dashWelcome"><span className="eyebrow">مرحبًا بك في نظام مدرسة الرباط</span><h1>مرحباً {user.name}</h1><p>إدارة مالية وإدارية موحدة، متابعة فورية، وصلاحيات حسب الدور.</p></div>
   <div className="dashDate"><b>{new Date().toLocaleDateString("ar-SA",{weekday:"long"})}</b><span>{new Date().toLocaleDateString("ar-SA")}</span><small>{db.school.academicYear}</small></div>
  </section>
  <div className="cards dashMetrics">
   <Metric t="الطلاب النشطون" v={db.students.filter(x=>x.status!=="منسحب").length} s="طالب وطالبة" icon="👥" tone="blue"/>
   <Metric t="الموظفون" v={db.staff.filter(x=>x.status!=="منتهي").length} s="إداري وتعليمي" icon="🎓" tone="violet"/>
   <Metric t="الرسوم المحصلة" v={money(cash)} s={db.school.currency} icon="🪙" tone="gold"/>
   <Metric t="صافي التدفق" v={money(cash-exp)} s={db.school.currency} icon="📊" tone="green"/>
  </div>
  <div className="dashboardGrid">
   <section className="panel dashPanel">
    <div className="panel-title"><div><span className="eyebrow">نظرة سريعة</span><h3>الحالة التشغيلية</h3></div><button className="softLink" onClick={()=>go("التقارير")}>عرض التقارير</button></div>
    <div className="opsGrid">
      <div className="opsItem"><span>إجمالي الرسوم</span><b>{money(fees)}</b><small>{db.school.currency}</small></div>
      <div className="opsItem"><span>المصروفات</span><b>{money(exp)}</b><small>{db.school.currency}</small></div>
      <div className="opsItem"><span>طلبات معلقة</span><b>{pending.length}</b><small>طلب</small></div>
      <div className="opsItem"><span>مخزون منخفض</span><b>{low.length}</b><small>صنف</small></div>
    </div>
    <div className="miniBars">
      {[["الأساسي الأول",72],["الأساسي الثاني",84],["الأساسي الثالث",77],["الأساسي الرابع",64],["الأساسي الخامس",58]].map(([n,v])=><div key={n}><span>{n}</span><i><em style={{height:v+"%"}}></em></i><b>{v}</b></div>)}
    </div>
   </section>
   <section className="panel dashPanel">
    <div className="panel-title"><h3>أحدث الإشعارات</h3><button className="softLink" onClick={()=>go("الطلبات والموافقات")}>عرض الكل</button></div>
    <div className="noticeList">{recent.length?recent.map((x,i)=><div className="noticeRow" key={x.id||i}><span className="noticeDot">●</span><div><b>{x.title}</b><small>{x.message}</small></div></div>):<div className="noticeRow"><span className="noticeDot">●</span><div><b>لا توجد إشعارات جديدة</b><small>سيظهر هنا آخر نشاطات النظام</small></div></div>}</div>
   </section>
   <section className="panel dashPanel">
    <div className="panel-title"><h3>اختصارات سريعة</h3></div>
    <div className="quick modernQuick"><button onClick={()=>go("الطلاب")}>👥 الطلاب</button><button onClick={()=>go("الرسوم والتحصيل")}>🪙 الرسوم</button><button onClick={()=>go("الحضور")}>📅 الحضور</button><button onClick={()=>go("التقارير")}>📊 التقارير</button></div>
   </section>
   <section className="panel quotePanel"><span>“ التربية والتوجيه ”</span><b>وحدة تسهم في بناء إنسان متميز</b><small>مدرسة الرباط الأساسية المختلطة الخاصة</small></section>
  </div>
 </>;
}

function Students({db,search,setSearch,mutate,setModal}){const rows=db.students.filter(x=>(x.name+" "+(x.grade||"")+" "+(x.parentPhone||"")).toLowerCase().includes(search.toLowerCase()));const del=x=>{if(db.fees.some(f=>f.studentId===x.id)||db.payments.some(p=>p.studentId===x.id)){alert("لا يمكن حذف طالب مرتبط بحركات مالية. غيّر حالته إلى منسحب.");return}if(confirm("تأكيد الحذف؟"))mutate(p=>({...p,students:p.students.filter(s=>s.id!==x.id)}),"حذف","الطلاب","حذف "+x.name)};return <section className="panel pagePanel"><Head title="الطلاب" desc="ملفات الطلاب وولي الأمر والحالة الدراسية." add="طالب" onAdd={()=>setModal({type:"student"})} search={search} setSearch={setSearch} extra={<button onClick={()=>csv("students.csv",db.students)}>تصدير</button>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الاسم</th><th>الصف</th><th>الفصل</th><th>ولي الأمر</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.grade}</td><td>{x.className||"—"}</td><td>{x.parentName||"—"}</td><td>{x.parentPhone||"—"}</td><td><S tone={x.status==="نشط"?"ok":"warn"}>{x.status}</S></td><td className="actions"><button onClick={()=>mutate(p=>({...p,students:p.students.map(s=>s.id===x.id?{...s,status:s.status==="نشط"?"موقوف":"نشط"}:s)}),"تعديل","الطلاب","تغيير حالة "+x.name)}>تغيير الحالة</button><button className="danger" onClick={()=>del(x)}>حذف</button></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Finance({db,search,setSearch,mutate,setModal}){const[tab,setTab]=useState("fees");const rows=db.fees.filter(x=>(x.studentName+" "+x.type).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="الرسوم والتحصيل" desc="الرصيد يحسب من الإيصالات الفعلية ولا يمكن الدفع بأكثر من المستحق." add={tab==="fees"?"رسوم":"إيصال قبض"} onAdd={()=>setModal({type:tab==="fees"?"fee":"payment"})} search={search} setSearch={setSearch} extra={<><button className={tab==="fees"?"selected":""} onClick={()=>setTab("fees")}>الرسوم</button><button className={tab==="payments"?"selected":""} onClick={()=>setTab("payments")}>الإيصالات</button></>}/>{tab==="fees"?(rows.length?<div className="tableWrap"><table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>الرصيد</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.studentName}</b></td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td>{money(balance(db,x))}</td><td><S tone={fstatus(db,x)==="مدفوع"?"ok":fstatus(db,x)==="غير مدفوع"?"bad":"warn"}>{fstatus(db,x)}</S></td></tr>)}</tbody></table></div>:<Empty/>):(db.payments.length?<div className="tableWrap"><table><thead><tr><th>الإيصال</th><th>الطالب</th><th>المبلغ</th><th>التاريخ</th><th>الطريقة</th><th></th></tr></thead><tbody>{[...db.payments].reverse().map(x=><tr key={x.id}><td><b>{x.receipt}</b></td><td>{x.studentName}</td><td>{money(x.amount)}</td><td>{x.date}</td><td>{x.method}</td><td><button onClick={()=>printReceipt(x,db.school)}>طباعة</button></td></tr>)}</tbody></table></div>:<Empty/>)}</section>}

function Expenses({db,search,setSearch,mutate,setModal}){const rows=db.expenses.filter(x=>(x.title+" "+x.category+" "+(x.payee||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="المصروفات" desc="المصروفات حسب التصنيف والتاريخ والمستفيد." add="مصروف" onAdd={()=>setModal({type:"expense"})} search={search} setSearch={setSearch} extra={<button onClick={()=>csv("expenses.csv",db.expenses)}>تصدير</button>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>البيان</th><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th>المستفيد</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.title}</b></td><td>{x.category}</td><td>{money(x.amount)}</td><td>{x.date}</td><td>{x.payee||"—"}</td><td><button className="danger" onClick={()=>confirm("تأكيد الحذف؟")&&mutate(p=>({...p,expenses:p.expenses.filter(e=>e.id!==x.id)}),"حذف","المحاسبة","حذف "+x.title)}>حذف</button></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Staff({db,search,setSearch,setModal}){const rows=db.staff.filter(x=>(x.name+" "+x.role+" "+(x.phone||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="الموظفون" desc="البيانات الوظيفية والرواتب والحالة." add="موظف" onAdd={()=>setModal({type:"staff"})} search={search} setSearch={setSearch}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الهاتف</th><th>الراتب</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.role}</td><td>{x.phone||"—"}</td><td>{money(x.salary)}</td><td><S tone="ok">{x.status}</S></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Attendance({db,mutate}){const[date,setDate]=useState(today());const rows=db.attendance.filter(x=>x.date===date);const status=s=>rows.find(x=>x.studentId===s.id)?.status;const mark=(s,st)=>mutate(p=>{const old=p.attendance.find(x=>x.studentId===s.id&&x.date===date);return{...p,attendance:old?p.attendance.map(x=>x.id===old.id?{...x,status:st}:x):[...p.attendance,{id:id("att"),studentId:s.id,studentName:s.name,date,status:st}]}},"تعديل","الحضور",s.name+" - "+st);return <section className="panel pagePanel"><Head title="الحضور" desc="تسجيل يومي للحضور والغياب والتأخير والأذونات."/><div className="toolbar"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><button onClick={()=>csv("attendance-"+date+".csv",rows)}>تصدير اليوم</button></div>{db.students.filter(x=>x.status==="نشط").length?<div className="attendanceGrid">{db.students.filter(x=>x.status==="نشط").map(s=><div className="attendanceRow" key={s.id}><div><b>{s.name}</b><small>{s.grade}</small></div><div className="attButtons">{["حاضر","غائب","متأخر","مأذون"].map(st=><button key={st} className={status(s)===st?"selected":""} onClick={()=>mark(s,st)}>{st}</button>)}</div></div>)}</div>:<Empty text="أضف الطلاب أولاً"/>}</section>}

function Inventory({db,search,setSearch,setModal}){const rows=db.inventory.filter(x=>(x.name+" "+(x.sku||"")+" "+(x.category||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="المخزون" desc="الأصناف والأرصدة ومنع الصرف بالسالب وحد إعادة الطلب." add="صنف" onAdd={()=>setModal({type:"item"})} search={search} setSearch={setSearch} extra={<button onClick={()=>setModal({type:"move"})}>+ حركة مخزون</button>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الصنف</th><th>الرمز</th><th>التصنيف</th><th>الرصيد</th><th>حد الطلب</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.sku||"—"}</td><td>{x.category||"—"}</td><td>{x.quantity+" "+(x.unit||"")}</td><td>{x.reorderLevel}</td><td><S tone={num(x.quantity)<=num(x.reorderLevel)?"warn":"ok"}>{num(x.quantity)<=num(x.reorderLevel)?"إعادة طلب":"متوفر"}</S></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Requests({db,mutate,setModal,user}){const decide=(x,st)=>mutate(p=>({...p,requests:p.requests.map(r=>r.id===x.id?{...r,status:st,decisionBy:user.name}:r)}),"اعتماد","الطلبات",st+" "+x.number);return <section className="panel pagePanel"><Head title="الطلبات والموافقات" desc="مسار طلب ومراجعة واعتماد/رفض." add="طلب" onAdd={()=>setModal({type:"request"})}/>{db.requests.length?<div className="tableWrap"><table><thead><tr><th>الرقم</th><th>العنوان</th><th>القسم</th><th>الأولوية</th><th>مقدم الطلب</th><th>الحالة</th><th></th></tr></thead><tbody>{[...db.requests].reverse().map(x=><tr key={x.id}><td><b>{x.number}</b></td><td>{x.title}</td><td>{x.department||"—"}</td><td>{x.priority}</td><td>{x.requester}</td><td><S tone={x.status==="معتمد"?"ok":x.status==="مرفوض"?"bad":"warn"}>{x.status}</S></td><td className="actions">{x.status==="قيد المراجعة"&&["مدير النظام","مدير المدرسة"].includes(user.role)&&<><button onClick={()=>decide(x,"معتمد")}>اعتماد</button><button className="danger" onClick={()=>decide(x,"مرفوض")}>رفض</button></>}</td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Reports({db}){
 const fees=total(db.fees),cash=total(db.payments),exp=total(db.expenses),open=db.fees.filter(x=>balance(db,x)>0);
 const printReport=()=>{const done=()=>document.body.classList.remove("report-print-mode");document.body.classList.add("report-print-mode");window.addEventListener("afterprint",done,{once:true});setTimeout(()=>window.print(),50);setTimeout(done,5000)};
 return <>
  <section className="panel pagePanel screenReport">
   <Head title="التقارير" desc="ملخص مالي وتقارير قابلة للطباعة والتصدير."/>
   <div className="cards reportCards"><Metric t="الرسوم" v={money(fees)} s={db.school.currency}/><Metric t="المتحصل" v={money(cash)} s={db.school.currency}/><Metric t="المصروفات" v={money(exp)} s={db.school.currency}/><Metric t="صافي التدفق" v={money(cash-exp)} s={db.school.currency}/></div>
   <div className="reportActions"><button onClick={printReport}>طباعة</button><button onClick={()=>csv("fees-report.csv",db.fees.map(x=>({...x,paid:paid(db,x.id),balance:balance(db,x),status:fstatus(db,x)})))}>تصدير الرسوم</button><button onClick={()=>csv("payments-report.csv",db.payments)}>تصدير الإيصالات</button><button onClick={()=>csv("inventory-report.csv",db.inventory)}>تصدير المخزون</button></div>
   <h3>الرسوم ذات الرصيد</h3>{open.length?<div className="tableWrap"><table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>الرصيد</th></tr></thead><tbody>{open.map(x=><tr key={x.id}><td>{x.studentName}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td><b>{money(balance(db,x))}</b></td></tr>)}</tbody></table></div>:<Empty text="لا توجد أرصدة مستحقة"/>}
  </section>
  <section className="reportPrintSheet officialLetterhead">
   <img className="officialLetterheadBg" src={LETTERHEAD_IMAGE} alt="ترويسة مدرسة الرباط"/>
   <div className="officialReportBody">
    <div className="orTitle"><span>تقرير مالي</span><h1>الملخص المالي</h1><p>تقرير صادر من النظام المالي والإداري المركزي</p></div>
    <div className="orMetrics">
      <div><span>إجمالي الرسوم</span><b>{money(fees)}</b><small>{db.school.currency}</small></div>
      <div><span>المتحصل</span><b>{money(cash)}</b><small>{db.school.currency}</small></div>
      <div><span>المصروفات</span><b>{money(exp)}</b><small>{db.school.currency}</small></div>
      <div><span>صافي التدفق</span><b>{money(cash-exp)}</b><small>{db.school.currency}</small></div>
    </div>
    <div className="orBalances"><h2>الرسوم ذات الرصيد</h2>{open.length?<table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>الرصيد</th></tr></thead><tbody>{open.slice(0,8).map(x=><tr key={x.id}><td>{x.studentName}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td>{money(balance(db,x))}</td></tr>)}</tbody></table>:<div className="orEmpty">لا توجد أرصدة مستحقة</div>}</div>
    <div className="orIssued">تاريخ الإصدار: <b>{new Date().toLocaleDateString("ar-SA")}</b></div>
   </div>
  </section>
 </>;
}

function Users({db,mutate,setModal,user,uidx,setUidx,fileRef,setDb}){const admin=["مدير النظام","مدير المدرسة"].includes(user.role);return <section className="panel pagePanel"><Head title="المستخدمون والصلاحيات" desc="الأدوار، النسخ الاحتياطي، وسجل التدقيق." add={admin?"مستخدم":null} onAdd={()=>setModal({type:"user"})}/><div className="settingsGrid"><div className="settingCard"><h3>الحساب الحالي</h3><select value={uidx} onChange={e=>setUidx(e.target.value)}>{db.users.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name+" — "+x.role}</option>)}</select><small>تبديل محلي للاختبار. الدخول الحقيقي يحتاج Auth مركزي.</small></div><div className="settingCard"><h3>النسخ الاحتياطي</h3><div className="buttonRow"><button onClick={()=>backup(db)}>تنزيل JSON</button><button onClick={()=>fileRef.current.click()}>استيراد</button></div></div><div className="settingCard"><h3>تصفير البيانات المحلية</h3><button className="danger" onClick={()=>confirm("سيتم حذف البيانات المحلية من هذا الجهاز فقط. متابعة؟")&&setDb(clear())}>تصفير</button></div></div><div className="tableWrap"><table><thead><tr><th>الاسم</th><th>البريد</th><th>الدور</th><th>الحالة</th><th></th></tr></thead><tbody>{db.users.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.email||"—"}</td><td>{x.role}</td><td><S tone={x.active?"ok":"bad"}>{x.active?"نشط":"موقوف"}</S></td><td>{admin&&x.id!=="u-admin"&&<button onClick={()=>mutate(p=>({...p,users:p.users.map(u=>u.id===x.id?{...u,active:!u.active}:u)}),"تعديل","المستخدمون","تغيير حالة "+x.name)}>{x.active?"إيقاف":"تفعيل"}</button>}</td></tr>)}</tbody></table></div><h3>سجل التدقيق</h3>{db.audit.length?<div className="auditList">{db.audit.slice(0,50).map(x=><div key={x.id}><b>{x.action+" · "+x.module}</b><span>{x.description}</span><small>{x.user+" — "+new Date(x.at).toLocaleString("ar")}</small></div>)}</div>:<Empty text="لا توجد عمليات مسجلة"/>}</section>}

function Dialogs({modal,setModal,db,mutate,notify,user}){if(!modal)return null;const close=()=>setModal(null);if(modal.type==="notes")return <Modal title="التنبيهات" close={close}>{db.notifications.length?<div className="auditList">{db.notifications.map(x=><div key={x.id}><b>{x.title}</b><span>{x.message}</span><small>{new Date(x.at).toLocaleString("ar")}</small></div>)}</div>:<Empty text="لا توجد تنبيهات"/>}<div className="modalActions"><button onClick={()=>{setModal(null)}}>إغلاق</button></div></Modal>;return <FormDialog type={modal.type} close={close} db={db} mutate={mutate} notify={notify} user={user}/>}

function FormDialog({type,close,db,mutate,notify,user}){const init={student:{name:"",grade:"",className:"",parentName:"",parentPhone:""},fee:{studentId:"",type:"رسوم دراسية",amount:"",dueDate:today()},payment:{feeId:"",amount:"",date:today(),method:"نقدي"},expense:{title:"",category:"أخرى",amount:"",date:today(),payee:""},staff:{name:"",role:"معلم",phone:"",salary:"",hireDate:today()},item:{name:"",sku:"",category:"",unit:"قطعة",quantity:"0",reorderLevel:"0",unitCost:"0"},move:{itemId:"",kind:"صرف",quantity:"",date:today(),recipient:""},request:{title:"",department:"",priority:"عادية",details:""},user:{name:"",email:"",role:"مشرف/معلم"}}[type]||{};const[f,setF]=useState(init);const set=(k,v)=>setF({...f,[k]:v});const title={student:"إضافة طالب",fee:"إضافة رسوم",payment:"إيصال قبض",expense:"إضافة مصروف",staff:"إضافة موظف",item:"إضافة صنف",move:"حركة مخزون",request:"طلب جديد",user:"إضافة مستخدم"}[type];
 const submit=async e=>{e.preventDefault();
 if(type==="student")mutate(p=>({...p,students:[...p.students,{...f,id:id("stu"),status:"نشط"}]}),"إنشاء","الطلاب","إضافة "+f.name);
 if(type==="fee"){const s=db.students.find(x=>x.id===f.studentId);mutate(p=>({...p,fees:[...p.fees,{...f,id:id("fee"),studentName:s.name,amount:num(f.amount)}]}),"إنشاء","المحاسبة","إضافة رسوم "+s.name)}
 if(type==="payment"){const fee=db.fees.find(x=>x.id===f.feeId),b=fee?balance(db,fee):0;if(!fee||num(f.amount)<=0||num(f.amount)>b){alert("المبلغ غير صالح أو أكبر من الرصيد "+money(b));return}const rec="REC-"+new Date().getFullYear()+"-"+String(db.payments.length+1).padStart(5,"0");mutate(p=>({...p,payments:[...p.payments,{...f,id:id("pay"),studentId:fee.studentId,studentName:fee.studentName,receipt:rec,amount:num(f.amount)}]}),"إنشاء","المحاسبة","إيصال "+rec);notify("تم تسجيل دفعة",rec+" — "+money(f.amount))}
 if(type==="expense")mutate(p=>({...p,expenses:[...p.expenses,{...f,id:id("exp"),amount:num(f.amount)}]}),"إنشاء","المحاسبة","مصروف "+f.title);
 if(type==="staff")mutate(p=>({...p,staff:[...p.staff,{...f,id:id("staff"),salary:num(f.salary),status:"على رأس العمل"}]}),"إنشاء","الموظفون","إضافة "+f.name);
 if(type==="item")mutate(p=>({...p,inventory:[...p.inventory,{...f,id:id("item"),quantity:num(f.quantity),reorderLevel:num(f.reorderLevel),unitCost:num(f.unitCost)}]}),"إنشاء","المخزون","إضافة "+f.name);
 if(type==="move"){const it=db.inventory.find(x=>x.id===f.itemId),q=num(f.quantity),delta=f.kind==="استلام"?q:-q;if(!it||q<=0)return;if(it.quantity+delta<0){alert("لا يمكن الصرف: الكمية أكبر من الرصيد");return}mutate(p=>({...p,inventory:p.inventory.map(x=>x.id===it.id?{...x,quantity:x.quantity+delta}:x),moves:[...p.moves,{...f,id:id("mov"),itemName:it.name,quantity:q,balanceAfter:it.quantity+delta}]}),"إنشاء","المخزون",f.kind+" "+q+" من "+it.name);if(it.quantity+delta<=it.reorderLevel)notify("تنبيه مخزون",it.name+" وصل إلى "+(it.quantity+delta))}
 if(type==="request")mutate(p=>({...p,requests:[...p.requests,{...f,id:id("req"),number:"REQ-"+String(p.requests.length+1).padStart(4,"0"),status:"قيد المراجعة",requester:user.name,createdAt:new Date().toISOString()}]}),"إنشاء","الطلبات","طلب "+f.title);
 if(type==="user"){
   if(centralEnabled){
     await inviteSchoolUser(f.email,f.name,f.role);
     alert("تم إصدار الدعوة. يمكن للمستخدم الآن التسجيل بنفس البريد من شاشة الدخول.");
   }else{
     mutate(p=>({...p,users:[...p.users,{...f,id:id("u"),active:true}]}),"إنشاء","المستخدمون","إضافة "+f.name);
   }
 }
 close()};
 return <Modal title={title} close={close}><form className="formGrid" onSubmit={submit}>{type==="student"&&<><F label="اسم الطالب" full><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="الصف"><input required value={f.grade} onChange={e=>set("grade",e.target.value)}/></F><F label="الفصل"><input value={f.className} onChange={e=>set("className",e.target.value)}/></F><F label="ولي الأمر"><input value={f.parentName} onChange={e=>set("parentName",e.target.value)}/></F><F label="هاتف ولي الأمر"><input value={f.parentPhone} onChange={e=>set("parentPhone",e.target.value)}/></F></>}
 {type==="fee"&&<><F label="الطالب" full><select required value={f.studentId} onChange={e=>set("studentId",e.target.value)}><option value="">اختر الطالب</option>{db.students.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F><F label="نوع الرسوم"><select value={f.type} onChange={e=>set("type",e.target.value)}>{["رسوم تسجيل","رسوم دراسية","رسوم نقل","رسوم نشاط","رسوم امتحانات","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F><F label="المبلغ"><input required min="1" type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></F><F label="الاستحقاق" full><input type="date" value={f.dueDate} onChange={e=>set("dueDate",e.target.value)}/></F></>}
 {type==="payment"&&<><F label="الرسم المستحق" full><select required value={f.feeId} onChange={e=>set("feeId",e.target.value)}><option value="">اختر</option>{db.fees.filter(x=>balance(db,x)>0).map(x=><option key={x.id} value={x.id}>{x.studentName+" — "+x.type+" — "+money(balance(db,x))}</option>)}</select></F><F label="المبلغ"><input required min="1" type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></F><F label="التاريخ"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></F><F label="الطريقة" full><select value={f.method} onChange={e=>set("method",e.target.value)}>{["نقدي","تحويل بنكي","شيك","بطاقة","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F></>}
 {type==="expense"&&<><F label="البيان" full><input required value={f.title} onChange={e=>set("title",e.target.value)}/></F><F label="التصنيف"><select value={f.category} onChange={e=>set("category",e.target.value)}>{["رواتب","إيجار","كهرباء وماء","صيانة","قرطاسية","مواد تعليمية","نقل","ضيافة","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F><F label="المبلغ"><input required min="1" type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></F><F label="التاريخ"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></F><F label="المستفيد"><input value={f.payee} onChange={e=>set("payee",e.target.value)}/></F></>}
 {type==="staff"&&<><F label="الاسم" full><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="الوظيفة"><select value={f.role} onChange={e=>set("role",e.target.value)}>{["معلم","إداري","عامل","حارس","سائق","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F><F label="الهاتف"><input value={f.phone} onChange={e=>set("phone",e.target.value)}/></F><F label="الراتب"><input type="number" min="0" value={f.salary} onChange={e=>set("salary",e.target.value)}/></F><F label="تاريخ التعيين"><input type="date" value={f.hireDate} onChange={e=>set("hireDate",e.target.value)}/></F></>}
 {type==="item"&&<><F label="اسم الصنف" full><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="الرمز"><input value={f.sku} onChange={e=>set("sku",e.target.value)}/></F><F label="التصنيف"><input value={f.category} onChange={e=>set("category",e.target.value)}/></F><F label="الوحدة"><input value={f.unit} onChange={e=>set("unit",e.target.value)}/></F><F label="الكمية"><input type="number" min="0" value={f.quantity} onChange={e=>set("quantity",e.target.value)}/></F><F label="حد إعادة الطلب"><input type="number" min="0" value={f.reorderLevel} onChange={e=>set("reorderLevel",e.target.value)}/></F></>}
 {type==="move"&&<><F label="الصنف" full><select required value={f.itemId} onChange={e=>set("itemId",e.target.value)}><option value="">اختر</option>{db.inventory.map(x=><option key={x.id} value={x.id}>{x.name+" — رصيد "+x.quantity}</option>)}</select></F><F label="الحركة"><select value={f.kind} onChange={e=>set("kind",e.target.value)}><option>استلام</option><option>صرف</option></select></F><F label="الكمية"><input required min="1" type="number" value={f.quantity} onChange={e=>set("quantity",e.target.value)}/></F><F label="التاريخ"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></F><F label="المستلم/المرجع" full><input value={f.recipient} onChange={e=>set("recipient",e.target.value)}/></F></>}
 {type==="request"&&<><F label="العنوان" full><input required value={f.title} onChange={e=>set("title",e.target.value)}/></F><F label="القسم"><input value={f.department} onChange={e=>set("department",e.target.value)}/></F><F label="الأولوية"><select value={f.priority} onChange={e=>set("priority",e.target.value)}><option>عادية</option><option>عالية</option><option>عاجلة</option></select></F><F label="التفاصيل" full><textarea rows="4" value={f.details} onChange={e=>set("details",e.target.value)}/></F></>}
 {type==="user"&&<><F label="الاسم"><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="البريد"><input type="email" value={f.email} onChange={e=>set("email",e.target.value)}/></F><F label="الدور" full><select value={f.role} onChange={e=>set("role",e.target.value)}>{ROLES.map(x=><option key={x}>{x}</option>)}</select></F></>}
 <Actions close={close}/></form></Modal>}

export default App;
