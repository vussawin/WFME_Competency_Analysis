import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area } from "recharts";
import _ from "lodash";

// ═══════════════════════════════════════════════════════════════
//  🔧 CONFIG — ใส่ URL จาก Google Apps Script ที่ Deploy แล้ว
// ═══════════════════════════════════════════════════════════════
const API_URL = "https://script.google.com/macros/s/AKfycbzh9J907XEK3iR3uAPtThwqQr9BaMhjWd2cqec1ieo_6kgC8Q3NOsWQpN-F7bpZ4HE8fg/exec";
// ตัวอย่าง: "https://script.google.com/macros/s/AKfycbx.../exec"

// ═══════════════════════════════════════════════════════════════
//  API Helper — เชื่อมต่อ Google Sheets ผ่าน Apps Script
// ═══════════════════════════════════════════════════════════════
const api = {
  async call(action, body = {}) {
    try {
      const res = await fetch(`${API_URL}?action=${action}`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" }, // Apps Script ต้องการ text/plain สำหรับ CORS
        body: JSON.stringify(body),
      });
      return await res.json();
    } catch (err) {
      console.error("API Error:", err);
      return { success: false, error: "ไม่สามารถเชื่อมต่อ Server ได้ กรุณาตรวจสอบ API_URL" };
    }
  },
  login: (email, password) => api.call("login", { email, password }),
  register: (data) => api.call("register", data),
  resetPassword: (email) => api.call("reset_password", { email }),
  changePassword: (email, pw) => api.call("change_password", { email, new_password: pw }),
  getAllData: () => api.call("get_all_data"),
  savePLO: (ploData, email) => api.call("save_plo", { ploData, user_email: email }),
  saveNL: (nlData, email) => api.call("save_nl", { nlData, user_email: email }),
  saveCourse: (courseData, email) => api.call("save_course", { courseData, user_email: email }),
  saveTrend: (trendData, email) => api.call("save_trend", { trendData, user_email: email }),
  ping: () => api.call("ping"),
};

// ═══════════════════════════════════════════════════════════════
//  THEME
// ═══════════════════════════════════════════════════════════════
const C = {
  bg:"#06080F", surface:"#0D1117", surfaceAlt:"#161B22", surfaceHover:"#1C2333",
  border:"#21262D", borderLight:"#30363D",
  primary:"#58A6FF", primaryDark:"#1F6FEB", primaryGlow:"rgba(88,166,255,0.15)",
  accent:"#3FB950", accentDark:"#238636", warn:"#D29922", danger:"#F85149",
  text:"#E6EDF3", textMuted:"#8B949E", textDim:"#484F58",
  gold:"#F0C000", teal:"#39D2C0", purple:"#BC8CFF", rose:"#FF7EB6",
  glass:"rgba(13,17,23,0.85)",
};
const PLO_LABELS=["คุณธรรม จริยธรรม","ความรู้ทางการแพทย์","ทักษะการวิเคราะห์","การสื่อสาร","การทำงานร่วมกัน","การเรียนรู้ตลอดชีวิต","การทำงานในชุมชน"];
const YEAR_LABELS=["ปี 1","ปี 2","ปี 3","ปี 4","ปี 5","ปี 6"];
const WFME_DOMAINS=["Medical Knowledge","Clinical Skills","Professional Values","Communication","Population Health","Critical Thinking","Lifelong Learning","Interprofessional"];
const ROLES={ CHAIR:{label:"ประธานหลักสูตร",color:C.gold,icon:"👑"}, FACULTY:{label:"อาจารย์ผู้สอน",color:C.primary,icon:"🎓"}, QA:{label:"ฝ่ายประกันคุณภาพ",color:C.teal,icon:"📋"}, ADMIN:{label:"ผู้ดูแลระบบ",color:C.purple,icon:"⚙️"} };

const GlobalStyles = () => <style>{`
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Outfit:wght@300;400;500;600;700;800&display=swap');
  *{box-sizing:border-box;margin:0;padding:0} body{background:${C.bg}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
  @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
  @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}
  @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
  @keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
  input:-webkit-autofill{-webkit-box-shadow:0 0 0 30px ${C.surfaceAlt} inset!important;-webkit-text-fill-color:${C.text}!important}
  ::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:${C.borderLight};border-radius:3px}
`}</style>;

// ═══════════════════════════════════════════════════════════════
//  LOADING / TOAST / CONNECTION STATUS
// ═══════════════════════════════════════════════════════════════
function Toast({ message, type = "success", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  const bg = type === "success" ? C.accent : type === "error" ? C.danger : C.warn;
  return (
    <div style={{ position:"fixed", top:20, right:20, zIndex:9999, padding:"14px 20px", borderRadius:14, background:`${bg}22`, border:`1px solid ${bg}55`, color:bg, fontSize:13, fontWeight:600, animation:"fadeIn .3s", backdropFilter:"blur(12px)", maxWidth:360, display:"flex", alignItems:"center", gap:10, boxShadow:`0 8px 32px rgba(0,0,0,.3)` }}>
      <span>{type==="success"?"✅":type==="error"?"❌":"⚠️"}</span>{message}
    </div>
  );
}

function ConnectionBadge({ connected, checking }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:6, padding:"4px 12px", borderRadius:20, background: connected ? `${C.accent}15` : checking ? `${C.warn}15` : `${C.danger}15`, border:`1px solid ${connected ? C.accent : checking ? C.warn : C.danger}33`, fontSize:11, fontWeight:600, color: connected ? C.accent : checking ? C.warn : C.danger }}>
      <span style={{ width:7, height:7, borderRadius:"50%", background: connected ? C.accent : checking ? C.warn : C.danger, animation: checking ? "pulse 1s infinite" : "none" }} />
      {checking ? "กำลังเชื่อมต่อ..." : connected ? "Google Sheets ✓" : "ออฟไลน์"}
    </div>
  );
}

function Spinner({ size = 20, color = C.primary }) {
  return <span style={{ display:"inline-block", width:size, height:size, border:`2.5px solid ${color}33`, borderTop:`2.5px solid ${color}`, borderRadius:"50%", animation:"spin .7s linear infinite" }} />;
}

// ═══════════════════════════════════════════════════════════════
//  AUTH SYSTEM (เชื่อม Google Sheets)
// ═══════════════════════════════════════════════════════════════
function AuthSystem({ onLogin, connected }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("FACULTY");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [otp, setOtp] = useState(["","","","","",""]);
  const [realOtp, setRealOtp] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const otpRefs = useRef([]);

  const clear = () => { setEmail(""); setPassword(""); setConfirmPw(""); setName(""); setError(""); setSuccess(""); };

  const handleLogin = async () => {
    setError(""); if (!email || !password) return setError("กรุณากรอก Email และ Password");
    setLoading(true);
    if (!connected || API_URL.includes("YOUR_")) {
      // Offline fallback
      const offlineUsers = [
        { email:"chair@med.edu", password:"chair123", id:"u1", name:"รศ.นพ.สมชาย รักษาดี", role:"CHAIR", avatar:"👑" },
        { email:"faculty@med.edu", password:"faculty123", id:"u2", name:"ผศ.พญ.วิภา สุขใจ", role:"FACULTY", avatar:"🎓" },
        { email:"qa@med.edu", password:"qa1234", id:"u3", name:"นางสาวพรรณี ดีงาม", role:"QA", avatar:"📋" },
        { email:"admin@med.edu", password:"admin123", id:"u4", name:"System Administrator", role:"ADMIN", avatar:"⚙️" },
      ];
      const u = offlineUsers.find(u => u.email === email.trim() && u.password === password);
      setLoading(false);
      if (u) onLogin({ id:u.id, email:u.email, name:u.name, role:u.role, avatar:u.avatar });
      else setError("Email หรือ Password ไม่ถูกต้อง");
      return;
    }
    const res = await api.login(email.trim(), password);
    setLoading(false);
    if (res.success) onLogin(res.user);
    else setError(res.error || "เข้าสู่ระบบไม่สำเร็จ");
  };

  const handleRegister = async () => {
    setError("");
    if (!name.trim()) return setError("กรุณากรอกชื่อ");
    if (!email.includes("@")) return setError("Email ไม่ถูกต้อง");
    if (password.length < 6) return setError("รหัสผ่าน 6 ตัวขึ้นไป");
    if (password !== confirmPw) return setError("รหัสผ่านไม่ตรงกัน");
    setLoading(true);
    const res = await api.register({ email:email.trim(), password, name:name.trim(), role });
    setLoading(false);
    if (res.success) { setSuccess("ลงทะเบียนสำเร็จ!"); setTimeout(() => { clear(); setMode("login"); }, 1500); }
    else setError(res.error);
  };

  const handleForgot = async () => {
    setError("");
    if (!email.includes("@")) return setError("Email ไม่ถูกต้อง");
    setLoading(true);
    const res = await api.resetPassword(email.trim());
    setLoading(false);
    if (res.success) { setRealOtp(res.otp); setResetEmail(email.trim()); setSuccess(`OTP: ${res.otp} (Demo)`); setMode("otp"); }
    else setError(res.error);
  };

  const handleOtpVerify = async () => {
    const entered = otp.join("");
    if (entered !== realOtp) return setError("OTP ไม่ถูกต้อง");
    setLoading(true);
    await api.changePassword(resetEmail, "reset123");
    setLoading(false);
    setSuccess("รีเซ็ตสำเร็จ! รหัสใหม่: reset123");
    setTimeout(() => { clear(); setMode("login"); }, 2000);
  };

  const I = { width:"100%", padding:"14px 16px", paddingLeft:44, borderRadius:12, border:`1.5px solid ${C.border}`, background:C.surfaceAlt, color:C.text, fontSize:14, outline:"none", transition:"all .25s", fontFamily:"'IBM Plex Sans Thai', sans-serif" };
  const Btn = { width:"100%", padding:"14px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${C.primaryDark},${C.primary})`, color:"#fff", fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:`0 4px 24px ${C.primaryGlow}` };

  const demoUsers = [
    { emoji:"👑", label:"ประธาน", email:"chair@med.edu", pw:"chair123" },
    { emoji:"🎓", label:"อาจารย์", email:"faculty@med.edu", pw:"faculty123" },
    { emoji:"📋", label:"QA", email:"qa@med.edu", pw:"qa1234" },
    { emoji:"⚙️", label:"Admin", email:"admin@med.edu", pw:"admin123" },
  ];

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:C.bg, position:"relative", overflow:"hidden", fontFamily:"'IBM Plex Sans Thai','Outfit',sans-serif" }}>
      <div style={{ position:"absolute", inset:0, backgroundImage:`linear-gradient(${C.border}22 1px,transparent 1px),linear-gradient(90deg,${C.border}22 1px,transparent 1px)`, backgroundSize:"60px 60px", pointerEvents:"none" }} />
      <div style={{ position:"absolute", top:"-20%", left:"-10%", width:"50%", height:"50%", background:`radial-gradient(circle,${C.primaryDark}15,transparent 70%)`, pointerEvents:"none" }} />

      <div style={{ width:"100%", maxWidth:440, margin:20, borderRadius:24, background:C.glass, backdropFilter:"blur(20px)", border:`1px solid ${C.border}`, boxShadow:`0 24px 80px rgba(0,0,0,.5)`, animation:"slideUp .6s ease-out", position:"relative", zIndex:10 }}>
        <div style={{ height:3, borderRadius:"24px 24px 0 0", background:`linear-gradient(90deg,${C.primaryDark},${C.primary},${C.teal})`, backgroundSize:"200% 100%", animation:"gradientShift 4s ease infinite" }} />
        <div style={{ padding:"36px 32px 32px" }}>
          <div style={{ textAlign:"center", marginBottom:28 }}>
            <div style={{ width:56, height:56, borderRadius:16, background:`linear-gradient(135deg,${C.primaryDark},${C.teal})`, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:28, marginBottom:12, boxShadow:`0 8px 32px ${C.primaryGlow}` }}>🏥</div>
            <h1 style={{ fontSize:22, fontWeight:800, color:C.text, fontFamily:"'Outfit',sans-serif" }}>
              {mode==="login"?"เข้าสู่ระบบ":mode==="register"?"ลงทะเบียน":mode==="forgot"?"ลืมรหัสผ่าน":"ยืนยัน OTP"}
            </h1>
            <p style={{ fontSize:13, color:C.textMuted, marginTop:6 }}>WFME Competency Analysis System</p>
            <div style={{ marginTop:8 }}><ConnectionBadge connected={connected} /></div>
          </div>

          {error && <div style={{ padding:"12px 16px", borderRadius:12, background:`${C.danger}15`, border:`1px solid ${C.danger}33`, color:C.danger, fontSize:13, marginBottom:16, animation:"fadeIn .3s", display:"flex", alignItems:"center", gap:8 }}>⚠️ {error}</div>}
          {success && <div style={{ padding:"12px 16px", borderRadius:12, background:`${C.accent}15`, border:`1px solid ${C.accent}33`, color:C.accent, fontSize:13, marginBottom:16, animation:"fadeIn .3s", display:"flex", alignItems:"center", gap:8 }}>✅ {success}</div>}

          {mode === "login" && (
            <div onKeyDown={e => e.key==="Enter" && handleLogin()} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>✉️</span><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={I} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border} /></div>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>🔒</span><input type={showPw?"text":"password"} placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{...I,paddingRight:44}} onFocus={e=>e.target.style.borderColor=C.primary} onBlur={e=>e.target.style.borderColor=C.border} /><button onClick={()=>setShowPw(!showPw)} style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:16, opacity:.5 }}>{showPw?"🙈":"👁️"}</button></div>
              <div style={{ textAlign:"right" }}><button onClick={()=>{clear();setMode("forgot")}} style={{ background:"none", border:"none", color:C.primary, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>ลืมรหัสผ่าน?</button></div>
              <button onClick={handleLogin} disabled={loading} style={{...Btn, opacity:loading?.7:1}}>{loading ? <span style={{ display:"inline-flex", alignItems:"center", gap:8 }}><Spinner size={16} color="#fff" /> กำลังตรวจสอบ...</span> : "เข้าสู่ระบบ →"}</button>
              <div style={{ textAlign:"center", fontSize:13, color:C.textMuted }}>ยังไม่มีบัญชี? <button onClick={()=>{clear();setMode("register")}} style={{ background:"none", border:"none", color:C.primary, fontSize:13, cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>ลงทะเบียน</button></div>
              <div style={{ marginTop:8, padding:16, borderRadius:12, background:C.surfaceAlt, border:`1px solid ${C.border}` }}>
                <div style={{ fontSize:11, color:C.textDim, textTransform:"uppercase", letterSpacing:1, marginBottom:10, fontWeight:600 }}>🔑 บัญชีทดสอบ</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {demoUsers.map(u => <button key={u.email} onClick={()=>{setEmail(u.email);setPassword(u.pw)}} style={{ padding:"8px 10px", borderRadius:8, border:`1px solid ${C.border}`, background:"transparent", color:C.textMuted, cursor:"pointer", fontSize:11, textAlign:"left", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6, transition:"all .2s" }} onMouseEnter={e=>e.currentTarget.style.background=C.surfaceHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><span>{u.emoji}</span><span style={{fontSize:10}}>{u.label}</span></button>)}
                </div>
              </div>
            </div>
          )}

          {mode === "register" && (
            <div onKeyDown={e=>e.key==="Enter"&&handleRegister()} style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>👤</span><input placeholder="ชื่อ-สกุล" value={name} onChange={e=>setName(e.target.value)} style={I} /></div>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>✉️</span><input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={I} /></div>
              <div><div style={{ fontSize:12, color:C.textMuted, marginBottom:8 }}>บทบาท</div><div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>{Object.entries(ROLES).filter(([k])=>k!=="ADMIN").map(([k,v])=><button key={k} onClick={()=>setRole(k)} style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer", fontSize:12, fontFamily:"inherit", border:`1.5px solid ${role===k?v.color:C.border}`, background:role===k?`${v.color}15`:"transparent", color:role===k?v.color:C.textMuted, display:"flex", alignItems:"center", gap:8 }}><span style={{fontSize:16}}>{v.icon}</span>{v.label}</button>)}</div></div>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>🔒</span><input type="password" placeholder="รหัสผ่าน (6 ตัวขึ้นไป)" value={password} onChange={e=>setPassword(e.target.value)} style={I} /></div>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>🔒</span><input type="password" placeholder="ยืนยันรหัสผ่าน" value={confirmPw} onChange={e=>setConfirmPw(e.target.value)} style={I} /></div>
              <button onClick={handleRegister} disabled={loading} style={{...Btn, background:`linear-gradient(135deg,${C.accentDark},${C.accent})`, opacity:loading?.7:1}}>{loading?<span style={{display:"inline-flex",alignItems:"center",gap:8}}><Spinner size={16} color="#fff"/>กำลังสร้าง...</span>:"ลงทะเบียน"}</button>
              <div style={{ textAlign:"center", fontSize:13, color:C.textMuted }}>มีบัญชีแล้ว? <button onClick={()=>{clear();setMode("login")}} style={{ background:"none", border:"none", color:C.primary, fontSize:13, cursor:"pointer", fontWeight:600, fontFamily:"inherit" }}>เข้าสู่ระบบ</button></div>
            </div>
          )}

          {mode === "forgot" && (
            <div onKeyDown={e=>e.key==="Enter"&&handleForgot()} style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ position:"relative" }}><span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, opacity:.5 }}>✉️</span><input placeholder="Email ที่ลงทะเบียน" value={email} onChange={e=>setEmail(e.target.value)} style={I} /></div>
              <button onClick={handleForgot} disabled={loading} style={{...Btn,background:`linear-gradient(135deg,${C.warn}cc,${C.warn})`}}>{loading?"กำลังส่ง...":"ส่ง OTP →"}</button>
              <div style={{textAlign:"center"}}><button onClick={()=>{clear();setMode("login")}} style={{background:"none",border:"none",color:C.primary,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← กลับ</button></div>
            </div>
          )}

          {mode === "otp" && (
            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              <div style={{ display:"flex", justifyContent:"center", gap:8 }}>{otp.map((d,i)=><input key={i} ref={el=>otpRefs.current[i]=el} type="text" inputMode="numeric" maxLength={1} value={d} onChange={e=>{const v=e.target.value.replace(/\D/,"");const n=[...otp];n[i]=v;setOtp(n);if(v&&i<5)otpRefs.current[i+1]?.focus()}} onKeyDown={e=>{if(e.key==="Backspace"&&!otp[i]&&i>0)otpRefs.current[i-1]?.focus()}} style={{width:48,height:56,textAlign:"center",fontSize:22,fontWeight:700,fontFamily:"'JetBrains Mono',monospace",borderRadius:12,border:`2px solid ${d?C.primary:C.border}`,background:C.surfaceAlt,color:C.text,outline:"none"}} />)}</div>
              <button onClick={handleOtpVerify} style={{...Btn,background:`linear-gradient(135deg,${C.accentDark},${C.accent})`}}>ยืนยัน OTP</button>
              <div style={{textAlign:"center"}}><button onClick={()=>{clear();setOtp(["","","","","",""]);setMode("login")}} style={{background:"none",border:"none",color:C.primary,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← กลับ</button></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
//  UI COMPONENTS
// ═══════════════════════════════════════════════════════════════
const Badge=({children,color=C.primary})=><span style={{background:color+"22",color,padding:"2px 10px",borderRadius:20,fontSize:11,fontWeight:600}}>{children}</span>;
const StatusDot=({value,t=80})=>{const c=value>=90?C.accent:value>=t?C.primary:value>=70?C.warn:C.danger;return<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",background:c,marginRight:6,boxShadow:`0 0 6px ${c}66`}}/>};
function KPICard({label,value,unit,trend,color=C.primary,icon}){const tc=trend>0?C.accent:trend<0?C.danger:C.textMuted;return<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",top:0,left:0,right:0,height:3,background:`linear-gradient(90deg,${color},${color}44)`}}/><div style={{fontSize:12,color:C.textMuted,textTransform:"uppercase",letterSpacing:1.2,marginBottom:8}}>{icon} {label}</div><div style={{fontSize:32,fontWeight:800,color:C.text,fontFamily:"'JetBrains Mono',monospace"}}>{value}<span style={{fontSize:14,color:C.textMuted,marginLeft:4}}>{unit}</span></div>{trend!==undefined&&<div style={{fontSize:12,color:tc,marginTop:6,fontWeight:600}}>{trend>0?"▲":trend<0?"▼":"●"} {Math.abs(trend)}% vs ปีก่อน</div>}</div>}
function SectionCard({title,subtitle,children,action}){return<div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:24,marginBottom:20}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:subtitle?4:16}}><h3 style={{color:C.text,fontSize:16,fontWeight:700,margin:0}}>{title}</h3>{action}</div>{subtitle&&<p style={{color:C.textDim,fontSize:12,margin:"0 0 16px 0"}}>{subtitle}</p>}{children}</div>}
function DataTable({columns,data,maxH=400}){return<div style={{overflowX:"auto",overflowY:"auto",maxHeight:maxH,borderRadius:12,border:`1px solid ${C.border}`}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{columns.map((c,i)=><th key={i} style={{position:"sticky",top:0,background:C.surfaceAlt,color:C.textMuted,padding:"10px 14px",textAlign:c.align||"left",borderBottom:`2px solid ${C.border}`,fontWeight:600,letterSpacing:.5,fontSize:11,textTransform:"uppercase",whiteSpace:"nowrap",zIndex:2}}>{c.label}</th>)}</tr></thead><tbody>{data.map((row,ri)=><tr key={ri} style={{background:ri%2===0?"transparent":C.surfaceAlt+"66"}}>{columns.map((c,ci)=><td key={ci} style={{padding:"9px 14px",borderBottom:`1px solid ${C.border}44`,color:C.text,textAlign:c.align||"left",whiteSpace:"nowrap"}}>{c.render?c.render(row[c.key],row):row[c.key]}</td>)}</tr>)}</tbody></table></div>}
function PLOHeatmap({data}){const gc=v=>v>=90?"#3FB950":v>=80?"#58A6FF":v>=70?"#D29922":"#F85149";return<div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"separate",borderSpacing:3,fontSize:12}}><thead><tr><th style={{padding:"8px 12px",color:C.textMuted,textAlign:"left",fontSize:11}}>PLO</th>{YEAR_LABELS.map(y=><th key={y} style={{padding:"8px 6px",color:C.textMuted,textAlign:"center",fontSize:11}}>{y}</th>)}<th style={{padding:"8px 6px",color:C.textMuted,textAlign:"center",fontSize:11}}>ผู้ใช้บัณฑิต</th></tr></thead><tbody>{data.map((r,i)=><tr key={i}><td style={{padding:"6px 12px",color:C.text,fontWeight:600,fontSize:11,whiteSpace:"nowrap"}}>{r.short}</td>{["y1","y2","y3","y4","y5","y6"].map(k=><td key={k} style={{padding:"8px 6px",textAlign:"center",background:gc(r[k])+"CC",color:"#fff",borderRadius:6,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{r[k]}%</td>)}<td style={{padding:"8px 6px",textAlign:"center",background:r.employer>=3.5?C.accent+"CC":C.warn+"CC",color:"#fff",borderRadius:6,fontWeight:700,fontFamily:"monospace",fontSize:12}}>{r.employer}/5</td></tr>)}</tbody></table></div>}

// ═══════════════════════════════════════════════════════════════
//  DATA INPUT PANEL (บันทึกลง Google Sheets)
// ═══════════════════════════════════════════════════════════════
function DataInputPanel({data,onUpdate,onClose,onSaveToSheets,saving}){
  const[tab,setTab]=useState("plo");const[ed,setEd]=useState(JSON.parse(JSON.stringify(data)));
  const handleSave=async()=>{onUpdate(ed);await onSaveToSheets(ed,tab);onClose()};
  const IS={background:C.surfaceAlt,border:`1px solid ${C.border}`,borderRadius:8,padding:"8px 12px",color:C.text,fontSize:13,width:"100%",outline:"none",fontFamily:"'JetBrains Mono',monospace"};
  const ts=a=>({padding:"8px 16px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:600,background:a?C.primary:"transparent",color:a?"#fff":C.textMuted,transition:"all .2s",fontFamily:"inherit"});
  return<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.7)",backdropFilter:"blur(8px)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}}>
    <div style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:20,width:"100%",maxWidth:900,maxHeight:"90vh",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{padding:"20px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div><h2 style={{color:C.text,margin:0,fontSize:18,fontWeight:700}}>📥 นำเข้าข้อมูล → Google Sheets</h2><p style={{color:C.textDim,margin:"4px 0 0",fontSize:12}}>แก้ไขแล้วกดบันทึก จะเขียนลง Google Sheets ทันที</p></div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={handleSave} disabled={saving} style={{padding:"8px 16px",borderRadius:8,border:"none",background:C.accent,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:600,fontFamily:"inherit",opacity:saving?.6:1}}>{saving?<span style={{display:"inline-flex",alignItems:"center",gap:6}}><Spinner size={14} color="#fff"/>บันทึก...</span>:"💾 บันทึกลง Sheets"}</button>
          <button onClick={onClose} style={{padding:"8px 16px",borderRadius:8,border:`1px solid ${C.border}`,background:"transparent",color:C.textMuted,cursor:"pointer",fontSize:12,fontFamily:"inherit"}}>✕</button>
        </div>
      </div>
      <div style={{padding:"12px 24px",borderBottom:`1px solid ${C.border}`,display:"flex",gap:4}}>{[{id:"plo",l:"PLO"},{id:"nl",l:"NL Exam"},{id:"course",l:"รายวิชา"},{id:"trend",l:"แนวโน้ม"}].map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={ts(tab===t.id)}>{t.l}</button>)}</div>
      <div style={{flex:1,overflow:"auto",padding:24}}>
        {tab==="plo"&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr><th style={{padding:"8px",color:C.textMuted,textAlign:"left",borderBottom:`1px solid ${C.border}`,fontSize:11}}>PLO</th>{YEAR_LABELS.map(y=><th key={y} style={{padding:"8px",color:C.textMuted,textAlign:"center",borderBottom:`1px solid ${C.border}`,fontSize:11}}>{y}</th>)}<th style={{padding:"8px",color:C.textMuted,textAlign:"center",borderBottom:`1px solid ${C.border}`,fontSize:11}}>ผู้ใช้บัณฑิต</th></tr></thead><tbody>{ed.ploAchievement.map((r,ri)=><tr key={ri}><td style={{padding:"6px 12px",color:C.text,fontSize:12}}>{r.short}</td>{["y1","y2","y3","y4","y5","y6"].map(k=><td key={k} style={{padding:4}}><input type="number" value={r[k]} onChange={e=>{const d={...ed};d.ploAchievement[ri][k]=+e.target.value;setEd(d)}} style={{...IS,width:60,textAlign:"center",padding:"6px 4px"}}/></td>)}<td style={{padding:4}}><input type="number" step="0.1" value={r.employer} onChange={e=>{const d={...ed};d.ploAchievement[ri].employer=+e.target.value;setEd(d)}} style={{...IS,width:60,textAlign:"center",padding:"6px 4px"}}/></td></tr>)}</tbody></table>}
        {tab==="nl"&&ed.nlData.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:12,marginBottom:12,padding:16,background:C.surfaceAlt,borderRadius:12}}><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>การสอบ</div><div style={{color:C.text,fontWeight:600}}>{r.name}</div></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>ผ่าน %</div><input type="number" value={r.passRate} onChange={e=>{const d={...ed};d.nlData[i].passRate=+e.target.value;setEd(d)}} style={IS}/></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>เฉลี่ย</div><input type="number" value={r.mean} onChange={e=>{const d={...ed};d.nlData[i].mean=+e.target.value;setEd(d)}} style={IS}/></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>ประเทศ</div><input type="number" value={r.national} onChange={e=>{const d={...ed};d.nlData[i].national=+e.target.value;setEd(d)}} style={IS}/></div></div>)}
        {tab==="course"&&<table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr>{["วิชา","CLO%","α","p","D","Pass%"].map(h=><th key={h} style={{padding:"8px",color:C.textMuted,textAlign:"center",borderBottom:`1px solid ${C.border}`,fontSize:11}}>{h}</th>)}</tr></thead><tbody>{ed.courseData.map((r,ri)=><tr key={ri}>{["name","cloAchieve","reliability","difficulty","discrimination","passRate"].map(k=><td key={k} style={{padding:4}}><input value={r[k]} onChange={e=>{const d={...ed};d.courseData[ri][k]=k==="name"?e.target.value:+e.target.value;setEd(d)}} style={{...IS,textAlign:"center",padding:"6px 4px"}}/></td>)}</tr>)}</tbody></table>}
        {tab==="trend"&&ed.trendData.map((r,i)=><div key={i} style={{display:"grid",gridTemplateColumns:".8fr 1fr 1fr 1fr 1fr",gap:12,marginBottom:12,padding:16,background:C.surfaceAlt,borderRadius:12}}><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>ปี</div><div style={{color:C.text,fontWeight:600}}>{r.year}</div></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>สำเร็จ%</div><input type="number" value={r.graduation} onChange={e=>{const d={...ed};d.trendData[i].graduation=+e.target.value;setEd(d)}} style={IS}/></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>NL%</div><input type="number" value={r.nlPass} onChange={e=>{const d={...ed};d.trendData[i].nlPass=+e.target.value;setEd(d)}} style={IS}/></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>ผู้ใช้บัณฑิต</div><input type="number" value={r.employer} onChange={e=>{const d={...ed};d.trendData[i].employer=+e.target.value;setEd(d)}} style={IS}/></div><div><div style={{color:C.textMuted,fontSize:11,marginBottom:4}}>Retention</div><input type="number" value={r.retention} onChange={e=>{const d={...ed};d.trendData[i].retention=+e.target.value;setEd(d)}} style={IS}/></div></div>)}
      </div>
    </div>
  </div>;
}

// ═══════════════════════════════════════════════════════════════
//  ANALYSIS ENGINE
// ═══════════════════════════════════════════════════════════════
function runAnalysis(data){const{ploAchievement,nlData,courseData}=data;const findings=[];const actions=[];
ploAchievement.forEach(p=>{const avg=(p.y1+p.y2+p.y3+p.y4+p.y5+p.y6)/6;if(avg<70){findings.push({level:"วิกฤต",area:p.short,detail:`${p.name}: ${avg.toFixed(1)}% ต่ำกว่าเกณฑ์`,color:C.danger});actions.push({priority:"เร่งด่วน",action:`ทบทวน ${p.short} ทั้งหมด`})}else if(avg<80){findings.push({level:"ต้องปรับปรุง",area:p.short,detail:`${p.name}: ${avg.toFixed(1)}% ต่ำกว่าเป้า`,color:C.warn});actions.push({priority:"สำคัญ",action:`Root Cause ${p.short}`})}if(p.employer<3.5)findings.push({level:"ต้องปรับปรุง",area:p.short,detail:`ผู้ใช้บัณฑิต ${p.employer}/5`,color:C.warn})});
nlData.forEach(n=>{if(n.passRate<n.national)findings.push({level:"ต้องปรับปรุง",area:n.name,detail:`ผ่าน ${n.passRate}% < ประเทศ ${n.national}%`,color:C.warn})});
courseData.forEach(c=>{if(c.reliability<0.7){findings.push({level:"คุณภาพ",area:c.name,detail:`α=${c.reliability} < 0.70`,color:C.warn});actions.push({priority:"สำคัญ",action:`ปรับปรุงข้อสอบ ${c.name}`})}});
const avg=_.mean(ploAchievement.map(p=>(p.y1+p.y2+p.y3+p.y4+p.y5+p.y6)/6));
return{findings:_.sortBy(findings,f=>f.level==="วิกฤต"?0:1),actions,overallScore:avg,status:avg>=90?"ดีเยี่ยม":avg>=80?"ดี":avg>=70?"ต้องปรับปรุง":"วิกฤต"}}

// ═══════════════════════════════════════════════════════════════
//  USER MENU
// ═══════════════════════════════════════════════════════════════
function UserMenu({user,onLogout}){const[open,setOpen]=useState(false);const r=ROLES[user.role]||ROLES.FACULTY;
return<div style={{position:"relative"}}><button onClick={()=>setOpen(!open)} style={{display:"flex",alignItems:"center",gap:10,padding:"6px 12px",borderRadius:12,border:`1px solid ${C.border}`,background:"transparent",cursor:"pointer"}} onMouseEnter={e=>e.currentTarget.style.background=C.surfaceHover} onMouseLeave={e=>e.currentTarget.style.background="transparent"}><div style={{width:32,height:32,borderRadius:10,background:`${r.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,border:`1px solid ${r.color}44`}}>{user.avatar}</div><div style={{textAlign:"left"}}><div style={{fontSize:12,fontWeight:600,color:C.text}}>{user.name?.substring(0,18)}</div><div style={{fontSize:10,color:r.color}}>{r.label}</div></div><span style={{fontSize:10,color:C.textDim,transform:open?"rotate(180deg)":"",transition:"transform .2s"}}>▼</span></button>
{open&&<><div onClick={()=>setOpen(false)} style={{position:"fixed",inset:0,zIndex:998}}/><div style={{position:"absolute",top:"calc(100% + 8px)",right:0,width:260,background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,boxShadow:`0 16px 48px rgba(0,0,0,.5)`,zIndex:999,overflow:"hidden",animation:"fadeIn .2s"}}><div style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,background:C.surfaceAlt}}><div style={{fontSize:14,fontWeight:700,color:C.text}}>{user.name}</div><div style={{fontSize:11,color:C.textMuted}}>{user.email}</div><Badge color={r.color}>{r.label}</Badge></div><div style={{padding:8}}><button onClick={onLogout} style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"none",background:"transparent",color:C.danger,cursor:"pointer",fontSize:13,textAlign:"left",fontFamily:"inherit",display:"flex",alignItems:"center",gap:10}} onMouseEnter={e=>e.target.style.background=`${C.danger}15`} onMouseLeave={e=>e.target.style.background="transparent"}>🚪 ออกจากระบบ</button></div></div></>}</div>}

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
function genSample(){const r=(a,b)=>+(a+Math.random()*(b-a)).toFixed(1);return{
  ploAchievement:PLO_LABELS.map((n,i)=>({name:n,short:`PLO ${i+1}`,y1:r(70,95),y2:r(72,96),y3:r(75,97),y4:r(78,98),y5:r(80,99),y6:r(82,99),employer:r(3.2,4.8),graduate:r(3.4,4.9),target:80})),
  nlData:[{name:"NL1 (ปี 3)",passRate:r(82,96),mean:r(58,72),national:r(78,88)},{name:"NL2 (ปี 5)",passRate:r(85,98),mean:r(60,75),national:r(80,90)},{name:"NL3 (ปี 6)",passRate:r(88,99),mean:r(62,78),national:r(82,92)}],
  courseData:Array.from({length:8},(_,i)=>({name:`วิชา ${i+1}`,cloAchieve:r(70,98),reliability:r(.65,.95),difficulty:r(.3,.7),discrimination:r(.15,.45),passRate:r(75,99)})),
  trendData:Array.from({length:5},(_,i)=>({year:`${2564+i}`,graduation:r(88,98),nlPass:r(82,97),employer:r(66,94),retention:r(75,95)})),
  radarData:WFME_DOMAINS.map(d=>({domain:d,score:r(60,98),benchmark:r(70,85)})),
  assessmentQuality:[{type:"MCQ",reliability:r(.7,.92),validity:r(.6,.85)},{type:"OSCE",reliability:r(.72,.9),validity:r(.65,.88)},{type:"Mini-CEX",reliability:r(.6,.85),validity:r(.7,.9)},{type:"Portfolio",reliability:r(.55,.8),validity:r(.6,.82)},{type:"EPA",reliability:r(.65,.88),validity:r(.72,.92)}],
  studentFlow:YEAR_LABELS.map(n=>({name:n,pass:Math.floor(r(160,210)),fail:Math.floor(r(2,15)),withdraw:Math.floor(r(1,8)),remediate:Math.floor(r(3,12))})),
}}

export default function App(){
  const[user,setUser]=useState(null);
  const[data,setData]=useState(()=>genSample());
  const[activeTab,setActiveTab]=useState("dashboard");
  const[showInput,setShowInput]=useState(false);
  const[analysis,setAnalysis]=useState(null);
  const[connected,setConnected]=useState(false);
  const[checking,setChecking]=useState(true);
  const[toast,setToast]=useState(null);
  const[saving,setSaving]=useState(false);
  const[loadingData,setLoadingData]=useState(false);

  // Check connection on mount
  useEffect(()=>{(async()=>{setChecking(true);if(API_URL.includes("YOUR_")){setConnected(false);setChecking(false);return}try{const r=await api.ping();setConnected(r.success)}catch{setConnected(false)}setChecking(false)})()},[]);

  // Load data from Sheets after login
  useEffect(()=>{if(!user||!connected)return;(async()=>{setLoadingData(true);const r=await api.getAllData();if(r.success&&r.data){const d=r.data;d.radarData=data.radarData;d.assessmentQuality=data.assessmentQuality;d.studentFlow=data.studentFlow;setData(d);setToast({msg:"โหลดข้อมูลจาก Google Sheets สำเร็จ",type:"success"})}setLoadingData(false)})()},[user,connected]);

  useEffect(()=>{if(data.ploAchievement)setAnalysis(runAnalysis(data))},[data]);

  const handleSaveToSheets=async(newData,tab)=>{
    if(!connected){setToast({msg:"ออฟไลน์ — ข้อมูลบันทึกในเครื่องเท่านั้น",type:"warn"});return}
    setSaving(true);
    const email=user?.email||"";
    let res;
    if(tab==="plo") res=await api.savePLO(newData.ploAchievement,email);
    else if(tab==="nl") res=await api.saveNL(newData.nlData,email);
    else if(tab==="course") res=await api.saveCourse(newData.courseData,email);
    else if(tab==="trend") res=await api.saveTrend(newData.trendData,email);
    else{
      // Save all
      await api.savePLO(newData.ploAchievement,email);
      await api.saveNL(newData.nlData,email);
      await api.saveCourse(newData.courseData,email);
      res=await api.saveTrend(newData.trendData,email);
    }
    setSaving(false);
    if(res?.success) setToast({msg:"✅ บันทึกลง Google Sheets สำเร็จ",type:"success"});
    else setToast({msg:"❌ บันทึกไม่สำเร็จ: "+(res?.error||""),type:"error"});
  };

  const sc=analysis?.status==="ดีเยี่ยม"?C.accent:analysis?.status==="ดี"?C.primary:analysis?.status==="ต้องปรับปรุง"?C.warn:C.danger;
  const canEdit=user&&(user.role==="CHAIR"||user.role==="ADMIN"||user.role==="FACULTY");
  const navs=[{id:"dashboard",icon:"📊",l:"Dashboard"},{id:"plo",icon:"🎯",l:"PLO"},{id:"course",icon:"📚",l:"รายวิชา"},{id:"trend",icon:"📈",l:"แนวโน้ม"},{id:"findings",icon:"🔍",l:"ผลวิเคราะห์"}];

  if(!user)return<><GlobalStyles/><AuthSystem onLogin={setUser} connected={connected}/></>;

  return<div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'IBM Plex Sans Thai','Outfit',sans-serif"}}>
    <GlobalStyles/>
    {toast&&<Toast message={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    {showInput&&<DataInputPanel data={data} onUpdate={setData} onClose={()=>setShowInput(false)} onSaveToSheets={handleSaveToSheets} saving={saving}/>}

    {/* Header */}
    <div style={{background:C.glass,borderBottom:`1px solid ${C.border}`,padding:"12px 24px",position:"sticky",top:0,zIndex:100,backdropFilter:"blur(16px)"}}>
      <div style={{maxWidth:1400,margin:"0 auto",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${C.primaryDark},${C.teal})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🏥</div>
          <div><h1 style={{margin:0,fontSize:16,fontWeight:800,letterSpacing:-.5,fontFamily:"'Outfit',sans-serif"}}>WFME Competency Analysis</h1><div style={{fontSize:11,color:C.textDim}}>ระบบวิเคราะห์สมรรถนะ | Google Sheets Database</div></div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <ConnectionBadge connected={connected} checking={checking}/>
          {analysis&&<Badge color={sc}>{analysis.status} ({analysis.overallScore.toFixed(1)}%)</Badge>}
          {canEdit&&<button onClick={()=>setShowInput(true)} style={{padding:"8px 18px",borderRadius:10,border:"none",background:`linear-gradient(135deg,${C.primaryDark},${C.primary})`,color:"#fff",cursor:"pointer",fontSize:12,fontWeight:700,fontFamily:"inherit",boxShadow:`0 2px 12px ${C.primaryGlow}`}}>📥 นำเข้าข้อมูล</button>}
          {loadingData&&<Spinner size={18}/>}
          <UserMenu user={user} onLogout={()=>{setUser(null);setActiveTab("dashboard")}}/>
        </div>
      </div>
    </div>

    {/* Nav */}
    <div style={{maxWidth:1400,margin:"0 auto",padding:"12px 24px 0"}}><div style={{display:"flex",gap:4,borderBottom:`1px solid ${C.border}`}}>{navs.map(n=><button key={n.id} onClick={()=>setActiveTab(n.id)} style={{padding:"10px 18px",border:"none",cursor:"pointer",fontSize:13,fontWeight:600,background:activeTab===n.id?C.surfaceAlt:"transparent",color:activeTab===n.id?C.primary:C.textMuted,borderBottom:activeTab===n.id?`2px solid ${C.primary}`:"2px solid transparent",borderRadius:"8px 8px 0 0",fontFamily:"inherit"}}>{n.icon} {n.l}</button>)}</div></div>

    {/* Content */}
    <div style={{maxWidth:1400,margin:"0 auto",padding:"20px 24px 40px"}}>

      {activeTab==="dashboard"&&<div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16,marginBottom:20}}>
          <KPICard label="PLO เฉลี่ย" value={analysis?.overallScore.toFixed(1)} unit="%" trend={2.3} color={sc} icon="🎯"/>
          <KPICard label="NL Pass" value={data.nlData[2]?.passRate} unit="%" trend={1.5} color={C.accent} icon="📝"/>
          <KPICard label="ผู้ใช้บัณฑิต" value={_.mean(data.ploAchievement.map(p=>p.employer)).toFixed(1)} unit="/5" trend={.3} color={C.gold} icon="👥"/>
          <KPICard label="สำเร็จการศึกษา" value={data.trendData[data.trendData.length-1]?.graduation} unit="%" trend={-.5} color={C.teal} icon="🎓"/>
          <KPICard label="ต้องดำเนินการ" value={analysis?.findings.filter(f=>f.level==="วิกฤต"||f.level==="ต้องปรับปรุง").length} unit="รายการ" color={C.danger} icon="⚠️"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginBottom:20}}>
          <SectionCard title="🗺️ PLO Heatmap" subtitle="เขียว≥90 น้ำเงิน≥80 เหลือง≥70 แดง<70"><PLOHeatmap data={data.ploAchievement}/></SectionCard>
          <SectionCard title="🕸️ WFME Radar"><ResponsiveContainer width="100%" height={300}><RadarChart data={data.radarData}><PolarGrid stroke={C.border}/><PolarAngleAxis dataKey="domain" tick={{fill:C.textMuted,fontSize:10}}/><PolarRadiusAxis angle={22.5} domain={[0,100]} tick={{fill:C.textDim,fontSize:10}}/><Radar name="สถาบัน" dataKey="score" stroke={C.primary} fill={C.primary} fillOpacity={.3} strokeWidth={2}/><Radar name="Benchmark" dataKey="benchmark" stroke={C.warn} fill={C.warn} fillOpacity={.1} strokeWidth={2} strokeDasharray="5 5"/><Legend wrapperStyle={{fontSize:11}}/></RadarChart></ResponsiveContainer></SectionCard>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <SectionCard title="📝 NL Exam"><ResponsiveContainer width="100%" height={250}><BarChart data={data.nlData} barGap={4}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:11}}/><YAxis domain={[50,100]} tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Bar dataKey="passRate" name="สถาบัน" fill={C.primary} radius={[4,4,0,0]}/><Bar dataKey="national" name="ประเทศ" fill={C.textDim} radius={[4,4,0,0]}/><Legend wrapperStyle={{fontSize:11}}/></BarChart></ResponsiveContainer></SectionCard>
          <SectionCard title="📈 แนวโน้ม 5 ปี"><ResponsiveContainer width="100%" height={250}><LineChart data={data.trendData}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="year" tick={{fill:C.textMuted,fontSize:11}}/><YAxis domain={[60,100]} tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Line dataKey="graduation" name="สำเร็จ" stroke={C.accent} strokeWidth={2.5} dot={{r:4}}/><Line dataKey="nlPass" name="NL Pass" stroke={C.primary} strokeWidth={2.5} dot={{r:4}}/><Line dataKey="retention" name="Retention" stroke={C.gold} strokeWidth={2.5} dot={{r:4}}/><Legend wrapperStyle={{fontSize:11}}/></LineChart></ResponsiveContainer></SectionCard>
        </div>
      </div>}

      {activeTab==="plo"&&<div>
        <SectionCard title="🎯 PLO Achievement"><ResponsiveContainer width="100%" height={400}><BarChart data={data.ploAchievement} barGap={2}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="short" tick={{fill:C.textMuted,fontSize:11}}/><YAxis domain={[0,100]} tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Bar dataKey="y1" name="ปี 1" fill="#6366F1" radius={[2,2,0,0]}/><Bar dataKey="y3" name="ปี 3" fill={C.primary} radius={[2,2,0,0]}/><Bar dataKey="y6" name="ปี 6" fill={C.accent} radius={[2,2,0,0]}/><Legend wrapperStyle={{fontSize:11}}/></BarChart></ResponsiveContainer></SectionCard>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <SectionCard title="👥 ผู้ใช้บัณฑิต vs บัณฑิต"><ResponsiveContainer width="100%" height={300}><BarChart data={data.ploAchievement} barGap={4}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="short" tick={{fill:C.textMuted,fontSize:11}}/><YAxis domain={[0,5]} tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Bar dataKey="employer" name="ผู้ใช้บัณฑิต" fill={C.gold} radius={[4,4,0,0]}/><Bar dataKey="graduate" name="บัณฑิต" fill={C.teal} radius={[4,4,0,0]}/><Legend wrapperStyle={{fontSize:11}}/></BarChart></ResponsiveContainer></SectionCard>
          <SectionCard title="🔄 PLO-WFME"><DataTable columns={[{key:"domain",label:"WFME"},{key:"plo",label:"PLO",align:"center"},{key:"score",label:"Score",align:"center",render:v=><span style={{color:v>=80?C.accent:v>=70?C.warn:C.danger,fontWeight:700,fontFamily:"monospace"}}>{v}%</span>},{key:"status",label:"สถานะ",align:"center",render:v=><Badge color={v==="บรรลุ"?C.accent:v==="ใกล้บรรลุ"?C.warn:C.danger}>{v}</Badge>}]} data={WFME_DOMAINS.map((d,i)=>({domain:d,plo:`PLO ${(i%7)+1}`,score:data.radarData?.[i]?.score||0,status:(data.radarData?.[i]?.score||0)>=80?"บรรลุ":(data.radarData?.[i]?.score||0)>=70?"ใกล้บรรลุ":"ไม่บรรลุ"}))}/></SectionCard>
        </div>
      </div>}

      {activeTab==="course"&&<div>
        <SectionCard title="📚 คุณภาพรายวิชา"><DataTable columns={[{key:"name",label:"รายวิชา"},{key:"cloAchieve",label:"CLO%",align:"center",render:v=><><StatusDot value={v}/><span style={{fontFamily:"monospace",fontWeight:700}}>{v}%</span></>},{key:"reliability",label:"α",align:"center",render:v=><span style={{color:v>=.8?C.accent:v>=.7?C.warn:C.danger,fontFamily:"monospace",fontWeight:700}}>{v}</span>},{key:"difficulty",label:"p",align:"center",render:v=><span style={{color:v>=.3&&v<=.7?C.accent:C.warn,fontFamily:"monospace"}}>{v}</span>},{key:"discrimination",label:"D",align:"center",render:v=><span style={{color:v>=.2?C.accent:C.danger,fontFamily:"monospace"}}>{v}</span>},{key:"passRate",label:"Pass%",align:"center",render:v=><span style={{fontFamily:"monospace",fontWeight:700}}>{v}%</span>}]} data={data.courseData}/></SectionCard>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <SectionCard title="📊 Assessment Quality"><ResponsiveContainer width="100%" height={300}><BarChart data={data.assessmentQuality} barGap={4}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="type" tick={{fill:C.textMuted,fontSize:11}}/><YAxis domain={[0,1]} tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Bar dataKey="reliability" name="Reliability" fill={C.primary} radius={[4,4,0,0]}/><Bar dataKey="validity" name="Validity" fill={C.teal} radius={[4,4,0,0]}/><Legend wrapperStyle={{fontSize:11}}/></BarChart></ResponsiveContainer></SectionCard>
          <SectionCard title="🔢 Student Flow"><ResponsiveContainer width="100%" height={300}><BarChart data={data.studentFlow}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="name" tick={{fill:C.textMuted,fontSize:11}}/><YAxis tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Bar dataKey="pass" name="ผ่าน" stackId="a" fill={C.accent}/><Bar dataKey="remediate" name="ซ่อม" stackId="a" fill={C.warn}/><Bar dataKey="fail" name="ตก" stackId="a" fill={C.danger}/><Bar dataKey="withdraw" name="ลาออก" stackId="a" fill={C.textDim}/><Legend wrapperStyle={{fontSize:11}}/></BarChart></ResponsiveContainer></SectionCard>
        </div>
      </div>}

      {activeTab==="trend"&&<div>
        <SectionCard title="📈 แนวโน้ม 5 ปี"><ResponsiveContainer width="100%" height={350}><ComposedChart data={data.trendData}><CartesianGrid strokeDasharray="3 3" stroke={C.border}/><XAxis dataKey="year" tick={{fill:C.textMuted,fontSize:12}}/><YAxis domain={[50,100]} tick={{fill:C.textDim,fontSize:11}}/><Tooltip contentStyle={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,fontSize:12,color:C.text}}/><Area dataKey="graduation" name="สำเร็จ" fill={C.accent+"33"} stroke={C.accent} strokeWidth={2.5}/><Line dataKey="nlPass" name="NL Pass" stroke={C.primary} strokeWidth={3} dot={{r:5,fill:C.primary}}/><Line dataKey="retention" name="Retention" stroke={C.gold} strokeWidth={2.5} dot={{r:4}} strokeDasharray="5 5"/><Legend wrapperStyle={{fontSize:11}}/></ComposedChart></ResponsiveContainer></SectionCard>
      </div>}

      {activeTab==="findings"&&analysis&&<div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:20}}>{[{l:"ทั้งหมด",v:analysis.findings.length,c:C.primary},{l:"วิกฤต",v:analysis.findings.filter(f=>f.level==="วิกฤต").length,c:C.danger},{l:"ต้องปรับปรุง",v:analysis.findings.filter(f=>f.level==="ต้องปรับปรุง").length,c:C.warn},{l:"แผนปรับปรุง",v:analysis.actions.length,c:C.accent}].map((s,i)=><div key={i} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",borderLeft:`4px solid ${s.c}`}}><div style={{fontSize:11,color:C.textMuted,textTransform:"uppercase",letterSpacing:1}}>{s.l}</div><div style={{fontSize:36,fontWeight:800,color:s.c,fontFamily:"'JetBrains Mono',monospace"}}>{s.v}</div></div>)}</div>
        <div style={{display:"grid",gridTemplateColumns:"1.2fr 1fr",gap:20}}>
          <SectionCard title="🔍 ข้อค้นพบ"><div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:500,overflowY:"auto"}}>{analysis.findings.map((f,i)=><div key={i} style={{display:"flex",gap:12,padding:"12px 16px",background:C.surfaceAlt,borderRadius:12,borderLeft:`3px solid ${f.color}`,alignItems:"flex-start"}}><Badge color={f.color}>{f.level}</Badge><div style={{flex:1}}><div style={{fontSize:12,fontWeight:700,color:C.text,marginBottom:2}}>{f.area}</div><div style={{fontSize:12,color:C.textMuted,lineHeight:1.5}}>{f.detail}</div></div></div>)}{!analysis.findings.length&&<div style={{textAlign:"center",padding:40,color:C.accent}}>✅ ทุก PLO บรรลุ</div>}</div></SectionCard>
          <SectionCard title="📋 แผนดำเนินการ"><div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:500,overflowY:"auto"}}>{analysis.actions.map((a,i)=><div key={i} style={{padding:"12px 16px",background:C.surfaceAlt,borderRadius:12,borderLeft:`3px solid ${a.priority==="เร่งด่วน"?C.danger:C.warn}`}}><Badge color={a.priority==="เร่งด่วน"?C.danger:C.warn}>{a.priority}</Badge><div style={{fontSize:12,color:C.text,lineHeight:1.6,marginTop:4}}>{a.action}</div></div>)}</div></SectionCard>
        </div>
      </div>}
    </div>
  </div>;
}
