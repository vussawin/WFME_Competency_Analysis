import { useState, useEffect, useCallback, useMemo } from "react";
import { BarChart, Bar, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, ComposedChart, Area } from "recharts";
import _ from "lodash";

// ─── Theme & Constants ────────────────────────────────────────
const COLORS = {
  bg: "#0B1120", surface: "#111827", surfaceAlt: "#1A2332",
  border: "#1E2D3D", borderLight: "#2A3A4A",
  primary: "#3B82F6", primaryDark: "#2563EB", primaryLight: "#60A5FA",
  accent: "#10B981", accentDark: "#059669",
  warn: "#F59E0B", warnDark: "#D97706",
  danger: "#EF4444", dangerDark: "#DC2626",
  text: "#F1F5F9", textMuted: "#94A3B8", textDim: "#64748B",
  gold: "#FBBF24", teal: "#14B8A6", purple: "#A78BFA", rose: "#FB7185",
};
const PLO_LABELS = [
  "คุณธรรม จริยธรรม","ความรู้ทางการแพทย์","ทักษะการวิเคราะห์","การสื่อสาร","การทำงานร่วมกัน","การเรียนรู้ตลอดชีวิต","การทำงานในชุมชน"
];
const YEAR_LABELS = ["ปี 1","ปี 2","ปี 3","ปี 4","ปี 5","ปี 6"];
const WFME_DOMAINS = [
  "Medical Knowledge","Clinical Skills","Professional Values","Communication","Population Health","Critical Thinking","Lifelong Learning","Interprofessional"
];
const NL_LABELS = ["NL1 (ปี 3)","NL2 (ปี 5)","NL3 (ปี 6)"];

// ─── Sample Data Generator ────────────────────────────────────
function generateSampleData() {
  const r = (min, max) => +(min + Math.random() * (max - min)).toFixed(1);
  const ploAchievement = PLO_LABELS.map((name, i) => ({
    name, short: `PLO ${i+1}`,
    y1: r(70,95), y2: r(72,96), y3: r(75,97), y4: r(78,98), y5: r(80,99), y6: r(82,99),
    employer: r(3.2,4.8), graduate: r(3.4,4.9), target: 80
  }));
  const nlData = [
    { name: "NL1 (ปี 3)", passRate: r(82,96), mean: r(58,72), national: r(78,88) },
    { name: "NL2 (ปี 5)", passRate: r(85,98), mean: r(60,75), national: r(80,90) },
    { name: "NL3 (ปี 6)", passRate: r(88,99), mean: r(62,78), national: r(82,92) },
  ];
  const trendData = Array.from({length:5}, (_,i) => ({
    year: `${2564+i}`, graduation: r(88,98), nlPass: r(82,97), employer: r(3.3,4.7)*20, retention: r(75,95),
  }));
  const courseData = Array.from({length:8}, (_,i) => ({
    name: `วิชา ${i+1}`, cloAchieve: r(70,98), reliability: r(0.65,0.95), difficulty: r(0.3,0.7), discrimination: r(0.15,0.45), passRate: r(75,99),
  }));
  const yearPromotion = YEAR_LABELS.map((name, i) => ({
    name, promoted: r(88,99), retained: r(1,8), withdrawn: r(0.5,4),
  }));
  const radarData = WFME_DOMAINS.map(d => ({
    domain: d, score: r(60,98), benchmark: r(70,85)
  }));
  const assessmentQuality = [
    { type: "MCQ", reliability: r(0.7,0.92), validity: r(0.6,0.85), count: Math.floor(r(200,500)) },
    { type: "OSCE", reliability: r(0.72,0.9), validity: r(0.65,0.88), count: Math.floor(r(30,80)) },
    { type: "Mini-CEX", reliability: r(0.6,0.85), validity: r(0.7,0.9), count: Math.floor(r(100,300)) },
    { type: "Portfolio", reliability: r(0.55,0.8), validity: r(0.6,0.82), count: Math.floor(r(50,150)) },
    { type: "EPA", reliability: r(0.65,0.88), validity: r(0.72,0.92), count: Math.floor(r(80,200)) },
  ];
  const studentFlow = YEAR_LABELS.map((name,i) => ({
    name, total: Math.floor(r(180,220)), pass: Math.floor(r(160,210)), fail: Math.floor(r(2,15)), withdraw: Math.floor(r(1,8)), remediate: Math.floor(r(3,12)),
  }));
  return { ploAchievement, nlData, trendData, courseData, yearPromotion, radarData, assessmentQuality, studentFlow };
}

// ─── Utility Components ───────────────────────────────────────
const Badge = ({ children, color = COLORS.primary }) => (
  <span style={{ background: color+"22", color, padding: "2px 10px", borderRadius: 20, fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>{children}</span>
);
const StatusDot = ({ value, threshold = 80 }) => {
  const c = value >= 90 ? COLORS.accent : value >= threshold ? COLORS.primary : value >= 70 ? COLORS.warn : COLORS.danger;
  return <span style={{ display:"inline-block", width:10, height:10, borderRadius:"50%", background:c, marginRight:6, boxShadow:`0 0 6px ${c}66` }} />;
};

function KPICard({ label, value, unit, trend, color = COLORS.primary, icon }) {
  const trendColor = trend > 0 ? COLORS.accent : trend < 0 ? COLORS.danger : COLORS.textMuted;
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: "20px 24px", position: "relative", overflow: "hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background: `linear-gradient(90deg, ${color}, ${color}44)` }} />
      <div style={{ fontSize: 12, color: COLORS.textMuted, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 8 }}>{icon} {label}</div>
      <div style={{ fontSize: 32, fontWeight: 800, color: COLORS.text, fontFamily: "'JetBrains Mono', monospace" }}>
        {value}<span style={{ fontSize: 14, color: COLORS.textMuted, marginLeft: 4 }}>{unit}</span>
      </div>
      {trend !== undefined && (
        <div style={{ fontSize: 12, color: trendColor, marginTop: 6, fontWeight: 600 }}>
          {trend > 0 ? "▲" : trend < 0 ? "▼" : "●"} {Math.abs(trend)}% vs ปีก่อน
        </div>
      )}
    </div>
  );
}

function DataTable({ columns, data, maxH = 400 }) {
  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: maxH, borderRadius: 12, border: `1px solid ${COLORS.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr>{columns.map((c,i) => (
            <th key={i} style={{ position:"sticky", top:0, background: COLORS.surfaceAlt, color: COLORS.textMuted, padding: "10px 14px", textAlign: c.align || "left", borderBottom: `2px solid ${COLORS.border}`, fontWeight: 600, letterSpacing: 0.5, fontSize: 11, textTransform: "uppercase", whiteSpace: "nowrap", zIndex: 2 }}>{c.label}</th>
          ))}</tr>
        </thead>
        <tbody>{data.map((row, ri) => (
          <tr key={ri} style={{ background: ri%2 === 0 ? "transparent" : COLORS.surfaceAlt+"66" }}>
            {columns.map((c,ci) => (
              <td key={ci} style={{ padding: "9px 14px", borderBottom: `1px solid ${COLORS.border}44`, color: COLORS.text, textAlign: c.align || "left", whiteSpace: "nowrap" }}>
                {c.render ? c.render(row[c.key], row) : row[c.key]}
              </td>
            ))}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

function SectionCard({ title, subtitle, children, action }) {
  return (
    <div style={{ background: COLORS.surface, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 24, marginBottom: 20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: subtitle ? 4 : 16 }}>
        <h3 style={{ color: COLORS.text, fontSize: 16, fontWeight: 700, margin: 0 }}>{title}</h3>
        {action}
      </div>
      {subtitle && <p style={{ color: COLORS.textDim, fontSize: 12, margin: "0 0 16px 0" }}>{subtitle}</p>}
      {children}
    </div>
  );
}

// ─── PLO Heatmap ──────────────────────────────────────────────
function PLOHeatmap({ data }) {
  const getColor = (v) => v >= 90 ? "#10B981" : v >= 80 ? "#3B82F6" : v >= 70 ? "#F59E0B" : "#EF4444";
  const getTextColor = (v) => v >= 70 ? "#fff" : "#fff";
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width:"100%", borderCollapse:"separate", borderSpacing: 3, fontSize: 12 }}>
        <thead><tr>
          <th style={{ padding: "8px 12px", color: COLORS.textMuted, textAlign:"left", fontSize: 11 }}>PLO</th>
          {YEAR_LABELS.map(y => <th key={y} style={{ padding: "8px 6px", color: COLORS.textMuted, textAlign:"center", fontSize: 11 }}>{y}</th>)}
          <th style={{ padding: "8px 6px", color: COLORS.textMuted, textAlign:"center", fontSize: 11 }}>ผู้ใช้บัณฑิต</th>
        </tr></thead>
        <tbody>{data.map((row, i) => (
          <tr key={i}>
            <td style={{ padding: "6px 12px", color: COLORS.text, fontWeight: 600, fontSize: 11, whiteSpace:"nowrap" }}>{row.short} {row.name.substring(0,12)}</td>
            {["y1","y2","y3","y4","y5","y6"].map(k => (
              <td key={k} style={{ padding: "8px 6px", textAlign:"center", background: getColor(row[k])+"CC", color: getTextColor(row[k]), borderRadius: 6, fontWeight: 700, fontFamily: "monospace", fontSize: 12 }}>{row[k]}%</td>
            ))}
            <td style={{ padding: "8px 6px", textAlign:"center", background: row.employer >= 3.5 ? COLORS.accent+"CC" : COLORS.warn+"CC", color: "#fff", borderRadius: 6, fontWeight: 700, fontFamily: "monospace", fontSize: 12 }}>{row.employer}/5</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  );
}

// ─── Data Input Modal ─────────────────────────────────────────
function DataInputPanel({ data, onUpdate, onClose }) {
  const [tab, setTab] = useState("plo");
  const [editData, setEditData] = useState(JSON.parse(JSON.stringify(data)));
  const [importing, setImporting] = useState(false);

  const handleCSVImport = useCallback(() => {
    setImporting(true);
    setTimeout(() => { setImporting(false); alert("นำเข้าข้อมูลสำเร็จ (Demo)"); }, 1500);
  }, []);

  const handleSave = () => { onUpdate(editData); onClose(); };

  const inputStyle = { background: COLORS.surfaceAlt, border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "8px 12px", color: COLORS.text, fontSize: 13, width: "100%", outline: "none", fontFamily: "monospace" };
  const tabStyle = (active) => ({ padding: "8px 16px", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: active ? COLORS.primary : "transparent", color: active ? "#fff" : COLORS.textMuted, transition: "all 0.2s" });

  const tabs = [
    { id:"plo", label:"PLO Achievement" },
    { id:"nl", label:"ผล NL Exam" },
    { id:"course", label:"รายวิชา" },
    { id:"trend", label:"แนวโน้มรายปี" },
  ];

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding: 20 }}>
      <div style={{ background: COLORS.bg, border:`1px solid ${COLORS.border}`, borderRadius:20, width:"100%", maxWidth:900, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"20px 24px", borderBottom:`1px solid ${COLORS.border}`, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <h2 style={{ color:COLORS.text, margin:0, fontSize:18, fontWeight:700 }}>📥 นำเข้าและแก้ไขข้อมูล</h2>
            <p style={{ color:COLORS.textDim, margin:"4px 0 0", fontSize:12 }}>แก้ไขข้อมูลโดยตรง หรือนำเข้าจากไฟล์ CSV/Excel</p>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button onClick={handleCSVImport} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${COLORS.border}`, background:"transparent", color:COLORS.textMuted, cursor:"pointer", fontSize:12 }}>
              {importing ? "⏳ กำลังนำเข้า..." : "📎 นำเข้า CSV"}
            </button>
            <button onClick={handleSave} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:COLORS.accent, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>
              💾 บันทึก
            </button>
            <button onClick={onClose} style={{ padding:"8px 16px", borderRadius:8, border:`1px solid ${COLORS.border}`, background:"transparent", color:COLORS.textMuted, cursor:"pointer", fontSize:12 }}>✕</button>
          </div>
        </div>
        <div style={{ padding:"12px 24px", borderBottom:`1px solid ${COLORS.border}`, display:"flex", gap:4 }}>
          {tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id)}>{t.label}</button>)}
        </div>
        <div style={{ flex:1, overflow:"auto", padding:24 }}>
          {tab === "plo" && (
            <div>
              <p style={{ color:COLORS.textMuted, fontSize:12, marginBottom:16 }}>ร้อยละนักศึกษาที่บรรลุ PLO แต่ละข้อ แยกตามชั้นปี</p>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead><tr>
                    <th style={{ padding:"8px 12px", color:COLORS.textMuted, textAlign:"left", borderBottom:`1px solid ${COLORS.border}`, fontSize:11 }}>PLO</th>
                    {YEAR_LABELS.map(y => <th key={y} style={{ padding:"8px", color:COLORS.textMuted, textAlign:"center", borderBottom:`1px solid ${COLORS.border}`, fontSize:11 }}>{y}</th>)}
                    <th style={{ padding:"8px", color:COLORS.textMuted, textAlign:"center", borderBottom:`1px solid ${COLORS.border}`, fontSize:11 }}>ผู้ใช้บัณฑิต</th>
                  </tr></thead>
                  <tbody>{editData.ploAchievement.map((row, ri) => (
                    <tr key={ri}>
                      <td style={{ padding:"6px 12px", color:COLORS.text, fontSize:12, whiteSpace:"nowrap" }}>{row.short} {row.name.substring(0,15)}</td>
                      {["y1","y2","y3","y4","y5","y6"].map(k => (
                        <td key={k} style={{ padding:4 }}>
                          <input type="number" value={row[k]} onChange={e => {
                            const nd = {...editData}; nd.ploAchievement[ri][k] = +e.target.value; setEditData(nd);
                          }} style={{...inputStyle, width:60, textAlign:"center", padding:"6px 4px"}} />
                        </td>
                      ))}
                      <td style={{ padding:4 }}>
                        <input type="number" step="0.1" value={row.employer} onChange={e => {
                          const nd = {...editData}; nd.ploAchievement[ri].employer = +e.target.value; setEditData(nd);
                        }} style={{...inputStyle, width:60, textAlign:"center", padding:"6px 4px"}} />
                      </td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "nl" && (
            <div>
              <p style={{ color:COLORS.textMuted, fontSize:12, marginBottom:16 }}>ผลสอบ National License Examination</p>
              {editData.nlData.map((row,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:12, marginBottom:12, padding:16, background:COLORS.surfaceAlt, borderRadius:12 }}>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>การสอบ</label><div style={{ color:COLORS.text, fontWeight:600 }}>{row.name}</div></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>อัตราผ่าน (%)</label><input type="number" value={row.passRate} onChange={e => { const d={...editData}; d.nlData[i].passRate=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>คะแนนเฉลี่ย</label><input type="number" value={row.mean} onChange={e => { const d={...editData}; d.nlData[i].mean=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>ค่าเฉลี่ยประเทศ</label><input type="number" value={row.national} onChange={e => { const d={...editData}; d.nlData[i].national=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                </div>
              ))}
            </div>
          )}
          {tab === "course" && (
            <div>
              <p style={{ color:COLORS.textMuted, fontSize:12, marginBottom:16 }}>ข้อมูลคุณภาพรายวิชาและผลสัมฤทธิ์</p>
              <div style={{ overflowX:"auto" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead><tr>
                    {["รายวิชา","CLO Achieve %","Reliability (α)","Difficulty (p)","Discrimination (D)","Pass Rate %"].map(h =>
                      <th key={h} style={{ padding:"8px", color:COLORS.textMuted, textAlign:"center", borderBottom:`1px solid ${COLORS.border}`, fontSize:11 }}>{h}</th>
                    )}
                  </tr></thead>
                  <tbody>{editData.courseData.map((row,ri) => (
                    <tr key={ri}>
                      {["name","cloAchieve","reliability","difficulty","discrimination","passRate"].map(k => (
                        <td key={k} style={{ padding:4 }}>
                          <input value={row[k]} onChange={e => { const d={...editData}; d.courseData[ri][k] = k==="name" ? e.target.value : +e.target.value; setEditData(d); }} style={{...inputStyle, textAlign:"center", padding:"6px 4px"}} />
                        </td>
                      ))}
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
          {tab === "trend" && (
            <div>
              <p style={{ color:COLORS.textMuted, fontSize:12, marginBottom:16 }}>ข้อมูลแนวโน้มรายปี (5 ปีย้อนหลัง)</p>
              {editData.trendData.map((row,i) => (
                <div key={i} style={{ display:"grid", gridTemplateColumns:"0.8fr 1fr 1fr 1fr 1fr", gap:12, marginBottom:12, padding:16, background:COLORS.surfaceAlt, borderRadius:12 }}>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>ปีการศึกษา</label><div style={{ color:COLORS.text, fontWeight:600 }}>{row.year}</div></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>อัตราสำเร็จ (%)</label><input type="number" value={row.graduation} onChange={e => { const d={...editData}; d.trendData[i].graduation=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>NL Pass (%)</label><input type="number" value={row.nlPass} onChange={e => { const d={...editData}; d.trendData[i].nlPass=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>ผู้ใช้บัณฑิต (x20)</label><input type="number" value={row.employer} onChange={e => { const d={...editData}; d.trendData[i].employer=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                  <div><label style={{ color:COLORS.textMuted, fontSize:11, display:"block", marginBottom:4 }}>Retention (%)</label><input type="number" value={row.retention} onChange={e => { const d={...editData}; d.trendData[i].retention=+e.target.value; setEditData(d); }} style={inputStyle} /></div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Analysis Engine ──────────────────────────────────────────
function runAnalysis(data) {
  const { ploAchievement, nlData, courseData, trendData, assessmentQuality, studentFlow } = data;
  const findings = [];
  const actions = [];

  // PLO Analysis
  ploAchievement.forEach(p => {
    const avg = (p.y1+p.y2+p.y3+p.y4+p.y5+p.y6)/6;
    if (avg < 70) { findings.push({ level:"วิกฤต", area: p.short, detail: `${p.name}: ค่าเฉลี่ยรวม ${avg.toFixed(1)}% ต่ำกว่าเกณฑ์มาก`, color: COLORS.danger }); actions.push({ priority:"เร่งด่วน", action:`ทบทวนรายวิชาที่รองรับ ${p.short} ทั้งหมด จัดทำแผนปรับปรุงเร่งด่วน` }); }
    else if (avg < 80) { findings.push({ level:"ต้องปรับปรุง", area: p.short, detail: `${p.name}: ค่าเฉลี่ย ${avg.toFixed(1)}% ต่ำกว่าเป้าหมาย 80%`, color: COLORS.warn }); actions.push({ priority:"สำคัญ", action:`วิเคราะห์ Root Cause ของ ${p.short} และจัดทำแผนปรับปรุง` }); }
    if (p.y6 < p.y4) { findings.push({ level:"แนวโน้มลดลง", area: p.short, detail: `${p.name}: ชั้นคลินิก (${p.y6}%) ต่ำกว่าชั้น ปี 4 (${p.y4}%)`, color: COLORS.warn }); }
    if (p.employer < 3.5) { findings.push({ level:"ต้องปรับปรุง", area: p.short, detail: `ผู้ใช้บัณฑิตให้คะแนน ${p.name} เพียง ${p.employer}/5.0`, color: COLORS.warn }); }
  });

  // NL Analysis
  nlData.forEach(nl => {
    if (nl.passRate < nl.national) { findings.push({ level:"ต้องปรับปรุง", area: nl.name, detail: `อัตราผ่าน ${nl.passRate}% ต่ำกว่าค่าเฉลี่ยประเทศ (${nl.national}%)`, color: COLORS.warn }); }
    if (nl.passRate < 80) { findings.push({ level:"วิกฤต", area: nl.name, detail: `อัตราผ่าน ${nl.passRate}% ต่ำกว่าเกณฑ์ขั้นต่ำ`, color: COLORS.danger }); }
  });

  // Course Quality
  courseData.forEach(c => {
    if (c.reliability < 0.7) { findings.push({ level:"คุณภาพเครื่องมือ", area: c.name, detail: `Reliability (α=${c.reliability}) ต่ำกว่าเกณฑ์ 0.70`, color: COLORS.warn }); actions.push({ priority:"สำคัญ", action:`ปรับปรุงข้อสอบ ${c.name} เพื่อเพิ่มค่าความเชื่อมั่น` }); }
    if (c.discrimination < 0.2) { findings.push({ level:"คุณภาพเครื่องมือ", area: c.name, detail: `Discrimination Index (${c.discrimination}) ต่ำ - ข้อสอบไม่จำแนกผู้เรียน`, color: COLORS.danger }); }
  });

  // Trend Analysis
  if (trendData.length >= 3) {
    const recent = trendData.slice(-3);
    if (recent[2].nlPass < recent[0].nlPass && recent[1].nlPass < recent[0].nlPass) {
      findings.push({ level:"แนวโน้มลดลง", area:"NL Pass Rate", detail:"อัตราสอบผ่าน NL ลดลงต่อเนื่อง 3 ปี", color: COLORS.danger });
      actions.push({ priority:"เร่งด่วน", action:"ทบทวนหลักสูตรและระบบเตรียมสอบ NL อย่างเร่งด่วน" });
    }
  }

  // Overall PLO summary
  const overallPLO = ploAchievement.map(p => (p.y1+p.y2+p.y3+p.y4+p.y5+p.y6)/6);
  const avgAll = _.mean(overallPLO);
  const status = avgAll >= 90 ? "ดีเยี่ยม" : avgAll >= 80 ? "ดี" : avgAll >= 70 ? "ต้องปรับปรุง" : "วิกฤต";

  return { findings: _.sortBy(findings, f => f.level === "วิกฤต" ? 0 : f.level === "ต้องปรับปรุง" ? 1 : 2), actions, overallScore: avgAll, status };
}

// ─── Main App ─────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(() => generateSampleData());
  const [activeTab, setActiveTab] = useState("dashboard");
  const [showInput, setShowInput] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  useEffect(() => { setAnalysisResult(runAnalysis(data)); }, [data]);

  const statusColor = analysisResult?.status === "ดีเยี่ยม" ? COLORS.accent : analysisResult?.status === "ดี" ? COLORS.primary : analysisResult?.status === "ต้องปรับปรุง" ? COLORS.warn : COLORS.danger;

  const navItems = [
    { id:"dashboard", icon:"📊", label:"Dashboard" },
    { id:"plo", icon:"🎯", label:"PLO Analysis" },
    { id:"course", icon:"📚", label:"รายวิชา" },
    { id:"trend", icon:"📈", label:"แนวโน้ม" },
    { id:"findings", icon:"🔍", label:"ผลวิเคราะห์" },
  ];

  return (
    <div style={{ minHeight:"100vh", background: COLORS.bg, color: COLORS.text, fontFamily: "'Noto Sans Thai', 'Segoe UI', sans-serif" }}>
      {showInput && <DataInputPanel data={data} onUpdate={setData} onClose={() => setShowInput(false)} />}

      {/* Header */}
      <div style={{ background: `linear-gradient(135deg, ${COLORS.surface} 0%, ${COLORS.bg} 100%)`, borderBottom: `1px solid ${COLORS.border}`, padding: "16px 24px", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(12px)" }}>
        <div style={{ maxWidth:1400, margin:"0 auto", display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:40, height:40, borderRadius:12, background:`linear-gradient(135deg, ${COLORS.primary}, ${COLORS.teal})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🏥</div>
            <div>
              <h1 style={{ margin:0, fontSize:16, fontWeight:800, letterSpacing:-0.5 }}>WFME Competency Analysis</h1>
              <div style={{ fontSize:11, color:COLORS.textDim }}>ระบบวิเคราะห์สมรรถนะนักศึกษาแพทย์ | หลักสูตร พ.ศ. 2562</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            {analysisResult && (
              <Badge color={statusColor}>สถานะ: {analysisResult.status} ({analysisResult.overallScore.toFixed(1)}%)</Badge>
            )}
            <button onClick={() => setShowInput(true)} style={{ padding:"8px 18px", borderRadius:10, border:"none", background:`linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:700, boxShadow:`0 2px 12px ${COLORS.primary}44` }}>
              📥 นำเข้าข้อมูล
            </button>
            <button onClick={() => setData(generateSampleData())} style={{ padding:"8px 18px", borderRadius:10, border:`1px solid ${COLORS.border}`, background:"transparent", color:COLORS.textMuted, cursor:"pointer", fontSize:12 }}>
              🔄 ข้อมูลตัวอย่าง
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"12px 24px 0" }}>
        <div style={{ display:"flex", gap:4, borderBottom:`1px solid ${COLORS.border}`, paddingBottom:0 }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => setActiveTab(n.id)} style={{
              padding:"10px 18px", border:"none", cursor:"pointer", fontSize:13, fontWeight:600,
              background: activeTab===n.id ? COLORS.surfaceAlt : "transparent",
              color: activeTab===n.id ? COLORS.primary : COLORS.textMuted,
              borderBottom: activeTab===n.id ? `2px solid ${COLORS.primary}` : "2px solid transparent",
              borderRadius: "8px 8px 0 0", transition:"all 0.2s"
            }}>{n.icon} {n.label}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth:1400, margin:"0 auto", padding:"20px 24px 40px" }}>

        {/* ─── DASHBOARD TAB ─── */}
        {activeTab === "dashboard" && (
          <div>
            {/* KPI Row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))", gap:16, marginBottom:20 }}>
              <KPICard label="PLO Achievement เฉลี่ย" value={analysisResult?.overallScore.toFixed(1)} unit="%" trend={2.3} color={statusColor} icon="🎯" />
              <KPICard label="NL Pass Rate ล่าสุด" value={data.nlData[2].passRate} unit="%" trend={1.5} color={COLORS.accent} icon="📝" />
              <KPICard label="ผู้ใช้บัณฑิตพึงพอใจ" value={_.mean(data.ploAchievement.map(p=>p.employer)).toFixed(1)} unit="/5.0" trend={0.3} color={COLORS.gold} icon="👥" />
              <KPICard label="อัตราสำเร็จการศึกษา" value={data.trendData[data.trendData.length-1].graduation} unit="%" trend={-0.5} color={COLORS.teal} icon="🎓" />
              <KPICard label="ข้อค้นพบที่ต้องดำเนินการ" value={analysisResult?.findings.filter(f=>f.level==="วิกฤต"||f.level==="ต้องปรับปรุง").length} unit="รายการ" color={COLORS.danger} icon="⚠️" />
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20, marginBottom:20 }}>
              {/* PLO Heatmap */}
              <SectionCard title="🗺️ PLO Achievement Heatmap" subtitle="ร้อยละนักศึกษาบรรลุ PLO แยกตามชั้นปี (สีเขียว ≥90%, น้ำเงิน ≥80%, เหลือง ≥70%, แดง <70%)">
                <PLOHeatmap data={data.ploAchievement} />
              </SectionCard>

              {/* WFME Radar */}
              <SectionCard title="🕸️ WFME Competency Radar" subtitle="คะแนนสมรรถนะเทียบกับ Benchmark ระดับชาติ">
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={data.radarData}>
                    <PolarGrid stroke={COLORS.border} />
                    <PolarAngleAxis dataKey="domain" tick={{ fill: COLORS.textMuted, fontSize: 10 }} />
                    <PolarRadiusAxis angle={22.5} domain={[0,100]} tick={{ fill: COLORS.textDim, fontSize: 10 }} />
                    <Radar name="สถาบัน" dataKey="score" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} strokeWidth={2} />
                    <Radar name="Benchmark" dataKey="benchmark" stroke={COLORS.warn} fill={COLORS.warn} fillOpacity={0.1} strokeWidth={2} strokeDasharray="5 5" />
                    <Legend wrapperStyle={{ fontSize: 11, color: COLORS.textMuted }} />
                  </RadarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              {/* NL Comparison */}
              <SectionCard title="📝 ผลสอบ National License" subtitle="เปรียบเทียบอัตราผ่านกับค่าเฉลี่ยระดับประเทศ">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={data.nlData} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis domain={[50,100]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Bar dataKey="passRate" name="สถาบัน" fill={COLORS.primary} radius={[4,4,0,0]} />
                    <Bar dataKey="national" name="ค่าเฉลี่ยประเทศ" fill={COLORS.textDim} radius={[4,4,0,0]} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              {/* Trend */}
              <SectionCard title="📈 แนวโน้ม 5 ปี" subtitle="อัตราสำเร็จการศึกษา, NL Pass Rate, Retention">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={data.trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="year" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis domain={[60,100]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Line dataKey="graduation" name="สำเร็จการศึกษา" stroke={COLORS.accent} strokeWidth={2.5} dot={{ r:4 }} />
                    <Line dataKey="nlPass" name="NL Pass" stroke={COLORS.primary} strokeWidth={2.5} dot={{ r:4 }} />
                    <Line dataKey="retention" name="Retention" stroke={COLORS.gold} strokeWidth={2.5} dot={{ r:4 }} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </LineChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>
          </div>
        )}

        {/* ─── PLO TAB ─── */}
        {activeTab === "plo" && (
          <div>
            <SectionCard title="🎯 PLO Achievement แยกชั้นปี" subtitle="วิเคราะห์ร้อยละการบรรลุ PLO แต่ละข้อ เทียบกับเป้าหมาย 80%">
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.ploAchievement} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="short" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                  <YAxis domain={[0,100]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                  <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                  <Bar dataKey="y1" name="ปี 1" fill="#6366F1" radius={[2,2,0,0]} />
                  <Bar dataKey="y3" name="ปี 3" fill={COLORS.primary} radius={[2,2,0,0]} />
                  <Bar dataKey="y6" name="ปี 6" fill={COLORS.accent} radius={[2,2,0,0]} />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <SectionCard title="👥 ผู้ใช้บัณฑิต vs บัณฑิต" subtitle="ความพึงพอใจแยก PLO (คะแนน 1-5)">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.ploAchievement} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="short" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis domain={[0,5]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Bar dataKey="employer" name="ผู้ใช้บัณฑิต" fill={COLORS.gold} radius={[4,4,0,0]} />
                    <Bar dataKey="graduate" name="บัณฑิต" fill={COLORS.teal} radius={[4,4,0,0]} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="🔄 PLO-WFME Mapping" subtitle="ความสอดคล้อง PLO กับ WFME Domain">
                <DataTable columns={[
                  { key:"domain", label:"WFME Domain" },
                  { key:"plo", label:"PLO", align:"center" },
                  { key:"score", label:"Score", align:"center", render: (v) => <span style={{ color: v >= 80 ? COLORS.accent : v >= 70 ? COLORS.warn : COLORS.danger, fontWeight:700, fontFamily:"monospace" }}>{v}%</span> },
                  { key:"status", label:"สถานะ", align:"center", render: (v) => <Badge color={v==="บรรลุ"?COLORS.accent:v==="ใกล้บรรลุ"?COLORS.warn:COLORS.danger}>{v}</Badge> },
                ]} data={WFME_DOMAINS.map((d,i) => ({
                  domain: d, plo: `PLO ${(i%7)+1}`,
                  score: data.radarData[i]?.score || 0,
                  status: (data.radarData[i]?.score||0) >= 80 ? "บรรลุ" : (data.radarData[i]?.score||0) >= 70 ? "ใกล้บรรลุ" : "ไม่บรรลุ"
                }))} />
              </SectionCard>
            </div>
          </div>
        )}

        {/* ─── COURSE TAB ─── */}
        {activeTab === "course" && (
          <div>
            <SectionCard title="📚 คุณภาพรายวิชาและเครื่องมือวัดผล" subtitle="วิเคราะห์ CLO Achievement, Reliability, Item Analysis แยกรายวิชา">
              <DataTable columns={[
                { key:"name", label:"รายวิชา" },
                { key:"cloAchieve", label:"CLO Achieve %", align:"center", render: (v) => <><StatusDot value={v} /><span style={{ fontFamily:"monospace", fontWeight:700 }}>{v}%</span></> },
                { key:"reliability", label:"Reliability (α)", align:"center", render: (v) => <span style={{ color: v >= 0.8 ? COLORS.accent : v >= 0.7 ? COLORS.warn : COLORS.danger, fontFamily:"monospace", fontWeight:700 }}>{v}</span> },
                { key:"difficulty", label:"Difficulty (p)", align:"center", render: (v) => <span style={{ color: v >= 0.3 && v <= 0.7 ? COLORS.accent : COLORS.warn, fontFamily:"monospace" }}>{v}</span> },
                { key:"discrimination", label:"Discrimination (D)", align:"center", render: (v) => <span style={{ color: v >= 0.2 ? COLORS.accent : COLORS.danger, fontFamily:"monospace" }}>{v}</span> },
                { key:"passRate", label:"Pass Rate %", align:"center", render: (v) => <span style={{ fontFamily:"monospace", fontWeight:700 }}>{v}%</span> },
              ]} data={data.courseData} />
            </SectionCard>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <SectionCard title="📊 Assessment Quality Overview" subtitle="Reliability vs Validity ของเครื่องมือวัดผลแต่ละประเภท">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.assessmentQuality} barGap={4}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="type" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis domain={[0,1]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Bar dataKey="reliability" name="Reliability" fill={COLORS.primary} radius={[4,4,0,0]} />
                    <Bar dataKey="validity" name="Validity" fill={COLORS.teal} radius={[4,4,0,0]} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="🔢 Student Flow (การไหลของนักศึกษา)" subtitle="จำนวนนักศึกษาที่ผ่าน / ตก / ลาออก / ซ่อม แยกชั้นปี">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.studentFlow}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Bar dataKey="pass" name="ผ่าน" stackId="a" fill={COLORS.accent} />
                    <Bar dataKey="remediate" name="ซ่อม" stackId="a" fill={COLORS.warn} />
                    <Bar dataKey="fail" name="ตก" stackId="a" fill={COLORS.danger} />
                    <Bar dataKey="withdraw" name="ลาออก" stackId="a" fill={COLORS.textDim} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>
          </div>
        )}

        {/* ─── TREND TAB ─── */}
        {activeTab === "trend" && (
          <div>
            <SectionCard title="📈 แนวโน้มผลลัพธ์หลักสูตร 5 ปี" subtitle="ติดตาม Key Indicators ตามเกณฑ์ WFME Area 7 Programme Evaluation">
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={data.trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                  <XAxis dataKey="year" tick={{ fill:COLORS.textMuted, fontSize:12 }} />
                  <YAxis domain={[50,100]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                  <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                  <Area dataKey="graduation" name="อัตราสำเร็จ" fill={COLORS.accent+"33"} stroke={COLORS.accent} strokeWidth={2.5} />
                  <Line dataKey="nlPass" name="NL Pass Rate" stroke={COLORS.primary} strokeWidth={3} dot={{ r:5, fill:COLORS.primary }} />
                  <Line dataKey="retention" name="Retention" stroke={COLORS.gold} strokeWidth={2.5} dot={{ r:4 }} strokeDasharray="5 5" />
                  <Legend wrapperStyle={{ fontSize:11 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </SectionCard>

            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
              <SectionCard title="📊 อัตราเลื่อนชั้นปี" subtitle="เปรียบเทียบอัตราเลื่อนชั้น / ตกซ้ำ / ลาออก">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.yearPromotion}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis domain={[0,100]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Bar dataKey="promoted" name="เลื่อนชั้น %" fill={COLORS.accent} radius={[4,4,0,0]} />
                    <Bar dataKey="retained" name="ตกซ้ำ %" fill={COLORS.danger} radius={[4,4,0,0]} />
                    <Bar dataKey="withdrawn" name="ลาออก %" fill={COLORS.textDim} radius={[4,4,0,0]} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>

              <SectionCard title="🔍 NL Score เปรียบเทียบ" subtitle="คะแนนเฉลี่ยสถาบัน vs ค่าเฉลี่ยระดับชาติ">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.nlData} barGap={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                    <XAxis dataKey="name" tick={{ fill:COLORS.textMuted, fontSize:11 }} />
                    <YAxis domain={[40,100]} tick={{ fill:COLORS.textDim, fontSize:11 }} />
                    <Tooltip contentStyle={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:8, fontSize:12, color:COLORS.text }} />
                    <Bar dataKey="mean" name="คะแนนเฉลี่ยสถาบัน" fill={COLORS.primary} radius={[6,6,0,0]} barSize={30} />
                    <Bar dataKey="national" name="ค่าเฉลี่ยประเทศ" fill={COLORS.textDim+"88"} radius={[6,6,0,0]} barSize={30} />
                    <Legend wrapperStyle={{ fontSize:11 }} />
                  </BarChart>
                </ResponsiveContainer>
              </SectionCard>
            </div>
          </div>
        )}

        {/* ─── FINDINGS TAB ─── */}
        {activeTab === "findings" && analysisResult && (
          <div>
            {/* Summary */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap:16, marginBottom:20 }}>
              {[
                { label:"ข้อค้นพบทั้งหมด", val: analysisResult.findings.length, col: COLORS.primary },
                { label:"วิกฤต", val: analysisResult.findings.filter(f=>f.level==="วิกฤต").length, col: COLORS.danger },
                { label:"ต้องปรับปรุง", val: analysisResult.findings.filter(f=>f.level==="ต้องปรับปรุง").length, col: COLORS.warn },
                { label:"แผนปรับปรุง", val: analysisResult.actions.length, col: COLORS.accent },
              ].map((s,i) => (
                <div key={i} style={{ background:COLORS.surface, border:`1px solid ${COLORS.border}`, borderRadius:16, padding:"20px 24px", borderLeft:`4px solid ${s.col}` }}>
                  <div style={{ fontSize:11, color:COLORS.textMuted, textTransform:"uppercase", letterSpacing:1 }}>{s.label}</div>
                  <div style={{ fontSize:36, fontWeight:800, color:s.col, fontFamily:"'JetBrains Mono', monospace" }}>{s.val}</div>
                </div>
              ))}
            </div>

            <div style={{ display:"grid", gridTemplateColumns:"1.2fr 1fr", gap:20 }}>
              <SectionCard title="🔍 ข้อค้นพบจากการวิเคราะห์" subtitle={`ประมวลผลจากข้อมูลทั้ง 5 ชุด ตามเกณฑ์ WFME (ทั้งหมด ${analysisResult.findings.length} รายการ)`}>
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:500, overflowY:"auto" }}>
                  {analysisResult.findings.map((f,i) => (
                    <div key={i} style={{ display:"flex", gap:12, padding:"12px 16px", background:COLORS.surfaceAlt, borderRadius:12, borderLeft:`3px solid ${f.color}`, alignItems:"flex-start" }}>
                      <Badge color={f.color}>{f.level}</Badge>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:12, fontWeight:700, color:COLORS.text, marginBottom:2 }}>{f.area}</div>
                        <div style={{ fontSize:12, color:COLORS.textMuted, lineHeight:1.5 }}>{f.detail}</div>
                      </div>
                    </div>
                  ))}
                  {analysisResult.findings.length === 0 && (
                    <div style={{ textAlign:"center", padding:40, color:COLORS.accent, fontSize:14 }}>✅ ไม่พบข้อค้นพบที่ต้องดำเนินการ — ทุก PLO บรรลุเป้าหมาย</div>
                  )}
                </div>
              </SectionCard>

              <SectionCard title="📋 แผนดำเนินการ (Action Plan)" subtitle="ข้อเสนอแนะเชิงปฏิบัติจากผลวิเคราะห์">
                <div style={{ display:"flex", flexDirection:"column", gap:8, maxHeight:500, overflowY:"auto" }}>
                  {analysisResult.actions.map((a,i) => (
                    <div key={i} style={{ padding:"12px 16px", background:COLORS.surfaceAlt, borderRadius:12, borderLeft:`3px solid ${a.priority==="เร่งด่วน"?COLORS.danger:COLORS.warn}` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4 }}>
                        <Badge color={a.priority==="เร่งด่วน"?COLORS.danger:COLORS.warn}>{a.priority}</Badge>
                        <span style={{ fontSize:11, color:COLORS.textDim }}>#{i+1}</span>
                      </div>
                      <div style={{ fontSize:12, color:COLORS.text, lineHeight:1.6 }}>{a.action}</div>
                    </div>
                  ))}
                  {analysisResult.actions.length === 0 && (
                    <div style={{ textAlign:"center", padding:40, color:COLORS.accent, fontSize:14 }}>✅ ไม่มีแผนดำเนินการเพิ่มเติม</div>
                  )}
                </div>
              </SectionCard>
            </div>

            {/* Decision Matrix */}
            <SectionCard title="🚦 Decision Matrix" subtitle="เกณฑ์ตัดสินผลและแนวทางดำเนินการตามระดับผลลัพธ์" action={<Badge color={statusColor}>สถานะปัจจุบัน: {analysisResult.status}</Badge>}>
              <DataTable columns={[
                { key:"level", label:"ระดับ", render: (v, row) => <span style={{ fontWeight:700, color:row.color }}>{v}</span> },
                { key:"criteria", label:"เกณฑ์", align:"center" },
                { key:"desc", label:"สถานะ" },
                { key:"action", label:"แนวทาง" },
              ]} data={[
                { level:"ดีเยี่ยม", criteria:"≥ 90%", desc:"บรรลุเกินเป้าหมาย", action:"คงระดับ + แบ่งปัน Best Practice", color:COLORS.accent },
                { level:"ดี", criteria:"80-89%", desc:"บรรลุตามเป้าหมาย", action:"ปรับปรุงเล็กน้อย + ติดตาม", color:COLORS.primary },
                { level:"ต้องปรับปรุง", criteria:"70-79%", desc:"ต่ำกว่าเป้าหมาย", action:"Root Cause Analysis + แผนปรับปรุง", color:COLORS.warn },
                { level:"วิกฤต", criteria:"< 70%", desc:"ไม่บรรลุ — เร่งด่วน", action:"แผนเร่งด่วน + รายงานผู้บริหาร + ปรับหลักสูตร", color:COLORS.danger },
              ]} />
            </SectionCard>
          </div>
        )}
      </div>
    </div>
  );
}
