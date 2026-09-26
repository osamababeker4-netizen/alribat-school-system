import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import App from"./main.jsx";
import{blank,hydrateLocal}from"./store.js";
import{centralConfigError,centralEnabled,centralLoad,getSession,signIn,signOut,signUpAccount,subscribeCentralChanges}from"./central.js";

function Login({onReady}){
 const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[mode,setMode]=useState("login"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[info,setInfo]=useState("");
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");setInfo("");try{
   if(mode==="login"){await signIn(email.trim(),password);const data=await centralLoad(blank);hydrateLocal(data);onReady();return}
   if(password.length<8)throw new Error("كلمة المرور يجب ألا تقل عن 8 أحرف");
   const data=await signUpAccount(email,password,name);
   if(data.session){const state=await centralLoad(blank);hydrateLocal(state);onReady()}
   else{setInfo("تم إنشاء الحساب. إذا طلب Supabase تأكيد البريد، افتح رسالة التفعيل ثم عد لتسجيل الدخول.");setMode("login")}
 }catch(err){const msg=String(err?.message||"");setError(msg.includes("Email not confirmed")?"البريد الإلكتروني غير مؤكد":msg.includes("Invalid login credentials")?"البريد الإلكتروني أو كلمة المرور غير صحيحة":msg||"تعذر إكمال العملية")}finally{setBusy(false)}};
 return <div className="loginPage"><div className="loginGlow"></div><div className="loginCard"><div className="loginBrand"><div className="loginLogo"><img src="./alribat-seal.svg" alt="شعار مدرسة الرباط"/></div><div><span>مدرسة الرباط</span><small>الأساسية المختلطة الخاصة — بورتسودان</small></div></div><div className="loginCopy"><span className="eyebrow">النظام المالي والإداري المركزي</span><h1>{mode==="login"?"تسجيل الدخول":"إنشاء الحساب"}</h1><p>{mode==="login"?"دخول آمن إلى بيانات المدرسة المركزية والصلاحيات المعتمدة.":"يعمل التسجيل فقط للبريد الذي أرسل له مدير النظام أو مدير المدرسة دعوة."}</p></div><form onSubmit={submit} className="loginForm">{mode==="register"&&<label><span>الاسم الكامل</span><input required value={name} onChange={e=>setName(e.target.value)} placeholder="الاسم الكامل"/></label>}<label><span>{mode==="login"?"البريد الإلكتروني أو رقم الجوال":"البريد الإلكتروني"}</span><input dir="ltr" type={mode==="login"?"text":"email"} autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder={mode==="login"?"email@example.com أو 249XXXXXXXXX":"name@example.com"}/></label><label><span>كلمة المرور</span><input dir="ltr" type="password" autoComplete={mode==="login"?"current-password":"new-password"} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••"/></label>{error&&<div className="loginError">{error}</div>}{info&&<div className="loginInfo">{info}</div>}<button className="primary loginButton" disabled={busy}>{busy?"جارٍ التحقق...":mode==="login"?"دخول آمن":"إنشاء الحساب"}</button></form><button className="switchAuth" onClick={()=>{setMode(mode==="login"?"register":"login");setError("");setInfo("")}}>{mode==="login"?"التسجيل عبر دعوة":"لدي حساب بالفعل"}</button><div className="loginFoot"><span>🔒 اتصال مشفر</span><span>قاعدة بيانات مركزية</span><span>صلاحيات حسب الدور</span></div></div></div>
}
function Boot(){
 const[ready,setReady]=useState(!centralEnabled),[checking,setChecking]=useState(centralEnabled),[syncState,setSyncState]=useState("ok"),[bootError,setBootError]=useState("");
 useEffect(()=>{if(!centralEnabled)return;let live=true;(async()=>{try{const s=await getSession();if(s){const data=await centralLoad(blank);hydrateLocal(data);if(live)setReady(true)}}catch(e){console.error(e);setBootError("تعذر استعادة الجلسة السابقة. سجّل الدخول من جديد.");try{await signOut()}catch{}}finally{if(live)setChecking(false)}})();return()=>{live=false}},[]);
 useEffect(()=>{if(!centralEnabled||!ready)return;const stop=subscribeCentralChanges(async()=>{try{setSyncState("sync");const data=await centralLoad(blank);hydrateLocal(data);window.location.reload()}catch(e){console.error(e);setSyncState("error")}});return stop},[ready]);
 useEffect(()=>{const ok=()=>setSyncState("ok");const pending=()=>setSyncState("sync");const err=e=>{setSyncState("error");const msg=e?.detail||"تعذر الحفظ المركزي";if(String(msg).includes("DATA_CONFLICT"))alert("تم تعديل نفس البيانات من جهاز آخر. أعد تحميل الصفحة ثم كرر التعديل.");};window.addEventListener("alribat-sync-ok",ok);window.addEventListener("alribat-sync-pending",pending);window.addEventListener("alribat-sync-error",err);return()=>{window.removeEventListener("alribat-sync-ok",ok);window.removeEventListener("alribat-sync-pending",pending);window.removeEventListener("alribat-sync-error",err)}},[]);
 if(!centralEnabled){
   if(import.meta.env.PROD)return <div className="bootScreen"><b>تعذر تشغيل النظام بأمان</b><small>{centralConfigError}</small></div>;
   return <App/>;
 }
 if(checking)return <div className="bootScreen"><div className="spinner"></div><b>جارٍ الاتصال بقاعدة المدرسة...</b></div>;
 if(!ready)return <><Login onReady={()=>{setBootError("");setReady(true)}}/>{bootError&&<div className="centralBadge error">● {bootError}</div>}</>;
 const logout=async()=>{await signOut();hydrateLocal(blank);setReady(false)};
 return <><App/><div className={"centralBadge "+syncState}>{syncState==="error"?"● تعذر الحفظ المركزي":syncState==="sync"?"● جارٍ المزامنة":"● متصل بالقاعدة المركزية"}</div><button className="logoutFab" onClick={logout}>تسجيل الخروج</button></>;
}
createRoot(document.getElementById("root")).render(<Boot/>);
