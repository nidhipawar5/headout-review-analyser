import { useState, useEffect } from "react";
import { listSchedules, saveSchedule, deleteSchedule, toggleSchedule } from "../lib/api.js";

const C = { surface:"#0F1623", card:"#131C2B", border:"#1C2942", teal:"#00D09C", muted:"#7A8BA8", dim:"#3D5070", red:"#F87171" };
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const FREQS = [["daily","Daily","Every day"],["weekly","Weekly","Once a week"],["biweekly","Bi-weekly","Every 2 weeks"],["monthly","Monthly","Once a month"]];
const EMPTY = { name:"", frequency:"weekly", dayOfWeek:1, dayOfMonth:1, time:"09:00", windowDays:7, recipients:"" };

const fmtWhen = s => {
  const fl = FREQS.find(f => f[0]===s.frequency)?.[1] ?? s.frequency;
  if (s.frequency==="weekly"||s.frequency==="biweekly") return `${fl} · ${DAYS[s.dayOfWeek??1]} at ${s.time}`;
  if (s.frequency==="monthly") return `${fl} · Day ${s.dayOfMonth} at ${s.time}`;
  return `${fl} at ${s.time}`;
};
const fmtLast = iso => iso ? new Date(iso).toLocaleString("en-IN",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"}) : "Never run";
const inp = (extra={}) => ({ width:"100%", padding:"9px 12px", borderRadius:9, border:`1px solid ${C.border}`, background:"#080D17", color:"#EDF2F7", fontSize:13, fontFamily:"inherit", outline:"none", ...extra });

export default function ScheduleScreen() {
  const [list,    setList]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [form,    setForm]    = useState(EMPTY);
  const [editId,  setEditId]  = useState(null);
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try { setList(await listSchedules()); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  function openNew()   { setForm(EMPTY); setEditId(null); setOpen(true); setError(""); }
  function openEdit(s) { setForm({...EMPTY,...s}); setEditId(s.id); setOpen(true); setError(""); }

  async function save() {
    if (!form.name.trim())       { setError("Name is required"); return; }
    if (!form.recipients.trim()) { setError("At least one recipient email is required"); return; }
    setSaving(true); setError("");
    try {
      await saveSchedule({ ...form, id: editId || undefined });
      await load();
      setOpen(false);
    } catch(e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function del(id) {
    if (!confirm("Delete this schedule?")) return;
    try { await deleteSchedule(id); await load(); }
    catch(e) { setError(e.message); }
  }

  async function tog(id) {
    try { await toggleSchedule(id); await load(); }
    catch(e) { setError(e.message); }
  }

  return (
    <div className="fade-up">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:"Syne,sans-serif", fontWeight:900, fontSize:22, marginBottom:4 }}>Scheduled Reports</h2>
          <p style={{ fontSize:13, color:C.muted }}>Auto-scrape, analyse and email the pulse on your schedule.</p>
        </div>
        <button onClick={openNew} style={{ padding:"9px 20px", borderRadius:10, border:"none", cursor:"pointer", background:`linear-gradient(135deg,${C.teal},#00A87A)`, color:"#080D17", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>
          + New Schedule
        </button>
      </div>

      {error && <div style={{ padding:"10px 16px", background:"#1F0707", border:"1px solid #7F1D1D", borderRadius:10, color:"#FCA5A5", fontSize:13, marginBottom:16 }}>⚠ {error} <button onClick={()=>setError("")} style={{float:"right",background:"none",border:"none",color:"#FCA5A5",cursor:"pointer"}}>✕</button></div>}

      {loading ? (
        <div style={{ textAlign:"center", padding:40, color:C.muted }}>
          <div style={{ width:28, height:28, border:`2px solid ${C.teal}`, borderTopColor:"transparent", borderRadius:"50%", animation:"spin 1s linear infinite", margin:"0 auto 12px" }} />
          Loading…
        </div>
      ) : list.length===0 ? (
        <div style={{ textAlign:"center", padding:"56px 24px", background:C.surface, border:`1px solid ${C.border}`, borderRadius:16 }}>
          <div style={{ fontSize:44, marginBottom:12 }}>📭</div>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:6 }}>No schedules yet</div>
          <div style={{ color:C.muted, fontSize:13, marginBottom:20 }}>Create one to automatically send weekly pulses.</div>
          <button onClick={openNew} style={{ padding:"9px 22px", borderRadius:10, border:`1px solid ${C.teal}`, cursor:"pointer", background:"transparent", color:C.teal, fontWeight:700, fontSize:13, fontFamily:"inherit" }}>+ Create first schedule</button>
        </div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {list.map(s => (
            <div key={s.id} style={{ background:C.surface, border:`1px solid ${s.active ? C.teal+"40" : C.border}`, borderRadius:14, padding:"16px 20px", display:"flex", gap:14, alignItems:"center", flexWrap:"wrap" }}>
              {/* Toggle */}
              <div onClick={()=>tog(s.id)} style={{ cursor:"pointer", flexShrink:0 }}>
                <div style={{ width:40, height:22, borderRadius:11, background: s.active ? C.teal : C.dim, position:"relative", transition:"background .2s" }}>
                  <div style={{ position:"absolute", top:2, left: s.active ? 20 : 2, width:18, height:18, borderRadius:"50%", background:"#fff", transition:"left .2s" }} />
                </div>
              </div>
              {/* Info */}
              <div style={{ flex:1, minWidth:180 }}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:3 }}>{s.name}</div>
                <div style={{ fontSize:12, color:C.muted }}>🕐 {fmtWhen(s)} &nbsp;·&nbsp; 📅 {s.windowDays}-day window &nbsp;·&nbsp; ✉️ {s.recipients?.split(",").length??1} recipient(s)</div>
              </div>
              {/* Last run */}
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontSize:11, fontWeight:700, color: s.lastStatus==="success" ? C.teal : s.lastStatus==="failed" ? C.red : C.dim }}>
                  {s.lastStatus==="success" ? "✓ OK" : s.lastStatus==="failed" ? "✗ Failed" : "Not yet run"}
                </div>
                <div style={{ fontSize:11, color:C.dim }}>{fmtLast(s.lastRun)}</div>
              </div>
              {/* Buttons */}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>openEdit(s)} style={{ padding:"5px 12px", borderRadius:8, border:`1px solid ${C.border}`, cursor:"pointer", background:"transparent", color:C.muted, fontSize:12, fontFamily:"inherit" }}>Edit</button>
                <button onClick={()=>del(s.id)}   style={{ padding:"5px 12px", borderRadius:8, border:"1px solid #7F1D1D", cursor:"pointer", background:"transparent", color:C.red, fontSize:12, fontFamily:"inherit" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:18, padding:28, width:"100%", maxWidth:480, maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:22 }}>
              <h3 style={{ fontFamily:"Syne,sans-serif", fontWeight:900, fontSize:18 }}>{editId ? "Edit Schedule" : "New Schedule"}</h3>
              <button onClick={()=>setOpen(false)} style={{ background:"none", border:"none", color:C.muted, cursor:"pointer", fontSize:20 }}>✕</button>
            </div>

            {error && <div style={{ padding:"8px 12px", background:"#1F0707", border:"1px solid #7F1D1D", borderRadius:8, color:"#FCA5A5", fontSize:12, marginBottom:14 }}>⚠ {error}</div>}

            <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
              {/* Name */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Schedule Name</label>
                <input style={inp()} placeholder="e.g. Weekly Team Pulse" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} />
              </div>

              {/* Frequency */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Frequency</label>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                  {FREQS.map(([val,label,desc]) => (
                    <div key={val} onClick={()=>setForm(f=>({...f,frequency:val}))} style={{ padding:"10px 12px", borderRadius:10, cursor:"pointer", border:`1px solid ${form.frequency===val ? C.teal : C.border}`, background: form.frequency===val ? `${C.teal}10` : C.card }}>
                      <div style={{ fontWeight:700, fontSize:13, color: form.frequency===val ? C.teal : "#EDF2F7" }}>{label}</div>
                      <div style={{ fontSize:11, color:C.muted }}>{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Day of week */}
              {(form.frequency==="weekly"||form.frequency==="biweekly") && (
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Day of Week</label>
                  <select style={inp()} value={form.dayOfWeek} onChange={e=>setForm(f=>({...f,dayOfWeek:+e.target.value}))}>
                    {DAYS.map((d,i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              )}

              {/* Day of month */}
              {form.frequency==="monthly" && (
                <div>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Day of Month</label>
                  <select style={inp()} value={form.dayOfMonth} onChange={e=>setForm(f=>({...f,dayOfMonth:+e.target.value}))}>
                    {Array.from({length:28},(_,i)=>i+1).map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              )}

              {/* Time */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Time</label>
                <input type="time" style={inp()} value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} />
              </div>

              {/* Window */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Review Window</label>
                <div style={{ display:"flex", gap:8 }}>
                  {[7,14,21,28].map(d => (
                    <button key={d} onClick={()=>setForm(f=>({...f,windowDays:d}))} style={{ flex:1, padding:"8px 0", borderRadius:8, cursor:"pointer", border:`1px solid ${form.windowDays===d ? C.teal : C.border}`, background: form.windowDays===d ? `${C.teal}15` : "transparent", color: form.windowDays===d ? C.teal : C.muted, fontWeight: form.windowDays===d ? 700 : 400, fontSize:13, fontFamily:"inherit" }}>{d}d</button>
                  ))}
                </div>
              </div>

              {/* Recipients */}
              <div>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:C.muted, textTransform:"uppercase", marginBottom:6 }}>Recipients (comma-separated)</label>
                <textarea rows={2} style={inp({resize:"none"})} placeholder="pm@company.com, ceo@company.com" value={form.recipients} onChange={e=>setForm(f=>({...f,recipients:e.target.value}))} />
              </div>

              {/* Preview */}
              {form.name && (
                <div style={{ padding:"10px 14px", background:`${C.teal}08`, border:`1px solid ${C.teal}25`, borderRadius:10, fontSize:12, color:C.teal }}>
                  📋 {form.name} — {fmtWhen(form)} — {form.windowDays}d window
                </div>
              )}

              {/* Actions */}
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setOpen(false)} style={{ flex:1, padding:"10px 0", borderRadius:10, border:`1px solid ${C.border}`, cursor:"pointer", background:"transparent", color:C.muted, fontFamily:"inherit", fontSize:13 }}>Cancel</button>
                <button onClick={save} disabled={saving} style={{ flex:2, padding:"10px 0", borderRadius:10, border:"none", cursor: saving ? "not-allowed" : "pointer", background:`linear-gradient(135deg,${C.teal},#00A87A)`, color:"#080D17", fontWeight:800, fontSize:14, fontFamily:"inherit", opacity: saving ? .7 : 1 }}>
                  {saving ? "Saving…" : editId ? "Update" : "Save Schedule"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
