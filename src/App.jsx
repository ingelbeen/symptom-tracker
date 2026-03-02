import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "./supabaseClient";

// Bug Watch infection_syndrome categories
const SYNDROMES = [
  { id: "respiratory", label: "Respiratory", icon: "🫁", examples: "cough, sore throat, cold, flu-like" },
  { id: "gastrointestinal", label: "Gastrointestinal", icon: "🤢", examples: "vomiting, diarrhoea, stomach pain" },
  { id: "urinary_tract", label: "Urinary Tract", icon: "💧", examples: "painful urination, frequency" },
  { id: "skin_soft_tissue", label: "Skin / Soft Tissue", icon: "🩹", examples: "redness, swelling, wound infection" },
  { id: "mouth_dental", label: "Mouth / Dental", icon: "🦷", examples: "toothache, abscess" },
  { id: "eye", label: "Eye", icon: "👁", examples: "redness, discharge" },
  { id: "ear", label: "Ear", icon: "👂", examples: "earache, discharge" },
  { id: "other", label: "Other", icon: "➕", examples: "fever, malaria, other" },
];

const SYMPTOMS = {
  respiratory: ["Cough","Sore throat","Runny nose","Blocked nose","Sneezing","Hoarse voice","Shortness of breath","Wheezing","Chest pain","Headache","Fever / chills","Muscle aches","Fatigue","Loss of taste / smell","Earache"],
  gastrointestinal: ["Nausea","Vomiting","Diarrhoea","Stomach cramps","Bloating","Loss of appetite","Fever / chills","Blood in stool","Fatigue"],
  urinary_tract: ["Pain/burning urinating","Urinating more often","Urgency","Blood in urine","Cloudy/smelly urine","Lower abdominal pain","Fever / chills","Back pain","Fatigue"],
  skin_soft_tissue: ["Redness","Swelling","Warmth","Pain/tenderness","Pus/discharge","Itching","Rash","Fever / chills","Fatigue"],
  mouth_dental: ["Toothache","Gum pain","Swelling","Mouth ulcers","Difficulty eating","Bad taste","Fever / chills"],
  eye: ["Redness","Discharge","Itching","Watering","Swelling","Pain","Blurred vision","Light sensitivity"],
  ear: ["Earache","Discharge","Hearing loss","Ringing","Fever / chills","Dizziness"],
  other: ["Fever / chills","Fatigue","Headache","Muscle aches","Loss of appetite","Night sweats","Joint pain"],
};

const SEVERITY = [
  { value: 1, label: "Mild", desc: "Noticeable but not affecting daily activities", color: "#66BB6A" },
  { value: 2, label: "Moderate", desc: "Affecting some daily activities", color: "#FFA726" },
  { value: 3, label: "Severe", desc: "Unable to carry out usual activities", color: "#EF5350" },
];

// Bug Watch ab_source
const AB_SOURCES = [
  { v: "gp", l: "GP" }, { v: "hospital", l: "Hospital doctor" },
  { v: "dentist", l: "Dentist" }, { v: "nurse", l: "Nurse" },
  { v: "walkin", l: "Doctor at walk-in centre" }, { v: "abroad", l: "Doctor abroad" },
  { v: "pharmacy_otc", l: "Pharmacy — over the counter" },
  { v: "leftover", l: "Not prescribed — had some left over" },
  { v: "not_prescribed_unknown", l: "Not prescribed — source not recorded" },
  { v: "prescribed_unknown", l: "Prescribed — source not recorded" },
  { v: "other", l: "Other" },
];

const ANTIBIOTICS = [
  "Amoxicillin","Co-amoxiclav (Augmentin)","Azithromycin","Clarithromycin",
  "Doxycycline","Flucloxacillin","Cefalexin","Ciprofloxacin","Metronidazole",
  "Trimethoprim","Nitrofurantoin","Erythromycin","Phenoxymethylpenicillin",
  "Co-trimoxazole","Levofloxacin","Artemether-lumefantrine (ACT)","Quinine",
  "Chloroquine","Sulfadoxine-pyrimethamine",
];

const OTHER_MEDS = [
  "Paracetamol","Ibuprofen","Aspirin","Cough syrup","Antihistamine",
  "Oral rehydration salts","Loperamide","Antacid","Nasal spray",
  "Eye drops","Ear drops","Antifungal cream","Steroid cream","Throat lozenges",
];

// Healthcare visit types — including pharmacy
const VISIT_TYPES = [
  { v: "gp_inperson", l: "GP (in person)" }, { v: "gp_remote", l: "GP (phone / video)" },
  { v: "walkin", l: "Walk-in / Urgent care" }, { v: "ed", l: "Emergency department" },
  { v: "hospital_admission", l: "Hospital admission" }, { v: "hospital_outpatient", l: "Hospital outpatient" },
  { v: "dentist", l: "Dentist" }, { v: "pharmacy", l: "Pharmacy" },
  { v: "nurse", l: "Nurse" }, { v: "traditional_healer", l: "Traditional / herbal healer" },
  { v: "community_hw", l: "Community health worker" }, { v: "other", l: "Other" },
];

const VISIT_OUTCOMES = [
  "Advice only — no medicines", "Prescribed antibiotic", "Prescribed other medicine",
  "Sold medicine over the counter", "Referred for further tests", "Referred to specialist",
  "Admitted to hospital", "Told to come back if not better", "Other",
];

// Bug Watch course_not_completed_reason
const STOP_REASONS = [
  { v: "feeling_better", l: "Feeling better" }, { v: "side_effects", l: "Started to get side effects" },
  { v: "worried_se", l: "Worried about side effects" }, { v: "forgot", l: "Forgot to take them" },
  { v: "lost", l: "Lost them" }, { v: "missed_doses", l: "Did not replace missed doses" },
  { v: "save_later", l: "Wanted to save them for later" }, { v: "alcohol", l: "Wanted to drink alcohol" },
  { v: "affect_meds", l: "Worried it would affect other medication" },
  { v: "never_take", l: "Never take antibiotics" }, { v: "cant_remember", l: "Can't remember" },
  { v: "other", l: "Other" },
];

const COMORBIDITIES = [
  { id: "lung", l: "Chronic lung disease (e.g. asthma)" }, { id: "heart", l: "Chronic heart disease" },
  { id: "heart_birth", l: "Heart problems from birth" }, { id: "kidney", l: "Chronic kidney disease" },
  { id: "diabetes", l: "Diabetes" }, { id: "liver", l: "Chronic liver disease" },
  { id: "gi", l: "Chronic GI (e.g. IBS, Crohn's)" }, { id: "skin", l: "Chronic skin (e.g. eczema)" },
  { id: "hiv", l: "HIV" }, { id: "sickle", l: "Sickle cell disease" },
  { id: "neuro", l: "Neurological disorder" }, { id: "mental", l: "Mental health condition" },
  { id: "cancer", l: "Cancer / chemotherapy" }, { id: "other", l: "Other" },
];

const td = () => new Date().toISOString().split("T")[0];
const fmt = d => d ? new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}) : "";
const ds = d => d ? Math.max(0, Math.floor((new Date()-new Date(d+"T00:00:00"))/864e5)) : 0;
const uid = () => Math.random().toString(36).substr(2, 9);

// ═══════════════════════════════════════════════════════════
// DATABASE HELPERS — read/write directly to Supabase
// ═══════════════════════════════════════════════════════════

// Load all episodes for a user, each enriched with visits, medicines, dailyLogs, adhLogs
async function loadAllEpisodes(userId) {
  const { data: rows, error } = await supabase
    .from("episodes").select("*").eq("user_id", userId).order("start_date", { ascending: false });
  if (error) { console.error("loadEpisodes", error); return []; }

  const enriched = await Promise.all(rows.map(async (r) => {
    const [{ data: visits }, { data: meds }, { data: logs }] = await Promise.all([
      supabase.from("healthcare_visits").select("*").eq("episode_id", r.id).order("visit_date"),
      supabase.from("medicines").select("*").eq("episode_id", r.id),
      supabase.from("daily_logs").select("*").eq("episode_id", r.id).order("log_date"),
    ]);

    // For each medicine, load adherence logs
    const medsWithAdh = await Promise.all((meds || []).map(async (m) => {
      const { data: adh } = await supabase.from("adherence_logs").select("*").eq("medicine_id", m.id).order("log_date");
      return dbMedToLocal(m, adh || []);
    }));

    return dbEpToLocal(r, visits || [], medsWithAdh, logs || []);
  }));

  return enriched;
}

// Convert DB episode row → local episode shape
function dbEpToLocal(r, visits, medicines, dailyLogs) {
  return {
    id: r.id, startDate: r.start_date, endDate: r.end_date, status: r.status,
    syndrome: r.syndrome_id ? { id: r.syndrome_id, label: r.syndrome_label, icon: r.syndrome_icon } : null,
    symptoms: r.symptoms || [], severity: r.severity_value ? { value: r.severity_value, label: r.severity_label, color: SEVERITY.find(s=>s.value===r.severity_value)?.color || "#999" } : null,
    notes: r.notes, lastCheckIn: r.last_check_in,
    healthcareVisits: visits.map(v => ({ id: v.id, type: v.visit_type, date: v.visit_date, outcome: v.outcome, prescribedAb: v.prescribed_ab, adviceSelfCare: v.advice_self_care, notes: v.notes })),
    medicines, dailyLogs: dailyLogs.map(l => ({ id: l.id, date: l.log_date, feeling: l.feeling, gone: l.resolved_symptoms, added: l.new_symptoms, severity: l.severity_value ? { value: l.severity_value, label: l.severity_label } : null })),
  };
}

// Convert DB medicine row → local medicine shape
function dbMedToLocal(m, adhLogs) {
  return {
    id: m.id, drugName: m.drug_name, customName: m.custom_drug_name,
    isAb: m.is_antibiotic, source: m.source,
    daysFromOnset: m.days_from_onset, prescDays: m.presc_duration_days ? String(m.presc_duration_days) : "",
    takenDays: m.taken_duration_days, delayed: m.delayed_prescription,
    completed: m.course_completed, notCompletedReason: m.not_completed_reason,
    startDate: m.start_date, adhStatus: m.adherence_status || "na",
    photoData: m.photo_path, // simplified — photo_path stores reference
    adhLogs: adhLogs.map(a => ({ date: a.log_date, taken: a.taken, note: a.note, reason: a.stop_reason })),
  };
}

async function loadProfile(userId) {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error && error.code !== "PGRST116") console.error("loadProfile", error);
  if (!data) return null;
  return {
    sex: data.sex, ageGroup: data.age_group, region: data.region, isHCW: data.is_hcw,
    hhSize: data.household_size ? String(data.household_size) : "",
    hhChildren: data.household_children ? String(data.household_children) : "",
    conditions: data.long_term_conditions || [],
    smoking: data.smoking, pregnant: data.pregnant, recurrentUTI: data.recurrent_uti,
    lastGP: data.last_gp_visit, lastAb: data.last_antibiotic_use, lastMalaria: data.last_malaria_illness,
  };
}

// ═══════════════════ MAIN APP ═══════════════════
export default function App({ userId }) {
  const [scr, setScr] = useState("home");
  const [stack, setStack] = useState([]);
  const [eps, setEps] = useState([]);
  const [prof, setProf] = useState(null);
  const [cur, setCur] = useState(null);
  const [step, setStep] = useState(0);
  const [medTarget, setMedTarget] = useState(null);
  const [loading, setLoading] = useState(true);

  const nav = s => { setStack(p => [...p, scr]); setScr(s); };
  const back = () => { const p = [...stack]; setScr(p.pop() || "home"); setStack(p); };
  const home = () => { setScr("home"); setStack([]); };

  // ── Load all data on mount ──
  const reload = useCallback(async () => {
    setLoading(true);
    const [episodes, profile] = await Promise.all([loadAllEpisodes(userId), loadProfile(userId)]);
    setEps(episodes);
    setProf(profile);
    setLoading(false);
  }, [userId]);

  useEffect(() => { reload(); }, [reload]);

  // ── Save episode (create or update in DB, then reload) ──
  const saveEp = async (ep) => {
    setCur(ep); // optimistic UI update
    setEps(p => { const i = p.findIndex(e => e.id === ep.id); if (i >= 0) { const n = [...p]; n[i] = ep; return n; } return [...p, ep]; });

    // Check if episode already exists in DB
    const { data: existing } = await supabase.from("episodes").select("id").eq("id", ep.id).single();

    if (existing) {
      // Update
      await supabase.from("episodes").update({
        syndrome_id: ep.syndrome?.id, syndrome_label: ep.syndrome?.label, syndrome_icon: ep.syndrome?.icon,
        start_date: ep.startDate, end_date: ep.endDate, status: ep.status,
        symptoms: ep.symptoms, severity_value: ep.severity?.value, severity_label: ep.severity?.label,
        notes: ep.notes, last_check_in: ep.lastCheckIn || td(),
      }).eq("id", ep.id);
    } else {
      // Insert new
      const { data: newRow, error } = await supabase.from("episodes").insert({
        id: ep.id, user_id: userId,
        syndrome_id: ep.syndrome?.id, syndrome_label: ep.syndrome?.label, syndrome_icon: ep.syndrome?.icon,
        start_date: ep.startDate, status: "active",
        symptoms: ep.symptoms, severity_value: ep.severity?.value, severity_label: ep.severity?.label,
        notes: ep.notes, last_check_in: ep.startDate,
      }).select().single();
      if (error) console.error("createEpisode", error);
      if (newRow) ep.id = newRow.id; // use DB-generated id
    }
  };

  // ── Save healthcare visit ──
  const saveVisit = async (ep, visit) => {
    const { data, error } = await supabase.from("healthcare_visits").insert({
      episode_id: ep.id, user_id: userId,
      visit_type: visit.type, visit_date: visit.date,
      outcome: visit.outcome, prescribed_ab: visit.prescribedAb,
      advice_self_care: visit.adviceSelfCare, notes: visit.notes,
    }).select().single();
    if (error) console.error("saveVisit", error);
    const newVisit = data ? { id: data.id, type: data.visit_type, date: data.visit_date, outcome: data.outcome, prescribedAb: data.prescribed_ab, adviceSelfCare: data.advice_self_care, notes: data.notes } : { ...visit, id: uid() };
    const updated = { ...ep, healthcareVisits: [...ep.healthcareVisits, newVisit] };
    setEps(p => p.map(e => e.id === ep.id ? updated : e));
    setCur(updated);
    return updated;
  };

  // ── Save medicine ──
  const saveMedicine = async (ep, med) => {
    const { data, error } = await supabase.from("medicines").insert({
      episode_id: ep.id, user_id: userId,
      drug_name: med.drugName, custom_drug_name: med.customName || null,
      is_antibiotic: med.isAb, source: med.source || null,
      days_from_onset: med.daysFromOnset || 0,
      presc_duration_days: med.prescDays ? parseInt(med.prescDays) : null,
      delayed_prescription: med.delayed,
      course_completed: med.completed, not_completed_reason: med.notCompletedReason || null,
      start_date: med.startDate, adherence_status: med.isAb ? "taking" : "na",
    }).select().single();
    if (error) console.error("saveMedicine", error);
    const newMed = data ? dbMedToLocal(data, []) : { ...med, id: uid() };
    const updated = { ...ep, medicines: [...ep.medicines, newMed] };
    setEps(p => p.map(e => e.id === ep.id ? updated : e));
    setCur(updated);
    return updated;
  };

  // ── Save daily check-in ──
  const saveCheckin = async (ep, log, updatedEp) => {
    await supabase.from("daily_logs").insert({
      episode_id: ep.id, user_id: userId, log_date: log.date,
      feeling: log.feeling, resolved_symptoms: log.gone || [],
      new_symptoms: log.added || [], severity_value: log.severity?.value, severity_label: log.severity?.label,
    });
    // Update the episode in DB
    await supabase.from("episodes").update({
      symptoms: updatedEp.symptoms, severity_value: updatedEp.severity?.value,
      severity_label: updatedEp.severity?.label, status: updatedEp.status,
      end_date: updatedEp.endDate, last_check_in: td(),
    }).eq("id", ep.id);
    // If resolved, update any active meds
    if (updatedEp.status === "resolved") {
      await supabase.from("medicines").update({ adherence_status: "completed_recovery" })
        .eq("episode_id", ep.id).eq("adherence_status", "taking");
    }
    setEps(p => p.map(e => e.id === ep.id ? updatedEp : e));
    setCur(updatedEp);
  };

  // ── Save adherence logs ──
  const saveAdherence = async (ep, updatedEp, medLogs) => {
    // medLogs = { medId: { taken, note, reason } }
    for (const [medId, log] of Object.entries(medLogs)) {
      if (!log.taken) continue;
      await supabase.from("adherence_logs").insert({
        medicine_id: medId, user_id: userId, log_date: td(),
        taken: log.taken, note: log.note || null, stop_reason: log.reason || null,
      });
      // Update medicine status if stopped or completed
      const updates = {};
      if (log.taken === "stopped") {
        updates.adherence_status = "stopped_early";
        updates.not_completed_reason = log.reason || null;
        updates.taken_duration_days = ds(updatedEp.medicines.find(m=>m.id===medId)?.startDate);
      }
      if (log.taken === "completed") {
        updates.adherence_status = "completed";
        updates.taken_duration_days = ds(updatedEp.medicines.find(m=>m.id===medId)?.startDate) + 1;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from("medicines").update(updates).eq("id", medId);
      }
    }
    setEps(p => p.map(e => e.id === ep.id ? updatedEp : e));
    setCur(updatedEp);
  };

  // ── Save profile ──
  const saveProfile = async (p) => {
    const row = {
      id: userId, sex: p.sex, age_group: p.ageGroup, region: p.region, is_hcw: p.isHCW,
      household_size: p.hhSize ? parseInt(p.hhSize) : null,
      household_children: p.hhChildren ? parseInt(p.hhChildren) : null,
      long_term_conditions: p.conditions, smoking: p.smoking, pregnant: p.pregnant,
      recurrent_uti: p.recurrentUTI, last_gp_visit: p.lastGP,
      last_antibiotic_use: p.lastAb, last_malaria_illness: p.lastMalaria,
    };
    const { error } = await supabase.from("profiles").upsert(row);
    if (error) console.error("saveProfile", error);
    setProf(p);
  };

  const newEp = () => {
    setCur({ id: uid(), startDate: td(), status: "active", syndrome: null, symptoms: [], severity: null, dailyLogs: [], healthcareVisits: [], medicines: [], notes: "", lastCheckIn: td() });
    setStep(0); nav("report");
  };

  // Notifications
  const notifs = [];
  const active = eps.filter(e => e.status === "active");

  active.forEach(ep => {
    if (ds(ep.lastCheckIn) >= 1)
      notifs.push({ id: "c_"+ep.id, type: "checkin", epId: ep.id, title: "How are you feeling?", body: `${ep.syndrome?.label||"Illness"} · Day ${ds(ep.startDate)+1}`, icon: ep.syndrome?.icon||"🤒" });
    ep.medicines.filter(m => m.isAb && m.adhStatus === "taking").forEach(m => {
      const last = m.adhLogs?.[m.adhLogs.length-1]?.date;
      if (!last || ds(last) >= 1)
        notifs.push({ id: "a_"+m.id, type: "adherence", epId: ep.id, medId: m.id, title: `💊 ${m.drugName}`, body: `Day ${ds(m.startDate)+1} of ${m.prescDays||"?"} — did you take it?`, icon: "💊" });
    });
  });

  const lastAny = eps.length ? eps.reduce((l,e) => e.startDate > l ? e.startDate : l, "2000-01-01") : null;
  if (!lastAny || ds(lastAny) >= 3)
    notifs.push({ id: "gen", type: "general", title: "Feeling unwell?", body: "Tap to report new symptoms", icon: "🔔" });

  const onNotif = n => {
    if (n.type === "general") return newEp();
    const ep = eps.find(e => e.id === n.epId);
    if (!ep) return;
    setCur({...ep});
    if (n.type === "checkin") nav("checkin");
    if (n.type === "adherence") { setMedTarget(n.medId); nav("adherence"); }
  };

  if (loading) return <div style={{...Z.frame,alignItems:"center",justifyContent:"center"}}><p style={{color:"#999",fontSize:14}}>Loading…</p></div>;

  return (
    <div style={Z.frame}>
      <div style={Z.status}><span style={{fontSize:11,fontWeight:600}}>9:41</span><span style={{fontSize:11}}>●●● ▐█</span></div>
      <div style={Z.body}>
        {scr==="home" && <Home {...{eps,notifs,prof,newEp,nav,setCur,onNotif}} />}
        {scr==="report" && <Report ep={cur} step={step} setStep={setStep} upd={setCur} save={async ep=>{await saveEp(ep);home();}} back={back} />}
        {scr==="detail" && <Detail ep={cur} upd={async ep=>{await saveEp(ep);}} back={back} nav={nav} />}
        {scr==="checkin" && <CheckinScr ep={cur} onSave={saveCheckin} back={back} goHome={home} />}
        {scr==="adherence" && <AdherenceScr ep={cur} medTarget={medTarget} onSave={saveAdherence} back={back} goHome={home} />}
        {scr==="addvisit" && <AddVisitScr ep={cur} onSave={saveVisit} back={back} />}
        {scr==="addmed" && <AddMedScr ep={cur} onSave={saveMedicine} back={back} />}
        {scr==="history" && <History eps={eps} open={ep=>{setCur({...ep});nav("detail");}} back={back} />}
        {scr==="profile" && <ProfileScr prof={prof} save={async p=>{await saveProfile(p);home();}} back={back} />}
      </div>
      <div style={Z.nav}>
        <NB i="🏠" l="Home" on={scr==="home"} t={home} />
        <NB i="➕" l="Report" on={false} t={newEp} accent />
        <NB i="📋" l="History" on={scr==="history"} t={()=>nav("history")} />
        <NB i="👤" l="Profile" on={scr==="profile"} t={()=>nav("profile")} />
      </div>
    </div>
  );
}

function NB({i,l,on,t,accent}) {
  return <button onClick={t} style={{...Z.navBtn,...(accent?{background:"#2D6A4F",borderRadius:22,padding:"8px 14px"}:{}),color:accent?"#fff":on?"#2D6A4F":"#aaa"}}>
    <span style={{fontSize:accent?20:18}}>{i}</span><span style={{fontSize:9,fontWeight:on||accent?700:500,marginTop:1}}>{l}</span>
  </button>;
}

// ═══════════════════ HOME ═══════════════════
function Home({eps,notifs,prof,newEp,nav,setCur,onNotif}) {
  const act = eps.filter(e=>e.status==="active");
  return <div style={Z.scroll}>
    <div style={{padding:"12px 20px 14px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
        <div><h1 style={{fontSize:26,fontWeight:900,color:"#1a1a1a",margin:0,letterSpacing:-0.5}}>Symptom<br/>Tracker</h1><p style={{fontSize:13,color:"#999",margin:"4px 0 0"}}>{fmt(td())}</p></div>
        <div style={{width:48,height:48,borderRadius:14,background:"#E8F5E9",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:24}}>🔬</span></div>
      </div>
      {!prof && <button onClick={()=>nav("profile")} style={Z.banner}><span>👋</span><span style={{fontSize:13,fontWeight:600,flex:1}}>Complete your profile</span><span>→</span></button>}
    </div>

    {notifs.length > 0 && <Sec t="Notifications">{notifs.map(n=>
      <button key={n.id} onClick={()=>onNotif(n)} style={Z.card}>
        <div style={{width:8,height:8,borderRadius:4,background:n.type==="adherence"?"#FF9800":"#EF5350",flexShrink:0,marginTop:5}} />
        <div style={{flex:1}}><p style={Z.ct}>{n.title}</p><p style={Z.cs}>{n.body}</p></div>
      </button>
    )}</Sec>}

    {act.length > 0 && <Sec t="Active episodes">{act.map(ep=>
      <button key={ep.id} onClick={()=>{setCur({...ep});nav("detail");}} style={Z.card}>
        <span style={{fontSize:26}}>{ep.syndrome?.icon||"🤒"}</span>
        <div style={{flex:1,minWidth:0}}>
          <p style={Z.ct}>{ep.syndrome?.label||"Illness"} · Day {ds(ep.startDate)+1}</p>
          <p style={Z.cs}>{ep.symptoms.slice(0,3).join(", ")}{ep.symptoms.length>3?` +${ep.symptoms.length-3}`:""}</p>
          {ep.medicines.filter(m=>m.isAb&&m.adhStatus==="taking").length>0 && <span style={{fontSize:11,color:"#FF9800",fontWeight:700}}>💊 {ep.medicines.filter(m=>m.isAb&&m.adhStatus==="taking").length} active antibiotic course</span>}
        </div>
        <span style={{color:"#ccc",fontSize:18}}>›</span>
      </button>
    )}</Sec>}

    <div style={{padding:"0 20px 12px"}}>
      <button onClick={newEp} style={Z.big}><span style={{fontSize:24}}>🤒</span><div><p style={{fontWeight:700,fontSize:15,margin:0}}>Report new illness</p><p style={{fontSize:12,margin:"2px 0 0",opacity:0.85}}>Record symptoms and start tracking</p></div></button>
    </div>

    <Sec t="Summary"><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
      <St n={eps.length} l="Episodes" /><St n={eps.reduce((s,e)=>s+e.medicines.length,0)} l="Medicines" /><St n={eps.reduce((s,e)=>s+e.healthcareVisits.length,0)} l="Visits" />
    </div></Sec>
  </div>;
}
function Sec({t,children}) { return <div style={{padding:"0 20px",marginBottom:14}}><p style={Z.lab}>{t}</p>{children}</div>; }
function St({n,l}) { return <div style={{textAlign:"center",padding:"12px 6px",background:"#fff",borderRadius:10,border:"1px solid #f0f0f0"}}><span style={{fontSize:22,fontWeight:800,color:"#2D6A4F",display:"block"}}>{n}</span><span style={{fontSize:10,color:"#999"}}>{l}</span></div>; }

// ═══════════════════ REPORT EPISODE ═══════════════════
function Report({ep,step,setStep,upd,save,back}) {
  if (!ep) return null;
  return <div style={Z.scroll}>
    <TB l={<B t={step>0?"← Back":"✕ Cancel"} tap={step>0?()=>setStep(step-1):back}/>} r={<span style={{fontSize:12,color:"#999"}}>Step {step+1}/4</span>} />
    <div style={{padding:"0 20px 4px"}}><div style={Z.track}><div style={{...Z.fill,width:`${(step+1)/4*100}%`}}/></div></div>
    <div style={{padding:"0 20px"}}>
      {step===0 && <><H>What type of infection?</H><Sub>Choose the area most affected</Sub>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:14}}>
          {SYNDROMES.map(s=><button key={s.id} onClick={()=>{upd({...ep,syndrome:s,symptoms:[]});setStep(1);}} style={{...Z.syn,...(ep.syndrome?.id===s.id?{borderColor:"#2D6A4F",background:"#E8F5E9"}:{})}}>
            <span style={{fontSize:28}}>{s.icon}</span><span style={{fontWeight:700,fontSize:13}}>{s.label}</span><span style={{fontSize:10,color:"#999",lineHeight:1.3}}>{s.examples}</span>
          </button>)}
        </div>
      </>}
      {step===1 && ep.syndrome && <><H>What symptoms?</H><Sub>Select all that apply</Sub>
        <Chips items={SYMPTOMS[ep.syndrome.id]||SYMPTOMS.other} sel={ep.symptoms} tog={s=>{const a=ep.symptoms.includes(s)?ep.symptoms.filter(x=>x!==s):[...ep.symptoms,s];upd({...ep,symptoms:a});}} />
        {ep.symptoms.length>0 && <Pr tap={()=>setStep(2)} mt={18}>Continue with {ep.symptoms.length} symptom{ep.symptoms.length!==1?"s":""}</Pr>}
      </>}
      {step===2 && <><H>How severe?</H><Sub>Impact on daily activities</Sub>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:14}}>{SEVERITY.map(sv=>
          <button key={sv.value} onClick={()=>{upd({...ep,severity:sv});setStep(3);}} style={{...Z.sev,borderColor:ep.severity?.value===sv.value?sv.color:"#e8e8e8",background:ep.severity?.value===sv.value?sv.color+"14":"#fff"}}>
            <div style={{width:14,height:14,borderRadius:7,background:sv.color,flexShrink:0}}/><div><p style={{fontWeight:700,fontSize:14,margin:0}}>{sv.label}</p><p style={{fontSize:12,color:"#888",margin:"2px 0 0"}}>{sv.desc}</p></div>
          </button>
        )}</div>
      </>}
      {step===3 && <><H>When did it start?</H><Sub>Approximate date symptoms began</Sub>
        <input type="date" value={ep.startDate} max={td()} onChange={e=>upd({...ep,startDate:e.target.value})} style={Z.inp} />
        <Lb mt={18}>Notes (optional)</Lb>
        <textarea value={ep.notes} onChange={e=>upd({...ep,notes:e.target.value})} placeholder="Anything else to record" style={{...Z.inp,height:56,resize:"vertical"}} />
        <Pr tap={()=>save(ep)} mt={20}>Save episode ✓</Pr>
        <p style={{fontSize:12,color:"#999",textAlign:"center",marginTop:6}}>Add visits and medicines on the next screen</p>
      </>}
    </div>
  </div>;
}

// ═══════════════════ DAILY CHECK-IN ═══════════════════
function CheckinScr({ep,onSave,back,goHome}) {
  const [feel,setFeel] = useState(null);
  const [gone,setGone] = useState([]);
  const [added,setAdded] = useState([]);
  const [sev,setSev] = useState(ep.severity);
  const [st,setSt] = useState(0);
  const [saving,setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const log = {id:uid(),date:td(),feeling:feel,gone,added,severity:sev};
    const syms = [...ep.symptoms.filter(s=>!gone.includes(s)),...added];
    const updatedEp = {...ep, symptoms:syms, severity:sev, dailyLogs:[...ep.dailyLogs,log], lastCheckIn:td(),
      status:feel==="resolved"?"resolved":"active", endDate:feel==="resolved"?td():ep.endDate,
      medicines:ep.medicines.map(m=> feel==="resolved"&&m.isAb&&m.adhStatus==="taking"?{...m,adhStatus:"completed_recovery"}:m),
    };
    await onSave(ep, log, updatedEp);
    setSaving(false);
    goHome();
  };

  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={st>0?()=>setSt(st-1):back}/>} r={<span style={{fontSize:13,fontWeight:600,color:"#2D6A4F"}}>Daily check-in</span>} />
    <div style={{padding:"0 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,padding:12,background:"#f8f8f5",borderRadius:12,marginBottom:14}}>
        <span style={{fontSize:22}}>{ep.syndrome?.icon||"🤒"}</span>
        <span style={{fontWeight:700,fontSize:14}}>{ep.syndrome?.label||"Illness"} · Day {ds(ep.startDate)+1}</span>
      </div>

      {st===0 && <><H>How are you feeling?</H>
        {[{v:"worse",i:"😞",l:"Worse"},{v:"same",i:"😐",l:"About the same"},{v:"better",i:"🙂",l:"A bit better"},{v:"resolved",i:"😊",l:"Fully recovered"}].map(o=>
          <button key={o.v} onClick={()=>{setFeel(o.v);setSt(o.v==="resolved"?2:1);}} style={{...Z.opt,borderColor:feel===o.v?"#2D6A4F":"#e8e8e8",marginBottom:8}}>
            <span style={{fontSize:22}}>{o.i}</span><span style={{fontWeight:600,fontSize:14}}>{o.l}</span>
          </button>
        )}
      </>}

      {st===1 && <><H>Symptoms resolved?</H><Sub>Tap any that have gone</Sub>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
          {ep.symptoms.map(s=><button key={s} onClick={()=>setGone(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])} style={{...Z.chip,...(gone.includes(s)?{background:"#e0e0e0",textDecoration:"line-through",color:"#aaa"}:{background:"#2D6A4F",color:"#fff",borderColor:"#2D6A4F"})}}>{s}</button>)}
        </div>
        <H mt={16}>New symptoms?</H>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:8}}>
          {(SYMPTOMS[ep.syndrome?.id]||SYMPTOMS.other).filter(s=>!ep.symptoms.includes(s)).map(s=>
            <button key={s} onClick={()=>setAdded(p=>p.includes(s)?p.filter(x=>x!==s):[...p,s])} style={{...Z.chip,...(added.includes(s)?{background:"#2D6A4F",color:"#fff",borderColor:"#2D6A4F"}:{})}}>{added.includes(s)?"✓ ":""}{s}</button>
          )}
        </div>
        <Pr tap={()=>setSt(2)} mt={16}>Continue</Pr>
      </>}

      {st===2 && <><H>Current severity</H>
        <div style={{display:"flex",flexDirection:"column",gap:10,marginTop:10}}>{SEVERITY.map(sv=>
          <button key={sv.value} onClick={()=>setSev(sv)} style={{...Z.sev,borderColor:sev?.value===sv.value?sv.color:"#e8e8e8",background:sev?.value===sv.value?sv.color+"14":"#fff"}}>
            <div style={{width:14,height:14,borderRadius:7,background:sv.color,flexShrink:0}}/><span style={{fontWeight:600,fontSize:14}}>{sv.label}</span>
          </button>
        )}</div>
        <Pr tap={finish} mt={16} disabled={saving}>{saving?"Saving…":feel==="resolved"?"Mark recovered ✓":"Save check-in ✓"}</Pr>
      </>}
    </div>
  </div>;
}

// ═══════════════════ ADHERENCE LOG ═══════════════════
function AdherenceScr({ep,medTarget,onSave,back,goHome}) {
  const meds = ep.medicines.filter(m=>m.isAb&&m.adhStatus==="taking");
  const [logs,setLogs] = useState({});
  const [saving,setSaving] = useState(false);

  const finish = async () => {
    setSaving(true);
    const updatedEp = {...ep, medicines:ep.medicines.map(m=>{
      const log = logs[m.id]; if (!log) return m;
      const entry = {date:td(),taken:log.taken,note:log.note||"",reason:log.reason||""};
      let status = m.adhStatus;
      if (log.taken==="stopped") status = "stopped_early";
      if (log.taken==="completed") status = "completed";
      return {...m, adhLogs:[...(m.adhLogs||[]),entry], adhStatus:status,
        ...(log.taken==="stopped"?{notCompletedReason:log.reason,takenDays:ds(m.startDate)}:{}),
        ...(log.taken==="completed"?{takenDays:ds(m.startDate)+1}:{}),
      };
    })};
    await onSave(ep, updatedEp, logs);
    setSaving(false);
    goHome();
  };

  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={back}/>} r={<span style={{fontSize:13,fontWeight:600,color:"#FF9800"}}>💊 Medicine log</span>} />
    <div style={{padding:"0 20px"}}>
      <H>Did you take your medicines?</H>
      <Sub>Log each antibiotic / antimicrobial</Sub>

      {meds.map(m=>{
        const log = logs[m.id]||{};
        const day = ds(m.startDate)+1;
        return <div key={m.id} style={{background:"#fff",border:"1px solid #f0f0f0",borderRadius:12,padding:14,marginTop:12}}>
          <p style={{fontWeight:700,fontSize:14,margin:0}}>💊 {m.drugName}{m.customName?` (${m.customName})`:""}</p>
          <p style={{fontSize:12,color:"#888",margin:"2px 0 10px"}}>Day {day} of {m.prescDays||"?"} · {AB_SOURCES.find(s=>s.v===m.source)?.l||"unknown source"}</p>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
            {[{v:"yes",l:"✓ Took it",c:"#2D6A4F"},{v:"missed",l:"✗ Missed",c:"#EF5350"},{v:"completed",l:"🎉 Course done",c:"#1565C0"},{v:"stopped",l:"⏹ Stopped",c:"#FF9800"}].map(o=>
              <button key={o.v} onClick={()=>setLogs(p=>({...p,[m.id]:{...log,taken:o.v}}))} style={{...Z.chip,fontSize:12,padding:"8px 10px",justifyContent:"center",...(log.taken===o.v?{background:o.c,color:"#fff",borderColor:o.c}:{})}}>{o.l}</button>
            )}
          </div>
          {log.taken==="stopped" && <div style={{marginTop:10}}>
            <Lb>Why did you stop?</Lb>
            <select value={log.reason||""} onChange={e=>setLogs(p=>({...p,[m.id]:{...log,reason:e.target.value}}))} style={Z.inp}>
              <option value="">Select reason…</option>
              {STOP_REASONS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
            </select>
          </div>}
          {log.taken==="missed" && <div style={{marginTop:8}}>
            <Lb>Why missed?</Lb>
            <input placeholder="e.g. forgot, felt sick" value={log.note||""} onChange={e=>setLogs(p=>({...p,[m.id]:{...log,note:e.target.value}}))} style={Z.inp} />
          </div>}
        </div>;
      })}
      <Pr tap={finish} mt={20} disabled={saving}>{saving?"Saving…":"Save medicine log ✓"}</Pr>
    </div>
  </div>;
}

// ═══════════════════ EPISODE DETAIL ═══════════════════
function Detail({ep,upd,back,nav}) {
  if (!ep) return null;
  const abTaking = ep.medicines.filter(m=>m.isAb&&m.adhStatus==="taking");
  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={back}/>} r={ep.status==="active"?<B t="Mark resolved" tap={()=>upd({...ep,status:"resolved",endDate:td()})} c="#2D6A4F"/>:null} />
    <div style={{padding:"0 20px"}}>
      <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
        <span style={{fontSize:30}}>{ep.syndrome?.icon||"🤒"}</span>
        <div>
          <h2 style={{fontSize:20,fontWeight:800,margin:0}}>{ep.syndrome?.label||"Illness"}</h2>
          <p style={{fontSize:12,color:"#888",margin:"2px 0"}}>{fmt(ep.startDate)}{ep.endDate?` → ${fmt(ep.endDate)}`:""} · <span style={{fontWeight:700,color:ep.status==="active"?"#FF9800":"#66BB6A"}}>{ep.status==="active"?"Active":"Resolved"}</span></p>
        </div>
      </div>

      <DS t="Symptoms"><div style={{display:"flex",flexWrap:"wrap",gap:6}}>
        {ep.symptoms.length===0?<Mu>None active</Mu>:ep.symptoms.map(s=><span key={s} style={Z.sc}>{s}</span>)}
      </div>
      {ep.severity && <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}><div style={{width:10,height:10,borderRadius:5,background:ep.severity.color}}/><span style={{fontWeight:600,fontSize:13}}>{ep.severity.label}</span></div>}
      </DS>

      <DS t="Healthcare visits" act={<B t="+ Add visit" tap={()=>nav("addvisit")} c="#2D6A4F" brd/>}>
        {ep.healthcareVisits.length===0?<Mu>None recorded</Mu>:ep.healthcareVisits.map((v,i)=>
          <div key={i} style={Z.it}>
            <p style={{fontWeight:700,fontSize:13,margin:0}}>{VISIT_TYPES.find(t=>t.v===v.type)?.l||v.type}</p>
            <p style={{fontSize:11,color:"#888",margin:"2px 0 0"}}>{fmt(v.date)}{v.outcome?` · ${v.outcome}`:""}{v.prescribedAb?" · 💊 Antibiotics prescribed":""}</p>
            {v.adviceSelfCare && <p style={{fontSize:11,color:"#999",margin:"2px 0 0"}}>ℹ️ Self-care / wait-and-see advice given</p>}
            {v.notes && <p style={{fontSize:11,color:"#aaa",margin:"2px 0 0"}}>{v.notes}</p>}
          </div>
        )}
      </DS>

      <DS t="Medicines" act={<B t="+ Add medicine" tap={()=>nav("addmed")} c="#2D6A4F" brd/>}>
        {ep.medicines.length===0?<Mu>None recorded</Mu>:ep.medicines.map((m,i)=>
          <div key={i} style={Z.it}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
              <div>
                <p style={{fontWeight:700,fontSize:13,margin:0}}>{m.isAb?"💊 ":""}{m.drugName}{m.customName?` (${m.customName})`:""}</p>
                <p style={{fontSize:11,color:"#888",margin:"2px 0 0"}}>
                  {AB_SOURCES.find(s=>s.v===m.source)?.l||""}{m.prescDays?` · ${m.prescDays}d prescribed`:""}{m.daysFromOnset!=null?` · started day ${m.daysFromOnset}`:""}
                </p>
              </div>
              {m.isAb && <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:10,
                background:m.adhStatus==="taking"?"#FFF3E0":m.adhStatus?.includes("completed")?"#E8F5E9":"#FFEBEE",
                color:m.adhStatus==="taking"?"#E65100":m.adhStatus?.includes("completed")?"#2E7D32":"#C62828",
              }}>{m.adhStatus==="taking"?"Taking":m.adhStatus?.includes("completed")?"Completed":"Stopped"}</span>}
            </div>
            {m.delayed && <p style={{fontSize:10,color:"#FF9800",fontWeight:700,margin:"3px 0 0"}}>⏳ Delayed / standby prescription</p>}
            {m.photoData && <p style={{fontSize:10,color:"#2D6A4F",fontWeight:700,margin:"3px 0 0"}}>📷 Photo attached</p>}
            {m.adhLogs && m.adhLogs.length>0 && <div style={{marginTop:6,paddingTop:6,borderTop:"1px solid #f5f5f5"}}>
              <p style={{fontSize:10,fontWeight:700,color:"#bbb",margin:"0 0 3px"}}>ADHERENCE LOG</p>
              {m.adhLogs.slice(-7).map((l,j)=><span key={j} style={{fontSize:11,color:"#666",marginRight:8}}>
                {fmt(l.date)}: {l.taken==="yes"?"✓":l.taken==="missed"?"✗":l.taken==="completed"?"🎉":"⏹"}
              </span>)}
            </div>}
          </div>
        )}
      </DS>

      {abTaking.length>0 && <button onClick={()=>nav("adherence")} style={{...Z.big,background:"#FF9800",marginTop:12}}>
        <span style={{fontSize:20}}>💊</span>
        <div><p style={{fontWeight:700,fontSize:14,margin:0}}>Log today's medicine</p><p style={{fontSize:12,margin:"2px 0 0",opacity:0.85}}>{abTaking.length} active course{abTaking.length>1?"s":""}</p></div>
      </button>}

      {ep.dailyLogs.length>0 && <DS t="Check-in log">{ep.dailyLogs.map((l,i)=>
        <div key={i} style={{...Z.it,padding:"8px 12px",display:"flex",gap:8,alignItems:"center"}}>
          <span style={{fontSize:12,color:"#888"}}>{fmt(l.date)}</span>
          <span style={{fontSize:12,fontWeight:600}}>{l.feeling==="worse"?"😞 Worse":l.feeling==="same"?"😐 Same":l.feeling==="better"?"🙂 Better":"😊 Recovered"}</span>
        </div>
      )}</DS>}
      <div style={{height:28}}/>
    </div>
  </div>;
}

// ═══════════════════ ADD HEALTHCARE VISIT ═══════════════════
function AddVisitScr({ep,onSave,back}) {
  const [v,setV] = useState({type:"",date:td(),outcome:"",prescribedAb:false,adviceSelfCare:false,notes:""});
  const [saving,setSaving] = useState(false);

  const doSave = async () => {
    if (!v.type) return;
    setSaving(true);
    await onSave(ep, v);
    setSaving(false);
    back();
  };

  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={back}/>} r={<span style={{fontSize:13,fontWeight:600,color:"#2D6A4F"}}>Healthcare visit</span>} />
    <div style={{padding:"0 20px"}}>
      <H>Where did you go?</H>
      <Sub>Includes pharmacies, community health workers, traditional healers</Sub>
      <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:10}}>
        {VISIT_TYPES.map(t=><button key={t.v} onClick={()=>setV(p=>({...p,type:t.v}))} style={{...Z.chip,...(v.type===t.v?Z.chipOn:{})}}>{t.l}</button>)}
      </div>
      <Lb mt={16}>Date of visit</Lb>
      <input type="date" value={v.date} max={td()} onChange={e=>setV(p=>({...p,date:e.target.value}))} style={Z.inp} />
      <Lb mt={12}>What happened?</Lb>
      <select value={v.outcome} onChange={e=>setV(p=>({...p,outcome:e.target.value}))} style={Z.inp}>
        <option value="">Select outcome…</option>{VISIT_OUTCOMES.map(o=><option key={o} value={o}>{o}</option>)}
      </select>
      <Tog on={v.prescribedAb} tap={()=>setV(p=>({...p,prescribedAb:!p.prescribedAb}))} l="Antibiotic prescribed?" mt={14} color="#FF9800" />
      {v.prescribedAb && <p style={{fontSize:12,color:"#FF9800",margin:"6px 0 0",fontWeight:600}}>💡 Add this antibiotic via "Add medicine" to track adherence</p>}
      <Tog on={v.adviceSelfCare} tap={()=>setV(p=>({...p,adviceSelfCare:!p.adviceSelfCare}))} l="Self-care / wait-and-see advice given?" mt={12} />
      <Lb mt={12}>Notes</Lb>
      <textarea value={v.notes} onChange={e=>setV(p=>({...p,notes:e.target.value}))} placeholder="Optional" style={{...Z.inp,height:52,resize:"vertical"}} />
      <Pr tap={doSave} mt={18} disabled={!v.type||saving}>{saving?"Saving…":"Save visit ✓"}</Pr>
    </div>
  </div>;
}

// ═══════════════════ ADD MEDICINE ═══════════════════
function AddMedScr({ep,onSave,back}) {
  const [m,setM] = useState({drugName:"",customName:"",isAb:false,source:"",daysFromOnset:ds(ep.startDate),prescDays:"",delayed:false,completed:null,notCompletedReason:"",photoData:null,startDate:td(),adhStatus:"na",adhLogs:[]});
  const fr = useRef(null);
  const [saving,setSaving] = useState(false);

  const doSave = async () => {
    if(!m.drugName&&!m.customName) return;
    setSaving(true);
    const med = {...m,adhStatus:m.isAb?"taking":"na",drugName:m.drugName==="__other"?m.customName:m.drugName};
    await onSave(ep, med);
    setSaving(false);
    back();
  };

  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={back}/>} r={<span style={{fontSize:13,fontWeight:600,color:"#2D6A4F"}}>Add medicine</span>} />
    <div style={{padding:"0 20px"}}>
      <H>What type of medicine?</H>
      <div style={{display:"flex",gap:8,marginTop:8}}>
        <button onClick={()=>setM(p=>({...p,isAb:true,drugName:""}))} style={{...Z.chip,flex:1,justifyContent:"center",padding:"10px 8px",...(m.isAb?{background:"#FF9800",color:"#fff",borderColor:"#FF9800"}:{})}}>💊 Antibiotic</button>
        <button onClick={()=>setM(p=>({...p,isAb:false,drugName:""}))} style={{...Z.chip,flex:1,justifyContent:"center",padding:"10px 8px",...(!m.isAb?{background:"#2D6A4F",color:"#fff",borderColor:"#2D6A4F"}:{})}}>💉 Other medicine</button>
      </div>
      {m.isAb && <div style={{background:"#FFF8E1",border:"1px solid #FFE082",borderRadius:10,padding:10,marginTop:10}}>
        <p style={{fontSize:12,color:"#E65100",fontWeight:600,margin:0}}>💡 Daily reminders will track whether you take this medicine</p>
      </div>}

      <Lb mt={14}>{m.isAb?"Antibiotic name *":"Medicine name *"}</Lb>
      <select value={m.drugName} onChange={e=>setM(p=>({...p,drugName:e.target.value}))} style={Z.inp}>
        <option value="">Select…</option>
        {(m.isAb?ANTIBIOTICS:OTHER_MEDS).map(a=><option key={a} value={a}>{a}</option>)}
        <option value="__other">Other (type below)</option>
      </select>
      {m.drugName==="__other" && <input placeholder="Type medicine name" value={m.customName} onChange={e=>setM(p=>({...p,customName:e.target.value}))} style={{...Z.inp,marginTop:8}} />}

      <Lb mt={14}>Source</Lb>
      <select value={m.source} onChange={e=>setM(p=>({...p,source:e.target.value}))} style={Z.inp}>
        <option value="">Where did you get it?</option>{AB_SOURCES.map(s=><option key={s.v} value={s.v}>{s.l}</option>)}
      </select>

      <Lb mt={14}>Days from symptom onset to starting</Lb>
      <input type="number" min={0} value={m.daysFromOnset} onChange={e=>setM(p=>({...p,daysFromOnset:parseInt(e.target.value)||0}))} style={Z.inp} />

      <Lb mt={14}>Duration prescribed (days)</Lb>
      <input type="number" min={1} placeholder="e.g. 7" value={m.prescDays} onChange={e=>setM(p=>({...p,prescDays:e.target.value}))} style={Z.inp} />

      <Tog on={m.delayed} tap={()=>setM(p=>({...p,delayed:!p.delayed}))} mt={14} l="Delayed / standby prescription?" sub="Told not to start unless symptoms worsen" color="#FF9800" />

      {!m.isAb && <><Lb mt={14}>Course completed?</Lb>
        <div style={{display:"flex",gap:8}}>
          {[{v:true,l:"Yes"},{v:false,l:"No"},{v:null,l:"Still taking"}].map(o=>
            <button key={String(o.v)} onClick={()=>setM(p=>({...p,completed:o.v}))} style={{...Z.chip,flex:1,justifyContent:"center",...(m.completed===o.v?Z.chipOn:{})}}>{o.l}</button>
          )}
        </div>
      </>}
      {m.completed===false && <><Lb mt={10}>Reason not completed</Lb>
        <select value={m.notCompletedReason} onChange={e=>setM(p=>({...p,notCompletedReason:e.target.value}))} style={Z.inp}>
          <option value="">Select…</option>{STOP_REASONS.map(r=><option key={r.v} value={r.v}>{r.l}</option>)}
        </select>
      </>}

      <Lb mt={18}>Photo of medicine (optional)</Lb>
      <input type="file" accept="image/*" capture="environment" ref={fr} onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=ev=>setM(p=>({...p,photoData:ev.target.result}));r.readAsDataURL(f);}} style={{display:"none"}} />
      <button onClick={()=>fr.current?.click()} style={Z.photo}>
        {m.photoData?<img src={m.photoData} alt="Medicine" style={{width:"100%",height:100,objectFit:"cover",borderRadius:8}}/>:<><span style={{fontSize:26}}>📷</span><span style={{fontSize:12,color:"#999"}}>Tap to photograph box or packaging</span></>}
      </button>

      <Pr tap={doSave} mt={18} disabled={(!m.drugName&&!m.customName)||saving}>{saving?"Saving…":m.isAb?"Save & start adherence tracking ✓":"Save medicine ✓"}</Pr>
      <div style={{height:24}}/>
    </div>
  </div>;
}

// ═══════════════════ HISTORY ═══════════════════
function History({eps,open,back}) {
  const sorted = [...eps].sort((a,b)=>b.startDate.localeCompare(a.startDate));
  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={back}/>} r={<span style={{fontSize:13,fontWeight:600,color:"#2D6A4F"}}>History</span>} />
    <div style={{padding:"0 20px"}}>
      {sorted.length===0?<div style={{textAlign:"center",paddingTop:60}}><span style={{fontSize:44,display:"block",marginBottom:10}}>📋</span><Mu>No episodes yet</Mu></div>
      :sorted.map(ep=><button key={ep.id} onClick={()=>open(ep)} style={Z.card}>
        <span style={{fontSize:26}}>{ep.syndrome?.icon||"🤒"}</span>
        <div style={{flex:1}}><p style={Z.ct}>{ep.syndrome?.label||"Illness"} <span style={{marginLeft:6,fontSize:11,fontWeight:700,color:ep.status==="active"?"#FF9800":"#66BB6A"}}>{ep.status==="active"?"● Active":"✓ Resolved"}</span></p>
        <p style={Z.cs}>{fmt(ep.startDate)}{ep.endDate?` → ${fmt(ep.endDate)}`:""} · {ep.medicines.length} med · {ep.healthcareVisits.length} visit</p></div>
        <span style={{color:"#ccc",fontSize:18}}>›</span>
      </button>)}
    </div>
  </div>;
}

// ═══════════════════ PROFILE ═══════════════════
function ProfileScr({prof,save,back}) {
  const [p,setP] = useState(prof||{sex:"",ageGroup:"",region:"",isHCW:false,hhSize:"",hhChildren:"",conditions:[],smoking:"",pregnant:"",recurrentUTI:false,lastGP:"",lastAb:"",lastMalaria:""});
  const [saving,setSaving] = useState(false);
  const togC = c => setP(pr=>({...pr,conditions:pr.conditions.includes(c)?pr.conditions.filter(x=>x!==c):[...pr.conditions,c]}));

  const doSave = async () => { setSaving(true); await save(p); setSaving(false); };

  return <div style={Z.scroll}>
    <TB l={<B t="← Back" tap={back}/>} r={<span style={{fontSize:13,fontWeight:600,color:"#2D6A4F"}}>Profile</span>} />
    <div style={{padding:"0 20px"}}>
      <p style={{fontSize:13,color:"#999",marginBottom:16}}>Baseline data — stored securely.</p>

      <p style={Z.lab}>Demographics</p>
      <Lb>Sex</Lb>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["Male","Female","Other / prefer not to say"].map(o=><button key={o} onClick={()=>setP(pr=>({...pr,sex:o}))} style={{...Z.chip,...(p.sex===o?Z.chipOn:{})}}>{o}</button>)}</div>
      <Lb mt={12}>Age group</Lb>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["0–5","6–15","16–35","36–55","56–70",">70"].map(o=><button key={o} onClick={()=>setP(pr=>({...pr,ageGroup:o}))} style={{...Z.chip,...(p.ageGroup===o?Z.chipOn:{})}}>{o}</button>)}</div>
      <Lb mt={12}>Setting</Lb>
      <div style={{display:"flex",gap:8}}>{["Urban","Peri-urban","Rural"].map(o=><button key={o} onClick={()=>setP(pr=>({...pr,region:o}))} style={{...Z.chip,...(p.region===o?Z.chipOn:{})}}>{o}</button>)}</div>
      <Tog on={p.isHCW} tap={()=>setP(pr=>({...pr,isHCW:!pr.isHCW}))} l="Healthcare worker" mt={12} />

      <p style={{...Z.lab,marginTop:20}}>Household</p>
      <Lb>People in household</Lb>
      <input type="number" min={1} value={p.hhSize} onChange={e=>setP(pr=>({...pr,hhSize:e.target.value}))} style={Z.inp} placeholder="e.g. 4" />
      <Lb mt={10}>Children under 16</Lb>
      <input type="number" min={0} value={p.hhChildren} onChange={e=>setP(pr=>({...pr,hhChildren:e.target.value}))} style={Z.inp} placeholder="e.g. 2" />

      <p style={{...Z.lab,marginTop:20}}>Health conditions</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{COMORBIDITIES.map(c=><button key={c.id} onClick={()=>togC(c.id)} style={{...Z.chip,fontSize:11,...(p.conditions.includes(c.id)?Z.chipOn:{})}}>{p.conditions.includes(c.id)?"✓ ":""}{c.l}</button>)}</div>

      <Lb mt={14}>Smoking</Lb>
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{["Current smoker","Ex-smoker","Never smoked"].map(o=><button key={o} onClick={()=>setP(pr=>({...pr,smoking:o}))} style={{...Z.chip,...(p.smoking===o?Z.chipOn:{})}}>{o}</button>)}</div>
      <Lb mt={12}>Currently pregnant?</Lb>
      <div style={{display:"flex",gap:8}}>{["Yes","No","N/A"].map(o=><button key={o} onClick={()=>setP(pr=>({...pr,pregnant:o}))} style={{...Z.chip,...(p.pregnant===o?Z.chipOn:{})}}>{o}</button>)}</div>
      <Tog on={p.recurrentUTI} tap={()=>setP(pr=>({...pr,recurrentUTI:!pr.recurrentUTI}))} l="Recurrent UTIs" mt={12} />

      <p style={{...Z.lab,marginTop:20}}>Recent history</p>
      {[{k:"lastGP",l:"Last GP / clinic visit"},{k:"lastAb",l:"Last antibiotic use"},{k:"lastMalaria",l:"Last malaria episode"}].map(f=>
        <div key={f.k}><Lb mt={10}>{f.l}</Lb><select value={p[f.k]} onChange={e=>setP(pr=>({...pr,[f.k]:e.target.value}))} style={Z.inp}>
          <option value="">Select…</option>{["Within last month","Within last 3 months","Within last year","More than a year ago","Never","Can't remember"].map(o=><option key={o} value={o}>{o}</option>)}
        </select></div>
      )}
      <Pr tap={doSave} mt={24} disabled={saving}>{saving?"Saving…":"Save profile ✓"}</Pr>
      <div style={{height:28}}/>
    </div>
  </div>;
}

// ═══════════════════ SHARED COMPONENTS ═══════════════════
function TB({l,r}) { return <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 20px 12px"}}>{l}{r}</div>; }
function B({t,tap,c,brd}) { return <button onClick={tap} style={{background:"none",border:brd?`1.5px solid ${c||"#2D6A4F"}`:"none",color:c||"#2D6A4F",fontSize:13,fontWeight:600,cursor:"pointer",padding:brd?"4px 12px":0,borderRadius:20}}>{t}</button>; }
function H({children,mt}) { return <h2 style={{fontSize:20,fontWeight:800,color:"#1a1a1a",margin:`${mt||0}px 0 4px`,letterSpacing:-0.3}}>{children}</h2>; }
function Sub({children}) { return <p style={{fontSize:13,color:"#999",margin:0}}>{children}</p>; }
function Lb({children,mt}) { return <label style={{display:"block",fontSize:12,fontWeight:700,color:"#666",marginTop:mt||0,marginBottom:5}}>{children}</label>; }
function Mu({children}) { return <p style={{fontSize:13,color:"#bbb",margin:0}}>{children}</p>; }
function Pr({children,tap,mt,disabled}) { return <button onClick={tap} disabled={disabled} style={{width:"100%",padding:14,background:disabled?"#ccc":"#2D6A4F",color:"#fff",border:"none",borderRadius:12,fontSize:15,fontWeight:700,cursor:disabled?"default":"pointer",marginTop:mt||0}}>{children}</button>; }
function Tog({on,tap,l,sub,mt,color}) {
  return <div style={{display:"flex",alignItems:"flex-start",gap:10,marginTop:mt||0}}>
    <button onClick={tap} style={{width:40,height:22,borderRadius:11,border:"none",background:on?(color||"#2D6A4F"):"#ddd",cursor:"pointer",position:"relative",padding:0,flexShrink:0}}>
      <div style={{width:18,height:18,borderRadius:9,background:"#fff",position:"absolute",top:2,transform:on?"translateX(20px)":"translateX(2px)",transition:"transform 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}} />
    </button>
    <div><span style={{fontSize:13,fontWeight:600}}>{l}</span>{sub&&<p style={{fontSize:11,color:"#999",margin:"2px 0 0"}}>{sub}</p>}</div>
  </div>;
}
function Chips({items,sel,tog}) {
  return <div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:12}}>
    {items.map(i=><button key={i} onClick={()=>tog(i)} style={{...Z.chip,...(sel.includes(i)?Z.chipOn:{})}}>{sel.includes(i)?"✓ ":""}{i}</button>)}
  </div>;
}
function DS({t,act,children}) {
  return <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid #f0f0f0"}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}><p style={Z.lab}>{t}</p>{act}</div>{children}
  </div>;
}

// ═══════════════════ STYLES ═══════════════════
const Z = {
  frame:{width:"100%",maxWidth:390,height:"100vh",maxHeight:844,margin:"0 auto",background:"#FAFAF7",display:"flex",flexDirection:"column",fontFamily:"'DM Sans',-apple-system,sans-serif",overflow:"hidden",boxShadow:"0 0 0 1px #e8e8e8"},
  status:{display:"flex",justifyContent:"space-between",padding:"6px 20px 2px",fontSize:11,color:"#1a1a1a"},
  body:{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"},
  scroll:{flex:1,overflowY:"auto",paddingBottom:16,WebkitOverflowScrolling:"touch"},
  nav:{display:"flex",justifyContent:"space-around",alignItems:"center",padding:"6px 8px 18px",background:"#fff",borderTop:"1px solid #f0f0f0"},
  navBtn:{background:"none",border:"none",display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",padding:"4px 10px"},
  card:{display:"flex",alignItems:"flex-start",gap:10,width:"100%",padding:"12px 14px",background:"#fff",border:"1px solid #f0f0f0",borderRadius:12,cursor:"pointer",marginBottom:6,textAlign:"left"},
  ct:{fontWeight:700,fontSize:14,margin:0,color:"#1a1a1a"},
  cs:{fontSize:12,color:"#888",margin:"2px 0 0"},
  lab:{fontSize:11,fontWeight:800,textTransform:"uppercase",letterSpacing:0.8,color:"#bbb",margin:"0 0 8px"},
  big:{display:"flex",alignItems:"center",gap:12,width:"100%",padding:16,background:"#2D6A4F",color:"#fff",border:"none",borderRadius:14,cursor:"pointer",textAlign:"left"},
  banner:{display:"flex",alignItems:"center",gap:10,width:"100%",padding:"10px 14px",background:"#FFF8E1",border:"1px solid #FFE082",borderRadius:10,cursor:"pointer",marginTop:14,color:"#1a1a1a",textAlign:"left"},
  track:{height:4,background:"#e8e8e8",borderRadius:2,overflow:"hidden",marginBottom:20},
  fill:{height:"100%",background:"#2D6A4F",borderRadius:2,transition:"width 0.3s"},
  syn:{display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"14px 6px",background:"#fff",border:"2px solid #f0f0f0",borderRadius:12,cursor:"pointer",textAlign:"center"},
  chip:{padding:"8px 14px",background:"#fff",border:"1.5px solid #e8e8e8",borderRadius:20,cursor:"pointer",fontSize:13,fontWeight:500,color:"#555",display:"flex",alignItems:"center",gap:4},
  chipOn:{background:"#2D6A4F",color:"#fff",borderColor:"#2D6A4F"},
  sev:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"2px solid #e8e8e8",borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%"},
  opt:{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:"#fff",border:"2px solid #e8e8e8",borderRadius:12,cursor:"pointer",textAlign:"left",width:"100%"},
  inp:{width:"100%",padding:"11px 14px",background:"#fff",border:"1.5px solid #e8e8e8",borderRadius:10,fontSize:14,color:"#1a1a1a",boxSizing:"border-box",marginTop:2},
  sc:{fontSize:11,padding:"3px 8px",background:"#E8F5E9",color:"#2D6A4F",borderRadius:20,fontWeight:600},
  it:{padding:"10px 12px",background:"#fff",border:"1px solid #f0f0f0",borderRadius:10,marginBottom:6},
  photo:{width:"100%",height:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:6,background:"#f5f5f5",border:"2px dashed #ddd",borderRadius:12,cursor:"pointer",overflow:"hidden",padding:0,marginTop:4},
};
