import { createClient } from "@supabase/supabase-js";

const url=import.meta.env.VITE_SUPABASE_URL;
const anon=import.meta.env.VITE_SUPABASE_ANON_KEY;
export const centralEnabled=Boolean(url&&anon);
export const supabase=centralEnabled?createClient(url,anon,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null;

let profileCache=null;
let pendingState=null;
let saveTimer=null;

const WRITE={
  "مدير النظام":["school","students","fees","payments","expenses","staff","attendance","inventory","moves","requests","audit","notifications"],
  "مدير المدرسة":["school","students","fees","payments","expenses","staff","attendance","inventory","moves","requests","audit","notifications"],
  "محاسب":["students","fees","payments","expenses","audit","notifications"],
  "أمين المستودع":["inventory","moves","requests","audit","notifications"],
  "مشرف/معلم":["students","attendance","requests","audit","notifications"]
};

export async function getSession(){
  if(!centralEnabled)return null;
  const {data,error}=await supabase.auth.getSession();
  if(error)throw error;
  return data.session;
}
export async function signIn(email,password){
  const {data,error}=await supabase.auth.signInWithPassword({email,password});
  if(error)throw error;
  return data.session;
}
export async function signUpAccount(email,password,full_name){
  const {data,error}=await supabase.auth.signUp({
    email:String(email).trim().toLowerCase(),
    password,
    options:{data:{full_name:full_name||"مستخدم مدرسة الرباط"}}
  });
  if(error)throw error;
  return data;
}
export async function inviteSchoolUser(email,full_name,role){
  const {data,error}=await supabase.rpc("invite_school_user",{
    p_email:String(email).trim().toLowerCase(),
    p_full_name:full_name,
    p_role:role
  });
  if(error)throw error;
  return data;
}
export async function signOut(){
  if(!centralEnabled)return;
  const {error}=await supabase.auth.signOut();
  if(error)throw error;
}
export async function getProfile(){
  const session=await getSession();
  if(!session)return null;
  const {data,error}=await supabase.from("profiles").select("user_id,full_name,role,active,must_change_password").eq("user_id",session.user.id).single();
  if(error)throw error;
  if(!data?.active)throw new Error("هذا الحساب موقوف");
  profileCache={...data,email:session.user.email};
  return profileCache;
}
export async function centralLoad(blank){
  if(!centralEnabled)return null;
  const profile=await getProfile();
  if(!profile)return null;
  const {data:mods,error}=await supabase.from("school_modules").select("module,data");
  if(error)throw error;
  const next=JSON.parse(JSON.stringify(blank));
  for(const row of mods||[]) next[row.module]=row.data;
  let users=[{id:"u-admin",authId:profile.user_id,name:profile.full_name,email:profile.email,role:profile.role,active:profile.active}];
  if(["مدير النظام","مدير المدرسة"].includes(profile.role)){
    const {data:profiles,error:pe}=await supabase.from("profiles").select("user_id,full_name,role,active");
    if(!pe&&profiles?.length) users=profiles.map((p,idx)=>({id:p.user_id===profile.user_id?"u-admin":"auth-"+idx,authId:p.user_id,name:p.full_name,email:p.user_id===profile.user_id?profile.email:"",role:p.role,active:p.active}));
  }
  next.users=users;
  next.central={enabled:true,userId:profile.user_id,role:profile.role,syncedAt:new Date().toISOString()};
  return next;
}
async function flushSave(){
  saveTimer=null;
  const state=pendingState;
  pendingState=null;
  if(!centralEnabled||!state||!profileCache)return;
  const keys=WRITE[profileCache.role]||[];
  if(!keys.length)return;
  const rows=keys.filter(k=>Object.prototype.hasOwnProperty.call(state,k)).map(module=>({module,data:state[module],updated_by:profileCache.user_id,updated_at:new Date().toISOString()}));
  if(!rows.length)return;
  const {error}=await supabase.from("school_modules").upsert(rows,{onConflict:"module"});
  if(error){
    console.error("Central sync failed",error);
    window.dispatchEvent(new CustomEvent("alribat-sync-error",{detail:error.message}));
  }else{
    window.dispatchEvent(new CustomEvent("alribat-sync-ok"));
  }
}
export function queueCentralSave(state){
  if(!centralEnabled||!profileCache)return;
  pendingState=JSON.parse(JSON.stringify(state));
  clearTimeout(saveTimer);
  saveTimer=setTimeout(flushSave,700);
}
export function currentProfile(){return profileCache;}
