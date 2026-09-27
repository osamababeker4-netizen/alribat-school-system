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
has(main,'setRows(r=>r.filter(x=>!savedIds.has(x._id)','OCR review rows must remain open after partial save');
has(main,'const openNotes=()=>','notification bell must mark/read via one controlled action');
has(main,'className="backNav"','back navigation must be wired');
has(main,'x.authId!==db.central?.userId','current authenticated account must not be disabled from UI');

for(const fn of ["inviteSchoolUser","setSchoolUserActive","updateMyPhone","subscribeCentralChanges","queueCentralSave"]){
  has(central,"export "+(fn==="queueCentralSave"?"function ":"async function ")+fn, "central function missing: "+fn);
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
