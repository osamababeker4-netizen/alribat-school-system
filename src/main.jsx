import{centralEnabled,currentProfile,getSession,inviteSchoolUser,setSchoolUserActive,updateMyPhone}from"./central.js";
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


const normalizePhone=v=>String(v||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0(?=\d{9,})/,"249");
const normalizePersonName=v=>String(v||"").normalize("NFKD").replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06EDـ]/g,"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/\s+/g,"").toLowerCase();
function resolveProfileStaff(db,profile){
 if(!profile)return null;
 const active=(db.staff||[]).filter(x=>x.status!=="منتهي");
 const byAuth=active.find(x=>x.authId&&x.authId===profile.user_id);if(byAuth)return byAuth;
 const pp=normalizePhone(profile.phone);if(pp){const byPhone=active.find(x=>normalizePhone(x.phone)===pp);if(byPhone)return byPhone}
 const pn=normalizePersonName(profile.full_name);if(pn){const byName=active.find(x=>normalizePersonName(x.name)===pn);if(byName)return byName}
 return null;
}
function localTimeHM(){return new Date().toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit",hour12:false})}
function autoAttendanceWrite(setDb,staff,profile,kind,pos,distance){
 const date=today(),now=localTimeHM(),who=profile?.full_name||staff.name,stamp=new Date().toISOString();
 setDb(p=>{
  const list=p.staffAttendance||[],old=list.find(x=>x.staffId===staff.id&&x.date===date);
  if(kind==="in"&&old?.checkIn)return p;
  if(kind==="out"&&(!old?.checkIn||old?.checkOut))return p;
  const base=old||{id:id("satt"),staffId:staff.id,staffName:staff.name,role:staff.role,date,status:"حاضر",checkIn:"",checkOut:"",notes:""};
  const geo={lat:pos.coords.latitude,lng:pos.coords.longitude,accuracy:pos.coords.accuracy,distance:Math.round(distance),at:stamp,mode:"auto"};
  const next=kind==="in"?{...base,status:"حاضر",checkIn:now,checkInGeo:geo,autoCheckIn:true,updatedAt:stamp}:{...base,checkOut:now,checkOutGeo:geo,autoCheckOut:true,updatedAt:stamp};
  const description=(kind==="in"?"حضور تلقائي ":"انصراف تلقائي ")+staff.name+" — "+Math.round(distance)+"م من مركز المدرسة";
  return{...p,staffAttendance:old?list.map(x=>x.id===old.id?next:x):[...list,next],audit:[audit(kind==="in"?"حضور تلقائي":"انصراف تلقائي","حضور الموظفين",description,who),...(p.audit||[])].slice(0,1000)}
 });
}
function AutoStaffGeofence({db,setDb}){
 const stateRef=useRef({inside:0,outside:0,lastAction:""}),dbRef=useRef(db);dbRef.current=db;
 useEffect(()=>{
  if(!centralEnabled||!navigator.geolocation)return;
  const profile=currentProfile();if(!profile||profile.role==="مدير المدرسة")return;
  const staff=resolveProfileStaff(db,profile);if(!staff)return;
  const g=db.school?.geofence||{},lat=Number(g.lat),lng=Number(g.lng),radius=Math.max(20,Number(g.radiusM||120)),maxAccuracy=Math.max(20,Number(g.maxAccuracyM||80)),exitBuffer=Math.max(10,Number(g.exitBufferM||25)),samples=Math.max(1,Number(g.autoSamples||2));
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!lat||!lng)return;
  let stopped=false;
  const handle=pos=>{
   if(stopped||!pos?.coords||!Number.isFinite(pos.coords.accuracy)||pos.coords.accuracy>maxAccuracy)return;
   const distance=geoDistanceM(lat,lng,pos.coords.latitude,pos.coords.longitude),inside=distance<=radius,outside=distance>=radius+exitBuffer;
   if(inside){stateRef.current.inside++;stateRef.current.outside=0}
   else if(outside){stateRef.current.outside++;stateRef.current.inside=0}
   else{stateRef.current.inside=0;stateRef.current.outside=0;return}
   const current=dbRef.current,rec=(current.staffAttendance||[]).find(x=>x.staffId===staff.id&&x.date===today());
   if(inside&&stateRef.current.inside>=samples&&!rec?.checkIn){
    stateRef.current.inside=0;stateRef.current.lastAction="in";autoAttendanceWrite(setDb,staff,profile,"in",pos,distance);
   }else if(outside&&stateRef.current.outside>=samples&&rec?.checkIn&&!rec?.checkOut){
    stateRef.current.outside=0;stateRef.current.lastAction="out";autoAttendanceWrite(setDb,staff,profile,"out",pos,distance);
   }
  };
  const error=e=>{if(e?.code===1)window.dispatchEvent(new CustomEvent("alribat-auto-attendance-status",{detail:"يجب السماح بالموقع لتفعيل الحضور التلقائي"}))};
  navigator.geolocation.getCurrentPosition(handle,error,{enableHighAccuracy:true,timeout:15000,maximumAge:0});
  const watch=navigator.geolocation.watchPosition(handle,error,{enableHighAccuracy:true,timeout:20000,maximumAge:10000});
  const onVisible=()=>{if(document.visibilityState==="visible")navigator.geolocation.getCurrentPosition(handle,()=>{}, {enableHighAccuracy:true,timeout:12000,maximumAge:0})};
  document.addEventListener("visibilitychange",onVisible);
  return()=>{stopped=true;navigator.geolocation.clearWatch(watch);document.removeEventListener("visibilitychange",onVisible)}
 },[db.school?.geofence?.lat,db.school?.geofence?.lng,db.school?.geofence?.radiusM,db.school?.geofence?.maxAccuracyM,db.school?.geofence?.exitBufferM,db.school?.geofence?.autoSamples,db.staff?.length]);
 return null;
}

function App(){
 const[db,setDb]=useState(load),[active,setActive]=useState("الرئيسية"),[prevActive,setPrevActive]=useState("الرئيسية"),[search,setSearch]=useState(""),[modal,setModal]=useState(null),[uidx,setUidx]=useState("u-admin");const fileRef=useRef();
 useEffect(()=>save(db),[db]);
 useEffect(()=>{const live=e=>{if(e?.detail)setDb(e.detail)};window.addEventListener("alribat-central-state",live);return()=>window.removeEventListener("alribat-central-state",live)},[]);
 useEffect(()=>{const run=()=>setDb(p=>{const hours=Number(p.school?.auditPurgeHours||0);if(!hours||!(p.audit||[]).length)return p;const last=Date.parse(p.school?.auditLastPurgeAt||0)||0;if(Date.now()-last<hours*3600000)return p;return{...p,audit:[],school:{...p.school,auditLastPurgeAt:new Date().toISOString()}}});run();const t=setInterval(run,60000);return()=>clearInterval(t)},[]);
 const user=db.users.find(x=>x.id===uidx&&x.active)||db.users.find(x=>x.active)||{name:"مدير النظام",role:"مدير النظام"};
 const allowed=PERMS[user.role]||["الرئيسية"];useEffect(()=>{if(!allowed.includes(active))setActive("الرئيسية")},[user.role,active]);
 const mutate=(fn,a,m,d)=>setDb(p=>{const n=fn(p);return{...n,audit:[audit(a,m,d,user.name),...(n.audit||[])].slice(0,1000)}});
 const notify=(title,message)=>setDb(p=>({...p,notifications:[{id:id("n"),title,message,at:new Date().toISOString(),read:false},...p.notifications].slice(0,100)}));
 const nav=MODS.filter(x=>allowed.includes(x[0]));
 const navigate=next=>{if(!next||next===active)return;setPrevActive(active);setActive(next);setSearch("")};
 const goBack=()=>{const next=allowed.includes(prevActive)&&prevActive!==active?prevActive:"الرئيسية";setActive(next);setPrevActive("الرئيسية");setSearch("")};
 const openNotes=()=>{setDb(p=>({...p,notifications:(p.notifications||[]).map(n=>({...n,read:true}))}));setModal({type:"notes"})};
 return <div className="app"><AutoStaffGeofence db={db} setDb={setDb}/><aside className="sidebar"><div className="brand"><div className="logo originalSchoolLogo"><img src={ORIGINAL_LOGO_DATA} alt="شعار مدرسة الرباط الأصلي"/></div><div><b>مدرسة الرباط</b><span>الإدارة والمالية</span></div></div><nav>{nav.map(x=><button key={x[0]} className={active===x[0]?"active":""} onClick={()=>navigate(x[0])}><i>{x[1]}</i><span>{x[0]}</span></button>)}</nav><div className="sideFoot ownershipMini"><span>الإصدار</span><b>Central v1.13.1</b><img className="miniSignature" src="./alribat-owner-signature.svg" alt="توقيع المالك"/><small>© 2026 Eng. Osama Ismail<br/>جميع الحقوق والملكية الفكرية محفوظة</small></div></aside><main><header><div className="headerTitle">{active!=="الرئيسية"&&<button className="backNav" onClick={goBack} aria-label="رجوع">← رجوع</button>}<span className="mobileTitle">مدرسة الرباط</span><h2>{active}</h2><small>النظام المالي والإداري المركزي</small></div><div className="headerActions"><button className="bell" onClick={openNotes}>🔔{db.notifications.some(x=>!x.read)&&<em>{db.notifications.filter(x=>!x.read).length}</em>}</button><div className="user"><div className="avatar">{(user.name||"م")[0]}</div><div><b>{user.name}</b><span>{user.role}</span></div></div></div></header><div className="content">
 {active==="الرئيسية"&&<Dashboard db={db} go={navigate} user={user}/>}
 {active==="الطلاب"&&<Students db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الرسوم والتحصيل"&&<Finance db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} notify={notify}/>}
 {active==="المصروفات"&&<Expenses db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal}/>}
 {active==="الموظفون"&&<Staff db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} user={user}/>}
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

const OCR_JUNK_WORDS=new Set(["الاسم","اسم","الطالب","الطالبه","الطالبة","طلاب","طالب","رسوم","التسجيل","الدراسيه","الدراسية","الدراسه","الدراسة","المتبقي","الباقي","الرصيد","جنيه","المبلغ","القسط","الاول","الأول","اجمالي","إجمالي","الصف","الفصل","رقم"]);
function cleanArabicNameCandidate(raw){
 const noMarks=String(raw||"")
  .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g,"")
  .replace(/[أإآٱ]/g,"ا")
  .replace(/ى/g,"ي")
  .replace(/ـ/g," ");
 const onlyArabic=noMarks
  .replace(/[A-Za-z]/g," ")
  .replace(/[0-9٠-٩۰-۹]/g," ")
  .replace(/[^\u0621-\u064A\u066E-\u06D3\s-]/g," ")
  .replace(/\s+/g," ")
  .trim();
 return onlyArabic.split(" ").filter(w=>w.length>1&&!OCR_JUNK_WORDS.has(w)).join(" ").trim();
}
function studentNameAssessment(raw,ocrConfidence=100){
 const source=cleanImportText(raw),cleaned=cleanArabicNameCandidate(source);
 const arabic=(source.match(/[\u0621-\u064A\u066E-\u06D3]/g)||[]).length;
 const latin=(source.match(/[A-Za-z]/g)||[]).length;
 const letters=arabic+latin;
 const ratio=letters?arabic/letters:0;
 const words=cleaned.split(/\s+/).filter(Boolean);
 const headerLike=/اسم\s*الطالب|رسوم|متبقي|الرصيد|المبلغ|التسجيل|الدراسي|student|tuition|remaining/i.test(source);
 const conf=Math.max(0,Math.min(100,Number(ocrConfidence)||0));
 let score=Math.round(conf*.45+ratio*35+Math.min(words.length,4)*5);
 if(words.length<2)score-=25;
 if(arabic<5)score-=25;
 if(headerLike)score-=35;
 if(latin>2)score-=20;
 score=Math.max(0,Math.min(100,score));
 const valid=words.length>=2&&arabic>=5&&ratio>=.78&&!headerLike&&score>=62;
 return{valid,cleaned:cleaned||source,score,ratio,words,reason:valid?"":headerLike?"عنوان/حقل وليس اسم طالب":latin>2?"النص يحتوي أحرفًا لاتينية غير متوقعة":words.length<2?"الاسم غير مكتمل":arabic<5?"الأحرف العربية غير كافية":"ثقة القراءة منخفضة"};
}
function rowsFromPlainText(text,meta={}){
 const lines=String(text||"").split(/\r?\n/).map(x=>x.trim()).filter(Boolean),out=[];
 const confidence=Number(meta.confidence??100);
 for(const raw of lines){
  let line=westernDigits(raw).replace(/[|؛;]/g," ").replace(/^\s*\d+\s*[-.)ـ:]?\s*/,"").trim();
  if(!line)continue;
  if(/الاسم|اسم الطالب|student name/i.test(line)&&/رسوم|متبقي|remaining|tuition/i.test(line))continue;
  const matches=[...line.matchAll(/\d[\d,.٬٫]*/g)];
  const vals=matches.map(m=>importMoney(m[0])).filter(Number.isFinite);
  const name=cleanArabicNameCandidate(line);
  const check=studentNameAssessment(name,confidence);
  if(!name||name.length<3)continue;
  out.push({
   name,
   registrationFee:vals.length>=3?vals[vals.length-3]:0,
   tuitionFee:vals.length>=2?vals[vals.length-2]:0,
   remainingFee:vals.length>=1?vals[vals.length-1]:0,
   grade:"",
   className:"",
   _ocrConfidence:confidence,
   _ocrScore:check.score,
   _ocrReason:check.reason,
   _reviewNeeded:!check.valid,
   _ocrSource:meta.source||"text"
  });
 }
 return out;
}
function decorateStudentImport(rows,students){
 const existing=new Map(students.map(x=>[importKeyName(x.name),x])),seen=new Set();
 return rows.map((r,i)=>{
  const key=importKeyName(r.name),dupe=key&&seen.has(key),match=key?existing.get(key):null;
  if(key)seen.add(key);
  const a=studentNameAssessment(r.name,r._manualEdited?100:(r._ocrConfidence??100));
  return{...r,_id:r._id||id("imp"),_row:i+1,_key:key,_duplicateFile:dupe,_existingId:match?.id||"",_reviewNeeded:r._manualEdited?!a.valid:(!a.valid||r._reviewNeeded),_ocrScore:r._manualEdited?a.score:(r._ocrScore??a.score),_ocrReason:r._manualEdited?a.reason:(r._ocrReason||a.reason),_status:dupe?"مكرر داخل الملف":(!a.valid||(!r._manualEdited&&r._reviewNeeded))?"بحاجة مراجعة":match?"تحديث سجل موجود":"طالب جديد"};
 });
}
async function importExcelFile(file){
 const XLSX=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm");
 const wb=XLSX.read(await file.arrayBuffer(),{type:"array"}),rows=[];
 for(const sn of wb.SheetNames){
  const grid=XLSX.utils.sheet_to_json(wb.Sheets[sn],{header:1,defval:""});
  const parsed=rowsFromGrid(grid);
  rows.push(...(parsed.length?parsed:rowsFromPlainText(grid.map(r=>r.join("\t")).join("\n"),{confidence:100,source:"excel"})));
 }
 return rows.map(r=>({...r,_ocrConfidence:100,_ocrScore:100,_reviewNeeded:false,_ocrSource:"excel"}));
}

const HANDWRITING_OCR_URL=String(import.meta.env.VITE_OCR_SERVICE_URL||"").replace(/\/$/,"");
async function sourceToUploadBlob(source){
 if(source instanceof Blob)return source;
 if(source instanceof HTMLCanvasElement)return await new Promise((resolve,reject)=>source.toBlob(b=>b?resolve(b):reject(new Error("تعذر تجهيز الصورة")),"image/jpeg",.92));
 throw new Error("مصدر الصورة غير مدعوم");
}
async function htrServiceHealth(timeoutMs=12000){
 if(!HANDWRITING_OCR_URL)return null;
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 try{
  const res=await fetch(HANDWRITING_OCR_URL+"/health",{cache:"no-store",signal:ctrl.signal});
  if(!res.ok)return null;
  return await res.json().catch(()=>null);
 }catch{return null}finally{clearTimeout(timer)}
}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function waitForHtrService(setProgress){
 for(let attempt=1;attempt<=4;attempt++){
  setProgress(attempt===1?"التحقق من محرك الخط العربي...":"إيقاظ محرك الخط العربي — المحاولة "+attempt+" من 4...");
  const health=await htrServiceHealth(attempt===1?12000:18000);
  if(health?.ok)return health;
  if(attempt<4)await wait(2500);
 }
 throw new Error("تعذر الوصول إلى محرك الخط العربي المتخصص. لم يتم استخدام OCR البديل حتى لا تظهر أسماء خاطئة.");
}
async function recognizeArabicHandwriting(source,setProgress,label="الصورة"){
 if(!HANDWRITING_OCR_URL)throw new Error("محرك الخط العربي غير مربوط بالنظام.");
 if(!centralEnabled)throw new Error("يلزم الاتصال بالنظام المركزي لتشغيل قراءة الخط العربي.");
 const session=await getSession();
 if(!session?.access_token)throw new Error("انتهت جلسة الدخول. أعد تسجيل الدخول ثم جرّب القراءة.");

 const health=await waitForHtrService(setProgress);
 const blob=await sourceToUploadBlob(source);
 const form=new FormData();
 form.append("file",blob,blob.name||"notebook.jpg");

 const ctrl=new AbortController();
 // First use can include loading the handwriting model on a sleeping Render
 // instance. Accuracy is more important than silently falling back to a weak
 // browser OCR, so allow enough time for the specialised reader to finish.
 const timeoutMs=health.modelReady?120000:210000;
 const timer=setTimeout(()=>ctrl.abort(),timeoutMs);
 const p1=setTimeout(()=>setProgress(health.modelReady?"قراءة الأسماء العربية من عمود الاسم...":"تحميل نموذج الخط العربي لأول استخدام — لا تغلق النافذة..."),6000);
 const p2=setTimeout(()=>setProgress("تحليل سطور الدفتر وقص كل اسم منفصلًا..."),18000);
 const p3=setTimeout(()=>setProgress("التعرف على الأسماء وربطها بصفوف الدفتر؛ هذه المرحلة قد تستغرق قليلًا في أول مرة..."),45000);
 const p4=setTimeout(()=>setProgress("المحرك المتخصص ما زال يعمل بدقة عالية — لن يتم استبداله بنتيجة OCR ضعيفة."),90000);

 try{
  setProgress(health.modelReady?"قراءة الخط العربي اليدوي المتخصص — "+label+"...":"تجهيز محرك الخط العربي المتخصص — "+label+"...");
  const res=await fetch(HANDWRITING_OCR_URL+"/ocr",{
   method:"POST",
   headers:{authorization:"Bearer "+session.access_token},
   body:form,
   signal:ctrl.signal,
   cache:"no-store"
  });
  let data={};try{data=await res.json()}catch{}
  if(!res.ok)throw new Error(data?.detail||"تعذر تشغيل محرك الخط اليدوي");
  const rows=(data.rows||[]).map((r,i)=>({
   name:cleanArabicNameCandidate(r.name||""),
   birthDate:"",studentPhone:"",
   registrationFee:0,tuitionFee:0,firstInstallment:0,secondInstallment:0,remainingFee:0,
   grade:"",className:"",notebookFields:{},
   _ocrConfidence:Number(r.quality||0),_ocrScore:Number(r.quality||0),
   _ocrReason:r.reviewNeeded?"قراءة خط يدوي تحتاج مراجعة":"",
   _reviewNeeded:Boolean(r.reviewNeeded),
   _ocrSource:"arabic-htr-v2.1",
   _ocrEngine:String(data.engine||"Arabic HTR"),
   _htrRow:Number(r.row||i+1),
   _y:Number(r.y||0),
   _rowBounds:[Number(r.y0||0),Number(r.y1||0)],
   _htrLayout:data.layout||{}
  })).filter(r=>r.name);
  if(!rows.length)throw new Error("لم يستطع محرك الخط العربي استخراج أسماء موثوقة من هذه الصورة. لم يتم عرض قراءة بديلة خاطئة.");
  return rows;
 }catch(e){
  if(e?.name==="AbortError")throw new Error("استغرقت القراءة المتخصصة وقتًا أطول من الحد المسموح. لم يتم استخدام OCR البديل حفاظًا على صحة الأسماء.");
  throw e;
 }finally{
  clearTimeout(timer);clearTimeout(p1);clearTimeout(p2);clearTimeout(p3);clearTimeout(p4);
 }
}


let studentPaddlePromise=null;
async function getStudentPaddleOcr(setProgress){
 if(!studentPaddlePromise){
  setProgress("تحميل محرك القراءة العربية المتقدم لأول مرة...");
  studentPaddlePromise=(async()=>{
   const{PaddleOCR}=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/@paddleocr/paddleocr-js@0.4.2/+esm");
   return PaddleOCR.create({
    lang:"ar",
    ocrVersion:"PP-OCRv5",
    textDetectionBatchSize:1,
    textRecognitionBatchSize:8,
    ortOptions:{
     backend:"wasm",
     wasmPaths:"https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/",
     numThreads:1,
     simd:true
    }
   });
  })().catch(e=>{studentPaddlePromise=null;throw e});
 }
 return studentPaddlePromise;
}
function paddlePolyBox(poly){
 const pts=[];
 if(Array.isArray(poly)){
  if(poly.length&&Array.isArray(poly[0])){
   for(const p of poly){if(Array.isArray(p)&&p.length>=2)pts.push([Number(p[0]),Number(p[1])])}
  }else if(poly.length>=4){
   for(let i=0;i+1<poly.length;i+=2)pts.push([Number(poly[i]),Number(poly[i+1])]);
  }
 }
 if(!pts.length)return{cx:0,cy:0,w:0,h:24};
 const xs=pts.map(p=>p[0]).filter(Number.isFinite),ys=pts.map(p=>p[1]).filter(Number.isFinite);
 if(!xs.length||!ys.length)return{cx:0,cy:0,w:0,h:24};
 const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
 return{cx:(minX+maxX)/2,cy:(minY+maxY)/2,w:maxX-minX,h:Math.max(8,maxY-minY)};
}
function paddleConfidence(score){
 const n=Number(score||0);
 return Math.max(0,Math.min(100,n<=1?n*100:n));
}

async function sourceDimensions(source){
 if(source instanceof HTMLCanvasElement)return{width:source.width||1,height:source.height||1};
 const bitmap=await createImageBitmap(source);
 const dims={width:bitmap.width||1,height:bitmap.height||1};
 if(bitmap.close)bitmap.close();
 return dims;
}
function paddleNormalizedItems(result,dims){
 return (result?.items||[]).map((it,i)=>{
  const text=cleanImportText(it?.text||"");
  const box=paddlePolyBox(it?.poly);
  return{text,score:paddleConfidence(it?.score),box,i,
   xn:box.cx/Math.max(1,dims.width),yn:box.cy/Math.max(1,dims.height),
   wn:box.w/Math.max(1,dims.width),hn:box.h/Math.max(1,dims.height)};
 }).filter(x=>x.text);
}
function normalizeHeaderText(text){
 return String(text||"").replace(/[أإآٱ]/g,"ا").replace(/ى/g,"ي").replace(/ة/g,"ه").replace(/ـ/g," ").replace(/\s+/g," ").trim().toLowerCase();
}
function ledgerFieldFromHeader(text){
 const t=normalizeHeaderText(text);
 if(/اسم/.test(t))return"name";
 if(/ميلاد/.test(t))return"birthDate";
 if(/تلفون|هاتف|جوال|موبايل|فون/.test(t))return"studentPhone";
 if(/تسجيل/.test(t))return"registrationFee";
 if(/رسوم.*دراس|دراس.*رسوم|دراسيه|دراسي/.test(t))return"tuitionFee";
 if(/قسط.*اول|اول.*قسط/.test(t))return"firstInstallment";
 if(/قسط.*ثان|ثاني.*قسط|تاني.*قسط/.test(t))return"secondInstallment";
 if(/متبقي|باقي|رصيد/.test(t))return"remainingFee";
 return"";
}
function ledgerIntervals(layout){
 const raw=[0,...(Array.isArray(layout?.columns)?layout.columns:[]),1]
  .map(Number).filter(Number.isFinite).filter(x=>x>=0&&x<=1).sort((a,b)=>a-b);
 const bounds=[];
 for(const x of raw){if(!bounds.length||x-bounds[bounds.length-1]>.018)bounds.push(x)}
 if(bounds[0]!==0)bounds.unshift(0);
 if(bounds[bounds.length-1]!==1)bounds.push(1);
 return bounds.slice(0,-1).map((x,i)=>({x0:x,x1:bounds[i+1],i,xc:(x+bounds[i+1])/2}));
}
function cellText(items){
 return [...items].sort((a,b)=>b.xn-a.xn).map(x=>x.text).join(" ").replace(/\s+/g," ").trim();
}
function normalizeNotebookDate(text){
 let t=westernDigits(String(text||"")).replace(/[٫.\\-]/g,"/").replace(/\s+/g,"").replace(/[^0-9/]/g,"");
 const parts=t.split("/").filter(Boolean);
 if(parts.length===3){
  let[a,b,c]=parts;
  if(a.length===4)return[a,b.padStart(2,"0"),c.padStart(2,"0")].join("-");
  if(c.length===4)return[c,b.padStart(2,"0"),a.padStart(2,"0")].join("-");
 }
 return t;
}
function normalizeNotebookPhone(text){
 const d=westernDigits(String(text||"")).replace(/\D/g,"");
 return d.length>=7?d:"";
}
function buildLedgerColumnMap(items,layout,htrRows){
 const intervals=ledgerIntervals(layout);
 if(!intervals.length)return{intervals,fields:new Map(),labels:new Map()};
 const firstY=Math.min(...htrRows.map(r=>Number(r._rowBounds?.[0]||r._y||1)).filter(Number.isFinite));
 const headerCut=Number.isFinite(firstY)?Math.max(.06,firstY-.004):.18;
 const fields=new Map(),labels=new Map();
 for(const intv of intervals){
  const header=cellText(items.filter(x=>x.xn>=intv.x0&&x.xn<intv.x1&&x.yn<headerCut&&x.yn>.025));
  labels.set(intv.i,header||("عمود "+(intv.i+1)));
  const f=ledgerFieldFromHeader(header);
  if(f)fields.set(intv.i,f);
 }
 const nameMid=Array.isArray(layout?.nameColumn)?(Number(layout.nameColumn[0])+Number(layout.nameColumn[1]))/2:0.82;
 const nameInt=intervals.find(x=>nameMid>=x.x0&&nameMid<x.x1)||intervals[intervals.length-1];
 fields.set(nameInt.i,"name");
 labels.set(nameInt.i,labels.get(nameInt.i)||"الاسم");

 // Only fill missing semantics by the known Alribat ledger order to the left
 // of the name column. Explicitly recognised headers always win.
 const fallback=["birthDate","studentPhone","registrationFee","firstInstallment","secondInstallment"];
 for(let step=1;step<=fallback.length;step++){
  const idx=nameInt.i-step;
  if(idx<0)break;
  if(!fields.has(idx))fields.set(idx,fallback[step-1]);
 }
 return{intervals,fields,labels};
}
function mergeLedgerDetails(htrRows,paddleItems,layout){
 if(!htrRows.length)return htrRows;
 const{intervals,fields,labels}=buildLedgerColumnMap(paddleItems,layout,htrRows);
 return htrRows.map(row=>{
  const[y0,y1]=row._rowBounds||[Math.max(0,(row._y||0)-.025),Math.min(1,(row._y||0)+.025)];
  const rowItems=paddleItems.filter(x=>x.yn>=y0-.006&&x.yn<=y1+.006);
  const notebookFields={};
  const patch={};
  for(const intv of intervals){
   const text=cellText(rowItems.filter(x=>x.xn>=intv.x0&&x.xn<intv.x1));
   if(!text)continue;
   const label=labels.get(intv.i)||("عمود "+(intv.i+1));
   notebookFields[label]=text;
   const field=fields.get(intv.i);
   if(!field||field==="name")continue;
   if(field==="birthDate")patch.birthDate=normalizeNotebookDate(text);
   else if(field==="studentPhone")patch.studentPhone=normalizeNotebookPhone(text);
   else patch[field]=importMoney(text);
  }
  return{...row,...patch,notebookFields:{...(row.notebookFields||{}),...notebookFields},_detailsSource:"ledger-row-columns"};
 });
}
function rowsFromPaddleResult(result){
 const items=(result?.items||[]).map((it,i)=>{
  const text=cleanImportText(it?.text||"");
  const box=paddlePolyBox(it?.poly);
  return{text,score:paddleConfidence(it?.score),box,i};
 }).filter(x=>x.text);
 if(!items.length)return[];
 const hs=items.map(x=>x.box.h).filter(x=>x>0).sort((a,b)=>a-b);
 const medianH=hs.length?hs[Math.floor(hs.length/2)]:26;
 const tolerance=Math.max(14,Math.min(55,medianH*.72));
 const groups=[];
 for(const item of [...items].sort((a,b)=>a.box.cy-b.box.cy||b.box.cx-a.box.cx)){
  let best=null,bestD=Infinity;
  for(const g of groups){
   const d=Math.abs(item.box.cy-g.cy);
   if(d<=tolerance&&d<bestD){best=g;bestD=d}
  }
  if(!best){best={cy:item.box.cy,items:[]};groups.push(best)}
  best.items.push(item);
  best.cy=best.items.reduce((n,x)=>n+x.box.cy,0)/best.items.length;
 }
 const out=[];
 for(const g of groups.sort((a,b)=>a.cy-b.cy)){
  const cells=[...g.items].sort((a,b)=>b.box.cx-a.box.cx);
  const arabicCells=cells.filter(x=>{
   const cleaned=cleanArabicNameCandidate(x.text);
   return cleaned&&/[\u0621-\u064A]/.test(cleaned)&&!/(اسم\s*الطالب|رسوم|متبقي|الرصيد|المبلغ|التسجيل|الدراسي|الصف|الفصل)/i.test(x.text);
  });
  if(!arabicCells.length)continue;
  // The student-name column is right-to-left in the school notebook. Join nearby
  // Arabic fragments on the same physical row so handwriting split into words
  // becomes one full name instead of several fake students.
  const rightEdge=arabicCells[0].box.cx;
  const selected=arabicCells.filter((x,idx)=>idx===0||rightEdge-x.box.cx<=Math.max(420,x.box.w*4));
  const rawName=selected.map(x=>x.text).join(" ");
  const name=cleanArabicNameCandidate(rawName);
  if(!name||name.length<2)continue;
  const nameConf=selected.reduce((n,x)=>n+x.score,0)/selected.length;
  const numeric=[];
  for(const cell of cells){
   for(const m of westernDigits(cell.text).matchAll(/\d[\d,.٬٫]*/g)){
    const raw=m[0].replace(/[^\d]/g,"");
    const value=importMoney(m[0]);
    if(raw.length&&raw.length<=8&&Number.isFinite(value))numeric.push({value,x:cell.box.cx});
   }
  }
  numeric.sort((a,b)=>b.x-a.x);
  const vals=numeric.map(x=>x.value);
  const check=studentNameAssessment(name,nameConf);
  out.push({
   name,
   registrationFee:vals.length>=3?vals[vals.length-3]:0,
   tuitionFee:vals.length>=2?vals[vals.length-2]:0,
   remainingFee:vals.length>=1?vals[vals.length-1]:0,
   grade:"",
   className:"",
   _ocrConfidence:Math.round(nameConf),
   _ocrScore:check.score,
   _ocrReason:check.reason,
   _reviewNeeded:!check.valid,
   _ocrSource:"paddle-ar-v5",
   _ocrEngine:"PP-OCRv5 Arabic"
  });
 }
 // Remove repeated detections without hiding uncertain rows from review.
 const seen=new Set();
 return out.filter(r=>{const k=importKeyName(r.name);if(!k||seen.has(k))return false;seen.add(k);return true});
}
async function recognizeWithPaddle(source,setProgress,label){
 const ocr=await getStudentPaddleOcr(setProgress);
 const dims=await sourceDimensions(source);
 setProgress("قراءة تفاصيل الصف والأعمدة — "+label+"...");
 const options={
  textDetLimitSideLen:1920,
  textDetLimitType:"max",
  textDetThresh:.22,
  textDetBoxThresh:.28,
  textDetUnclipRatio:1.7,
  textRecScoreThresh:.12
 };
 const[result]=await ocr.predict(source,options);
 let rows=rowsFromPaddleResult(result);
 let items=paddleNormalizedItems(result,dims);
 const good=rows.filter(r=>!r._reviewNeeded).length;
 if(good>=Math.max(2,Math.ceil(rows.length*.58)))return{rows,items,dims,result};
 setProgress("تحسين الصورة وإعادة قراءة تفاصيل الصف...");
 const contrast=await preprocessStudentImage(source,"contrast");
 const retryDims={width:contrast.width||dims.width,height:contrast.height||dims.height};
 const[retry]=await ocr.predict(contrast,{...options,textDetThresh:.16,textDetBoxThresh:.2,textRecScoreThresh:.08});
 const second=rowsFromPaddleResult(retry);
 const secondItems=paddleNormalizedItems(retry,retryDims);
 const useSecond=scoreOcrResult(second,second.reduce((n,r)=>n+(r._ocrConfidence||0),0)/Math.max(1,second.length))>
        scoreOcrResult(rows,rows.reduce((n,r)=>n+(r._ocrConfidence||0),0)/Math.max(1,rows.length));
 return useSecond?{rows:second,items:secondItems,dims:retryDims,result:retry}:{rows,items,dims,result};
}

let studentOcrWorkerPromise=null;
let studentOcrProgressSink=null;
async function getStudentOcrWorker(setProgress){
 studentOcrProgressSink=setProgress;
 if(!studentOcrWorkerPromise){
  studentOcrWorkerPromise=(async()=>{
   const{createWorker}=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/+esm");
   const worker=await createWorker("ara+eng",1,{logger:m=>{
    if(m?.status==="recognizing text"&&studentOcrProgressSink){
     const pct=Math.max(0,Math.min(100,Math.round((m.progress||0)*100)));
     studentOcrProgressSink("التعرف الاحترافي على العربية — "+pct+"%");
    }
   }});
   await worker.setParameters({
    preserve_interword_spaces:"1",
    user_defined_dpi:"300",
    tessedit_pageseg_mode:"6"
   });
   return worker;
  })().catch(e=>{studentOcrWorkerPromise=null;throw e});
 }
 return studentOcrWorkerPromise;
}
function otsuThreshold(hist,total){
 let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
 let sumB=0,wB=0,maxVar=-1,threshold=145;
 for(let i=0;i<256;i++){
  wB+=hist[i];if(!wB)continue;
  const wF=total-wB;if(!wF)break;
  sumB+=i*hist[i];
  const mB=sumB/wB,mF=(sum-sumB)/wF,v=wB*wF*(mB-mF)*(mB-mF);
  if(v>maxVar){maxVar=v;threshold=i}
 }
 return threshold;
}
async function preprocessStudentImage(source,mode="contrast"){
 const bitmap=source instanceof HTMLCanvasElement?source:await createImageBitmap(source);
 const sw=bitmap.width,sh=bitmap.height;
 const targetW=Math.min(2400,Math.max(1500,sw<1400?Math.round(sw*1.8):sw));
 const scale=targetW/sw,targetH=Math.max(1,Math.round(sh*scale));
 const canvas=document.createElement("canvas");canvas.width=targetW;canvas.height=targetH;
 const ctx=canvas.getContext("2d",{willReadFrequently:true});
 ctx.fillStyle="#fff";ctx.fillRect(0,0,targetW,targetH);
 ctx.drawImage(bitmap,0,0,targetW,targetH);
 const img=ctx.getImageData(0,0,targetW,targetH),d=img.data,hist=new Uint32Array(256);
 let mean=0,total=targetW*targetH;
 for(let i=0;i<d.length;i+=4){const g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);hist[g]++;mean+=g}
 mean/=total;
 let low=0,high=255,acc=0,cut=total*.015;
 for(let i=0;i<256;i++){acc+=hist[i];if(acc>=cut){low=i;break}}
 acc=0;for(let i=255;i>=0;i--){acc+=hist[i];if(acc>=cut){high=i;break}}
 const span=Math.max(35,high-low),thr=otsuThreshold(hist,total);
 for(let i=0;i<d.length;i+=4){
  let g=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
  g=Math.max(0,Math.min(255,Math.round((g-low)*255/span)));
  if(mode==="binary")g=g>(thr-low)*255/span?255:0;
  else g=Math.max(0,Math.min(255,Math.round((g-128)*1.24+128)));
  if(mean<110)g=255-g;
  d[i]=d[i+1]=d[i+2]=g;d[i+3]=255;
 }
 ctx.putImageData(img,0,0);
 if(!(source instanceof HTMLCanvasElement)&&bitmap.close)bitmap.close();
 return canvas;
}
function scoreOcrResult(rows,confidence){
 const good=rows.filter(r=>studentNameAssessment(r.name,confidence).valid).length;
 const avg=rows.length?rows.reduce((a,r)=>a+(r._ocrScore||0),0)/rows.length:0;
 return good*120+avg+Math.min(100,confidence);
}
async function recognizeStudentSource(source,setProgress,label="الصورة"){
 // Start table/details OCR in parallel, but HTR is authoritative for names.
 // We never race it against a 4.5-second timer and never replace handwritten
 // names with Paddle/Tesseract guesses.
 const paddlePromise=recognizeWithPaddle(source,setProgress,label)
   .then(pack=>({pack,error:null}))
   .catch(error=>({pack:null,error}));

 if(HANDWRITING_OCR_URL&&centralEnabled){
  const htrRows=await recognizeArabicHandwriting(source,setProgress,label);
  const paddleResult=await paddlePromise;
  if(paddleResult.pack?.items?.length){
   setProgress("ربط الاسم وتاريخ الميلاد والجوال والرسوم بنفس الصف...");
   const layout=htrRows[0]?._htrLayout||{};
   return mergeLedgerDetails(htrRows,paddleResult.pack.items,layout);
  }
  return htrRows;
 }

 // Compatibility path only when the specialised handwriting service is not
 // configured at all (for example, an offline/local development copy).
 const paddleResult=await paddlePromise;
 if(paddleResult.pack?.rows?.length)return paddleResult.pack.rows;

 const worker=await getStudentOcrWorker(setProgress);
 setProgress("تشغيل OCR المحلي الاحتياطي...");
 const contrast=await preprocessStudentImage(source,"contrast");
 await worker.setParameters({tessedit_pageseg_mode:"6"});
 const first=await worker.recognize(contrast),conf1=Number(first.data?.confidence||0);
 return rowsFromPlainText(first.data?.text||"",{confidence:conf1,source:"tesseract-offline-fallback"});
}

async function importPdfFile(file,setProgress){
 const pdfjs=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs");
 pdfjs.GlobalWorkerOptions.workerSrc="https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";
 const doc=await pdfjs.getDocument({data:await file.arrayBuffer()}).promise;
 let directText="";
 for(let i=1;i<=doc.numPages;i++){
  setProgress("قراءة PDF النصية — صفحة "+i+" من "+doc.numPages);
  const p=await doc.getPage(i),c=await p.getTextContent();
  directText+="\n"+c.items.map(x=>x.str).join(" ");
 }
 let direct=rowsFromPlainText(directText,{confidence:100,source:"pdf-text"});
 const directGood=direct.filter(r=>!r._reviewNeeded).length;
 if(directGood>=2)return direct;
 let rows=[];
 for(let i=1;i<=Math.min(doc.numPages,20);i++){
  setProgress("تحضير PDF — صفحة "+i+" من "+Math.min(doc.numPages,20));
  const p=await doc.getPage(i),vp=p.getViewport({scale:2.35}),canvas=document.createElement("canvas");
  canvas.width=Math.round(vp.width);canvas.height=Math.round(vp.height);
  await p.render({canvasContext:canvas.getContext("2d"),viewport:vp}).promise;
  rows.push(...await recognizeStudentSource(canvas,setProgress,"PDF صفحة "+i));
 }
 return rows;
}
async function importImageFile(file,setProgress){
 return recognizeStudentSource(file,setProgress,"الصورة");
}
async function readStudentImportFile(file,setProgress){
 const n=file.name.toLowerCase(),t=file.type||"";
 if(/\.(xlsx|xls)$/i.test(n))return importExcelFile(file);
 if(/\.pdf$/i.test(n)||t==="application/pdf")return importPdfFile(file,setProgress);
 if(t.startsWith("image/")||/\.(png|jpe?g|webp|bmp)$/i.test(n))return importImageFile(file,setProgress);
 const text=await file.text();
 const delim=text.split(/\r?\n/).map(l=>l.split(/\t|,|;|\|/));
 const gridRows=rowsFromGrid(delim);
 return gridRows.length?gridRows.map(r=>({...r,_ocrConfidence:100,_ocrScore:100,_reviewNeeded:false,_ocrSource:"structured"})):rowsFromPlainText(text,{confidence:100,source:"text"});
}


function Students({db,search,setSearch,mutate,setModal}){
 const[genderFilter,setGenderFilter]=useState("الكل"),[gradeFilter,setGradeFilter]=useState("الكل");
 const genderOf=x=>["بنين","ذكر","ولد"].includes(x?.gender)?"بنين":["بنات","أنثى","انثى","بنت"].includes(x?.gender)?"بنات":x?.gender||"غير محدد";
 const grades=useMemo(()=>Array.from(new Set(db.students.map(x=>cleanImportText(x.grade)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"ar")),[db.students]);
 const groups=useMemo(()=>{const m=new Map();for(const st of db.students){const grade=cleanImportText(st.grade)||"غير محدد",gender=genderOf(st),key=grade+"||"+gender,old=m.get(key)||{grade,gender,count:0};old.count++;m.set(key,old)}return Array.from(m.values()).sort((a,b)=>a.grade.localeCompare(b.grade,"ar")||a.gender.localeCompare(b.gender,"ar"))},[db.students]);
 const rows=db.students.filter(x=>{const g=genderOf(x),hay=(x.name+" "+(x.grade||"")+" "+g+" "+(x.studentPhone||x.parentPhone||"")).toLowerCase();return hay.includes(search.toLowerCase())&&(genderFilter==="الكل"||g===genderFilter)&&(gradeFilter==="الكل"||cleanImportText(x.grade)===gradeFilter)}).sort((a,b)=>(a.name||"").localeCompare(b.name||"","ar"));
 const exportCurrent=()=>{const tag=(gradeFilter==="الكل"?"كل-الصفوف":gradeFilter)+"-"+(genderFilter==="الكل"?"بنين-وبنات":genderFilter);csv("students-"+tag+".csv",rows.map(x=>({...x,gender:genderOf(x)})))};
 const del=x=>{if(db.fees.some(f=>f.studentId===x.id)||db.payments.some(p=>p.studentId===x.id)){alert("لا يمكن حذف طالب مرتبط بحركات مالية. غيّر حالته إلى منسحب.");return}if(confirm("تأكيد الحذف؟"))mutate(p=>({...p,students:p.students.filter(st=>st.id!==x.id)}),"حذف","الطلاب","حذف "+x.name)};
 return <section className="panel pagePanel">
  <Head title="الطلاب" desc="قوائم منفصلة حسب الصف وبنين/بنات، مع قراءة الصور والتعرف على العربية والتعديل داخل البرنامج." add="طالب" onAdd={()=>setModal({type:"student"})} search={search} setSearch={setSearch} extra={<><button className="primary" onClick={()=>setModal({type:"studentImport"})}>📷 قراءة الصور والاستيراد</button><button onClick={exportCurrent}>تصدير القائمة الحالية</button></>}/>
  <div className="studentListFilters">
   <div className="studentGenderTabs">
    <button className={genderFilter==="الكل"?"selected":""} onClick={()=>setGenderFilter("الكل")}>الكل <b>{db.students.length}</b></button>
    <button className={genderFilter==="بنين"?"selected":""} onClick={()=>setGenderFilter("بنين")}>👦 بنين <b>{db.students.filter(x=>genderOf(x)==="بنين").length}</b></button>
    <button className={genderFilter==="بنات"?"selected":""} onClick={()=>setGenderFilter("بنات")}>👧 بنات <b>{db.students.filter(x=>genderOf(x)==="بنات").length}</b></button>
   </div>
   <label className="studentGradeFilter"><span>الصف</span><select value={gradeFilter} onChange={e=>setGradeFilter(e.target.value)}><option value="الكل">كل الصفوف</option>{grades.map(g=><option key={g} value={g}>{g}</option>)}</select></label>
   {(genderFilter!=="الكل"||gradeFilter!=="الكل")&&<button onClick={()=>{setGenderFilter("الكل");setGradeFilter("الكل")}}>إلغاء الفرز</button>}
  </div>
  {groups.length>0&&<div className="studentGroupGrid">{groups.map(g=><button key={g.grade+"-"+g.gender} className={"studentGroupCard "+(gradeFilter===g.grade&&genderFilter===g.gender?"active":"")} onClick={()=>{setGradeFilter(g.grade);setGenderFilter(g.gender)}}><span>{g.gender==="بنين"?"👦":g.gender==="بنات"?"👧":"👤"}</span><div><b>{g.grade}</b><small>{g.gender} — {g.count} طالب</small></div></button>)}</div>}
  <div className="studentListHeader"><b>{gradeFilter==="الكل"?"كل الصفوف":gradeFilter} · {genderFilter==="الكل"?"بنين وبنات":genderFilter}</b><span>{rows.length} طالب</span></div>
  {rows.length?<div className="tableWrap"><table><thead><tr><th>الاسم</th><th>الجنس</th><th>تاريخ الميلاد</th><th>الصف</th><th>الفصل</th><th>رسوم التسجيل</th><th>رسوم الدراسة</th><th>القسط الأول</th><th>القسط الثاني</th><th>المتبقي</th><th>الهاتف</th><th>الحالة</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td><S tone={genderOf(x)==="بنات"?"warn":"ok"}>{genderOf(x)}</S></td><td>{x.birthDate||"—"}</td><td>{x.grade||"—"}</td><td>{x.className||"—"}</td><td>{money(x.registrationFee)}</td><td>{money(x.tuitionFee)}</td><td>{money(x.firstInstallment)}</td><td>{money(x.secondInstallment)}</td><td><b>{money(x.remainingFee)}</b></td><td>{x.studentPhone||x.parentPhone||"—"}</td><td><S tone={x.status==="نشط"?"ok":"warn"}>{x.status}</S></td><td className="actions"><button onClick={()=>setModal({type:"studentEdit",record:x})}>تعديل</button><button onClick={()=>mutate(p=>({...p,students:p.students.map(st=>st.id===x.id?{...st,status:st.status==="نشط"?"موقوف":"نشط"}:st)}),"تعديل","الطلاب","تغيير حالة "+x.name)}>الحالة</button><button className="danger" onClick={()=>del(x)}>حذف</button></td></tr>)}</tbody></table></div>:<Empty text="لا يوجد طلاب في هذه القائمة"/>}
 </section>
}

function StudentImportModal({db,mutate,close}){
 const[rows,setRows]=useState([]),[progress,setProgress]=useState(""),[error,setError]=useState(""),[fileName,setFileName]=useState(""),[targetGrade,setTargetGrade]=useState(""),[targetGender,setTargetGender]=useState("بنين");
 const inputRef=useRef();
 const knownGrades=useMemo(()=>Array.from(new Set(db.students.map(x=>cleanImportText(x.grade)).filter(Boolean))).sort((a,b)=>a.localeCompare(b,"ar")),[db.students]);
 const decorated=useMemo(()=>decorateStudentImport(rows,db.students),[rows,db.students]);
 const valid=decorated.filter(x=>x.name&&!x._duplicateFile&&!x._reviewNeeded),review=decorated.filter(x=>x._reviewNeeded&&!x._duplicateFile),created=valid.filter(x=>!x._existingId).length,updated=valid.filter(x=>x._existingId).length,duplicates=decorated.filter(x=>x._duplicateFile).length;
 const loadFiles=async selected=>{const files=Array.from(selected||[]);if(!files.length)return;const grade=cleanImportText(targetGrade);if(!grade){setError("حدد الصف أولاً ثم اختر الصور.");if(inputRef.current)inputRef.current.value="";return}setFileName(files.length===1?files[0].name:files.length+" ملفات");setRows([]);setError("");try{let all=[];for(let i=0;i<files.length;i++){setProgress("الملف "+(i+1)+" من "+files.length+" — جاري تحليل "+files[i].name);const parsed=await readStudentImportFile(files[i],setProgress);all.push(...parsed.map(x=>({...x,grade,gender:targetGender})))}if(!all.length)throw new Error("لم أتمكن من استخراج بيانات الطلاب. جرّب صورة أوضح.");setRows(all.map(x=>({...x,grade,gender:targetGender,_id:id("imp")})));setProgress("")}catch(e){setProgress("");setError(e.message||"تعذر قراءة الملفات")}};
 const edit=(rid,k,v)=>setRows(r=>r.map(x=>x._id===rid?{...x,[k]:["name","grade","className","gender","birthDate","studentPhone"].includes(k)?v:importMoney(v),...(k==="name"?{_manualEdited:true,_reviewNeeded:false,_ocrConfidence:100}:{})}:x));
 const remove=rid=>setRows(r=>r.filter(x=>x._id!==rid));
 const commit=()=>{if(!valid.length){alert(review.length?"لا توجد صفوف موثوقة للحفظ بعد. صحح الأسماء المعلّمة «بحاجة مراجعة» أولاً.":"لا توجد صفوف صالحة للحفظ");return}const grade=cleanImportText(targetGrade);if(!grade){alert("حدد الصف أولاً");return}const savedIds=new Set(valid.map(r=>r._id));mutate(p=>{let students=[...p.students];const byName=new Map(students.map((x,i)=>[importKeyName(x.name),{x,i}]));for(const r of valid){const key=importKeyName(r.name);if(!key)continue;const found=byName.get(key),patch={name:cleanImportText(r.name),birthDate:r.birthDate||found?.x.birthDate||"",studentPhone:r.studentPhone||found?.x.studentPhone||"",registrationFee:num(r.registrationFee)||num(found?.x.registrationFee),tuitionFee:num(r.tuitionFee)||num(found?.x.tuitionFee),firstInstallment:num(r.firstInstallment)||num(found?.x.firstInstallment),secondInstallment:num(r.secondInstallment)||num(found?.x.secondInstallment),remainingFee:num(r.remainingFee)||num(found?.x.remainingFee),notebookFields:{...(found?.x.notebookFields||{}),...(r.notebookFields||{})},grade:cleanImportText(r.grade)||grade,className:r.className||found?.x.className||"",gender:r.gender||targetGender,importedAt:new Date().toISOString(),importSource:fileName,importMethod:"HTR + row/column OCR"};if(found){students[found.i]={...found.x,...patch};byName.set(key,{x:students[found.i],i:found.i})}else{const st={id:id("stu"),status:"نشط",parentName:"",parentPhone:"",...patch};students.push(st);byName.set(key,{x:st,i:students.length-1})}}return{...p,students}},"استيراد","الطلاب","OCR إلى "+grade+" — "+targetGender+": "+created+" جديد، "+updated+" تحديث، "+duplicates+" مكرر");if(review.length){setRows(r=>r.filter(x=>!savedIds.has(x._id)&&decorated.some(d=>d._id===x._id&&d._reviewNeeded)));alert("تم حفظ "+valid.length+" طالب موثوق. بقي "+review.length+" سجل بحاجة مراجعة داخل نفس النافذة.");}else{alert("تم حفظ "+valid.length+" طالب في قائمة «"+grade+" — "+targetGender+"».");close()}};
 return <Modal title="قراءة الصور واستيراد الطلاب — OCR عربي" close={close}><div className="studentImport">
  <div className="importRouting"><div><b>1) حدد الصف والقائمة</b><span>ستُنزل البيانات تلقائيًا في القائمة المحددة بعد المراجعة.</span></div><label><span>الصف</span><input list="student-import-grades" value={targetGrade} onChange={e=>setTargetGrade(e.target.value)} placeholder="مثال: الصف الثالث"/><datalist id="student-import-grades">{knownGrades.map(g=><option key={g} value={g}/>)}</datalist></label><label><span>القائمة</span><select value={targetGender} onChange={e=>setTargetGender(e.target.value)}><option value="بنين">👦 بنين</option><option value="بنات">👧 بنات</option></select></label></div>
  <div className="importDestination">وجهة التنزيل: <b>{cleanImportText(targetGrade)||"حدد الصف"} — {targetGender}</b></div>
  <div className="importDrop"><b>📷 صور دفتر / PDF / Excel / CSV / TXT</b><span>يتم تتبع كل ملف وصفحة أثناء القراءة. إذا تأخر محرك الخط العربي ينتقل النظام تلقائيًا إلى محرك احتياطي بدل بقاء النافذة معلقة.</span><button type="button" className="primary" onClick={e=>{e.preventDefault();e.stopPropagation();if(!cleanImportText(targetGrade)){setError("حدد الصف أولاً ثم اختر الصور.");return}if(inputRef.current){inputRef.current.value="";inputRef.current.click()}}}>{fileName?"اختيار ملفات أخرى":"اختيار الصور والملفات"}</button><input ref={inputRef} style={{position:"absolute",width:1,height:1,opacity:0,pointerEvents:"none"}} multiple type="file" accept="image/*,.pdf,.xlsx,.xls,.csv,.txt,.tsv" onChange={e=>{const picked=e.currentTarget.files;loadFiles(picked)}}/></div>
  {progress&&<div className="importProgress">⏳ {progress}</div>}{error&&<div className="importError">⚠️ {error}</div>}
  {rows.length>0&&<><div className="importSummary"><span>الصف <b>{cleanImportText(targetGrade)}</b></span><span>القائمة <b>{targetGender}</b></span><span>جديد <b>{created}</b></span><span>تحديث <b>{updated}</b></span><span>بحاجة مراجعة <b>{review.length}</b></span><span>مكرر <b>{duplicates}</b></span><span>إجمالي <b>{decorated.length}</b></span></div>
  <div className="tableWrap importPreview"><table><thead><tr><th>#</th><th>اسم الطالب</th><th>الثقة</th><th>الجنس</th><th>تاريخ الميلاد</th><th>الجوال</th><th>رسوم التسجيل</th><th>رسوم الدراسة</th><th>القسط الأول</th><th>القسط الثاني</th><th>المتبقي</th><th>الصف</th><th>الفصل</th><th>الحالة</th><th></th></tr></thead><tbody>{decorated.map((r,i)=><tr key={r._id} className={r._duplicateFile?"importDuplicate":r._reviewNeeded?"importReview":r._existingId?"importExisting":""}><td>{i+1}</td><td><input value={r.name} onChange={e=>edit(r._id,"name",e.target.value)}/>{r._ocrReason&&r._reviewNeeded?<small className="ocrReason">{r._ocrReason}</small>:null}</td><td><span className={"ocrConfidence "+(r._reviewNeeded?"low":(r._ocrScore||0)>=80?"high":"mid")}>{Math.round(r._ocrScore||0)}%</span></td><td><select value={r.gender||targetGender} onChange={e=>edit(r._id,"gender",e.target.value)}><option value="بنين">بنين</option><option value="بنات">بنات</option></select></td><td><input dir="ltr" value={r.birthDate||""} onChange={e=>edit(r._id,"birthDate",e.target.value)}/></td><td><input dir="ltr" inputMode="tel" value={r.studentPhone||""} onChange={e=>edit(r._id,"studentPhone",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.registrationFee||""} onChange={e=>edit(r._id,"registrationFee",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.tuitionFee||""} onChange={e=>edit(r._id,"tuitionFee",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.firstInstallment||""} onChange={e=>edit(r._id,"firstInstallment",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.secondInstallment||""} onChange={e=>edit(r._id,"secondInstallment",e.target.value)}/></td><td><input dir="ltr" type="number" min="0" value={r.remainingFee||""} onChange={e=>edit(r._id,"remainingFee",e.target.value)}/></td><td><input value={r.grade||""} onChange={e=>edit(r._id,"grade",e.target.value)}/></td><td><input value={r.className||""} onChange={e=>edit(r._id,"className",e.target.value)}/></td><td><S tone={r._duplicateFile||r._reviewNeeded?"bad":r._existingId?"warn":"ok"}>{r._status}</S></td><td><button className="danger" onClick={()=>remove(r._id)}>حذف</button></td></tr>)}</tbody></table></div>
  <div className="importNote">يتم حفظ الأسماء الموثوقة فقط. أي قراءة ضعيفة تُعلّم «بحاجة مراجعة» ولا تُحفظ حتى تصحيح الاسم يدويًا. يُقرأ اسم الطالب بمحرك HTR عربي مستقل، ثم تُربط به تلقائيًا تفاصيل نفس الصف: تاريخ الميلاد، الجوال، رسوم التسجيل، رسوم الدراسة، الأقساط، المتبقي وأي خانات إضافية يتعرف عليها النظام. أي اسم غير موثوق يبقى للمراجعة.</div><div className="modalActions"><button onClick={close}>إلغاء</button><button className="primary" onClick={commit}>تنزيل وحفظ {valid.length} طالب</button></div></>}
 </div></Modal>
}

function StudentEditModal({student,db,mutate,close}){
 const[f,setF]=useState({...student,gender:["بنات","أنثى","انثى","بنت"].includes(student.gender)?"بنات":"بنين"});
 const set=(k,v)=>setF(x=>({...x,[k]:v}));
 const submit=e=>{e.preventDefault();const name=cleanImportText(f.name),grade=cleanImportText(f.grade);if(!name||!grade){alert("اسم الطالب والصف مطلوبان");return}const clash=db.students.find(x=>x.id!==student.id&&importKeyName(x.name)===importKeyName(name));if(clash){alert("يوجد طالب آخر بنفس الاسم. عدّل الاسم قبل الحفظ.");return}mutate(p=>({...p,students:p.students.map(x=>x.id===student.id?{...x,...f,name,grade,registrationFee:num(f.registrationFee),tuitionFee:num(f.tuitionFee),firstInstallment:num(f.firstInstallment),secondInstallment:num(f.secondInstallment),remainingFee:num(f.remainingFee),updatedAt:new Date().toISOString()}:x)}),"تعديل","الطلاب","تعديل بيانات "+name);close()};
 return <Modal title={"تعديل الطالب — "+student.name} close={close}><form className="formGrid" onSubmit={submit}>
  <F label="اسم الطالب" full><input required value={f.name||""} onChange={e=>set("name",e.target.value)}/></F>
  <F label="الجنس"><select value={f.gender||"بنين"} onChange={e=>set("gender",e.target.value)}><option value="بنين">بنين</option><option value="بنات">بنات</option></select></F>
  <F label="الصف"><input required value={f.grade||""} onChange={e=>set("grade",e.target.value)}/></F>
  <F label="الفصل"><input value={f.className||""} onChange={e=>set("className",e.target.value)}/></F>
  <F label="تاريخ الميلاد"><input value={f.birthDate||""} onChange={e=>set("birthDate",e.target.value)}/></F>
  <F label="هاتف الطالب"><input inputMode="tel" value={f.studentPhone||""} onChange={e=>set("studentPhone",e.target.value)}/></F>
  <F label="رسوم التسجيل"><input type="number" min="0" value={f.registrationFee||""} onChange={e=>set("registrationFee",e.target.value)}/></F>
  <F label="القسط الأول"><input type="number" min="0" value={f.tuitionFee||""} onChange={e=>set("tuitionFee",e.target.value)}/></F>
  <F label="المستحقات"><input type="number" min="0" value={f.remainingFee||""} onChange={e=>set("remainingFee",e.target.value)}/></F>
  <F label="ولي الأمر"><input value={f.parentName||""} onChange={e=>set("parentName",e.target.value)}/></F>
  <F label="هاتف ولي الأمر"><input inputMode="tel" value={f.parentPhone||""} onChange={e=>set("parentPhone",e.target.value)}/></F>
  <Actions close={close}/>
 </form></Modal>
}

function Finance({db,search,setSearch,mutate,setModal}){const[tab,setTab]=useState("fees");const q=search.toLowerCase(),rows=db.fees.filter(x=>(x.studentName+" "+x.type).toLowerCase().includes(q)),paymentRows=db.payments.filter(x=>(x.receipt+" "+x.studentName+" "+x.method).toLowerCase().includes(q));return <section className="panel pagePanel"><Head title="الرسوم والتحصيل" desc="المتبقي يحسب من الإيصالات الفعلية ولا يمكن الدفع بأكثر من المستحق." add={tab==="fees"?"رسوم":"إيصال قبض"} onAdd={()=>setModal({type:tab==="fees"?"fee":"payment"})} search={search} setSearch={setSearch} extra={<><button className={tab==="fees"?"selected":""} onClick={()=>setTab("fees")}>الرسوم</button><button className={tab==="payments"?"selected":""} onClick={()=>setTab("payments")}>الإيصالات</button></>}/>{tab==="fees"?(rows.length?<div className="tableWrap"><table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.studentName}</b></td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td>{money(balance(db,x))}</td><td><S tone={fstatus(db,x)==="مدفوع"?"ok":fstatus(db,x)==="غير مدفوع"?"bad":"warn"}>{fstatus(db,x)}</S></td></tr>)}</tbody></table></div>:<Empty/>):(paymentRows.length?<div className="tableWrap"><table><thead><tr><th>الإيصال</th><th>الطالب</th><th>المبلغ</th><th>التاريخ</th><th>الطريقة</th><th></th></tr></thead><tbody>{[...paymentRows].reverse().map(x=><tr key={x.id}><td><b>{x.receipt}</b></td><td>{x.studentName}</td><td>{money(x.amount)}</td><td>{x.date}</td><td>{x.method}</td><td><button onClick={()=>printReceipt(x,db.school)}>طباعة</button></td></tr>)}</tbody></table></div>:<Empty/>)}</section>}

function Expenses({db,search,setSearch,mutate,setModal}){const rows=db.expenses.filter(x=>(x.title+" "+x.category+" "+(x.payee||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="المصروفات" desc="المصروفات حسب التصنيف والتاريخ والمستفيد." add="مصروف" onAdd={()=>setModal({type:"expense"})} search={search} setSearch={setSearch} extra={<button onClick={()=>csv("expenses.csv",db.expenses)}>تصدير</button>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>البيان</th><th>التصنيف</th><th>المبلغ</th><th>التاريخ</th><th>المستفيد</th><th></th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.title}</b></td><td>{x.category}</td><td>{money(x.amount)}</td><td>{x.date}</td><td>{x.payee||"—"}</td><td><button className="danger" onClick={()=>confirm("تأكيد الحذف؟")&&mutate(p=>({...p,expenses:p.expenses.filter(e=>e.id!==x.id)}),"حذف","المحاسبة","حذف "+x.title)}>حذف</button></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Staff({db,search,setSearch,setModal,mutate,user}){const admin=["مدير النظام","مدير المدرسة"].includes(user?.role);const norm=v=>String(v||"").replace(/\D/g,"");const rows=db.staff.filter(x=>(x.name+" "+x.role+" "+(x.phone||"")).toLowerCase().includes(search.toLowerCase()));const linked=x=>db.users.find(u=>x.authId&&u.authId===x.authId)||db.users.find(u=>norm(x.phone)&&norm(u.phone)===norm(x.phone))||db.users.find(u=>normalizePersonName(u.name)===normalizePersonName(x.name));const link=(st,authId)=>mutate(p=>({...p,staff:p.staff.map(x=>x.id===st.id?{...x,authId}:x)}),"تعديل","الموظفون","ربط حساب النظام بالموظف "+st.name);return <section className="panel pagePanel"><Head title="الموظفون" desc="البيانات الوظيفية والرواتب وربط حساب الجوال بالحضور التلقائي." add="موظف" onAdd={()=>setModal({type:"staff"})} search={search} setSearch={setSearch}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الاسم</th><th>الوظيفة</th><th>الهاتف</th><th>حساب الحضور</th><th>الراتب</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=>{const lu=linked(x);return <tr key={x.id}><td><b>{x.name}</b></td><td>{x.role}</td><td>{x.phone||"—"}</td><td>{admin?<select value={x.authId||lu?.authId||""} onChange={e=>link(x,e.target.value)}><option value="">ربط تلقائي بالاسم/الجوال</option>{db.users.filter(u=>u.active&&u.role!=="مدير المدرسة"&&u.authId).map(u=><option key={u.authId} value={u.authId}>{u.name+" — "+u.role}</option>)}</select>:<span>{lu?.name||"غير مرتبط"}</span>}{lu&&<small className="linkedAccount">✓ {lu.name}</small>}</td><td>{money(x.salary)}</td><td><S tone="ok">{x.status}</S></td></tr>})}</tbody></table></div>:<Empty/>}</section>}

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
  <Head title="حضور وانصراف الموظفين" desc="الحضور والانصراف تلقائيان عند دخول/خروج جوال الموظف من النطاق أثناء تشغيل النظام، مع استثناء مدير المدرسة."/>
  <div className={"geoFenceBanner "+(geoReady?"ready":"blocked")}>
   <div><b>{geoReady?"📍 النطاق الجغرافي مفعل":"⚠️ النطاق الجغرافي غير مضبوط"}</b><span>{geoReady?"تلقائي أثناء تشغيل النظام • نصف قطر "+Number(g.radiusM||120)+"م • هامش خروج "+Number(g.exitBufferM||25)+"م • دقة GPS ≤ "+Number(g.maxAccuracyM||80)+"م":"لن يعمل تسجيل الحضور أو الانصراف حتى يعتمد مدير النظام موقع المدرسة من الإعدادات."}</span></div>
   {geoReady&&<small>موقع المدرسة: {Number(g.lat).toFixed(6)}, {Number(g.lng).toFixed(6)}</small>}
  </div>
  <div className="cards staffAttMetrics"><Metric t="الموظفون" v={staff.length} s="موظف نشط" icon="👥" tone="blue"/><Metric t="حاضر اليوم" v={present} s="تحقق جغرافي" icon="✓" tone="green"/><Metric t="غائب" v={absent} s="حسب سجل اليوم" icon="×" tone="gold"/><Metric t="بانتظار الانصراف" v={open} s="حضور بلا انصراف" icon="⏱" tone="violet"/></div>
  <div className="toolbar staffAttToolbar"><input type="date" value={date} max={today()} onChange={e=>setDate(e.target.value)}/><button onClick={()=>csv("staff-attendance-"+date+".csv",rows.map(x=>({...x,checkInDistanceM:x.checkInGeo?.distance??"",checkInAccuracyM:x.checkInGeo?.accuracy??"",checkOutDistanceM:x.checkOutGeo?.distance??"",checkOutAccuracyM:x.checkOutGeo?.accuracy??""})))}>تصدير سجل اليوم</button></div>
  {staff.length?<div className="tableWrap"><table className="staffAttTable"><thead><tr><th>الموظف</th><th>الوظيفة</th><th>الحالة</th><th>الحضور</th><th>الانصراف</th><th>الموقع</th><th>المدة</th><th>الإجراء</th></tr></thead><tbody>{staff.map(st=>{const r=rec(st);return <tr key={st.id}><td><b>{st.name}</b></td><td>{st.role}</td><td><select value={r?.status||""} onChange={e=>e.target.value&&setStatus(st,e.target.value)}><option value="">غير مسجل</option>{["غائب","إجازة","مأذون"].map(x=><option key={x}>{x}</option>)}{r?.status==="حاضر"&&<option value="حاضر">حاضر — GPS</option>}</select></td><td><b className="timeCell">{r?.checkIn||"—"}</b>{r?.checkInGeo&&<small className="geoMeta">±{Math.round(r.checkInGeo.accuracy)}م</small>}</td><td><b className="timeCell">{r?.checkOut||"—"}</b>{r?.checkOutGeo&&<small className="geoMeta">±{Math.round(r.checkOutGeo.accuracy)}م</small>}</td><td>{r?.checkInGeo?<span className="geoOk">داخل النطاق • {r.checkInGeo.distance}م</span>:"—"}</td><td>{duration(r)}</td><td className="actions"><button className="checkInBtn" disabled={!geoReady||date!==today()||Boolean(r?.checkIn)||Boolean(geoBusy)} onClick={()=>checkIn(st)}>{geoBusy==="in-"+st.id?"جارٍ التحقق...":"حضور الآن"}</button><button className="checkOutBtn" disabled={!geoReady||date!==today()||!r?.checkIn||Boolean(r?.checkOut)||Boolean(geoBusy)} onClick={()=>checkOut(st)}>{geoBusy==="out-"+st.id?"جارٍ التحقق...":"انصراف الآن"}</button></td></tr>})}</tbody></table></div>:<Empty text="أضف الموظفين أولاً"/>}
 </section>
}

function Attendance({db,mutate}){const[date,setDate]=useState(today());const rows=db.attendance.filter(x=>x.date===date);const status=s=>rows.find(x=>x.studentId===s.id)?.status;const mark=(s,st)=>mutate(p=>{const old=p.attendance.find(x=>x.studentId===s.id&&x.date===date);return{...p,attendance:old?p.attendance.map(x=>x.id===old.id?{...x,status:st}:x):[...p.attendance,{id:id("att"),studentId:s.id,studentName:s.name,date,status:st}]}},"تعديل","الحضور",s.name+" - "+st);return <section className="panel pagePanel"><Head title="الحضور" desc="تسجيل يومي للحضور والغياب والتأخير والأذونات."/><div className="toolbar"><input type="date" value={date} onChange={e=>setDate(e.target.value)}/><button onClick={()=>csv("attendance-"+date+".csv",rows)}>تصدير اليوم</button></div>{db.students.filter(x=>x.status==="نشط").length?<div className="attendanceGrid">{db.students.filter(x=>x.status==="نشط").map(s=><div className="attendanceRow" key={s.id}><div><b>{s.name}</b><small>{s.grade}</small></div><div className="attButtons">{["حاضر","غائب","متأخر","مأذون"].map(st=><button key={st} className={status(s)===st?"selected":""} onClick={()=>mark(s,st)}>{st}</button>)}</div></div>)}</div>:<Empty text="أضف الطلاب أولاً"/>}</section>}

function Inventory({db,search,setSearch,setModal}){const rows=db.inventory.filter(x=>(x.name+" "+(x.sku||"")+" "+(x.category||"")).toLowerCase().includes(search.toLowerCase()));return <section className="panel pagePanel"><Head title="المخزون" desc="الأصناف والأرصدة ومنع الصرف بالسالب وحد إعادة الطلب." add="صنف" onAdd={()=>setModal({type:"item"})} search={search} setSearch={setSearch} extra={<button onClick={()=>setModal({type:"move"})}>+ حركة مخزون</button>}/>{rows.length?<div className="tableWrap"><table><thead><tr><th>الصنف</th><th>الرمز</th><th>التصنيف</th><th>المتبقي</th><th>حد الطلب</th><th>الحالة</th></tr></thead><tbody>{rows.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.sku||"—"}</td><td>{x.category||"—"}</td><td>{x.quantity+" "+(x.unit||"")}</td><td>{x.reorderLevel}</td><td><S tone={num(x.quantity)<=num(x.reorderLevel)?"warn":"ok"}>{num(x.quantity)<=num(x.reorderLevel)?"إعادة طلب":"متوفر"}</S></td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Requests({db,mutate,setModal,user}){const decide=(x,st)=>mutate(p=>({...p,requests:p.requests.map(r=>r.id===x.id?{...r,status:st,decisionBy:user.name}:r)}),"اعتماد","الطلبات",st+" "+x.number);return <section className="panel pagePanel"><Head title="الطلبات والموافقات" desc="مسار طلب ومراجعة واعتماد/رفض." add="طلب" onAdd={()=>setModal({type:"request"})}/>{db.requests.length?<div className="tableWrap"><table><thead><tr><th>الرقم</th><th>العنوان</th><th>القسم</th><th>الأولوية</th><th>مقدم الطلب</th><th>الحالة</th><th></th></tr></thead><tbody>{[...db.requests].reverse().map(x=><tr key={x.id}><td><b>{x.number}</b></td><td>{x.title}</td><td>{x.department||"—"}</td><td>{x.priority}</td><td>{x.requester}</td><td><S tone={x.status==="معتمد"?"ok":x.status==="مرفوض"?"bad":"warn"}>{x.status}</S></td><td className="actions">{x.status==="قيد المراجعة"&&["مدير النظام","مدير المدرسة"].includes(user.role)&&<><button onClick={()=>decide(x,"معتمد")}>اعتماد</button><button className="danger" onClick={()=>decide(x,"مرفوض")}>رفض</button></>}</td></tr>)}</tbody></table></div>:<Empty/>}</section>}

function Reports({db}){
 const fees=total(db.fees),cash=total(db.payments),exp=total(db.expenses),open=db.fees.filter(x=>balance(db,x)>0);
 const printReport=()=>{const done=()=>document.body.classList.remove("report-print-mode");document.body.classList.add("report-print-mode");window.addEventListener("afterprint",done,{once:true});setTimeout(()=>window.print(),50);setTimeout(done,5000)};
 return <>
  <section className="panel pagePanel screenReport">
   <Head title="التقارير" desc="ملخص مالي وتقارير قابلة للطباعة والتصدير."/>
   <div className="cards reportCards"><Metric t="الرسوم" v={money(fees)} s={db.school.currency}/><Metric t="المتحصل" v={money(cash)} s={db.school.currency}/><Metric t="المصروفات" v={money(exp)} s={db.school.currency}/><Metric t="صافي التدفق" v={money(cash-exp)} s={db.school.currency}/></div>
   <div className="reportActions"><button onClick={printReport}>طباعة</button><button onClick={()=>csv("fees-report.csv",db.fees.map(x=>({...x,paid:paid(db,x.id),balance:balance(db,x),status:fstatus(db,x)})))}>تصدير الرسوم</button><button onClick={()=>csv("payments-report.csv",db.payments)}>تصدير الإيصالات</button><button onClick={()=>csv("inventory-report.csv",db.inventory)}>تصدير المخزون</button><button onClick={()=>csv("staff-attendance-report.csv",db.staffAttendance||[])}>تصدير حضور الموظفين</button></div>
   <h3>الرسوم ذات المتبقي</h3>{open.length?<div className="tableWrap"><table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>{open.map(x=><tr key={x.id}><td>{x.studentName}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td><b>{money(balance(db,x))}</b></td></tr>)}</tbody></table></div>:<Empty text="لا توجد مبالغ متبقية"/>}
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
    <div className="orBalances"><h2>الرسوم ذات المتبقي</h2>{open.length?<table><thead><tr><th>الطالب</th><th>النوع</th><th>الإجمالي</th><th>المدفوع</th><th>المتبقي</th></tr></thead><tbody>{open.slice(0,8).map(x=><tr key={x.id}><td>{x.studentName}</td><td>{x.type}</td><td>{money(x.amount)}</td><td>{money(paid(db,x.id))}</td><td>{money(balance(db,x))}</td></tr>)}</tbody></table>:<div className="orEmpty">لا توجد مبالغ متبقية</div>}</div>
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

const PORT_SUDAN_MAP_CENTER=[19.6158,37.2164];
function ensureLeafletCss(){
 if(document.getElementById("alribat-leaflet-css"))return;
 const l=document.createElement("link");l.id="alribat-leaflet-css";l.rel="stylesheet";l.href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css";l.crossOrigin="";document.head.appendChild(l);
}
function SchoolMapPicker({lat,lng,radiusM,onPick}){
 const hostRef=useRef(null),mapRef=useRef(null),markerRef=useRef(null),circleRef=useRef(null),pickRef=useRef(onPick);const[mapError,setMapError]=useState("");
 pickRef.current=onPick;
 const nlat=Number(lat),nlng=Number(lng),valid=Number.isFinite(nlat)&&Number.isFinite(nlng)&&nlat!==0&&nlng!==0;
 useEffect(()=>{let alive=true;ensureLeafletCss();(async()=>{try{
   const mod=await import(/* @vite-ignore */"https://cdn.jsdelivr.net/npm/leaflet@1.9.4/+esm");if(!alive||!hostRef.current)return;const L=mod.default||mod;
   const center=valid?[nlat,nlng]:PORT_SUDAN_MAP_CENTER;
   const map=L.map(hostRef.current,{zoomControl:true,scrollWheelZoom:true}).setView(center,valid?17:13);
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:20,attribution:"© OpenStreetMap"}).addTo(map);
   const icon=L.divIcon({className:"schoolMapPin",html:"<span>📍</span>",iconSize:[36,36],iconAnchor:[18,32]});
   const marker=L.marker(center,{draggable:true,icon}).addTo(map);
   const circle=L.circle(center,{radius:Math.max(20,Number(radiusM||120)),color:"#c9961a",weight:2,fillColor:"#c9961a",fillOpacity:.09}).addTo(map);
   const choose=p=>{marker.setLatLng(p);circle.setLatLng(p);pickRef.current?.(p.lat,p.lng)};
   map.on("click",e=>choose(e.latlng));marker.on("dragend",()=>choose(marker.getLatLng()));
   mapRef.current=map;markerRef.current=marker;circleRef.current=circle;setTimeout(()=>map.invalidateSize(),120);
  }catch(e){if(alive)setMapError("تعذر تحميل الخريطة الآن. يمكنك استخدام الموقع الحالي أو إدخال الإحداثيات يدويًا.")}})();
  return()=>{alive=false;if(mapRef.current){mapRef.current.remove();mapRef.current=null;markerRef.current=null;circleRef.current=null}}
 },[]);
 useEffect(()=>{if(circleRef.current)circleRef.current.setRadius(Math.max(20,Number(radiusM||120)))},[radiusM]);
 useEffect(()=>{if(!valid||!mapRef.current||!markerRef.current||!circleRef.current)return;const p=[nlat,nlng];markerRef.current.setLatLng(p);circleRef.current.setLatLng(p);if(!mapRef.current.getBounds().contains(p))mapRef.current.panTo(p)},[nlat,nlng,valid]);
 return <div className="schoolMapPicker"><div className="schoolMapHelp"><b>حدد موقع المدرسة من الخريطة</b><span>اضغط على الموقع مباشرة أو اسحب العلامة. الدائرة تمثل نطاق السماح بالحضور والانصراف.</span></div><div ref={hostRef} className="schoolMapCanvas"/>{mapError&&<small className="geoBlockedText">{mapError}</small>}</div>
}

function Settings({db,mutate}){
 const current=db.users.find(x=>x.authId===db.central?.userId)||db.users[0]||{};
 const[s,setS]=useState({...db.school,geofence:{radiusM:120,maxAccuracyM:80,exitBufferM:25,autoSamples:2,...(db.school.geofence||{})},subjectsText:(db.school.subjects||[]).join("\n")}),[loginPhone,setLoginPhone]=useState(current.phone||""),[geoSetting,setGeoSetting]=useState(false);
 useEffect(()=>setS({...db.school,geofence:{radiusM:120,maxAccuracyM:80,exitBufferM:25,autoSamples:2,...(db.school.geofence||{})},subjectsText:(db.school.subjects||[]).join("\n")}),[db.school]);
 useEffect(()=>setLoginPhone(current.phone||""),[current.phone]);
 const set=(k,v)=>setS({...s,[k]:v});const setGeo=(k,v)=>setS({...s,geofence:{...(s.geofence||{}),[k]:v}});
 const saveSettings=()=>mutate(p=>({...p,school:{...p.school,...s,subjects:s.subjectsText.split("\n").map(x=>x.trim()).filter(Boolean),subjectsText:undefined}}),"تعديل","الإعدادات","تحديث إعدادات المدرسة");
 const captureSchoolLocation=async()=>{setGeoSetting(true);try{const p=await getDevicePosition();setS(x=>({...x,geofence:{...(x.geofence||{}),lat:Number(p.lat.toFixed(7)),lng:Number(p.lng.toFixed(7)),radiusM:Number(x.geofence?.radiusM||120),maxAccuracyM:Number(x.geofence?.maxAccuracyM||80),capturedAccuracyM:Math.round(p.accuracy),capturedAt:p.at}}));alert("تم التقاط الموقع. اضغط «حفظ الإعدادات» لاعتماده كموقع المدرسة.")}catch(e){alert(e.message)}finally{setGeoSetting(false)}};
 const saveLoginPhone=async()=>{try{await updateMyPhone(loginPhone);mutate(p=>({...p,users:p.users.map(u=>u.authId===p.central?.userId?{...u,phone:loginPhone}:u)}),"تعديل","المستخدمون","تحديث رقم جوال تسجيل الدخول");alert("تم حفظ رقم الجوال. يمكنك استخدامه مع كلمة المرور في تسجيل الدخول.")}catch(e){alert(e.message||"تعذر حفظ رقم الجوال")}};
 const logoFile=e=>{const file=e.target.files?.[0];if(!file)return;if(file.size>700000){alert("حجم الشعار يجب ألا يتجاوز 700KB");return}const r=new FileReader();r.onload=()=>set("logoUrl",r.result);r.readAsDataURL(file)};
 return <section className="panel pagePanel"><Head title="إعدادات البرنامج" desc="بيانات المدرسة والهوية والسنة الدراسية والمواد وإعدادات الطباعة وتسجيل الدخول."/><div className="settingsForm"><div className="logoSettings"><img src={ORIGINAL_LOGO_DATA} alt="شعار مدرسة الرباط الأصلي"/><div><b>شعار المدرسة</b><input type="file" accept="image/*" onChange={logoFile}/><button onClick={()=>set("logoUrl","")}>اعتماد الشعار الأصلي</button></div></div><div className="settingCard geoSettings"><h3>📍 نطاق حضور الموظفين</h3><p className="muted">حدد موقع المدرسة مباشرة من الخريطة أو استخدم GPS الحالي. بعد الحفظ لن يعمل الحضور والانصراف خارج الدائرة المحددة.</p><SchoolMapPicker lat={s.geofence?.lat} lng={s.geofence?.lng} radiusM={s.geofence?.radiusM||120} onPick={(lat,lng)=>setS(x=>({...x,geofence:{...(x.geofence||{}),lat:Number(lat.toFixed(7)),lng:Number(lng.toFixed(7)),pickedFromMap:true,capturedAccuracyM:null,capturedAt:new Date().toISOString()}}))}/><div className="geoSettingsGrid"><F label="خط العرض"><input dir="ltr" type="number" step="0.0000001" value={s.geofence?.lat||""} onChange={e=>setGeo("lat",e.target.value)}/></F><F label="خط الطول"><input dir="ltr" type="number" step="0.0000001" value={s.geofence?.lng||""} onChange={e=>setGeo("lng",e.target.value)}/></F><F label="نصف قطر السماح — متر"><input dir="ltr" type="number" min="20" max="1000" value={s.geofence?.radiusM||120} onChange={e=>setGeo("radiusM",e.target.value)}/></F><F label="أقصى دقة GPS مقبولة — متر"><input dir="ltr" type="number" min="20" max="300" value={s.geofence?.maxAccuracyM||80} onChange={e=>setGeo("maxAccuracyM",e.target.value)}/></F><F label="هامش الخروج — متر"><input dir="ltr" type="number" min="10" max="200" value={s.geofence?.exitBufferM||25} onChange={e=>setGeo("exitBufferM",e.target.value)}/></F><F label="مرات التأكيد قبل التسجيل"><input dir="ltr" type="number" min="1" max="5" value={s.geofence?.autoSamples||2} onChange={e=>setGeo("autoSamples",e.target.value)}/></F></div><div className="buttonRow"><button className="primary" disabled={geoSetting} onClick={captureSchoolLocation}>{geoSetting?"جارٍ تحديد الموقع...":"اعتماد موقعي الحالي كموقع المدرسة"}</button></div>{s.geofence?.lat&&s.geofence?.lng?<small>الموقع المحدد: {Number(s.geofence.lat).toFixed(6)}, {Number(s.geofence.lng).toFixed(6)}{s.geofence.capturedAccuracyM?" • دقة GPS ±"+s.geofence.capturedAccuracyM+"م":s.geofence.pickedFromMap?" • تم اختياره من الخريطة":""} — اضغط «حفظ الإعدادات» لاعتماده.</small>:<small className="geoBlockedText">لم يتم تحديد موقع المدرسة بعد — الحضور والانصراف سيبقيان مقفلين.</small>}</div><div className="settingCard auditRetentionSettings"><h3>🧹 حذف سجل التدقيق تلقائيًا</h3><p className="muted">حدد كل كم ساعة يتم تصفير سجل التدقيق. اختر 0 لتعطيل الحذف التلقائي. إذا لم يكن النظام مفتوحًا وقت الموعد، ينفذ الحذف عند أول تشغيل لاحق.</p><F label="فترة الحذف — ساعة"><select value={s.auditPurgeHours||0} onChange={e=>set("auditPurgeHours",Number(e.target.value))}><option value="0">معطل</option><option value="1">كل ساعة</option><option value="6">كل 6 ساعات</option><option value="12">كل 12 ساعة</option><option value="24">كل 24 ساعة</option><option value="168">كل أسبوع</option><option value="720">كل 30 يومًا</option></select></F>{s.auditLastPurgeAt&&<small>آخر حذف تلقائي: {new Date(s.auditLastPurgeAt).toLocaleString("ar")}</small>}</div><div className="settingCard loginIdentity"><h3>بيانات تسجيل الدخول</h3><p className="muted">يمكنك الدخول بالبريد الإلكتروني أو رقم الجوال مع نفس كلمة المرور.</p><div className="buttonRow"><input dir="ltr" placeholder="+249..." value={loginPhone} onChange={e=>setLoginPhone(e.target.value)}/><button className="primary" onClick={saveLoginPhone}>حفظ رقم الجوال</button></div><small>البريد الحالي: {current.email||"—"}</small></div><div className="formGrid"><F label="اسم المدرسة"><input value={s.name||""} onChange={e=>set("name",e.target.value)}/></F><F label="الاسم الرسمي"><input value={s.fullName||""} onChange={e=>set("fullName",e.target.value)}/></F><F label="السنة الدراسية"><input value={s.academicYear||""} onChange={e=>set("academicYear",e.target.value)}/></F><F label="العملة"><input value={s.currency||""} onChange={e=>set("currency",e.target.value)}/></F><F label="هاتف المدرسة"><input dir="ltr" value={s.phone||""} onChange={e=>set("phone",e.target.value)}/></F><F label="البريد الإلكتروني"><input dir="ltr" value={s.email||""} onChange={e=>set("email",e.target.value)}/></F><F label="العنوان" full><input value={s.address||""} onChange={e=>set("address",e.target.value)}/></F><F label="المواد الدراسية — مادة في كل سطر" full><textarea rows="8" value={s.subjectsText||""} onChange={e=>set("subjectsText",e.target.value)}/></F><div className="formActions full"><button className="primary" onClick={saveSettings}>حفظ الإعدادات</button></div></div>
<div className="settingCard">
  <h3>الملكية الفكرية</h3>
  <p><b>© 2026 Eng. Osama Ismail — جميع الحقوق محفوظة.</b></p>
  <p className="muted">هذا النظام وتصميمه وبرمجته وتكامل قاعدة البيانات وسجل إصداراته موثق باسم المالك داخل المستودع.</p>
  <img className="ownerSignature" src="./alribat-owner-signature.svg" alt="التوقيع المعتمد للمالك"/><small>التوقيع اليدوي المعتمد + التوقيع الإلكتروني: Eng. Osama Ismail • الإصدار v1.13.1 • 2026-09-26</small>
  <div className="buttonRow"><button onClick={()=>window.open("https://github.com/osamababeker4-netizen/alribat-school-system/blob/main/COPYRIGHT.md","_blank")}>عرض إثبات الملكية</button></div>
</div>
</div></section>
}

function Users({db,mutate,setModal,user,uidx,setUidx,fileRef,setDb}){const admin=["مدير النظام","مدير المدرسة"].includes(user.role);const clearAuditNow=()=>{if(!admin)return;if(confirm("سيتم حذف سجل التدقيق بالكامل من القاعدة المركزية بعد المزامنة. متابعة؟"))setDb(p=>({...p,audit:[],school:{...p.school,auditLastPurgeAt:new Date().toISOString()}}))};return <section className="panel pagePanel"><Head title="المستخدمون والصلاحيات" desc="الأدوار، النسخ الاحتياطي، وسجل التدقيق." add={admin?"مستخدم":null} onAdd={()=>setModal({type:"user"})}/><div className="settingsGrid"><div className="settingCard"><h3>الحساب الحالي</h3><select value={uidx} onChange={e=>setUidx(e.target.value)}>{db.users.filter(x=>x.active).map(x=><option key={x.id} value={x.id}>{x.name+" — "+x.role}</option>)}</select><small>تبديل محلي للاختبار. الدخول الحقيقي يحتاج Auth مركزي.</small></div><div className="settingCard"><h3>النسخ الاحتياطي</h3><div className="buttonRow"><button onClick={()=>backup(db)}>تنزيل JSON</button><button onClick={()=>fileRef.current.click()}>استيراد</button></div></div><div className="settingCard"><h3>سجل التدقيق</h3><p className="muted">السجلات الحالية: {(db.audit||[]).length} • الحذف التلقائي: {Number(db.school?.auditPurgeHours||0)?("كل "+Number(db.school.auditPurgeHours)+" ساعة"):"معطل"}</p>{admin&&<button className="danger" onClick={clearAuditNow}>حذف سجل التدقيق الآن</button>}</div></div><div className="tableWrap"><table><thead><tr><th>الاسم</th><th>البريد</th><th>الجوال</th><th>الدور</th><th>الحالة</th><th></th></tr></thead><tbody>{db.users.map(x=><tr key={x.id}><td><b>{x.name}</b></td><td>{x.email||"—"}</td><td>{x.phone||"—"}</td><td>{x.role}</td><td><S tone={x.active?"ok":"bad"}>{x.active?"نشط":"موقوف"}</S></td><td>{admin&&x.id!=="u-admin"&&x.authId!==db.central?.userId&&<button onClick={async()=>{try{await setSchoolUserActive(x.authId,!x.active);mutate(p=>({...p,users:p.users.map(u=>u.id===x.id?{...u,active:!u.active}:u)}),"تعديل","المستخدمون","تغيير حالة "+x.name)}catch(e){alert(e.message||"تعذر تحديث حالة المستخدم")}}}>{x.active?"إيقاف":"تفعيل"}</button>}</td></tr>)}</tbody></table></div><h3>سجل التدقيق</h3>{db.audit.length?<div className="auditList">{db.audit.slice(0,50).map(x=><div key={x.id}><b>{x.action+" · "+x.module}</b><span>{x.description}</span><small>{x.user+" — "+new Date(x.at).toLocaleString("ar")}</small></div>)}</div>:<Empty text="لا توجد عمليات مسجلة"/>}</section>}
function Dialogs({modal,setModal,db,mutate,notify,user}){if(!modal)return null;const close=()=>setModal(null);if(modal.type==="studentImport")return <StudentImportModal db={db} mutate={mutate} close={close}/>;if(modal.type==="studentEdit")return <StudentEditModal student={modal.record} db={db} mutate={mutate} close={close}/>;if(modal.type==="notes")return <Modal title="التنبيهات" close={close}>{db.notifications.length?<div className="auditList">{db.notifications.map(x=><div key={x.id}><b>{x.title}</b><span>{x.message}</span><small>{new Date(x.at).toLocaleString("ar")}</small></div>)}</div>:<Empty text="لا توجد تنبيهات"/>}<div className="modalActions"><button onClick={()=>{setModal(null)}}>إغلاق</button></div></Modal>;return <FormDialog type={modal.type} close={close} db={db} mutate={mutate} notify={notify} user={user}/>}

function FormDialog({type,close,db,mutate,notify,user}){const init={student:{name:"",birthDate:"",studentPhone:"",grade:"",gender:"بنين",className:"",registrationFee:"",tuitionFee:"",firstInstallment:"",secondInstallment:"",remainingFee:"",parentName:"",parentPhone:""},fee:{studentId:"",type:"رسوم دراسية",amount:"",dueDate:today()},payment:{feeId:"",amount:"",date:today(),method:"نقدي"},expense:{title:"",category:"أخرى",amount:"",date:today(),payee:""},staff:{name:"",role:"معلم",phone:"",salary:"",hireDate:today(),authId:""},item:{name:"",sku:"",category:"",unit:"قطعة",quantity:"0",reorderLevel:"0",unitCost:"0"},move:{itemId:"",kind:"صرف",quantity:"",date:today(),recipient:""},request:{title:"",department:"",priority:"عادية",details:""},user:{name:"",email:"",phone:"",role:"مشرف/معلم"}}[type]||{};const[f,setF]=useState(init);const set=(k,v)=>setF({...f,[k]:v});const title={student:"إضافة طالب",fee:"إضافة رسوم",payment:"إيصال قبض",expense:"إضافة مصروف",staff:"إضافة موظف",item:"إضافة صنف",move:"حركة مخزون",request:"طلب جديد",user:"إضافة مستخدم"}[type];
 const submit=async e=>{e.preventDefault();
 if(type==="student"){const name=cleanImportText(f.name),grade=cleanImportText(f.grade);if(db.students.some(x=>importKeyName(x.name)===importKeyName(name))){alert("يوجد طالب مسجل بنفس الاسم. استخدم زر «تعديل» للسجل الموجود.");return}mutate(p=>({...p,students:[...p.students,{...f,name,grade,registrationFee:num(f.registrationFee),tuitionFee:num(f.tuitionFee),firstInstallment:num(f.firstInstallment),secondInstallment:num(f.secondInstallment),remainingFee:num(f.remainingFee),id:id("stu"),status:"نشط"}]}),"إنشاء","الطلاب","إضافة "+name)}
 if(type==="fee"){const s=db.students.find(x=>x.id===f.studentId);mutate(p=>({...p,fees:[...p.fees,{...f,id:id("fee"),studentName:s.name,amount:num(f.amount)}]}),"إنشاء","المحاسبة","إضافة رسوم "+s.name)}
 if(type==="payment"){const fee=db.fees.find(x=>x.id===f.feeId),b=fee?balance(db,fee):0;if(!fee||num(f.amount)<=0||num(f.amount)>b){alert("المبلغ غير صالح أو أكبر من المتبقي "+money(b));return}const rec="REC-"+new Date().getFullYear()+"-"+String(db.payments.length+1).padStart(5,"0");mutate(p=>({...p,payments:[...p.payments,{...f,id:id("pay"),studentId:fee.studentId,studentName:fee.studentName,receipt:rec,amount:num(f.amount)}]}),"إنشاء","المحاسبة","إيصال "+rec);notify("تم تسجيل دفعة",rec+" — "+money(f.amount))}
 if(type==="expense")mutate(p=>({...p,expenses:[...p.expenses,{...f,id:id("exp"),amount:num(f.amount)}]}),"إنشاء","المحاسبة","مصروف "+f.title);
 if(type==="staff")mutate(p=>({...p,staff:[...p.staff,{...f,id:id("staff"),salary:num(f.salary),status:"على رأس العمل"}]}),"إنشاء","الموظفون","إضافة "+f.name);
 if(type==="item")mutate(p=>({...p,inventory:[...p.inventory,{...f,id:id("item"),quantity:num(f.quantity),reorderLevel:num(f.reorderLevel),unitCost:num(f.unitCost)}]}),"إنشاء","المخزون","إضافة "+f.name);
 if(type==="move"){const it=db.inventory.find(x=>x.id===f.itemId),q=num(f.quantity),delta=f.kind==="استلام"?q:-q;if(!it||q<=0)return;if(it.quantity+delta<0){alert("لا يمكن الصرف: الكمية أكبر من المتبقي");return}mutate(p=>({...p,inventory:p.inventory.map(x=>x.id===it.id?{...x,quantity:x.quantity+delta}:x),moves:[...p.moves,{...f,id:id("mov"),itemName:it.name,quantity:q,balanceAfter:it.quantity+delta}]}),"إنشاء","المخزون",f.kind+" "+q+" من "+it.name);if(it.quantity+delta<=it.reorderLevel)notify("تنبيه مخزون",it.name+" وصل إلى "+(it.quantity+delta))}
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
 return <Modal title={title} close={close}><form className="formGrid" onSubmit={submit}>{type==="student"&&<><F label="اسم الطالب" full><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="تاريخ الميلاد"><input placeholder="كما في الدفتر" value={f.birthDate} onChange={e=>set("birthDate",e.target.value)}/></F><F label="هاتف الطالب"><input inputMode="tel" value={f.studentPhone} onChange={e=>set("studentPhone",e.target.value)}/></F><F label="الصف"><input required value={f.grade} onChange={e=>set("grade",e.target.value)}/></F><F label="الجنس"><select value={f.gender||"بنين"} onChange={e=>set("gender",e.target.value)}><option value="بنين">بنين</option><option value="بنات">بنات</option></select></F><F label="الفصل"><input value={f.className} onChange={e=>set("className",e.target.value)}/></F><F label="رسوم التسجيل"><input type="number" min="0" value={f.registrationFee} onChange={e=>set("registrationFee",e.target.value)}/></F><F label="رسوم الدراسة"><input type="number" min="0" value={f.tuitionFee} onChange={e=>set("tuitionFee",e.target.value)}/></F><F label="القسط الأول"><input type="number" min="0" value={f.firstInstallment} onChange={e=>set("firstInstallment",e.target.value)}/></F><F label="القسط الثاني"><input type="number" min="0" value={f.secondInstallment} onChange={e=>set("secondInstallment",e.target.value)}/></F><F label="المتبقي"><input type="number" min="0" value={f.remainingFee} onChange={e=>set("remainingFee",e.target.value)}/></F><F label="ولي الأمر"><input value={f.parentName} onChange={e=>set("parentName",e.target.value)}/></F><F label="هاتف ولي الأمر"><input inputMode="tel" value={f.parentPhone} onChange={e=>set("parentPhone",e.target.value)}/></F></>}
 {type==="fee"&&<><F label="الطالب" full><select required value={f.studentId} onChange={e=>set("studentId",e.target.value)}><option value="">اختر الطالب</option>{db.students.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></F><F label="نوع الرسوم"><select value={f.type} onChange={e=>set("type",e.target.value)}>{["رسوم تسجيل","رسوم دراسية","رسوم نقل","رسوم نشاط","رسوم امتحانات","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F><F label="المبلغ"><input required min="1" type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></F><F label="الاستحقاق" full><input type="date" value={f.dueDate} onChange={e=>set("dueDate",e.target.value)}/></F></>}
 {type==="payment"&&<><F label="الرسم المستحق" full><select required value={f.feeId} onChange={e=>set("feeId",e.target.value)}><option value="">اختر</option>{db.fees.filter(x=>balance(db,x)>0).map(x=><option key={x.id} value={x.id}>{x.studentName+" — "+x.type+" — "+money(balance(db,x))}</option>)}</select></F><F label="المبلغ"><input required min="1" type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></F><F label="التاريخ"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></F><F label="الطريقة" full><select value={f.method} onChange={e=>set("method",e.target.value)}>{["نقدي","تحويل بنكي","شيك","بطاقة","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F></>}
 {type==="expense"&&<><F label="البيان" full><input required value={f.title} onChange={e=>set("title",e.target.value)}/></F><F label="التصنيف"><select value={f.category} onChange={e=>set("category",e.target.value)}>{["رواتب","إيجار","كهرباء وماء","صيانة","قرطاسية","مواد تعليمية","نقل","ضيافة","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F><F label="المبلغ"><input required min="1" type="number" value={f.amount} onChange={e=>set("amount",e.target.value)}/></F><F label="التاريخ"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></F><F label="المستفيد"><input value={f.payee} onChange={e=>set("payee",e.target.value)}/></F></>}
 {type==="staff"&&<><F label="الاسم" full><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="الوظيفة"><select value={f.role} onChange={e=>set("role",e.target.value)}>{["معلم","إداري","عامل","حارس","سائق","أخرى"].map(x=><option key={x}>{x}</option>)}</select></F><F label="الهاتف"><input value={f.phone} onChange={e=>set("phone",e.target.value)}/></F><F label="حساب النظام المرتبط" full><select value={f.authId||""} onChange={e=>{const u=db.users.find(x=>x.authId===e.target.value);setF({...f,authId:e.target.value,phone:f.phone||u?.phone||"",name:f.name||u?.name||""})}}><option value="">ربط تلقائي بالاسم/الجوال</option>{db.users.filter(x=>x.active&&x.role!=="مدير المدرسة").map(x=><option key={x.authId||x.id} value={x.authId||""}>{x.name+" — "+x.role+(x.phone?" — "+x.phone:"")}</option>)}</select></F><F label="الراتب"><input type="number" min="0" value={f.salary} onChange={e=>set("salary",e.target.value)}/></F><F label="تاريخ التعيين"><input type="date" value={f.hireDate} onChange={e=>set("hireDate",e.target.value)}/></F></>}
 {type==="item"&&<><F label="اسم الصنف" full><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="الرمز"><input value={f.sku} onChange={e=>set("sku",e.target.value)}/></F><F label="التصنيف"><input value={f.category} onChange={e=>set("category",e.target.value)}/></F><F label="الوحدة"><input value={f.unit} onChange={e=>set("unit",e.target.value)}/></F><F label="الكمية"><input type="number" min="0" value={f.quantity} onChange={e=>set("quantity",e.target.value)}/></F><F label="حد إعادة الطلب"><input type="number" min="0" value={f.reorderLevel} onChange={e=>set("reorderLevel",e.target.value)}/></F></>}
 {type==="move"&&<><F label="الصنف" full><select required value={f.itemId} onChange={e=>set("itemId",e.target.value)}><option value="">اختر</option>{db.inventory.map(x=><option key={x.id} value={x.id}>{x.name+" — المتبقي "+x.quantity}</option>)}</select></F><F label="الحركة"><select value={f.kind} onChange={e=>set("kind",e.target.value)}><option>استلام</option><option>صرف</option></select></F><F label="الكمية"><input required min="1" type="number" value={f.quantity} onChange={e=>set("quantity",e.target.value)}/></F><F label="التاريخ"><input type="date" value={f.date} onChange={e=>set("date",e.target.value)}/></F><F label="المستلم/المرجع" full><input value={f.recipient} onChange={e=>set("recipient",e.target.value)}/></F></>}
 {type==="request"&&<><F label="العنوان" full><input required value={f.title} onChange={e=>set("title",e.target.value)}/></F><F label="القسم"><input value={f.department} onChange={e=>set("department",e.target.value)}/></F><F label="الأولوية"><select value={f.priority} onChange={e=>set("priority",e.target.value)}><option>عادية</option><option>عالية</option><option>عاجلة</option></select></F><F label="التفاصيل" full><textarea rows="4" value={f.details} onChange={e=>set("details",e.target.value)}/></F></>}
 {type==="user"&&<><F label="الاسم"><input required value={f.name} onChange={e=>set("name",e.target.value)}/></F><F label="البريد"><input required type="email" value={f.email} onChange={e=>set("email",e.target.value)}/></F><F label="رقم الجوال"><input dir="ltr" placeholder="+249..." value={f.phone} onChange={e=>set("phone",e.target.value)}/></F><F label="الدور"><select value={f.role} onChange={e=>set("role",e.target.value)}>{ROLES.map(x=><option key={x}>{x}</option>)}</select></F></>}
 <Actions close={close}/></form></Modal>}

export default App;
