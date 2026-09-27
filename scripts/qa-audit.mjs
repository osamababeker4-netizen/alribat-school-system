import fs from "node:fs";

const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const main=read("src/main.jsx");
const boot=read("src/bootstrap.jsx");
const central=read("src/central.js");
const store=read("src/store.js");
const index=read("index.html");
const pkg=JSON.parse(read("package.json"));

const failures=[];
const ok=(cond,msg)=>{if(!cond)failures.push(msg)};
const has=(src,needle,msg)=>ok(src.includes(needle),msg||("missing: "+needle));

const modules=["الرئيسية","الطلاب","الرسوم والتحصيل","المصروفات","الموظفون","حضور الموظفين","الحضور","المخزون","الطلبات والموافقات","ورقة التقدير","التقارير","المستخدمون والصلاحيات","الإعدادات"];
for(const m of modules){
  has(main,'active==="'+m+'"',"module is not rendered: "+m);
}

for(const type of ["student","fee","payment","expense","staff","item","move","request","user"]){
  has(main,'type==="'+type+'"',"form dialog missing: "+type);
}
for(const type of ["studentImport","studentEdit","notes"]){
  has(main,'modal.type==="'+type+'"',"special dialog missing: "+type);
}

has(main,'<Staff db={db} search={search} setSearch={setSearch} mutate={mutate} setModal={setModal} user={user}/>','staff screen must receive active user');
has(main,'function StudentEditModal({student,db,mutate,close})','student editor must validate against live database');
has(main,'db.students.some(x=>importKeyName(x.name)===importKeyName(name))','manual student creation must reject duplicates');
has(main,'review.length?"لا توجد صفوف موثوقة للحفظ بعد.','OCR review rows must be blocked from save');
has(main,'ocrVersion:"PP-OCRv5"','advanced Arabic OCR engine missing');
has(main,'lang:"ar"','Arabic OCR language must be explicit');
has(main,'_ocrSource:"paddle-ar-v5"','Paddle Arabic OCR results must be traceable');
has(main,'tesseract-offline-fallback','offline compatibility OCR path missing');
has(main,'firstInstallment','first installment field missing');
has(main,'secondInstallment','second installment field missing');
has(main,'birthDate','birth date field missing');
has(main,'studentPhone','student phone field missing');
has(main,'notebookFields','raw notebook detail preservation missing');
has(main,'mergeLedgerDetails','row detail merger missing');
has(main,'syncStudentCoreFees','student finance synchronizer missing');
has(main,'syncStudentNameRefs','dependent student-name synchronizer missing');
has(main,'nextReceiptNumber','safe receipt sequence generator missing');
has(main,'coreFeeValidation','paid-fee amount validation missing');
has(main,'x.message||x.body||""','legacy notification body fallback missing');
has(main,'registrationFee:null,tuitionFee:null','unknown OCR fees must stay null rather than fake zero');
has(main,'links.push("حضور")','student delete must protect attendance history');
has(main,'links.push("درجات")','student delete must protect grade history');
has(main,'max={today()}','student attendance must block future dates');
has(main,'رمز الصنف مستخدم بالفعل','inventory duplicate SKU protection missing');
has(main,'centralEnabled?<><b>{user.name}</b>','production account switch hardening missing');
has(main,'CORE_FEE_FIELDS','core registration/tuition fee mapping missing');
has(main,'كل حساب مرتبطًا بموظف واحد فقط','staff account uniqueness guard missing');
has(main,'رقم الجوال مستخدم في سجل موظف آخر','staff phone uniqueness guard missing');

has(main,'SCHOOL_TZ="Africa/Khartoum"','school timezone must be explicit');
has(main,'recordStaffGeofenceEvent(kind==="in"?"enter":"exit"','browser geofence must use secure server RPC');
ok(!main.includes('function autoAttendanceWrite('),"browser geofence must not write attendance locally");
has(main,'quantity:num(x.quantity)+delta','inventory balance update must be numeric');
has(main,'nextRequestNumber','request numbering must not depend on array length');

has(main,'gradeCounts=[...gradeMap.entries()]','dashboard must use real grade/student data');
has(main,'setModal({type:"notes"})','dashboard notification navigation missing');
has(main,'quick=[["الطلاب"','authorized quick-action map missing');
has(main,'users:p.users,central:p.central','central restore must preserve authenticated identity');
has(main,'importOptionalMoney','structured imports must preserve blank monetary values');
ok(!main.includes('["الأساسي الأول",72]'),"dashboard still contains fixed demo metrics");
ok(!main.includes('onClick={()=>go("الطلبات والموافقات")}>عرض الكل</button>'),"notification button still routes to requests");
ok(!main.includes('input type="file" accept="image/*" onChange={logoFile}'),"non-functional logo uploader still visible");

ok(!main.includes('label="الفصل"'),'student class/section field must be removed');
ok(!main.includes('<th>الفصل</th>'),'student class/section list column must be removed');
ok(!main.includes('student.className'),'student class/section references must be removed');
ok(!main.includes('r.className'),'import class/section references must be removed');
has(main,'rotateLedgerSource','ledger orientation alignment missing');
has(main,'layout.rotation','HTR rotation metadata missing');
has(main,'setRows(r=>r.filter(x=>!savedIds.has(x._id)','OCR review rows must remain open after partial save');
has(main,'const openNotes=()=>','notification bell must mark/read via one controlled action');
has(main,'className="backNav"','back navigation must be wired');
has(main,'x.authId!==db.central?.userId','current authenticated account must not be disabled from UI');

for(const fn of ["inviteSchoolUser","setSchoolUserActive","updateMyPhone","recordStaffGeofenceEvent"]){
  has(central,"export async function "+fn, "central function missing: "+fn);
}
for(const fn of ["subscribeCentralChanges","queueCentralSave"]){
  has(central,"export function "+fn, "central function missing: "+fn);
}
for(const fn of ["csv","backup","restore"]){
  has(store,fn,"store utility missing: "+fn);
}

has(boot,'<Login onReady=','login flow missing');
has(boot,'logoutFab','logout action missing');
has(boot,'centralBadge','central sync status missing');
has(index,'meta name="app-version"','app-version meta missing');

ok(!main.includes('onClick={()=>{}}'),"empty onClick handler found");
ok(!main.includes('href="#"'),"placeholder href found");
ok(!main.includes('registrationFee:vals.length>=3?vals[vals.length-3]:0'),"OCR still fabricates zero registration fees");
ok(!main.includes('tuitionFee:vals.length>=2?vals[vals.length-2]:0'),"OCR still fabricates zero tuition fees");
ok(!main.includes('String(db.payments.length+1).padStart'),"receipt numbers must not depend on array length");
ok(!main.includes('تبديل محلي للاختبار. الدخول الحقيقي يحتاج Auth مركزي.'),"production local account-switch warning still exposed");
ok(!/TODO|FIXME/.test(main+boot+central+store),"TODO/FIXME found in production source");

const jsxButtons=[...main.matchAll(/<button\b([^>]*)>/g)]
  .map(m=>m[1])
  .filter(a=>a.includes("className")||a.includes("onClick")||a.includes("type="));
for(const attrs of jsxButtons){
  const interactive=/onClick\s*=/.test(attrs)||/type="submit"/.test(attrs)||/disabled/.test(attrs);
  const delegated=/className="primary"/.test(attrs)&&main.includes('<div className="importDrop"');
  ok(interactive||delegated,"possibly inert JSX button: <button "+attrs.trim()+">");
}

const v=pkg.version;
has(index,'content="'+v+'"',"index app-version must match package version");
has(boot,"الإصدار "+v,"login footer version must match package version");
has(main,"Central v"+v,"sidebar version must match package version");

if(failures.length){
  console.error("QA audit failed:");
  failures.forEach((x,i)=>console.error(String(i+1)+". "+x));
  process.exit(1);
}
console.log("QA audit passed — modules, dialogs, buttons, central sync, import, editing, reports and version wiring are intact.");
