// ═══════════════════════════════════════════════════════════════════════
//  ไฟล์ที่ 1: Google Apps Script (Code.gs)
//  
//  วิธีติดตั้ง:
//  1. ไปที่ https://script.google.com → สร้างโปรเจกต์ใหม่
//  2. คัดลอกโค้ดด้านล่างทั้งหมดไปวางใน Code.gs
//  3. กด Deploy → New Deployment → Web App
//     - Execute as: Me
//     - Who has access: Anyone
//  4. คัดลอก Web App URL → นำไปวางใน React (ค่า API_URL)
//
//  Google Sheets จะถูกสร้างอัตโนมัติ 4 แผ่น:
//     - users       (ข้อมูลผู้ใช้)
//     - plo_data    (ข้อมูล PLO Achievement)
//     - nl_data     (ข้อมูลผลสอบ NL)
//     - course_data (ข้อมูลรายวิชา)
//     - trend_data  (ข้อมูลแนวโน้มรายปี)
//     - audit_log   (บันทึกการใช้งาน)
// ═══════════════════════════════════════════════════════════════════════

// ----- ตั้งค่า Spreadsheet ID -----
// วิธีที่ 1: ปล่อยว่าง → สร้าง Spreadsheet ใหม่อัตโนมัติ
// วิธีที่ 2: ใส่ ID ของ Spreadsheet ที่มีอยู่แล้ว
const SPREADSHEET_ID = ""; // ← ใส่ ID ถ้ามี หรือปล่อยว่าง

function getOrCreateSpreadsheet() {
  let ss;
  if (SPREADSHEET_ID) {
    ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  } else {
    // ค้นหาไฟล์ที่เคยสร้าง
    const files = DriveApp.getFilesByName("WFME_Database");
    if (files.hasNext()) {
      ss = SpreadsheetApp.open(files.next());
    } else {
      ss = SpreadsheetApp.create("WFME_Database");
      initializeSheets(ss);
    }
  }
  return ss;
}

function initializeSheets(ss) {
  // ===== Sheet: users =====
  let sheet = ss.getSheetByName("Sheet1");
  if (sheet) sheet.setName("users");
  else sheet = ss.insertSheet("users");
  sheet.getRange(1, 1, 1, 8).setValues([["id", "email", "password_hash", "name", "role", "avatar", "created_at", "last_login"]]);
  // เพิ่ม default users
  const now = new Date().toISOString();
  sheet.getRange(2, 1, 4, 8).setValues([
    ["u1", "chair@med.edu", hashPassword("chair123"), "รศ.นพ.สมชาย รักษาดี", "CHAIR", "👑", now, ""],
    ["u2", "faculty@med.edu", hashPassword("faculty123"), "ผศ.พญ.วิภา สุขใจ", "FACULTY", "🎓", now, ""],
    ["u3", "qa@med.edu", hashPassword("qa1234"), "นางสาวพรรณี ดีงาม", "QA", "📋", now, ""],
    ["u4", "admin@med.edu", hashPassword("admin123"), "System Administrator", "ADMIN", "⚙️", now, ""],
  ]);
  sheet.setFrozenRows(1);

  // ===== Sheet: plo_data =====
  const ploSheet = ss.insertSheet("plo_data");
  ploSheet.getRange(1, 1, 1, 11).setValues([["plo_id", "plo_name", "y1", "y2", "y3", "y4", "y5", "y6", "employer", "graduate", "updated_at"]]);
  const ploNames = ["คุณธรรม จริยธรรม", "ความรู้ทางการแพทย์", "ทักษะการวิเคราะห์", "การสื่อสาร", "การทำงานร่วมกัน", "การเรียนรู้ตลอดชีวิต", "การทำงานในชุมชน"];
  ploNames.forEach((name, i) => {
    ploSheet.getRange(i + 2, 1, 1, 11).setValues([[
      "PLO " + (i + 1), name,
      rand(75, 95), rand(78, 96), rand(80, 97), rand(82, 98), rand(84, 99), rand(86, 99),
      randDec(3.5, 4.8), randDec(3.6, 4.9), now
    ]]);
  });
  ploSheet.setFrozenRows(1);

  // ===== Sheet: nl_data =====
  const nlSheet = ss.insertSheet("nl_data");
  nlSheet.getRange(1, 1, 1, 5).setValues([["exam_name", "pass_rate", "mean_score", "national_avg", "updated_at"]]);
  nlSheet.getRange(2, 1, 3, 5).setValues([
    ["NL1 (ปี 3)", rand(85, 96), rand(60, 72), rand(80, 88), now],
    ["NL2 (ปี 5)", rand(88, 98), rand(62, 75), rand(82, 90), now],
    ["NL3 (ปี 6)", rand(90, 99), rand(65, 78), rand(84, 92), now],
  ]);
  nlSheet.setFrozenRows(1);

  // ===== Sheet: course_data =====
  const courseSheet = ss.insertSheet("course_data");
  courseSheet.getRange(1, 1, 1, 7).setValues([["course_name", "clo_achieve", "reliability", "difficulty", "discrimination", "pass_rate", "updated_at"]]);
  for (let i = 0; i < 8; i++) {
    courseSheet.getRange(i + 2, 1, 1, 7).setValues([[
      "วิชา " + (i + 1), rand(75, 98), randDec(0.65, 0.95), randDec(0.3, 0.7), randDec(0.15, 0.45), rand(78, 99), now
    ]]);
  }
  courseSheet.setFrozenRows(1);

  // ===== Sheet: trend_data =====
  const trendSheet = ss.insertSheet("trend_data");
  trendSheet.getRange(1, 1, 1, 6).setValues([["year", "graduation", "nl_pass", "employer_score", "retention", "updated_at"]]);
  for (let i = 0; i < 5; i++) {
    trendSheet.getRange(i + 2, 1, 1, 6).setValues([[
      String(2564 + i), rand(90, 98), rand(85, 97), randDec(3.5, 4.7), rand(78, 95), now
    ]]);
  }
  trendSheet.setFrozenRows(1);

  // ===== Sheet: audit_log =====
  const logSheet = ss.insertSheet("audit_log");
  logSheet.getRange(1, 1, 1, 5).setValues([["timestamp", "user_email", "action", "details", "ip"]]);
  logSheet.setFrozenRows(1);
}

// ===== Utility Functions =====
function rand(min, max) { return Math.round(min + Math.random() * (max - min)); }
function randDec(min, max) { return +(min + Math.random() * (max - min)).toFixed(1); }

function hashPassword(pw) {
  // Simple hash สำหรับ demo (Production ควรใช้ bcrypt ฝั่ง server จริง)
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, pw);
  return bytes.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

function sheetToJson(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function writeLog(ss, email, action, details) {
  const logSheet = ss.getSheetByName("audit_log");
  logSheet.appendRow([new Date().toISOString(), email, action, details, ""]);
}

// ===== CORS Headers =====
function createJsonOutput(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

// ===== Main Entry Points =====
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  try {
    const params = e.parameter || {};
    const action = params.action || "";
    const ss = getOrCreateSpreadsheet();

    // POST body
    let body = {};
    if (e.postData) {
      try { body = JSON.parse(e.postData.contents); } catch (err) { body = {}; }
    }

    switch (action) {

      // ────── AUTH ──────
      case "login": {
        const { email, password } = body;
        if (!email || !password) return createJsonOutput({ success: false, error: "กรุณากรอก Email และ Password" });
        const users = sheetToJson(ss.getSheetByName("users"));
        const hashed = hashPassword(password);
        const user = users.find(u => u.email === email.toLowerCase().trim() && u.password_hash === hashed);
        if (!user) return createJsonOutput({ success: false, error: "Email หรือ Password ไม่ถูกต้อง" });
        // Update last_login
        const sheet = ss.getSheetByName("users");
        const allData = sheet.getDataRange().getValues();
        for (let i = 1; i < allData.length; i++) {
          if (allData[i][1] === email.toLowerCase().trim()) {
            sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
            break;
          }
        }
        // Generate simple session token
        const token = Utilities.getUuid();
        writeLog(ss, email, "LOGIN", "เข้าสู่ระบบสำเร็จ");
        return createJsonOutput({
          success: true,
          user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar },
          token: token
        });
      }

      case "register": {
        const { email, password, name, role } = body;
        if (!email || !password || !name) return createJsonOutput({ success: false, error: "กรุณากรอกข้อมูลให้ครบ" });
        if (password.length < 6) return createJsonOutput({ success: false, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" });
        const users = sheetToJson(ss.getSheetByName("users"));
        if (users.find(u => u.email === email.toLowerCase().trim())) {
          return createJsonOutput({ success: false, error: "Email นี้ถูกใช้งานแล้ว" });
        }
        const avatars = { CHAIR: "👑", FACULTY: "🎓", QA: "📋", ADMIN: "⚙️" };
        const newId = "u" + Date.now();
        ss.getSheetByName("users").appendRow([
          newId, email.toLowerCase().trim(), hashPassword(password), name, role || "FACULTY",
          avatars[role] || "🎓", new Date().toISOString(), ""
        ]);
        writeLog(ss, email, "REGISTER", "ลงทะเบียนใหม่ บทบาท: " + (role || "FACULTY"));
        return createJsonOutput({ success: true, message: "ลงทะเบียนสำเร็จ" });
      }

      case "reset_password": {
        const { email } = body;
        const users = sheetToJson(ss.getSheetByName("users"));
        const user = users.find(u => u.email === email.toLowerCase().trim());
        if (!user) return createJsonOutput({ success: false, error: "ไม่พบบัญชีผู้ใช้นี้" });
        const otp = String(Math.floor(100000 + Math.random() * 900000));
        // ใน Production ส่ง OTP ทาง Email จริง ด้วย MailApp.sendEmail()
        // MailApp.sendEmail(email, "WFME OTP", "รหัส OTP ของคุณคือ: " + otp);
        writeLog(ss, email, "RESET_PASSWORD", "ขอรหัส OTP");
        return createJsonOutput({ success: true, otp: otp, message: "ส่ง OTP แล้ว" });
      }

      case "change_password": {
        const { email, new_password } = body;
        const sheet = ss.getSheetByName("users");
        const allData = sheet.getDataRange().getValues();
        for (let i = 1; i < allData.length; i++) {
          if (allData[i][1] === email.toLowerCase().trim()) {
            sheet.getRange(i + 1, 3).setValue(hashPassword(new_password));
            writeLog(ss, email, "CHANGE_PASSWORD", "เปลี่ยนรหัสผ่านสำเร็จ");
            return createJsonOutput({ success: true });
          }
        }
        return createJsonOutput({ success: false, error: "ไม่พบบัญชี" });
      }

      // ────── DATA: READ ──────
      case "get_all_data": {
        const ploData = sheetToJson(ss.getSheetByName("plo_data"));
        const nlData = sheetToJson(ss.getSheetByName("nl_data"));
        const courseData = sheetToJson(ss.getSheetByName("course_data"));
        const trendData = sheetToJson(ss.getSheetByName("trend_data"));
        return createJsonOutput({
          success: true,
          data: {
            ploAchievement: ploData.map(r => ({
              name: r.plo_name, short: r.plo_id,
              y1: +r.y1, y2: +r.y2, y3: +r.y3, y4: +r.y4, y5: +r.y5, y6: +r.y6,
              employer: +r.employer, graduate: +r.graduate, target: 80
            })),
            nlData: nlData.map(r => ({
              name: r.exam_name, passRate: +r.pass_rate, mean: +r.mean_score, national: +r.national_avg
            })),
            courseData: courseData.map(r => ({
              name: r.course_name, cloAchieve: +r.clo_achieve, reliability: +r.reliability,
              difficulty: +r.difficulty, discrimination: +r.discrimination, passRate: +r.pass_rate
            })),
            trendData: trendData.map(r => ({
              year: String(r.year), graduation: +r.graduation, nlPass: +r.nl_pass,
              employer: +r.employer_score * 20, retention: +r.retention
            })),
          }
        });
      }

      // ────── DATA: WRITE ──────
      case "save_plo": {
        const { ploData, user_email } = body;
        const sheet = ss.getSheetByName("plo_data");
        // ลบข้อมูลเก่า (เก็บ header)
        if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        const now = new Date().toISOString();
        ploData.forEach((p, i) => {
          sheet.getRange(i + 2, 1, 1, 11).setValues([[
            p.short, p.name, p.y1, p.y2, p.y3, p.y4, p.y5, p.y6, p.employer, p.graduate || 0, now
          ]]);
        });
        writeLog(ss, user_email || "", "SAVE_PLO", "บันทึกข้อมูล PLO " + ploData.length + " รายการ");
        return createJsonOutput({ success: true, message: "บันทึก PLO สำเร็จ" });
      }

      case "save_nl": {
        const { nlData, user_email } = body;
        const sheet = ss.getSheetByName("nl_data");
        if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        const now = new Date().toISOString();
        nlData.forEach((n, i) => {
          sheet.getRange(i + 2, 1, 1, 5).setValues([[n.name, n.passRate, n.mean, n.national, now]]);
        });
        writeLog(ss, user_email || "", "SAVE_NL", "บันทึกข้อมูล NL " + nlData.length + " รายการ");
        return createJsonOutput({ success: true, message: "บันทึก NL สำเร็จ" });
      }

      case "save_course": {
        const { courseData, user_email } = body;
        const sheet = ss.getSheetByName("course_data");
        if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        const now = new Date().toISOString();
        courseData.forEach((c, i) => {
          sheet.getRange(i + 2, 1, 1, 7).setValues([[
            c.name, c.cloAchieve, c.reliability, c.difficulty, c.discrimination, c.passRate, now
          ]]);
        });
        writeLog(ss, user_email || "", "SAVE_COURSE", "บันทึกข้อมูลรายวิชา " + courseData.length + " รายการ");
        return createJsonOutput({ success: true, message: "บันทึกรายวิชาสำเร็จ" });
      }

      case "save_trend": {
        const { trendData, user_email } = body;
        const sheet = ss.getSheetByName("trend_data");
        if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
        const now = new Date().toISOString();
        trendData.forEach((t, i) => {
          sheet.getRange(i + 2, 1, 1, 6).setValues([[
            t.year, t.graduation, t.nlPass, (t.employer / 20), t.retention, now
          ]]);
        });
        writeLog(ss, user_email || "", "SAVE_TREND", "บันทึกข้อมูลแนวโน้ม " + trendData.length + " รายการ");
        return createJsonOutput({ success: true, message: "บันทึกแนวโน้มสำเร็จ" });
      }

      // ────── AUDIT LOG ──────
      case "get_logs": {
        const logs = sheetToJson(ss.getSheetByName("audit_log"));
        return createJsonOutput({ success: true, logs: logs.slice(-100).reverse() });
      }

      // ────── SETUP CHECK ──────
      case "ping": {
        return createJsonOutput({ success: true, message: "WFME API พร้อมใช้งาน", spreadsheet_id: ss.getId() });
      }

      default:
        return createJsonOutput({ success: false, error: "Unknown action: " + action });
    }
  } catch (err) {
    return createJsonOutput({ success: false, error: err.message });
  }
}
