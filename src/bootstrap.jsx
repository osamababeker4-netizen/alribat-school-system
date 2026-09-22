import React,{useEffect,useState}from"react";
import{createRoot}from"react-dom/client";
import App from"./main.jsx";
import{blank,hydrateLocal}from"./store.js";
import{centralEnabled,centralLoad,getSession,signIn}from"./central.js";

function Login({onReady}){
 const[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const submit=async e=>{e.preventDefault();setBusy(true);setError("");try{await signIn(email.trim(),password);const data=await centralLoad(blank);hydrateLocal(data);onReady()}catch(err){setError(err.message||"تعذر تسجيل الدخول")}finally{setBusy(false)}};
 return <div className="loginPage"><div className="loginGlow"></div><div className="loginCard"><div className="loginBrand"><div className="loginLogo">ر</div><div><span>مدرسة الرباط</span><small>الأساسية المختلطة الخاصة — بورتسودان</small></div></div><div className="loginCopy"><span className="eyebrow">النظام المالي والإداري المركزي</span><h1>تسجيل الدخول</h1><p>دخول آمن إلى بيانات المدرسة المركزية والصلاحيات المعتمدة.</p></div><form onSubmit={submit} className="loginForm"><label><span>البريد الإلكتروني</span><input dir="ltr" type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com"/></label><label><span>كلمة المرور</span><input dir="ltr" type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••"/></label>{error&&<div className="loginError">{error}</div>}<button className="primary loginButton" disabled={busy}>{busy?"جارٍ التحقق...":"دخول آمن"}</button></form><div className="loginFoot"><span>🔒 اتصال مشفر</span><span>قاعدة بيانات مركزية</span><span>صلاحيات حسب الدور</span></div></div></div>
}
function Boot(){
 const[ready,setReady]=useState(!centralEnabled),[checking,setChecking]=useState(centralEnabled);
 useEffect(()=>{if(!centralEnabled)return;let live=true;(async()=>{try{const s=await getSession();if(s){const data=await centralLoad(blank);hydrateLocal(data);if(live)setReady(true)}}catch(e){console.error(e)}finally{if(live)setChecking(false)}})();return()=>{live=false}},[]);
 if(!centralEnabled)return <App/>;
 if(checking)return <div className="bootScreen"><div className="spinner"></div><b>جارٍ الاتصال بقاعدة المدرسة...</b></div>;
 if(!ready)return <Login onReady={()=>setReady(true)}/>;
 return <App/>;
}
createRoot(document.getElementById("root")).render(<Boot/>);
