const K="alribat-school-system-v1";
export const blank={version:1,school:{name:"مدرسة الرباط",currency:"جنيه سوداني",academicYear:"2026/2027"},students:[],fees:[],payments:[],expenses:[],staff:[],attendance:[],inventory:[],moves:[],requests:[],users:[{id:"u-admin",name:"مدير النظام",email:"admin@alribat.local",role:"مدير النظام",active:true}],audit:[],notifications:[]};
const copy=x=>JSON.parse(JSON.stringify(x));
export const id=(p="id")=>p+"-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
export function load(){try{const x=JSON.parse(localStorage.getItem(K));return x?{...copy(blank),...x,school:{...blank.school,...(x.school||{})}}:copy(blank)}catch{return copy(blank)}}
export const save=x=>localStorage.setItem(K,JSON.stringify(x));
export const clear=()=>{localStorage.removeItem(K);return copy(blank)};
export const total=(a,k="amount")=>a.reduce((n,x)=>n+Number(x[k]||0),0);
export const paid=(db,fid)=>total(db.payments.filter(x=>x.feeId===fid));
export const balance=(db,f)=>Math.max(0,Number(f.amount||0)-paid(db,f.id));
export const fstatus=(db,f)=>paid(db,f.id)<=0?"غير مدفوع":balance(db,f)<=0?"مدفوع":"مدفوع جزئياً";
export const money=v=>new Intl.NumberFormat("ar-SD",{maximumFractionDigits:2}).format(Number(v||0));
export const audit=(action,module,description,user)=>({id:id("audit"),at:new Date().toISOString(),action,module,description,user});
export function csv(name,rows){if(!rows.length){alert("لا توجد بيانات للتصدير");return}const ks=[...new Set(rows.flatMap(x=>Object.keys(x)))];const q=v=>"\""+String(v??"").replaceAll("\"","\"\"")+"\"";const text="\ufeff"+[ks.map(q).join(","),...rows.map(r=>ks.map(k=>q(r[k])).join(","))].join("\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();URL.revokeObjectURL(a.href)}
export function backup(db){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:"application/json"}));a.download="alribat-backup-"+new Date().toISOString().slice(0,10)+".json";a.click();URL.revokeObjectURL(a.href)}
export async function restore(file){const x=JSON.parse(await file.text());if(!x||!Array.isArray(x.students)||!Array.isArray(x.fees))throw new Error("ملف غير صالح");return {...copy(blank),...x,school:{...blank.school,...(x.school||{})}}}