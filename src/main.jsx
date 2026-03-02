// src/main.jsx — Entry point with auth
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { useAuth } from "./useAuth";
import App from "./App";

function Root() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [isNew, setIsNew] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  if (loading) return <div style={c}><p style={{color:"#888"}}>Loading...</p></div>;

  if (!user) {
    const go = async () => {
      setErr(""); setMsg("");
      try {
        if (isNew) { await signUp(email, pw); setMsg("Check your email to confirm."); }
        else await signIn(email, pw);
      } catch (e) { setErr(e.message); }
    };
    return <div style={c}><div style={card}>
      <span style={{fontSize:40,display:"block",textAlign:"center"}}>🔬</span>
      <h1 style={{fontSize:24,fontWeight:800,textAlign:"center",margin:"12px 0 4px"}}>Symptom Tracker</h1>
      <p style={{fontSize:14,color:"#888",textAlign:"center",margin:"0 0 20px"}}>{isNew?"Create account":"Sign in"}</p>
      <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={inp} />
      <input type="password" placeholder="Password" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&go()} style={inp} />
      {err && <p style={{color:"#EF5350",fontSize:13}}>{err}</p>}
      {msg && <p style={{color:"#2D6A4F",fontSize:13}}>{msg}</p>}
      <button onClick={go} style={btn}>{isNew?"Create account":"Sign in"}</button>
      <button onClick={()=>{setIsNew(!isNew);setErr("");setMsg("");}} style={lnk}>{isNew?"Have an account? Sign in":"New? Create account"}</button>
    </div></div>;
  }

  return <App userId={user.id} onSignOut={signOut} />;
}

const c = {display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh",background:"#FAFAF7",fontFamily:"'DM Sans',-apple-system,sans-serif",padding:20};
const card = {width:"100%",maxWidth:340,padding:32,background:"#fff",borderRadius:20,boxShadow:"0 2px 20px rgba(0,0,0,0.06)"};
const inp = {width:"100%",padding:"12px 14px",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:14,marginBottom:10,boxSizing:"border-box"};
const btn = {width:"100%",padding:14,background:"#2D6A4F",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:"pointer",marginTop:4};
const lnk = {display:"block",width:"100%",textAlign:"center",background:"none",border:"none",color:"#2D6A4F",fontSize:13,fontWeight:600,cursor:"pointer",marginTop:12};

ReactDOM.createRoot(document.getElementById("root")).render(<React.StrictMode><Root/></React.StrictMode>);
