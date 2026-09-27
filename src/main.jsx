import{centralEnabled,inviteSchoolUser,setSchoolUserActive,updateMyPhone}from"./central.js";
import React,{useEffect,useMemo,useRef,useState}from"react";
import{audit,backup,balance,clear,csv,fstatus,id,load,money,paid,restore,save,total}from"./store.js";
import ORIGINAL_LOGO_DATA from"./originalLogo.js";
import"./styles.css";

const MODS=[["الرئيسية","⌂"],["الطلاب","🎓"],["الرسوم والتحصيل","💳"],["المصروفات","🧾"],["الموظفون","👥"],["حضور الموظفين","⏱"],["الحضور","✓"],["المخزون","▣"],["الطلبات والموافقات","↔"],["ورقة التقدير","📝"],["التقارير","▤"],["المستخدمون والصلاحيات","👤"],["الإعدادات","⚙"]];
const PERMS={"مدير النظام":MODS.map(x=>x[0]),"مدير المدرسة":MODS.map(x=>x[0]),"محاسب":["الرئيسية","الطلاب","الرسوم والتحصيل","المصروفات","التقارير"],"أمين المستودع":["الرئيسية","المخزون","الطلبات والموافقات","التقارير"],"مشرف/معلم":["الرئيسية","الطلاب","الحضور","ورقة التقدير","الطلبات والموافقات"]};
const ROLES=Object.keys(PERMS),today=()=>new Date().toISOString().slice(0,10),num=x=>Number(x||0);
function S({children,tone="neutral"}){return <span className={"status "+tone}>{children}</span>}
function Empty({text="لا توجد بيانات حتى الآن"}){return <div className="empty"><div className="emptyIcon">▤</div><b>{text}</b><span>استخدم زر الإضافة لبدء التسجيل.</span></div>}
function Head({title,desc,add,onAdd,search,setSearch,extra}){return <><div className="panel-title"><div><span className="eyebrow">مدرسة الرباط</span><h2>{title}</h2></div>{add&&<button className="primary" onClick={onAdd}>+ {add}</button>}</div><p className="muted">{desc}</p>{setSearch&&<div className="toolbar"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="بحث..."/>{extra}</div>}</>}
function Modal({title,close,children}){return <div className="modalWrap" onMouseDown={e=>e.target===e.currentTarget&&close()}><div className="modal"><div className="modalHead"><h3>{title}</h3><button className="iconBtn" onClick={close}>×</button></div>{children}</div></div>}
function F({label,children,full}){return <label className={full?"full":""}><span>{label}</span>{children}</label>}
function Actions({close}){return <div className="formActions full"><button type="button" onClick={close}>إلغاء</button><button className="primary" type="submit">حفظ</button></div>}
function Metric({t,v,s,icon="•",tone="blue"}){return <div className={"card metricCard "+tone}><div className="metricIcon">{icon}</div><div><span>{t}</span><strong>{v}</strong><small>{s}</small></div></div>}
function printAsset(name){const base=new URL(import.meta.env.BASE_URL||"/",window.location.origin+"/");return new URL(String(name).replace(/^\.?\//,""),base).href}

function printReceipt(x,school){
 const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
 const logoUrl=ORIGINAL_LOGO_DATA,stampUrl=printAsset("alribat-school-stamp-straight.png"),stampFallback=printAsset("alribat-stamp.svg");
 const w=window.open("","_blank","width=950,height=980");if(!w)return;
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>إيصال ${esc(x.receipt)}</title><style>
 @page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#f7f1e3;font-family:Tahoma,Arial,sans-serif;color:#2b2417}.printbtn{position:fixed;top:12px;left:12px;z-index:50;padding:10px 16px;border:0;border-radius:10px;background:#8f6208;color:#fff;font:inherit;font-weight:700;box-shadow:0 8px 24px #0002}.printbtn:disabled{opacity:.55}.sheet{position:relative;width:210mm;height:297mm;margin:0 auto;background:#fff;overflow:hidden;box-shadow:0 0 0 1px #d9e2e9 inset}.sheet:before{content:"";position:absolute;inset:5mm;border:1.5px solid #d6a843;pointer-events:none}.sheet:after{content:"";position:absolute;inset:8mm;border:1px solid #8f620830;pointer-events:none}.officialHead{position:relative;z-index:3;margin:12mm 15mm 0;min-height:31mm;display:grid;grid-template-columns:1fr 42mm 1fr;align-items:center;gap:6mm;padding:0 0 4mm;border-bottom:2px solid #8f6208}.officialHead:after{content:"";position:absolute;right:0;left:0;bottom:-4px;height:1.5px;background:#d6a843}.headAr,.headEn{display:grid;gap:1.5mm;line-height:1.25}.headAr{text-align:right}.headEn{text-align:left;color:#8f6208}.headAr b,.headEn b{font-size:9pt;color:#6c7680}.headAr strong,.headEn strong{font-size:12.5pt;color:#8f6208}.headAr span,.headEn span{font-size:8.5pt;color:#8a6b22;font-weight:700}.headLogo{display:grid;place-items:center}.headLogo img{width:40mm;height:28mm;object-fit:contain}.watermark{position:absolute;z-index:0;left:50%;top:54%;transform:translate(-50%,-50%);width:126mm;height:90mm;object-fit:contain;opacity:.065}.docBody{position:relative;z-index:2;margin:10mm 18mm 0}.docKicker{text-align:center;color:#9b7a2a;font-size:8pt;font-weight:700}.title{text-align:center;color:#8f6208;font-size:22pt;font-weight:800;margin:2mm 0 9mm}.grid{display:grid;grid-template-columns:1fr 1fr;gap:4mm}.field{background:#fffffff0;border:1px solid #e5d7b4;border-radius:3mm;padding:4.5mm;min-height:24mm}.field b{display:block;color:#786b4e;font-size:8pt;margin-bottom:2mm}.field span{display:block;font-size:12.5pt;font-weight:800;color:#2b2417}.amount{margin-top:6mm;background:#fffdf7;border:1.5px solid #d6a843;border-radius:3mm;padding:5.5mm;text-align:center}.amount small{display:block;color:#786b51;font-size:8pt}.amount strong{display:block;color:#8f6208;font-size:23pt;margin-top:2mm}.docNote{text-align:center;margin-top:6mm;color:#6b7580;font-size:7.5pt}.officialBottom{position:absolute;z-index:3;right:18mm;left:18mm;bottom:18mm;display:flex;align-items:flex-end;justify-content:flex-start}.stampBox,.signBox{min-width:44mm;text-align:center;color:#66583b;font-size:7pt}.stampBox img{display:block;width:31mm;height:31mm;object-fit:contain;margin:0 auto 1mm}.signBox img{display:block;width:43mm;max-height:17mm;object-fit:contain;margin:0 auto 1mm}.signBox b{display:block;color:#8f6208;font-size:7.5pt}.signBox small{display:block;margin-top:1mm}.footer{position:absolute;z-index:3;right:15mm;left:15mm;bottom:7mm;padding-top:2.2mm;border-top:1.5px solid #8f6208;display:flex;justify-content:space-between;gap:5mm;font-size:6.8pt;color:#8f6208}.footer span{color:#756746}.footer .rights{font-weight:700}@media(max-width:800px){body{background:#fff}.sheet{transform-origin:top center;width:210mm;height:297mm}.printbtn{top:8px;left:8px}}@media print{html,body{background:#fff}.printbtn{display:none}.sheet{margin:0;box-shadow:none}}
 </style></head><body><button class="printbtn" disabled onclick="window.print()">جارٍ تحميل الهوية...</button><div class="sheet">
 <div class="officialHead"><div class="headAr"><b>وزارة التربية والتوجيه</b><strong>مدرسة الرباط للتعليم الخاص</strong><span>وحدة بورتسودان الشرقية</span></div><div class="headLogo"><img src="${logoUrl}" alt="شعار مدرسة الرباط"></div><div class="headEn" dir="ltr"><b>MINISTRY OF EDUCATION &amp; GUIDANCE</b><strong>AL-RIBAT PRIVATE SCHOOL</strong><span>EAST PORT SUDAN UNIT</span></div></div>
 <img class="watermark" src="${logoUrl}" alt="">
 <div class="docBody"><div class="docKicker">مستند مالي رسمي • OFFICIAL FINANCIAL DOCUMENT</div><div class="title">إيصال قبض</div><div class="grid"><div class="field"><b>رقم الإيصال</b><span>${esc(x.receipt)}</span></div><div class="field"><b>التاريخ</b><span>${esc(x.date)}</span></div><div class="field"><b>اسم الطالب</b><span>${esc(x.studentName)}</span></div><div class="field"><b>طريقة الدفع</b><span>${esc(x.method)}</span></div></div><div class="amount"><small>المبلغ المستلم</small><strong>${money(x.amount)} ${esc(school.currency)}</strong></div><div class="docNote">مستند صادر إلكترونيًا من النظام المالي والإداري المركزي — مدرسة الرباط</div></div>
 <div class="officialBottom officialBottomNoSign"><div class="stampBox"><img src="${stampUrl}" onerror="this.onerror=null;this.src='${stampFallback}'" alt="الختم الرسمي"><span>الختم الرسمي</span></div></div>
 <div class="footer"><span>مدرسة الرباط للتعليم الخاص • بورتسودان</span><span class="rights">© 2026 Eng. Osama Ismail — جميع الحقوق والملكية الفكرية محفوظة</span></div>
 </div><script>(function(){var b=document.querySelector(".printbtn"),imgs=[].slice.call(document.images);Promise.all(imgs.map(function(i){return i.complete?Promise.resolve():new Promise(function(r){i.addEventListener("load",r,{once:true});i.addEventListener("error",r,{once:true})})})).then(function(){b.disabled=false;b.textContent="طباعة / حفظ PDF"})})();</script></body></html>`);
 w.document.close();
}


function PrintBrand(){
 return <div className="printBrand" aria-hidden="true">
  <div className="printHeader officialGenericHeader"><div className="genericAr"><b>وزارة التربية والتوجيه</b><span>مدرسة الرباط للتعليم الخاص</span><small>وحدة بورتسودان الشرقية</small></div><img src={ORIGINAL_LOGO_DATA}/><div className="genericEn"><b>MINISTRY OF EDUCATION &amp; GUIDANCE</b><span>AL-RIBAT PRIVATE SCHOOL</span><small>EAST PORT SUDAN UNIT</small></div></div>
  <img className="printWatermark" src={ORIGINAL_LOGO_DATA}/>
  <div className="printStamp"><img src="./alribat-school-stamp-straight.png" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="./alribat-stamp.svg"}}/><span>الختم الرسمي</span></div>
  <div className="printFooter"><b>مدرسة الرباط للتعليم الخاص</b><span>© 2026 Eng. Osama Ismail • جميع الحقوق والملكية الفكرية محفوظة</span></div>
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
 return <div className="app"><aside className="sidebar"><div className="brand"><div className="logo originalSchoolLogo"><img src={ORIGINAL_LOGO_DATA} alt="شعار مدرسة الرباط الأصلي"/></div><div><b>مدرسة الرباط</b><span>الإدارة والمالية</span></div></div><nav>{nav.map(x=><button key={x[0]} className={active===x[0]?"active":""} onClick={()=>{setActive(x[0]);setSearch("")}}><i>{x[1]}</i><span>{x[0]}</span></button>)}</nav><div className="sideFoot ownershipMini"><span>الإصدار</span><b>Central v1.8.0</b><img className="miniSignature" src="./alribat-owner-signature.svg" alt="توقيع المالك"/><small>© 2026 Eng. Osama Ismail<br/>جميع الحقوق والملكية الفكرية محفوظة</small></div></aside><main><header><div className="headerTitle"><span className="mobileTitle">مدرسة الرباط</span><h2>{active}</h2><small>النظام المالي والإداري المركزي</small></div><div className="headerActions"><button className="bell" onClick={()=>setModal({type:"notes"})}>🔔{db.notifications.some(x=>!x.read)&&<em>{db.notifications.filter(x=>!x.read).length}</em>}</button><div className="user"><div className="avatar">{(user.name||"م")[0]}</div><div><b>{user.name}</b><span>{user.role}</span></div></div></div></header><div className="content">
 {active==="الرئيسية"&&<Dashboard db={db} go={setActive} user={user}/>}
 {active==="الطلاب"&&<Students db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الرسوم والتحصيل"&&<Finance db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} notify={notify}/>}
 {active==="المصروفات"&&<Expenses db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الموظفون"&&<Staff db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="حضور الموظفين"&&<StaffAttendance db={db} mutate={mutate}/>}
 {active==="الحضور"&&<Attendance db={db} mutate={mutate}/>}
 {active==="المخزون"&&<Inventory db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} notify={notify}/>}
 {active==="الطلبات والموافقات"&&<Requests db={db} mutate={mutate} setModal={setModal} user={user}/>}
 {active==="ورقة التقدير"&&<GradeSheet db={db} mutate={mutate}/>}\n {active==="التقارير"&&<Reports db={db}/>}
 {active==="المستخدمون والصلاحيات"&&<Users db={db} mutate={mutate} setModal={setModal} user={user} uidx={uidx} setUidx={setUidx} fileRef={fileRef} setDb={setDb}/>}\n {active==="الإعدادات"&&<Settings db={db} mutate={mutate}/>}
 <div className="systemOwnership"><img src="./alribat-owner-signature.svg" alt="توقيع المالك"/><div><b>© 2026 Eng. Osama Ismail — جميع الحقوق محفوظة</b><span>الملكية الفكرية وتصميم وبرمجة نظام مدرسة الرباط موثقة داخل المستودع وسجل الإصدارات.</span></div></div>
 </div></main>
 <Dialogs modal={modal} setModal={setModal} db={db} mutate={mutate} notify={notify} user={user}/>
 <PrintBrand/>\n <input ref={fileRef} hidden type="file" accept="application/json" onChange={async e=>{try{setDb(await restore(e.target.files[0]));alert("تم استيراد النسخة الاحتياطية")}catch(x){alert(x.message)}e.target.value=""}}/>
 </div>
}

function Dashboard({db,go,user}){
 const fees=total(db.fees),cash=total(db.payments),exp=total(db.expenses),low=db.inventory.filter(x=>num(x.quantity)<=num(x.reorderLevel)),pending=db.requests.filter(x=>x.status==="قيد المراجعة");
 const recent=[...db.notifications].slice(0,4),staffToday=(db.staffAttendance||[]).filter(x=>x.date===today()),staffPresent=staffToday.filter(x=>x.status==="حاضر").length;
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
      <div className="opsItem"><span>حضور الموظفين اليوم</span><b>{staffPresent}</b><small>موظف</small></div>
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
    <div className="quick modernQuick"><button onClick={()=>go("الطلاب")}>👥 الطلاب</button><button onClick={()=>go("الرسوم والتحصيل")}>🪙 الرسوم</button><button onClick={()=>go("الحضور")}>📅 حضور الطلاب</button><button onClick={()=>go("حضور الموظفين")}>⏱ حضور الموظفين</button><button onClick={()=>go("التقارير")}>📊 التقارير</button></div>
   </section>
   <section className="panel quotePanel"><span>“ التربية والتوجيه ”</span><b>وحدة تسهم في بناء إنسان متميز</b><small>مدرسة الرباط الأساسية المختلطة الخاصة</small></section>
  </div>
 </>;
}


const importKeyName=v=>String(v||"").normalize("NFKD").replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,"").replace(/ـ/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ؤ/g,"و").replace(/ئ/g,"ي").replace(/[^\u0621-\u064A0-9a-zA-Z]/g,"").toLowerCase();
const westernDigits=v=>String(v??"").replace(/[٠-٩]/g,d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d)).replace(/[۰-۹]/g,d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d));
const importMoney=v=>{const n=Number(westernDigits(v).replace(/[٬,\s]/g,"").replace("٫","."));return Number.isFinite(n)?Math.max(0,n):0};
const cleanImportText=v=>String(v??"").replace(/\s+/g," ").trim();
const headerKey=v=>importKeyName(String(v||"").replace(/رسوم|الرسوم|مبلغ|قيمة|اجمالي|إجمالي/g,""));
const IMPORT_HEADERS={
 name:["الاسم","اسمالطالب","الطالب","الطالبه","student","studentname","name"],
 registrationFee:["التسجيل","رسومتسجيل","registration","registrationfee"],
 tuitionFee:["الدراسيه","الدراسه","رسومدراسيه","tuition","tuitionfee","schoolfee"],
 remainingFee:["المتبقي","الباقي","الرصيد","متبقي","remaining","balance","outstanding"],
 grade:["الصف","المرحله","grade","classlevel"],
 className:["الفصل","الشعبه","class","section"]
};
function detectImportColumns(row){
 const map={};row.forEach((v,i)=>{const h=headerKey(v);for(const[k,names]of Object.entries(IMPORT_HEADERS))if(names.some(x=>h===importKeyName(x)||h.includes(importKeyName(x))))map[k]=i});
 return map;
}
function rowFromGrid(row,map){
 const pick=k=>map[k]===undefined?"":row[map[k]];
 return {name:cleanImportText(pick("name")),registrationFee:importMoney(pick("registrationFee")),tuitionFee:importMoney(pick("tuitionFee")),remainingFee:importMoney(pick("remainingFee")),grade:cleanImportText(pick("grade")),className:cleanImportText(pick("className"))};
}
function rowsFromGrid(grid){
 if(!Array.isArray(grid)||!grid.length)return[];
 let hi=-1,map={};
 for(let i=0;i<Math.min(grid.length,12);i++){const m=detectImportColumns(grid[i]||[]);if(m.name!==undefined&&(m.registrationFee!==undefined||m.tuitionFee!==undefined||m.remainingFee!==undefined)){hi=i;map=m;break}}
 if(hi>=0)return grid.slice(hi+1).map(r=>rowFromGrid(r,map)).filter(x=>x.name);
 return[];
}
function rowsFromPlainText(text){
 const lines=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];
 for(const raw of lines){
  let line=westernDigits(raw).replace(/[|؛;]/g," ");
  if(/الاسم|اسم الطالب|student name/i.test(line)&&/رسوم|متبقي|remaining|tuition/i.test(line))continue;
  const matches=[...line.matchAll(/\d[\d,.٬٫]*/g)];
  if(matches.length<2)continue;
  const vals=matches.map(m=>importMoney(m[0])).filter(Number.isFinite);
  const selected=matches.slice(-3),first=selected[0];
  let name=cleanImportText(line.slice(0,first.index).replace(/^\s*\d+\s*[-.)ـ:]?\s*/,""));
  if(!name){name=cleanImportText(line.replace(/\d[\d,.٬٫]*/g," ").replace(/^\s*[-.)ـ:]?\s*/,""))}
  if(!name||name.length<2)continue;
  out.push({name,registrationFee:vals.length>=3?vals[vals.length-3]:0,tuitionFee:vals.length>=2?vals[vals.length-2]:0,remainingFee:vals[vals.length-1]||0,grade:"",className:""});
 }
 return out;
}
function decorateStudentImport(rows,students){
 const existing=new Map(students.map(x=>[importKeyName(x.name),x])),seen=new Set();
 return rows.map((r,i)=>{const key=importKeyName(r.name),dupe=key&&seen.has(key),match=key?existing.get(key):null;if(key)seen.add(key);return{...r,_id:r._id||id("imp"),_row:i+1,_key:key,_duplicateFile:dupe,_existingId:match?.id||"",_status:dupe?"مكرر داخل الملف":match?"تحديث سجل موجود":"طالب جديد"}});
}
async function importExcelFile(file){
 const XLSX=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}),rows=[];
 for(const sn of wb.SheetNames){const grid=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:""}),parsed=rowsFromGrid(grid);rows.push(...(parsed.length?parsed:rowsFromPlainText(grid.map(r=>r.join("\t")).join("\n"))))}
 return rows;
}
async function importPdfFile(file,setProgress){
 const pdfjs=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs");
 pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
 const doc=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;let text="";
 for(let i=1;i<=doc.numPages;i++){setProgress("قراءة PDF — صفحة "+i+" من "+doc.numPages);const p=await doc.getPage(i),c=await p.getTextContent();text+="\n"+c.items.map(x=>x.str).join(" ")}
 let rows=rowsFromPlainText(text);if(rows.length)return rows;
 const{createWorker}=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/+esm");
 const worker=await createWorker("ara+eng");
 try{for(let i=1;i<=Math.min(doc.numPages,12);i++){setProgress("التعرف الضوئي على PDF — صفحة "+i);const p=await doc.getPage(i),vp=p.getViewport({scale:2}),canvas=document.createElement("canvas");canvas.width=vp.width;canvas.height=vp.height;await p.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;const r=await worker.recognize(canvas);text+="\n"+r.data.text}}finally{await worker.terminate()}
 return rowsFromPlainText(text);
}
async function importImageFile(file,setProgress){
 setProgress("قراءة الصورة والتعرف على الكتابة العربية...");
 const{createWorker}=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/+esm");
 const worker=await createWorker("ara+eng");
 try{const r=await worker.recognize(file);return rowsFromPlainText(r.data.text)}finally{await worker.terminate()}
}
async function readStudentImportFile(file,setProgress){
 const n=file.name.toLowerCase(),t=file.type||"";
 if(/\.(xlsx|xls)$/i.test(n))return importExcelFile(file);
 if(/\.pdf$/i.test(n)||t==="application/pdf")return importPdfFile(file,setProgress);
 if(t.startsWith("image/")||/\.(png|jpe?g|webp|bmp)$/i.test(n))return importImageFile(file,setProgress);
 const text=await file.text();const delim=text.split(/\r?\n/).map(l=>l.split(/\t|,|;|\|/));const gridRows=rowsFromGrid(delim);return gridRows.length?gridRows:rowsFromPlainText(text);
}

function Students({db,search,setSearch,mutate,setModal}){const rows=db.students.filter(x=>(x.name+" "+(x.grade||"")+" "+(x.parentPhone||"")).toLowerCase().includes(search.toLowerCase()));const del=x=>{if(db.fees.some(f=>f.studentId===x.id)||db.payments.some(p=>p.studentId===x.id)){alert("لا يمكن حذف طالب مرتبط بحركات مالية. غيّر حالته إلى منسحب.");return}if(confirm("تأكيد الحذف؟"))mutate(p=>({...p,students:p.students.filter(st=>st.id!==x.id)}),"حذف","الطلاب","حذف "+x.name)};return <section className="panel pagePanel"><Head title="الطلاب" desc="ملفات الطلاب وبيانات الرسوم المستوردة، مع منع تكرار الاسم تلقائيًا." add="طالب" onAdd={()=>setModal({type:"student"})} search={search} setSearch={setSearch} extra={<><button className="primary" onClick={()=>setModal({type:"studentImport"})}>⇧ استيراد ذكي</button><button onClick={()=>csv("students.csv",db.students)}>تصدير</button></>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الاسم</th><th>الصف</th><th>الفصل</th><th>رسوم التسجيل</th><th>الرسوم الدراسية</th><th>المتبقي</th><th>ولي الأمر</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.grade||"—"}</td><td>{x.className||"—"}</td><td>{money(x.registrationFee)}</td><td>{money(x.tuitionFee)}</td><td><b>{money(x.remainingFee)}</b></td><td>{x.parentName||"—"}</td><td>{x.parentPhone||"—"}</td><td><S tone={x.status==="نشط"?"ok":"warn"}>{x.status}</S></td><td className="actions"><button onClick={()=>mutate(p=>({...p,students:p.students.map(st=>st.id===x.id?{...st,status:st.status==="نشط"?"موقوف":"نشط"}:st)}),"تعديل","الطلاب","تغيير حالة "+x.name)}>تغيير الحالة</button><button className="danger" onClick={()=>del(x)}>حذف</button></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function StudentImportModal({db,mutate,close}){
 const[rows,setRows]=useState([]),[progress,setProgress]=useState(""),[error,setError]=useState(""),[fileName,setFileName]=useState("");
 const inputRef=useRef();
 const decorated=useMemo(()=>decorateStudentImport(rows,db.students),[rows,db.students]);
 const valid=decorated.filter(x=>x.name&&!x._duplicateFile),created=valid.filter(x=>!x._existingId).length,updated=valid.filter(x=>x._existingId).length,duplicates=decorated.filter(x=>x._duplicateFile).length;
 const loadFile=async file=>{if(!file)return;setFileName(file.name);setRows([]);setError("");setProgress("جاري تحليل الملف...");try{const parsed=await readStudentImportFile(file,setProgress);if(!parsed.length)throw new Error("لم أتمكن من استخراج صفوف طلاب تلقائيًا. جرّب صورة أوضح أو ملف Excel/CSV منظمًا.");setRows(parsed.map(x=>({...x,_id:id("imp")})));setProgress("")}catch(e){setProgress("");setError(e.message||"تعذر قراءة الملف")}};
 const edit=(rid,k,v)=>setRows(r=>r.map(x=>x._id===rid?{...x,[k]:k==="name"||k==="grade"||k==="className"?v:importMoney(v)}:x));
 const remove=rid=>setRows(r=>r.filter(x=>x._id!==rid));
 const commit=()=>{if(!valid.length){alert("لا توجد صفوف صالحة للحفظ");return}mutate(p=>{let students=[...p.students],createdN=0,updatedN=0;const byName=new Map(students.map((x,i)=>[importKeyName(x.name),{x,i}]));for(const r of valid){const key=importKeyName(r.name);if(!key)continue;const found=byName.get(key),patch={name:cleanImportText(r.name),registrationFee:num(r.registrationFee),tuitionFee:num(r.tuitionFee),remainingFee:num(r.remainingFee),grade:r.grade||found?.x.grade||"",className:r.className||found?.x.className||"",importedAt:new Date().toISOString(),importSource:fileName};if(found){students[found.i]={...found.x,...patch};byName.set(key,{x:students[found.i],i:found.i});updatedN++}else{const st={id:id("stu"),status:"نشط",parentName:"",parentPhone:"",...patch};students.push(st);byName.set(key,{x:st,i:students.length-1});createdN++}}return{...p,students}},"استيراد","الطلاب","استيراد ذكي: "+created+" جديد، "+updated+" تحديث، "+duplicates+" مكرر تم تجاهله");alert("تم الاستيراد بدون تكرار الأسماء: "+created+" طالب جديد، "+updated+" سجل تم تحديثه، "+duplicates+" مكرر تم تجاهله.");close()};
 return <Modal title="استيراد بيانات الطلاب — ذكي" close={close}><div className="studentImport">
  <div className="importDrop" onClick={()=>inputRef.current?.click()}><b>📷 صورة دفتر / PDF / Excel / CSV / TXT</b><span>اختر الملف وسيتم استخراج الاسم ورسوم التسجيل والرسوم الدراسية والمتبقي تلقائيًا.</span><button className="primary">{fileName?"اختيار ملف آخر":"اختيار ملف"}</button><input ref={inputRef} hidden type="file" accept="image/*,.pdf,.xlsx,.xls,.csv,.txt,.tsv" onChange={e=>loadFile(e.target.files?.[0])}/></div>
  {progress&&<div className="importProgress">⏳ {progress}</div>}{error&&<div className="importError">⚠️ {error}</div>}
  {rows.length>0&&<><div className="importSummary"><span>جديد <b>{created}</b></span><span>تحديث موجود <b>{updated}</b></span><span>مكرر داخل الملف <b>{duplicates}</b></span><span>إجمالي مقروء <b>{decorated.length}</b></span></div>
  <div className="tableWrap importPreview"><table><thead><tr><th>#</th><th>اسم الطالب</th><th>رسوم التسجيل</th><th>الرسوم الدراسية</th><th>المتبقي</th><th>الصف</th><th>الفصل</th><th>الحالة</th><th></th></tr></thead><tbody>{decorated.map((r,i)=><tr key={r._id} className={r._duplicateFile?"importDuplicate":r._existingId?"importExisting":""}><td>{i+1}</td><td><input value={r.name} onChange={e=>edit(r._id,"name",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.registrationFee||""} onChange={e=>edit(r._id,"registrationFee",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.tuitionFee||""} onChange={e=>edit(r._id,"tuitionFee",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.remainingFee||""} onChange={e=>edit(r._id,"remainingFee",e.target.value)}/></td><td><input value={r.grade||""} onChange={e=>edit(r._id,"grade",e.target.value)}/></td><td><input value={r.className||""} onChange={e=>edit(r._id,"className",e.target.value)}/></td><td><S tone={r._duplicateFile?"bad":r._existingId?"warn":"ok"}>{r._status}</S></td><td><button className="danger" onClick={()=>remove(r._id)}>حذف</button></td></tr>)}</tbody></table></div>
  <div className="importNote">لن يُنشأ اسم مكرر. الاسم الموجود مسبقًا يتم تحديث بياناته، والمكرر داخل نفس الملف يتم تجاهله تلقائيًا.</div><div className="modalActions"><button onClick={close}>إلغاء</button><button className="primary" onClick={commit}>اعتماد وحفظ {valid.length} صف</button></div></>}
 </div></Modal>
}

function Finance({db,search,setSearch,mutate,setModal}){const[tab,setTab]=useState("fees");const rows=db.fees.filter(x=>(x.studentName+" "+x.type).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="الرسوم والتحصيل" desc="الرصيد يحسب من الإيصالات الفعلية ولا يمكن الدفع بأكثر من المستحق." add={tab==="fees"?"رسوم":"إيصال قبض"} onAdd={()=>setModal({type:tab==="fees"?"fee":"payment"})} search={search} setSearch={setSearch} extra={<><button className={tab==="fees"?"selected":""} onClick={()=>setTab("fees")}>الرسوم</button><button className={tab==="payments"?"selected":""} onClick={()=>setTab("payments")}>الإيصالات</button></>}/>{tab==="fees"?(rows.length?<div className="tableWrap"><table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>الرصيد</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.studentName}</b></td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td>{money(balance(db,x))}</td><td><S tone={fstatus(db,x)==="مدفوع"?"ok":fstatus(db,x)==="غير مدفوع"?"bad":"warn"}>{fstatus(db,x)}</S></td></tr>)}</tbody></table></div>:<Empty/>):(db.payments.length?<div className="tableWrap"><table><thead><tr><th>الإيصال</th><th>الطالب</th><th>المبلغ</th><th>التاريخ</th><th>الطريقة</th><th></th></tr></thead><tbody>{[...db.payments].reverse().map(x=><tr key={x.id}><td><b>{x.receipt}</b></td><td>{x.studentName}</td><td>{money(x.amount)}</td><td>{x.date}</td><td>{x.method}</td><td><button onClick={()=>printReceipt(x,db.school)}>طباعة</button></td></tr>)}</tbody></table></div>:<Empty/>)}</section>}

function Expenses({db,search,setSearch,mutate,setModal}){const rows=db.expenses.filter(x=>(x.title+" "+x.category+" "+(x.payee||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="المصروفات" desc="المصروفات حسب التصنيف والتاريخ والمستفيد." add="مصروف" onAdd={()=>setModal({type:"expense"})} search={search} setSearch={setSearch} extra={<button onClick={()=>csv("expenses.csv",db.expenses)}>تصدير</button>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>البيان</th><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th>المستفيد</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.title}</b></td><td>{x.category}</td><td>{money(x.amount)}</td><td>{x.date}</td><td>{x.payee||"—"}</td><td><button className="danger" onClick={()=>confirm("تأكيد الحذف؟")&&mutate(p=>({...p,expenses:p.expenses.filter(e=>e.id!==x.id)}),"حذف","المحاسبة","حذف "+x.title)}>حذف</button></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Staff({db,search,setSearch,setModal}){const rows=db.staff.filter(x=>(x.name+" "+x.role+" "+(x.phone||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="الموظفون" desc="البيانات الوظيفية والرواتب والحالة." add="موظف" onAdd={()=>setModal({type:"staff"})} search={search} setSearch={setSearch}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الهاتف</th><th>الراتب</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.role}</td><td>{x.phone||"—"}</td><td>{money(x.salary)}</td><td><S tone="ok">{x.status}</S></td></tr>)}</tbody></table></div>:<Empty/>}</section>}



const toRad=v=>v*Math.PI/180;
function geoDistanceM(aLat,aLng,bLat,bLng){
 const R=6371000,dLat=toRad(bLat-aLat),dLng=toRad(bLng-aLng);
 const q=Math.sin(dLat/2)**2+Math.cos(toRad(aLat))*Math.cos(toRad(bLat))*Math.sin(dLng/2)**2;
 return 2*R*Math.asin(Math.min(1,Math.sqrt(q)));
}
function getDevicePosition(){
 return new Promise((resolve,reject)=>{
  if(!navigator.geolocation){reject(new Error("هذا الجهاز أو المتصفح لا يدعم تحديد الموقع الجغرافي"));return}
  navigator.geolocation.getCurrentPosition(
   p=>resolve({lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,at:new Date().toISOString()}),
   e=>reject(new Error(e.code===1?"يجب السماح للنظام بالوصول إلى الموقع لتسجيل الحضور أو الانصراف":e.code===2?"تعذر تحديد موقع الجهاز. فعّل GPS وحاول مرة أخرى":"انتهت مهلة تحديد الموقع. اقترب من نافذة أو مكان مفتوح وحاول مرة أخرى")),
   {enableHighAccuracy:true,timeout:15000,maximumAge:0}
  );
 });
}
function validateSchoolGeofence(school,pos){
 const g=school?.geofence||{},lat=Number(g.lat),lng=Number(g.lng),radius=Math.max(20,Number(g.radiusM||120)),maxAccuracy=Math.max(20,Number(g.maxAccuracyM||80));
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng)throw new Error("لم يتم اعتماد موقع المدرسة بعد. يجب على مدير النظام تحديد موقع المدرسة من الإعدادات أولاً.");
 if(!Number.isFinite(pos.accuracy)||pos.accuracy>maxAccuracy)throw new Error("دقة GPS غير كافية للتسجيل ("+Math.round(pos.accuracy||0)+"م). الحد المسموح "+maxAccuracy+"م.");
 const distance=geoDistanceM(lat,lng,pos.lat,pos.lng);
 if(distance>radius)throw new Error("أنت خارج نطاق المدرسة. المسافة الحالية تقريباً "+Math.round(distance)+"م، والنطاق المسموح "+radius+"م.");
 return {...pos,distance:Math.round(distance),radiusM:radius,maxAccuracyM:maxAccuracy,schoolLat:lat,schoolLng:lng};
}

function StaffAttendance({db,mutate}){
 const[date,setDate]=useState(today()),[geoBusy,setGeoBusy]=useState("");
 const staff=db.staff.filter(x=>x.status!=="منتهي"),all=db.staffAttendance||[],rows=all.filter(x=>x.date===date);
 const rec=st=>rows.find(x=>x.staffId===st.id),now=()=>new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false});
 const g=db.school?.geofence||{},geoReady=Number.isFinite(Number(g.lat))&&Number.isFinite(Number(g.lng))&&Number(g.lat)!==0&&Number(g.lng)!==0;
 const upsert=(st,patch,desc)=>mutate(p=>{const list=p.staffAttendance||[],old=list.find(x=>x.staffId===st.id&&x.date===date),base=old||{id:id("satt"),staffId:st.id,staffName:st.name,role:st.role,date,status:"حاضر",checkIn:"",checkOut:"",notes:""};const next={...base,...patch,staffName:st.name,role:st.role,updatedAt:new Date().toISOString()};return{...p,staffAttendance:old?list.map(x=>x.id===old.id?next:x):[...list,next]}},"تعديل","حضور الموظفين",desc);
 const verify=async(label)=>{
  if(date!==today())throw new Error("الحضور والانصراف الجغرافي متاحان لليوم الحالي فقط.");
  setGeoBusy(label);
  try{return validateSchoolGeofence(db.school,await getDevicePosition())}finally{setGeoBusy("")}
 };
 const checkIn=async st=>{try{const pos=await verify("in-"+st.id);upsert(st,{status:"حاضر",checkIn:now(),checkInGeo:pos},"حضور "+st.name+" داخل نطاق المدرسة ("+pos.distance+"م)")}catch(e){alert(e.message)}};
 const checkOut=async st=>{const r=rec(st);if(!r?.checkIn){alert("يجب تسجيل الحضور أولاً");return}try{const pos=await verify("out-"+st.id);upsert(st,{checkOut:now(),checkOutGeo:pos},"انصراف "+st.name+" داخل نطاق المدرسة ("+pos.distance+"م)")}catch(e){alert(e.message)}};
 const setStatus=(st,status)=>{
  if(status==="حاضر"){alert("حالة «حاضر» لا تُسجل يدويًا. استخدم زر «حضور الآن» ليتم التحقق من موقع الموظف.");return}
  upsert(st,{status,checkIn:"",checkOut:"",checkInGeo:null,checkOutGeo:null},"حالة "+st.name+" — "+status)
 };
 const duration=r=>{if(!r?.checkIn||!r?.checkOut)return"—";const[a,b]=[r.checkIn,r.checkOut].map(t=>{const[h,m]=t.split(":").map(Number);return h*60+m});const d=Math.max(0,b-a);return Math.floor(d/60)+"س "+String(d%60).padStart(2,"0")+"د"};
 const present=rows.filter(x=>x.status==="حاضر").length,absent=rows.filter(x=>x.status==="غائب").length,open=rows.filter(x=>x.checkIn&&!x.checkOut).length;
 return <section className="panel pagePanel staffAttendancePage">
  <Head title="حضور وانصراف الموظفين" desc="تسجيل جغرافي إلزامي: لا يُقبل الحضور أو الانصراف إلا من داخل نطاق المدرسة."/>
  <div className={"geoFenceBanner "+(geoReady?"ready":"blocked")}>
   <div><b>{geoReady?"📍 النطاق الجغرافي مفعل":"⚠️ النطاق الجغرافي غير مضبوط"}</b><span>{geoReady?"نصف قطر السماح "+Number(g.radiusM||120)+"م • دقة GPS المطلوبة ≤ "+Number(g.maxAccuracyM||80)+"م":"لن يعمل تسجيل الحضور أو الانصراف حتى يعتمد مدير النظام موقع المدرسة من الإعدادات."}</span></div>
   {geoReady&&<small>موقع المدرسة: {Number(g.lat).toFixed(6)}, {Number(g.lng).toFixed(6)}</small>}
  </div>
  <div className="cards staffAttMetrics"><Metric t="الموظفون" v={staff.length} s="موظف نشط" icon="👥" tone="blue"/><Metric t="حاضر اليوم" v={present} s="تحقق جغرافي" icon="✓" tone="green"/><Metric t="غائب" v={absent} s="حسب سجل اليوم" icon="×" tone="gold"/><Metric t="بانتظار الانصراف" v={open} s="حضور بلا انصراف" icon="⏱" tone="violet"/></div>
  <div className="toolbar staffAttToolbar"><input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/><button onClick={()=>csv("staff-attendance-"+date+".csv",rows.map(x=>({...x,checkInDistanceM:x.checkInGeo?.distance??"",checkInAccuracyM:x.checkInGeo?.accuracy??"",checkOutDistanceM:x.checkOutGeo?.distance??"",checkOutAccuracyM:x.checkOutGeo?.accuracy??""})))}>تصدير سجل اليوم</button></div>
  {staff.length?<div className="tableWrap"><table className="staffAttTable"><thead><tr><th>الموظف</th><th>الوظيفة</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th><th>الموقع</th><th>المدة</th><th>الإجراء</th></tr></thead><tbody>{staff.map(st=>{const r=rec(st);return <tr key={st.id}><td><b>{st.name}</b></td><td>{st.role}</td><td><select value={r?.status||""} onChange={e=>e.target.value&&setStatus(st,e.target.value)}><option value="">غير مسجل</option>{["غائب","إجازة","مأذون"].map(x=><option key={x}>{x}</option>)}{r?.status==="حاضر"&&<option value="حاضر">حاضر — GPS</option>}</select></td><td><b className="timeCell">{r?.checkIn||"—"}</b>{r?.checkInGeo&&<small className="geoMeta">±{Math.round(r.checkInGeo.accuracy)}م</small>}</td><td><b className="timeCell">{r?.checkOut||"—"}</b>{r?.checkOutGeo&&<small className="geoMeta">±{Math.round(r.checkOutGeo.accuracy)}م</small>}</td><td>{r?.checkInGeo?<span className="geoOk">داخل النطاق • {r.checkInGeo.distance}م</span>:"—"}</td><td>{duration(r)}</td><td className="actions"><button className="checkInBtn" disabled={!geoReady||date!==today()||Boolean(r?.checkIn)||Boolean(geoBusy)} onClick={()=>checkIn(st)}>{geoBusy==="in-"+st.id?"جارٍ التحقق...":"حضور الآن"}</button><button className="checkOutBtn" disabled={!geoReady||date!==today()||!r?.checkIn||Boolean(r?.checkOut)||Boolean(geoBusy)} onClick={()=>checkOut(st)}>{geoBusy==="out-"+st.id?"جارٍ التحقق...":"انصراف الآن"}</button></td></tr>})}</tbody></table></div>:<Empty text="أضف الموظفين أولاً"/>}
 </section>
}

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
   <div className="reportActions"><button onClick={printReport}>طباعة</button><button onClick={()=>csv("fees-report.csv",db.fees.map(x=>({...x,paid:paid(db,x.id),balance:balance(db,x),status:fstatus(db,x)})))}>تصدير الرسوم</button><button onClick={()=>csv("payments-report.csv",db.payments)}>تصدير الإيصالات</button><button onClick={()=>csv("inventory-report.csv",db.inventory)}>تصدير المخزون</button><button onClick={()=>csv("staff-attendance-report.csv",db.staffAttendance||[])}>تصدير حضور الموظفين</button></div>
   <h3>الرسوم ذات الرصيد</h3>{open.length?<div className="tableWrap"><table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>الرصيد</th></tr></thead><tbody>{open.map(x=><tr key={x.id}><td>{x.studentName}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td><b>{money(balance(db,x))}</b></td></tr>)}</tbody></table></div>:<Empty text="لا توجد أرصدة مستحقة"/>}
  </section>
  <section className="reportPrintSheet officialLetterhead officialDocSheet">
   <div className="officialDocHeader"><div className="officialDocAr"><b>وزارة التربية والتوجيه</b><strong>مدرسة الرباط للتعليم الخاص</strong><span>وحدة بورتسودان الشرقية</span></div><img className="officialDocLogo" src={ORIGINAL_LOGO_DATA} alt="شعار مدرسة الرباط الأصلي"/><div className="officialDocEn" dir="ltr"><b>MINISTRY OF EDUCATION &amp; GUIDANCE</b><strong>AL-RIBAT PRIVATE SCHOOL</strong><span>EAST PORT SUDAN UNIT</span></div></div>
   <img className="officialDocWatermark" src={ORIGINAL_LOGO_DATA} alt=""/>
   <div className="officialReportBody">
    <div className="orTitle"><span>تقرير مالي رسمي • OFFICIAL FINANCIAL REPORT</span><h1>الملخص المالي</h1><p>تقرير صادر من النظام المالي والإداري المركزي</p></div>
    <div className="orMetrics">
      <div><span>إجمالي الرسوم</span><b>{money(fees)}</b><small>{db.school.currency}</small></div>
      <div><span>المتحصل</span><b>{money(cash)}</b><small>{db.school.currency}</small></div>
      <div><span>المصروفات</span><b>{money(exp)}</b><small>{db.school.currency}</small></div>
      <div><span>صافي التدفق</span><b>{money(cash-exp)}</b><small>{db.school.currency}</small></div>
    </div>
    <div className="orBalances"><h2>الرسوم ذات الرصيد</h2>{open.length?<table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>الرصيد</th></tr></thead><tbody>{open.slice(0,8).map(x=><tr key={x.id}><td>{x.studentName}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td>{money(balance(db,x))}</td></tr>)}</tbody></table>:<div className="orEmpty">لا توجد أرصدة مستحقة</div>}</div>
    <div className="orIssued">تاريخ الإصدار: <b>{new Date().toLocaleDateString("ar-SA")}</b></div>
   </div>
   <div className="officialDocBottom officialBottomNoSign"><div className="officialDocStamp"><img src="./alribat-school-stamp-straight.png" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="./alribat-stamp.svg"}} alt="الختم الرسمي"/><span>الختم الرسمي</span></div></div>
   <div className="officialDocFooter"><span>مدرسة الرباط للتعليم الخاص • بورتسودان</span><b>© 2026 Eng. Osama Ismail — جميع الحقوق والملكية الفكرية محفوظة</b></div>
  </section> </>;
}


function gradeLabel(scale,avg){
 const sorted=[...(scale||[])].sort((a,b)=>Number(b.min)-Number(a.min));
 return (sorted.find(x=>avg>=Number(x.min))||{label:"—"}).label;
}

function printGradeSheet(student,term,scores,db){
 const subjects=db.school.subjects||[],vals=subjects.map(s=>Number(scores[s]||0)),avg=vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0,label=gradeLabel(db.school.gradeScale,avg);
 const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
 const rows=subjects.map(s=>`<tr><td>${esc(s)}</td><td>${esc(scores[s]??"")}</td><td>100</td></tr>`).join("");
 const logoUrl=ORIGINAL_LOGO_DATA,stampUrl=printAsset("alribat-school-stamp-straight.png"),stampFallback=printAsset("alribat-stamp.svg");
 const w=window.open("","_blank","width=950,height=980");if(!w)return;
 w.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>ورقة تقدير — ${esc(student.name)}</title><style>
 @page{size:A4 portrait;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#f7f1e3;font-family:Tahoma,Arial,sans-serif;color:#2b2417}.btn{position:fixed;top:12px;left:12px;z-index:50;padding:10px 16px;border:0;border-radius:10px;background:#8f6208;color:#fff;font:inherit;font-weight:700}.btn:disabled{opacity:.55}.sheet{position:relative;width:210mm;height:297mm;margin:0 auto;background:#fff;overflow:hidden}.sheet:before{content:"";position:absolute;inset:5mm;border:1.5px solid #d6a843}.sheet:after{content:"";position:absolute;inset:8mm;border:1px solid #8f620830}.officialHead{position:relative;z-index:3;margin:12mm 15mm 0;min-height:31mm;display:grid;grid-template-columns:1fr 42mm 1fr;align-items:center;gap:6mm;padding-bottom:4mm;border-bottom:2px solid #8f6208}.officialHead:after{content:"";position:absolute;right:0;left:0;bottom:-4px;height:1.5px;background:#d6a843}.headAr,.headEn{display:grid;gap:1.5mm;line-height:1.25}.headAr{text-align:right}.headEn{text-align:left}.headAr b,.headEn b{font-size:9pt;color:#6c7680}.headAr strong,.headEn strong{font-size:12.5pt;color:#8f6208}.headAr span,.headEn span{font-size:8.5pt;color:#8a6b22;font-weight:700}.headLogo{display:grid;place-items:center}.headLogo img{width:40mm;height:28mm;object-fit:contain}.watermark{position:absolute;z-index:0;left:50%;top:55%;transform:translate(-50%,-50%);width:126mm;height:90mm;object-fit:contain;opacity:.06}.body{position:relative;z-index:2;margin:8mm 18mm 0}.kicker{text-align:center;color:#9b7a2a;font-size:8pt;font-weight:700}.title{text-align:center;color:#8f6208;font-size:20pt;font-weight:800;margin:2mm 0 6mm}.meta{display:grid;grid-template-columns:1fr 1fr;gap:3mm;margin-bottom:5mm}.meta div{border:1px solid #e5d7b4;border-radius:2.5mm;padding:3.2mm;background:#fffffff0}.meta b{display:block;font-size:8pt;color:#786b4e;margin-bottom:1mm}.meta span{font-size:11.5pt;font-weight:800;color:#2b2417}table{width:100%;border-collapse:collapse;background:#fffffff0}th,td{border:1px solid #dfcfaa;padding:2.4mm;text-align:center;font-size:8.8pt}th{background:#f5e7bf;color:#8f6208}.sum{margin-top:4mm;display:flex;gap:4mm}.sum div{flex:1;border:1px solid #d8b45d;border-radius:2.5mm;padding:3.5mm;text-align:center;background:#fffaf0;font-size:8pt}.sum b{display:block;color:#8f6208;font-size:15pt;margin-top:1mm}.officialBottom{position:absolute;z-index:3;right:18mm;left:18mm;bottom:18mm;display:flex;align-items:flex-end;justify-content:flex-start}.stampBox,.signBox{min-width:44mm;text-align:center;color:#66583b;font-size:7pt}.stampBox img{display:block;width:30mm;height:30mm;object-fit:contain;margin:0 auto 1mm}.signBox img{display:block;width:42mm;max-height:17mm;object-fit:contain;margin:0 auto 1mm}.signBox b{display:block;color:#8f6208;font-size:7.5pt}.footer{position:absolute;z-index:3;right:15mm;left:15mm;bottom:7mm;padding-top:2.2mm;border-top:1.5px solid #8f6208;display:flex;justify-content:space-between;gap:5mm;font-size:6.8pt;color:#8f6208}.footer span{color:#756746}.footer .rights{font-weight:700}@media print{html,body{background:#fff}.btn{display:none}.sheet{margin:0}}
 </style></head><body><button class="btn" disabled onclick="window.print()">جارٍ تحميل الهوية...</button><div class="sheet">
 <div class="officialHead"><div class="headAr"><b>وزارة التربية والتوجيه</b><strong>مدرسة الرباط للتعليم الخاص</strong><span>وحدة بورتسودان الشرقية</span></div><div class="headLogo"><img src="${logoUrl}" alt="شعار مدرسة الرباط"></div><div class="headEn" dir="ltr"><b>MINISTRY OF EDUCATION &amp; GUIDANCE</b><strong>AL-RIBAT PRIVATE SCHOOL</strong><span>EAST PORT SUDAN UNIT</span></div></div>
 <img class="watermark" src="${logoUrl}" alt=""><div class="body"><div class="kicker">وثيقة أكاديمية رسمية • OFFICIAL ACADEMIC DOCUMENT</div><div class="title">ورقة التقدير</div><div class="meta"><div><b>اسم الطالب</b><span>${esc(student.name)}</span></div><div><b>الصف</b><span>${esc(student.grade)}</span></div><div><b>الفصل</b><span>${esc(student.className||"—")}</span></div><div><b>الفترة</b><span>${esc(term)}</span></div></div><table><thead><tr><th>المادة</th><th>الدرجة</th><th>النهاية العظمى</th></tr></thead><tbody>${rows}</tbody></table><div class="sum"><div>المتوسط<b>${avg.toFixed(1)}%</b></div><div>التقدير<b>${esc(label)}</b></div></div></div>
 <div class="officialBottom officialBottomNoSign"><div class="stampBox"><img src="${stampUrl}" onerror="this.onerror=null;this.src='${stampFallback}'" alt="الختم الرسمي"><span>الختم الرسمي</span></div></div>
 <div class="footer"><span>مدرسة الرباط للتعليم الخاص • بورتسودان</span><span class="rights">© 2026 Eng. Osama Ismail — جميع الحقوق والملكية الفكرية محفوظة</span></div></div><script>(function(){var b=document.querySelector(".btn"),imgs=[].slice.call(document.images);Promise.all(imgs.map(function(i){return i.complete?Promise.resolve():new Promise(function(r){i.addEventListener("load",r,{once:true});i.addEventListener("error",r,{once:true})})})).then(function(){b.disabled=false;b.textContent="طباعة / حفظ PDF"})})();</script></body></html>`);
 w.document.close();
}

function GradeSheet({db,mutate}){
 const students=db.students.filter(x=>x.status!=="منسحب"),subjects=db.school.subjects||[];
 const[sid,setSid]=useState(students[0]?.id||""),[term,setTerm]=useState("الفصل الأول"),[scores,setScores]=useState({});
 const student=students.find(x=>x.id===sid);
 useEffect(()=>{const r=db.grades.find(x=>x.studentId===sid&&x.term===term);setScores(r?.scores||{})},[sid,term,db.grades]);
 const avg=subjects.length?subjects.reduce((n,s)=>n+Number(scores[s]||0),0)/subjects.length:0;
 const saveGrade=()=>{if(!student)return;mutate(p=>{const old=p.grades.find(x=>x.studentId===sid&&x.term===term);const rec={id:old?.id||id("grade"),studentId:sid,studentName:student.name,grade:student.grade,term,scores,average:avg,updatedAt:new Date().toISOString()};return{...p,grades:old?p.grades.map(x=>x.id===old.id?rec:x):[...p.grades,rec]}},"تعديل","التقدير","تحديث تقدير "+student.name)};
 return <section className="panel pagePanel"><Head title="ورقة التقدير" desc="إدخال درجات الطالب وطباعة ورقة التقدير الرسمية."/>{students.length?<><div className="gradeToolbar"><select value={sid} onChange={e=>setSid(e.target.value)}>{students.map(x=><option key={x.id} value={x.id}>{x.name} — {x.grade}</option>)}</select><select value={term} onChange={e=>setTerm(e.target.value)}><option>الفصل الأول</option><option>الفصل الثاني</option><option>الفصل الثالث</option><option>النهائي</option></select><button className="primary" onClick={saveGrade}>حفظ الدرجات</button><button onClick={()=>student&&printGradeSheet(student,term,scores,db)}>طباعة ورقة التقدير</button></div><div className="gradeGrid">{subjects.map(s=><label key={s}><span>{s}</span><input type="number" min="0" max="100" value={scores[s]??""} onChange={e=>setScores({...scores,[s]:Math.min(100,Math.max(0,Number(e.target.value)))})}/></label>)}</div><div className="gradeSummary"><div><span>المتوسط</span><b>{avg.toFixed(1)}%</b></div><div><span>التقدير</span><b>{gradeLabel(db.school.gradeScale,avg)}</b></div></div></>:<Empty text="أضف الطلاب أولاً"/>}</section>
}
function Settings({db,mutate}){
 const current=db.users.find(x=>x.authId===db.central?.userId)||db.users[0]||{};
 const[s,setS]=useState({...db.school,geofence:{radiusM:120,maxAccuracyM:80,...(db.school.geofence||{})},subjectsText:(db.school.subjects||[]).join("\n")}),[loginPhone,setLoginPhone]=useState(current.phone||""),[geoSetting,setGeoSetting]=useState(false);
 useEffect(()=>setS({...db.school,geofence:{radiusM:120,maxAccuracyM:80,...(db.school.geofence||{})},subjectsText:(db.school.subjects||[]).join("\n")}),[db.school]);
 useEffect(()=>setLoginPhone(current.phone||""),[current.phone]);
 const set=(k,v)=>setS({...s,[k]:v});const setGeo=(k,v)=>setS({...s,geofence:{...(s.geofence||{}),[k]:v}});
 const saveSettings=()=>mutate(p=>({...p,school:{...p.school,...s,subjects:s.subjectsText.split("\n").map(x=>x.trim()).filter(Boolean),subjectsText:undefined}}),"تعديل","الإعدادات","تحديث إعدادات المدرسة");
 const captureSchoolLocation=async()=>{setGeoSetting(true);try{const p=await getDevicePosition();setS(x=>({...x,geofence:{...(x.geofence||{}),lat:Number(p.lat.toFixed(7)),lng:Number(p.lng.toFixed(7)),radiusM:Number(x.geofence?.radiusM||120),maxAccuracyM:Number(x.geofence?.maxAccuracyM||80),capturedAccuracyM:Math.round(p.accuracy),capturedAt:p.at}}));alert("تم التقاط الموقع. اضغط «حفظ الإعدادات» لاعتماده كموقع المدرسة.")}catch(e){alert(e.message)}finally{setGeoSetting(false)}};
 const saveLoginPhone=async()=>{try{await updateMyPhone(loginPhone);mutate(p=>({...p,users:p.users.map(u=>u.authId===p.central?.userId?{...u,phone:loginPhone}:u)}),"تعديل","المستخدمون","تحديث رقم جوال تسجيل الدخول");alert("تم حفظ رقم الجوال. يمكنك استخدامه مع كلمة المرور في تسجيل الدخول.")}catch(e){alert(e.message||"تعذر حفظ رقم الجوال")}};
 const logoFile=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>700000){alert("حجم الشعار يجب ألا يتجاوز 700KB");return}const r=new FileReader();r.onload=()=>set("logoUrl",r.result);r.readAsDataURL(file)};
 return <section className="panel pagePanel"><Head title="إعدادات البرنامج" desc="بيانات المدرسة والهوية والسنة الدراسية والمواد وإعدادات الطباعة وتسجيل الدخول."/><div className="settingsForm"><div className="logoSettings"><img src={ORIGINAL_LOGO_DATA} alt="شعار مدرسة الرباط الأصلي"/><div><b>شعار المدرسة</b><input type="file" accept="image/*" onChange={logoFile}/><button onClick={()=>set("logoUrl","")}>اعتماد الشعار الأصلي</button></div></div><div className="settingCard geoSettings"><h3>📍 نطاق حضور الموظفين</h3><p className="muted">يُستخدم هذا الموقع لمنع تسجيل الحضور والانصراف من خارج المدرسة. يفضّل اعتماد الموقع وأنت داخل مبنى المدرسة.</p><div className="geoSettingsGrid"><F label="خط العرض"><input dir="ltr" type="number" step="0.0000001" value={s.geofence?.lat||""} onChange={e=>setGeo("lat",e.target.value)}/></F><F label="خط الطول"><input dir="ltr" type="number" step="0.0000001" value={s.geofence?.lng||""} onChange={e=>setGeo("lng",e.target.value)}/></F><F label="نصف قطر السماح — متر"><input dir="ltr" type="number" min="20" max="1000" value={s.geofence?.radiusM||120} onChange={e=>setGeo("radiusM",e.target.value)}/></F><F label="أقصى دقة GPS مقبولة — متر"><input dir="ltr" type="number" min="20" max="300" value={s.geofence?.maxAccuracyM||80} onChange={e=>setGeo("maxAccuracyM",e.target.value)}/></F></div><div className="buttonRow"><button className="primary" disabled={geoSetting} onClick={captureSchoolLocation}>{geoSetting?"جارٍ تحديد الموقع...":"اعتماد موقعي الحالي كموقع المدرسة"}</button></div>{s.geofence?.lat&&s.geofence?.lng?<small>الموقع المحفوظ: {Number(s.geofence.lat).toFixed(6)}, {Number(s.geofence.lng).toFixed(6)}{s.geofence.capturedAccuracyM?" • دقة الالتقاط ±"+s.geofence.capturedAccuracyM+"م":""}</small>:<small className="geoBlockedText">لم يتم اعتماد موقع المدرسة بعد — الحضور والانصراف سيبقيان مقفلين.</small>}</div><div className="settingCard loginIdentity"><h3>بيانات تسجيل الدخول</h3><p className="muted">يمكنك الدخول بالبريد الإلكتروني أو رقم الجوال مع نفس كلمة المرور.</p><div className="buttonRow"><input dir="ltr" placeholder="+249..." value={loginPhone} onChange={e=>setLoginPhone(e.target.value)}/><button className="primary" onClick={saveLoginPhone}>حفظ رقم الجوال</button></div><small>البريد الحالي: {current.email||"—"}</small></div><div className="formGrid"><F label="اسم المدرسة"><input value={s.name||""} onChange={e=>set("name",e.target.value)}/></F><F label="الاسم الرسمي"><input value={s.fullName||""} onChange={e=>set("fullName",e.target.value)}/></F><F label="السنة الدراسية"><input value={s.academicYear||""} onChange={e=>set("academicYear",e.target.value)}/></F><F label="العملة"><input value={s.currency||""} onChange={e=>set("currency",e.target.value)}/></F><F label="هاتف المدرسة"><input dir="ltr" value={s.phone||""} onChange={e=>set("phone",e.target.value)}/></F><F label="البريد الإلكتروني"><input dir="ltr" value={s.email||""} onChange={e=>set("email",e.target.value)}/></F><F label="العنوان" full><input value={s.address||""} onChange={e=>set("address",e.target.value)}/></F><F label="المواد الدراسية — مادة في كل سطر" full><textarea rows="8" value={s.subjectsText||""} onChange={e=>set("subjectsText",e.target.value)}/></F><div className="formActions full"><button className="primary" onClick={saveSettings}>حفظ الإعدادات</button></div></div>
<div className="settingCard">
  <h3>الملكية الفكرية</h3>
  <p><b>© 2026 Eng. Osama Ismail — جميع الحقوق محفوظة.</b></p>
  <p className="muted">هذا النظام وتصميمه وبرمجته وتكامل قاعدة البيانات وسجل إصداراته موثق باسم المالك داخل المستودع.</p>
  <img className="ownerSignature" src="./alribat-owner-signature.svg" alt="التوقيع المعتمد للمالك"/><small>التوقيع اليدوي المعتمد + التوقيع الإلكتروني: Eng. Osama Ismail • الإصدار v1.8.0 • 2026-09-26</small>
  <div className="buttonRow"><button onClick={()=>window.open("https://github.com/osamababeker4-netizen/alribat-school-system/blob/main/COPYRIGHT.md","_blank")}>عرض إثبات الملكية</button></div>
</div>
</div></section>
}

function Users({db,mutate,setModal,user,uidx,setUidx,fileRef,setDb}){const admin=["مدير النظام","مدير المدرسة"].includes(user.role);return <section className="panel pagePanel"><Head title="المستخدمون والصلاحيات" desc="الأدوار، النسخ الاحتياطي، وسجل التدقيق." add={admin?"مستخدم":null} onAdd={()=>setModal({type:"user"})}/><div className="settingsGrid"><div className="settingCard"><h3>الحساب الحالي</h3><select value={uidx} onChange={e=>setUidx(e.target.value)}>{db.users.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name+" — "+x.role}</option>)}</select><small>تبديل محلي للاختبار. الدخول الحقيقي يحتاج Auth مركزي.</small></div><div className="settingCard"><h3>النسخ الاحتياطي</h3><div className="buttonRow"><button onClick={()=>backup(db)}>تنزيل JSON</button><button onClick={()=>fileRef.current.click()}>استيراد</button></div></div><div className="settingCard"><h3>تصفير البيانات المحلية</h3><button className="danger" onClick={()=>confirm("سيتم حذف البيانات المحلية من هذا الجهاز فقط. متابعة؟")&&setDb(clear())}>تصفير</button></div></div><div className="tableWrap"><table><thead><tr><th>الاسم</th><th>البريد</th><th>الجوال</th><th>الدور</th><th>الحالة</th><th></th></tr></thead><tbody>{db.users.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.email||"—"}</td><td>{x.phone||"—"}</td><td>{x.role}</td><td><S tone={x.active?"ok":"bad"}>{x.active?"نشط":"موقوف"}</S></td><td>{admin&&x.id!=="u-admin"&&<button onClick={async()=>{try{await setSchoolUserActive(x.authId,!x.active);mutate(p=>({...p,users:p.users.map(u=>u.id===x.id?{...u,active:!u.active}:u)}),"تعديل","المستخدمون","تغيير حالة "+x.name)}catch(e){alert(e.message||"تعذر تحديث حالة المستخدم")}}}>{x.active?"إيقاف":"تفعيل"}</button>}</td></tr>)}</tbody></table></div><h3>سجل التدقيق</h3>{db.audit.length?<div className="auditList">{db.audit.slice(0,50).map(x=><div key={x.id}><b>{x.action+" · "+x.module}</b><span>{x.description}</span><small>{x.user+" — "+new Date(x.at).toLocaleString("ar")}</small></div>)}</div>:<Empty text="لا توجد عمليات مسجلة"/>}</section>}

function Dialogs({modal,setModal,db,mutate,notify,user}){if(!modal)return null;const close=()=>setModal(null);if(modal.type==="studentImport")return <StudentImportModal db={db} mutate={mutate} close={close}/>;if(modal.type==="notes")return <Modal title="التنبيهات" close={close}>{db.notifications.length?<div className="auditList">{db.notifications.map(x=><div key={x.id}><b>{x.title}</b><span>{x.message}</span><small>{new Date(x.at).toLocaleString("ar")}</small></div>)}</div>:<Empty text="لا توجد تنبيهات"/>}<div className="modalActions"><button onClick={()=>{setModal(null)}}>إغلاق</button></div></Modal>;return <FormDialog type={modal.type} close={close} db={db} mutate={mutate} notify={notify} user={user}/>}

function FormDialog({type,close,db,mutate,notify,user}){const init={student:{name:"",grade:"",className:"",parentName:"",parentPhone:""},fee:{studentId:"",type:"رسوم دراسية",amount:"",dueDate:today()},payment:{feeId:"",amount:"",date:today(),method:"نقدي"},expense:{title:"",category:"أخرى",amount:"",date:today(),payee:""},staff:{name:"",role:"معلم",phone:"",salary:"",hireDate:today()},item:{name:"",sku:"",category:"",unit:"قطعة",quantity:"0",reorderLevel:"0",unitCost:"0"},move:{itemId:"",kind:"صرف",quantity:"",date:today(),recipient:""},request:{title:"",department:"",priority:"عادية",details:""},user:{name:"",email:"",phone:"",role:"مشرف/معلم"}}[type]||{};const[f,setF]=useState(init);const set=(k,v)=>setF({...f,[k]:v});const title={student:"إضافة طالب",fee:"إضافة رسوم",payment:"إيصال قبض",expense:"إضافة مصروف",staff:"إضافة موظف",item:"إضافة صنف",move:"حركة مخزون",request:"طلب جديد",user:"إضافة مستخدم"}[type];
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
     await inviteSchoolUser(f.email,f.phone,f.name,f.role);
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
 {type==="user"&&<><F label="الاسم"><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="البريد"><input required type="email" value={f.email} onChange={e=>set("email",e.target.value)}/></F><F label="رقم الجوال"><input dir="ltr" placeholder="+249..." value={f.phone} onChange={e=>set("phone",e.target.value)}/></F><F label="الدور"><select value={f.role} onChange={e=>set("role",e.target.value)}>{ROLES.map(x=><option key={x}>{x}</option>)}</select></F></>}
 <Actions close={close}/></form></Modal>}

export default App;
