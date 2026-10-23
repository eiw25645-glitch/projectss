import{initializeApp}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import{getFirestore,collection,doc,setDoc,deleteDoc,onSnapshot,getDoc,getDocs,serverTimestamp,arrayUnion,writeBatch}from"https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
// ===== แก้เฉพาะ firebaseConfig ตรงนี้ (Firebase Console > Project settings > Your apps > Web) =====
const firebaseConfig = {
  apiKey: "ใส่_API_KEY_ที่นี่",
  authDomain: "ใส่_PROJECT_ID.firebaseapp.com",
  projectId: "ใส่_PROJECT_ID",
  storageBucket: "ใส่_PROJECT_ID.appspot.com",
  messagingSenderId: "ใส่_SENDER_ID",
  appId: "ใส่_APP_ID"
};
/* ตั้งค่าครั้งแรก (ไม่มีระบบล็อกอิน เปิดเว็บแล้วเข้าแดชบอร์ดทันที):
1) สร้าง Firestore Database
2) Firestore > Rules วางกฎนี้ แล้วกด Publish:
rules_version = '2';
service cloud.firestore { match /databases/{db}/documents {
  match /{document=**} { allow read, write: if true; } } }
3) อัปโหลด index.html + app.js ขึ้น GitHub Pages
** ใครมีลิงก์เว็บก็เข้าดู/แก้ข้อมูลได้ จึงอย่าเผยแพร่ลิงก์สาธารณะ **
*/

const app=initializeApp(firebaseConfig),db=getFirestore(app);
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],main=$("#main");
const S={role:"viewer",name:"",projects:[],loaded:false,pid:null,cur:null,exp:[],inst:[],lists:{},gl:[],subs:[]};
const M=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const STAT={"รอลงนามสัญญา":"gray","กำลังก่อสร้าง":"blue","หยุดชั่วคราว":"amber","ส่งมอบงานแล้ว":"violet","ตรวจรับแล้ว":"green","ปิดโครงการ":"slate"};
const ACTIVE=["รอลงนามสัญญา","กำลังก่อสร้าง","หยุดชั่วคราว"],DONE=["ส่งมอบงานแล้ว","ตรวจรับแล้ว","ปิดโครงการ"];
const AG=["กรมโยธาธิการและผังเมือง","เทศบาล","กรมทางหลวง","อบต."];
const CATS=["วัสดุก่อสร้าง","ค่าแรง","ค่าเครื่องจักร-ขนส่ง","ค่าเช่า","ค่าน้ำมัน","ค่าธรรมเนียม-ภาษี","เบ็ดเตล็ด","อื่นๆ"];
const METH=["เงินสด","โอนเงิน","เช็ค","เครดิต-ค้างจ่าย"],PAY=["จ่ายแล้ว","ค้างจ่าย"],IST=["รอเบิก","ส่งเบิกแล้ว","ได้รับเงินแล้ว"];
const COLS={
 inst:[["no","number","งวดที่"],["pct","number","% งาน"],["amt","number","จำนวนเงิน"],["sent","date","วันที่ส่งเบิก"],["recv","date","วันที่ได้รับเงิน"],["st","sel","สถานะ",IST],["note","text","หมายเหตุ"]],
 exp:[["date","date","วันที่"],["item","text","รายการ"],["cat","sel","หมวด",CATS],["amt","number","จำนวนเงิน"],["meth","sel","วิธีจ่าย",METH],["payer","dl","ผู้จ่าย"],["payee","text","จ่ายให้ใคร"],["st","sel","สถานะ",PAY],["note","text","หมายเหตุ"]]};
const COLL={inst:"installments",exp:"expenses"};

// ---------- helpers ----------
const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const baht=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const thd=s=>{if(!s)return"-";const[y,m,d]=s.split("-");return`${+d} ${M[m-1]} ${+y+543}`};
const dt=s=>new Date(s+"T00:00:00Z"),diff=(a,b)=>Math.round((dt(b)-dt(a))/864e5);
const addD=(s,n)=>new Date(dt(s).getTime()+n*864e5).toISOString().slice(0,10);
const today=()=>new Date().toLocaleDateString("sv");
const num=v=>+v||0,sum=(a,f="amt")=>a.reduce((s,r)=>s+num(r[f]),0);
const eff=p=>(p.ext?.length&&p.ext[p.ext.length-1].newEnd)||p.end||"";
const stamp=()=>({updatedBy:S.name,updatedAt:serverTimestamp()});
const stampTxt=p=>{const d=p.updatedAt?.toDate?.();return p.updatedBy?`แก้ไขล่าสุดโดย ${e(p.updatedBy)}${d?` เมื่อ ${thd(d.toLocaleDateString("sv"))} ${d.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})} น.`:""}`:""};

// ---------- auto-save ----------
let retry=null;const deb={};
const st=k=>{const el=$("#save");el.dataset.k=k;el.textContent={saving:"กำลังบันทึก…",ok:"บันทึกแล้ว ✓",err:"บันทึกไม่สำเร็จ ลองใหม่"}[k]};
const run=async f=>{st("saving");retry=f;try{await f();st("ok")}catch(x){console.error(x);st("err")}};
const later=(k,f)=>{clearTimeout(deb[k]);st("saving");deb[k]=setTimeout(()=>run(f),600)};
$("#save").onclick=()=>{if($("#save").dataset.k=="err"&&retry)run(retry)};
const pref=()=>doc(db,"projects",S.pid);
const patch=o=>{Object.assign(S.cur,o);later("p"+Object.keys(o).join(),()=>setDoc(pref(),{...o,...stamp()},{merge:true}))};
const addList=(k,v)=>{v=(v||"").trim();if(v&&!(S.lists[k]||[]).includes(v))run(()=>setDoc(doc(db,"settings","lists"),{[k]:arrayUnion(v)},{merge:true}))};

// ---------- start (ไม่มีล็อกอิน) ----------
S.role="editor";
const askName=()=>{const n=(prompt("ใส่ชื่อของคุณ (ใช้แสดงว่าใครแก้ไขล่าสุด)",S.name||"")||S.name||"ไม่ระบุชื่อ").trim();S.name=n;try{localStorage.setItem("uname",n)}catch{}$("#who").textContent=`👤 ${n} (กดเพื่อเปลี่ยนชื่อ)`};
try{S.name=localStorage.getItem("uname")||""}catch{}
if(S.name)$("#who").textContent=`👤 ${S.name} (กดเพื่อเปลี่ยนชื่อ)`;else askName();
$("#who").style.cursor="pointer";$("#who").onclick=askName;
showHome();
S.gl.push(onSnapshot(collection(db,"projects"),s=>{S.projects=s.docs.map(d=>({id:d.id,...d.data()}));S.loaded=true;paint()},()=>st("err")));
S.gl.push(onSnapshot(doc(db,"settings","lists"),s=>{S.lists=s.data()||{};
 const fill=(id,a)=>$(id).innerHTML=[...new Set(a)].map(x=>`<option value="${e(x)}">`).join("");
 fill("#dln",[...(S.lists.names||[]),...S.projects.map(p=>p.name)]);fill("#dla",[...AG,...(S.lists.agencies||[])]);fill("#dlp",S.lists.payers||[])}));
$("#nhome").onclick=showHome;

// ---------- home ----------
function showHome(){
 S.pid=null;S.cur=null;S.subs.forEach(f=>f());S.subs=[];S.exp=[];S.inst=[];
 main.innerHTML=`<header class="top"><div><h1>โครงการทั้งหมด</h1><p class="sub">ภาพรวมโครงการ หจก.สรรเสริญการสร้าง</p></div>
 <div class="row"><button class="btn" id="hpdf">Export PDF</button><button class="btn" id="hcsv">Export CSV</button><button class="btn pri ed" id="addp">+ เพิ่มโครงการใหม่</button></div></header>
 <div class="printonly"><h2>รายงานสรุปโครงการ · ${thd(today())}</h2></div>
 <div id="sum" class="kpis"></div>
 <div class="bar"><input class="f" id="q" placeholder="ค้นหาชื่อโครงการ / เลขที่สัญญา / หน่วยงาน"><select class="f" id="fs"><option value="">ทุกสถานะ</option>${Object.keys(STAT).map(s=>`<option>${s}</option>`).join("")}</select><select class="f" id="fa"></select></div>
 <div id="cards" class="cards"></div>
 <div class="row ed" style="margin-top:24px"><button class="btn" id="seed">โหลดข้อมูลตัวอย่าง 2 โครงการ</button><button class="btn dng" id="clr">ล้างข้อมูลตัวอย่าง</button></div>`;
 paint()}
function paintHome(){
 if(!$("#cards"))return;
 const q=$("#q").value.trim().toLowerCase(),fs=$("#fs").value;
 const ags=[...new Set(S.projects.map(p=>p.agency).filter(Boolean))],fa0=$("#fa").value;
 $("#fa").innerHTML=`<option value="">ทุกหน่วยงาน</option>`+ags.map(a=>`<option${a==fa0?" selected":""}>${e(a)}</option>`).join("");
 const fa=$("#fa").value,ps=S.projects,list=ps.filter(p=>(!fs||p.status==fs)&&(!fa||p.agency==fa)&&(!q||[p.name,p.contractNo,p.agency,p.agencyFull,p.site].join(" ").toLowerCase().includes(q)));
 $("#sum").innerHTML=[["โครงการทั้งหมด",ps.length],["กำลังดำเนินการ",ps.filter(p=>ACTIVE.includes(p.status)).length],["เสร็จแล้ว",ps.filter(p=>DONE.includes(p.status)).length],["วงเงินสัญญารวม",baht(sum(ps,"budget"))],["ยอดเบิกรวม",baht(sum(ps,"drawn"))]].map(([l,v])=>`<div class="k"><b>${v}</b><span>${l}</span></div>`).join("");
 $("#cards").innerHTML=list.map(p=>{const end=eff(p),left=end?diff(today(),end):null,pc=num(p.budget)?Math.min(100,num(p.drawn)/num(p.budget)*100):0,warn=left!=null&&left<30&&ACTIVE.includes(p.status);
  return`<div class="pc" data-open="${p.id}"><span class="badge ${STAT[p.status]||"gray"}">${e(p.status||"-")}</span><h3>${e(p.name||"(ยังไม่ตั้งชื่อ)")}</h3><p>${e(p.agencyFull||p.agency||"-")}</p>
  <div class="mt"><span>วงเงินสัญญา</span><b>${baht(p.budget)}</b></div><div class="mt" style="margin-top:6px"><span>เบิกงวดสะสม</span><b>${pc.toFixed(1)}%</b></div><div class="pg"><i style="width:${pc}%"></i></div>
  <div class="mt"><span>วันคงเหลือของสัญญา</span><b style="color:${warn||(left!=null&&left<0)?"var(--red)":"inherit"}">${left==null?"-":left<0?`เกิน ${-left} วัน`:`${left} วัน`}</b></div></div>`}).join("")||`<p class="sub">${S.loaded?"ยังไม่มีโครงการ กด “+ เพิ่มโครงการใหม่” เพื่อเริ่มต้น":"กำลังโหลด…"}</p>`;
 applyRole()}

// ---------- project view ----------
const fld=(f,l,t="text",x="")=>`<label>${l}<input data-p="${f}" type="${t}" ${t=="number"?'step="any"':""} ${x}></label>`;
function openProject(id){
 S.pid=id;S.cur=S.projects.find(p=>p.id==id);S.exp=[];S.inst=[];S.subs.forEach(f=>f());
 S.subs=["inst","exp"].map(k=>onSnapshot(collection(db,"projects",id,COLL[k]),s=>{S[k]=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>k=="exp"?(a.date||"").localeCompare(b.date||"")||(a.ts||0)-(b.ts||0):num(a.no)-num(b.no));paint()},()=>st("err")));
 main.innerHTML=`<header class="top"><div><button class="btn" id="back">← กลับหน้าแรก</button></div><div class="row"><button class="btn" id="ppdf">Export PDF / พิมพ์ A4</button><button class="btn" id="pcsv">Export CSV</button><label class="btn ed" style="margin:0">Import CSV<input id="imp" type="file" accept=".csv" hidden></label><button class="btn dng ed" id="delp">ลบโครงการ</button></div></header>
 <div id="dash"></div>
 <div class="box sec"><h2>ข้อมูลโครงการ</h2><p id="perr" class="err"></p><div class="grid">
 <label class="w2">ชื่อโครงการ<input data-p="name" list="dln" data-l="names"></label>
 <label>หน่วยงาน<input data-p="agency" list="dla" data-l="agencies"></label>
 ${fld("agencyFull","ชื่อหน่วยงานเต็ม")}${fld("site","หน้างาน (ที่ตั้ง/สถานที่ก่อสร้าง)","text",'class="w2"')}
 ${fld("budget","วงเงินในสัญญา (บาท)","number")}${fld("contractNo","เลขที่สัญญา")}${fld("contractDate","ลงวันที่","date")}
 ${fld("start","วันที่เริ่มสัญญา","date")}${fld("end","วันสิ้นสุดสัญญา","date")}${fld("days","จำนวนวัน (คำนวณให้ แก้เองได้)","number")}
 <label>สถานะโครงการ<select data-p="status">${Object.keys(STAT).map(s=>`<option>${s}</option>`).join("")}</select></label></div></div>
 <div class="box sec"><h2>ขยายสัญญา</h2><div class="tw" id="text"></div><button class="btn ed addb" id="addx">+ เพิ่มการขยายสัญญา</button></div>
 <div class="box sec"><h2>เบิกงวด</h2><div class="tw" id="tinst"></div><div id="isum"></div><button class="btn ed addb" id="addi">+ เพิ่มงวด</button></div>
 <div class="box sec"><h2>บันทึกค่าใช้จ่าย</h2>
 <div class="fl"><select class="f" id="fc"><option value="">ทุกหมวด</option>${CATS.map(c=>`<option>${c}</option>`).join("")}</select><input class="f" id="fp" list="dlp" placeholder="ผู้จ่าย (ทุกคน)"><select class="f" id="fm"><option value="">ทุกวิธีจ่าย</option>${METH.map(c=>`<option>${c}</option>`).join("")}</select><label style="margin:0">ตั้งแต่<input class="f" id="fd1" type="date"></label><label style="margin:0">ถึง<input class="f" id="fd2" type="date"></label></div>
 <div id="esum"></div><div class="tw" id="texp"></div><button class="btn pri ed addb" id="adde">+ เพิ่มรายการ</button></div>`;
 paint()}
const closed=el=>el.contains(document.activeElement);
function paint(){
 if(!S.pid)return paintHome();
 const p=S.cur=S.projects.find(x=>x.id==S.pid);
 if(!p){if(S.loaded)showHome();return}
 $$("[data-p]").forEach(el=>{if(el!==document.activeElement)el.value=p[el.dataset.p]??""});
 dash(p);paintExt(p);tbl("inst");tbl("exp");sums();applyRole()}
function dash(p){
 const end=eff(p),t=today(),tot=p.start&&end?diff(p.start,end):0,pas=p.start?diff(p.start,t):0,left=end?diff(t,end):null,pc=tot>0?Math.max(0,Math.min(100,pas/tot*100)):0;
 const ex=sum(S.exp),dr=num(p.drawn),pl=dr-ex,warn=left!=null&&(left<30)&&ACTIVE.includes(p.status);
 const bc=CATS.map(c=>[c,sum(S.exp.filter(r=>r.cat==c))]).filter(x=>x[1]>0),mx=Math.max(1,...bc.map(x=>x[1]));
 $("#dash").innerHTML=`<div class="printonly"><h2>รายงานสรุปโครงการ · ${thd(today())}</h2></div>
 <h1>${e(p.name||"(ยังไม่ตั้งชื่อ)")} <span class="badge ${STAT[p.status]||"gray"}">${e(p.status||"")}</span></h1><p class="sub">${e(p.agencyFull||p.agency||"")} · ${stampTxt(p)}</p>
 <div class="box sec"><div class="mt" style="margin:0"><span>ระยะเวลาสัญญา ${thd(p.start)} – ${thd(end)}${p.ext?.length?` (ขยาย ${p.ext.length} ครั้ง)`:""}</span><b style="color:${warn||(left!=null&&left<0)?"var(--red)":"inherit"}">${left==null?"-":left<0?`เกินกำหนด ${-left} วัน`:`เหลือ ${left} วัน`}</b></div><div class="pg ${warn?"red":""}"><i style="width:${pc}%"></i></div></div>
 <div class="kpis sec"><div class="k"><b>${baht(p.budget)}</b><span>วงเงินสัญญา</span></div><div class="k"><b>${baht(dr)}</b><span>เบิกไปแล้ว</span></div><div class="k"><b>${baht(num(p.budget)-dr)}</b><span>คงเหลือ</span></div><div class="k"><b>${baht(ex)}</b><span>ค่าใช้จ่ายรวม</span></div><div class="k ${pl<0?"r":"g"}"><b>${baht(pl)}</b><span>${pl<0?"ขาดทุน":"กำไร"}เบื้องต้น (เบิก − ค่าใช้จ่าย)</span></div></div>
 <div class="box"><h2>ค่าใช้จ่ายแยกตามหมวด</h2>${bc.map(([c,v])=>`<div class="cb"><span>${c}</span><i style="width:${v/mx*100}%"></i><b>${baht(v)}</b></div>`).join("")||'<p class="sub">ยังไม่มีค่าใช้จ่าย</p>'}</div>`}
function paintExt(p){const el=$("#text");if(!el||closed(el))return;
 el.innerHTML=(p.ext?.length?`<table data-k="ext"><thead><tr><th>ครั้งที่</th><th>จำนวนวันที่ขยาย</th><th>เหตุผล</th><th>วันที่อนุมัติ</th><th>วันสิ้นสุดสัญญาใหม่</th><th class="ed"></th></tr></thead><tbody>${p.ext.map((x,i)=>`<tr data-i="${i}"><td>${i+1}</td><td><input data-f="days" type="number" value="${e(x.days)}"></td><td><input data-f="reason" value="${e(x.reason)}"></td><td><input data-f="date" type="date" value="${e(x.date)}"></td><td class="ne">${thd(x.newEnd)}</td><td class="ed"><button class="x" data-del>🗑</button></td></tr>`).join("")}</tbody></table>`:'<p class="sub">ไม่มีการขยายสัญญา</p>')}
const recalc=p=>{let c=p.end;(p.ext||[]).forEach(x=>{c=c?addD(c,num(x.days)):"";x.newEnd=c})};
const cell=(f,t,v,o)=>t=="sel"?`<select data-f="${f}">${o.map(x=>`<option${x==v?" selected":""}>${x}</option>`).join("")}</select>`:`<input data-f="${f}" type="${t=="dl"?"text":t}" value="${e(v)}"${t=="dl"?' list="dlp" data-l="payers"':""}${t=="number"?' step="any"':""}>`;
function filt(){const g=i=>$(i)?.value||"";return S.exp.filter(r=>(!g("#fc")||r.cat==g("#fc"))&&(!g("#fp")||(r.payer||"").includes(g("#fp")))&&(!g("#fm")||r.meth==g("#fm"))&&(!g("#fd1")||r.date>=g("#fd1"))&&(!g("#fd2")||r.date<=g("#fd2")))}
function tbl(k){const el=$("#t"+k);if(!el)return;if(closed(el))return;
 const rows=k=="exp"?filt():S.inst;
 el.innerHTML=`<table data-k="${k}"><thead><tr>${COLS[k].map(c=>`<th>${c[2]}</th>`).join("")}<th class="ed"></th></tr></thead><tbody>${rows.map(r=>`<tr data-id="${r.id}">${COLS[k].map(c=>`<td>${cell(c[0],c[1],r[c[0]],c[3])}</td>`).join("")}<td class="ed"><button class="x" data-del title="ลบ">🗑</button></td></tr>`).join("")||`<tr><td colspan="${COLS[k].length+1}" class="sub">ยังไม่มีรายการ</td></tr>`}</tbody></table>`}
function sums(){
 const p=S.cur;if(!p)return;
 if($("#isum")){const a=sum(S.inst),pc=num(p.budget)?a/num(p.budget)*100:0;$("#isum").innerHTML=`<div class="sumrow" style="padding:8px 10px;margin-top:6px">รวม ${baht(a)} บาท · % งานรวม ${sum(S.inst,"pct")}% · เบิกสะสม ${pc.toFixed(1)}% ของวงเงิน</div>`}
 const rows=filt(),by=k=>Object.entries(rows.reduce((m,r)=>(m[r[k]||"-"]=(m[r[k]||"-"]||0)+num(r.amt),m),{})).map(([a,b])=>`<li><span>${e(a)}</span><b>${baht(b)}</b></li>`).join("");
 if($("#esum"))$("#esum").innerHTML=`<div class="chips"><div class="k"><b>${baht(sum(rows))}</b><span>ยอดรวม (${rows.length} รายการ)</span></div><div class="k r"><b>${baht(sum(rows.filter(r=>r.st=="ค้างจ่าย")))}</b><span>ยอดค้างจ่าย</span></div></div><div class="two"><div><h2>แยกตามผู้จ่าย</h2><ul class="l">${by("payer")}</ul></div><div><h2>แยกตามหมวด</h2><ul class="l">${by("cat")}</ul></div></div>`}
function applyRole(){if(S.role=="editor")return;$$("#main input:not(.f),#main select:not(.f)").forEach(x=>x.disabled=true)}

// ---------- events ----------
main.addEventListener("focusout",()=>setTimeout(()=>{if(S.pid)paint()},120));
main.addEventListener("input",ev=>{const el=ev.target;
 if(el.classList.contains("f"))return S.pid?(tbl("exp"),sums()):paintHome();
 if(el.dataset.p)return onP(el);
 const tb=el.closest("[data-k]"),tr=el.closest("tr"),f=el.dataset.f;if(!tb||!f)return;
 const v=el.type=="number"?(el.value===""?"":+el.value):el.value,k=tb.dataset.k;
 if(k=="ext"){const x=S.cur.ext[tr.dataset.i];x[f]=v;recalc(S.cur);patch({ext:S.cur.ext});$$("#text .ne").forEach((c,i)=>c.textContent=thd(S.cur.ext[i].newEnd));return dash(S.cur)}
 const id=tr.dataset.id,row=S[k].find(r=>r.id==id);if(row)row[f]=v;
 later(k+id+f,()=>setDoc(doc(db,"projects",S.pid,COLL[k],id),{[f]:v,...stamp()},{merge:true}));
 if(k=="inst")patch({drawn:sum(S.inst.filter(r=>r.st!="รอเบิก"))});
 sums();dash(S.cur)});
main.addEventListener("change",ev=>{const el=ev.target,l=el.dataset.l;if(l)addList(l,el.value);if(el.dataset.p=="name")addList("names",el.value)});
function onP(el){
 const p=S.cur,f=el.dataset.p,v=el.type=="number"?(el.value===""?"":+el.value):el.value,o={[f]:v};
 if(f=="start"||f=="end"){const s=f=="start"?v:p.start,en=f=="end"?v:p.end;
  if(s&&en&&en<s){$("#perr").textContent="วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา";return}
  $("#perr").textContent="";if(s&&en){o.days=diff(s,en)+1;$('[data-p="days"]').value=o.days}
  if(f=="end"){p.end=v;recalc(p);o.ext=p.ext||[]}}
 patch(o);dash(p)}
main.addEventListener("click",async ev=>{const t=ev.target,id=t.id;
 const open=t.closest("[data-open]");if(open)return openProject(open.dataset.open);
 if(id=="back")return showHome();
 if(id=="addp"){const nid=doc(collection(db,"projects")).id;await run(()=>setDoc(doc(db,"projects",nid),{name:"",agency:"",status:"รอลงนามสัญญา",budget:0,drawn:0,ext:[],...stamp()}));return openProject(nid)}
 if(id=="addx"){S.cur.ext=[...(S.cur.ext||[]),{days:0,reason:"",date:""}];recalc(S.cur);patch({ext:S.cur.ext});return paint()}
 if(id=="addi"){const n=doc(collection(db,"projects",S.pid,"installments"));return run(()=>setDoc(n,{no:S.inst.length+1,pct:"",amt:0,st:"รอเบิก",...stamp()}))}
 if(id=="adde"){const n=doc(collection(db,"projects",S.pid,"expenses"));return run(()=>setDoc(n,{date:today(),item:"",cat:CATS[0],amt:0,meth:METH[0],payer:S.name,payee:"",st:PAY[0],ts:Date.now(),...stamp()}))}
 if(id=="delp"&&confirm(`ลบโครงการ “${S.cur.name||"ไม่มีชื่อ"}” และข้อมูลค่าใช้จ่าย/เบิกงวดทั้งหมด?\nลบแล้วกู้คืนไม่ได้ (แนะนำให้ Export CSV สำรองก่อน)`)){const i=S.pid;showHome();return run(()=>delProj(i))}
 if(t.matches("[data-del]")){const tr=t.closest("tr"),k=t.closest("[data-k]").dataset.k;if(!confirm("ยืนยันการลบรายการนี้?"))return;
  if(k=="ext"){S.cur.ext.splice(+tr.dataset.i,1);recalc(S.cur);patch({ext:S.cur.ext});return paint()}
  await run(()=>deleteDoc(doc(db,"projects",S.pid,COLL[k],tr.dataset.id)));if(k=="inst")patch({drawn:sum(S.inst.filter(r=>r.st!="รอเบิก"&&r.id!=tr.dataset.id))})}
 if(id=="hpdf"||id=="ppdf")return print();
 if(id=="hcsv")return csv("โครงการ",["ชื่อโครงการ","หน่วยงาน","หน่วยงานเต็ม","หน้างาน","วงเงิน","เลขที่สัญญา","ลงวันที่","เริ่ม","สิ้นสุด(รวมขยาย)","จำนวนวัน","สถานะ","เบิกสะสม"],S.projects.map(p=>[p.name,p.agency,p.agencyFull,p.site,p.budget,p.contractNo,p.contractDate,p.start,eff(p),p.days,p.status,p.drawn]));
 if(id=="pcsv"){const nm=S.cur.name||"project";
  csv(nm+"_ค่าใช้จ่าย",COLS.exp.map(c=>c[2]),S.exp.map(r=>COLS.exp.map(c=>r[c[0]])));
  return csv(nm+"_เบิกงวด",COLS.inst.map(c=>c[2]),S.inst.map(r=>COLS.inst.map(c=>r[c[0]])))}
 if(id=="seed")return run(seed);
 if(id=="clr"&&confirm("ลบเฉพาะโครงการตัวอย่าง (sample) ทั้งหมด?"))return run(async()=>{for(const p of S.projects.filter(x=>x.sample))await delProj(p.id)})});
main.addEventListener("change",async ev=>{if(ev.target.id!="imp")return;const f=ev.target.files[0];if(!f)return;
 const rows=parseCSV((await f.text()).replace(/^\uFEFF/,"")),h=rows.shift()||[],C=COLS.exp;
 if(!confirm(`นำเข้า ${rows.length} รายการเข้าโครงการนี้?`))return;
 run(async()=>{const b=writeBatch(db);rows.filter(r=>r.some(x=>x)).forEach((r,i)=>{const o={ts:Date.now()+i,...stamp()};C.forEach(c=>{const j=h.indexOf(c[2]);if(j>=0)o[c[0]]=c[1]=="number"?num(r[j]):r[j]});b.set(doc(collection(db,"projects",S.pid,"expenses")),o)});await b.commit()});ev.target.value=""});
async function delProj(id){for(const c of Object.values(COLL)){const s=await getDocs(collection(db,"projects",id,c));for(const d of s.docs)await deleteDoc(d.ref)}await deleteDoc(doc(db,"projects",id))}

// ---------- csv ----------
function csv(name,head,rows){const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\uFEFF"+[head,...rows].map(r=>r.map(q).join(",")).join("\r\n")],{type:"text/csv"}));a.download=`${name}_${today()}.csv`;a.click()}
function parseCSV(t){const r=[];let row=[],c="",q=0;for(let i=0;i<t.length;i++){const h=t[i];
 if(q){if(h=='"'){if(t[i+1]=='"'){c+='"';i++}else q=0}else c+=h}else if(h=='"')q=1;else if(h==","){row.push(c);c=""}else if(h=="\n"){row.push(c);r.push(row);row=[];c=""}else if(h!="\r")c+=h}
 if(c||row.length){row.push(c);r.push(row)}return r}

// ---------- sample data ----------
async function seed(){
 const P=[{id:"sample_1",name:"ก่อสร้างถนน คสล. สายบ้านดอนแก้ว",agency:"เทศบาล",agencyFull:"เทศบาลตำบลดอนแก้ว",site:"หมู่ 3 ต.ดอนแก้ว อ.แม่ริม จ.เชียงใหม่",budget:2450000,contractNo:"12/2568",contractDate:"2025-01-20",start:"2025-02-01",end:"2025-07-30",days:180,status:"กำลังก่อสร้าง",ext:[{days:30,reason:"ฝนตกชุก",date:"2025-07-10",newEnd:"2025-08-29"}]},
  {id:"sample_2",name:"ปรับปรุงอาคารสำนักงานโยธาธิการ",agency:"กรมโยธาธิการและผังเมือง",agencyFull:"สำนักงานโยธาธิการและผังเมืองจังหวัดเชียงใหม่",site:"ถ.ช้างคลาน อ.เมือง จ.เชียงใหม่",budget:1380000,contractNo:"พ.07/2568",contractDate:"2025-03-01",start:"2025-03-15",end:"2025-09-10",days:180,status:"ส่งมอบงานแล้ว",ext:[]}];
 const I={sample_1:[[1,30,735000,"2025-04-01","2025-04-20","ได้รับเงินแล้ว"],[2,60,735000,"2025-06-10","","ส่งเบิกแล้ว"],[3,100,980000,"","","รอเบิก"]],sample_2:[[1,50,690000,"2025-06-01","2025-06-25","ได้รับเงินแล้ว"],[2,100,690000,"2025-09-15","2025-10-05","ได้รับเงินแล้ว"]]};
 const E={sample_1:[["2025-02-10","ซื้อหินคลุก/ทราย","วัสดุก่อสร้าง",180000,"โอนเงิน","สมชาย","ร้านวัสดุแม่ริม","จ่ายแล้ว"],["2025-03-05","ค่าแรงช่างเทพื้น","ค่าแรง",120000,"เงินสด","สมหญิง","ทีมช่างบุญมี","จ่ายแล้ว"],["2025-03-20","ค่าน้ำมันรถบรรทุก","ค่าน้ำมัน",26500,"เครดิต-ค้างจ่าย","สมชาย","ปั๊มน้ำมันดอนแก้ว","ค้างจ่าย"]],sample_2:[["2025-03-25","สีและวัสดุทาสี","วัสดุก่อสร้าง",98000,"โอนเงิน","สมหญิง","ร้านสีเชียงใหม่","จ่ายแล้ว"],["2025-04-12","ค่าเช่านั่งร้าน","ค่าเช่า",45000,"เช็ค","สมชาย","บจก.นั่งร้านไทย","ค้างจ่าย"]]};
 for(const p of P){const b=writeBatch(db);const{id,...d}=p;b.set(doc(db,"projects",id),{...d,sample:true,drawn:sum((I[id]).map(r=>({a:r[2],s:r[5]})).filter(r=>r.s!="รอเบิก"),"a"),...stamp()});
  I[id].forEach(r=>b.set(doc(collection(db,"projects",id,"installments")),{no:r[0],pct:r[1],amt:r[2],sent:r[3],recv:r[4],st:r[5],note:""}));
  E[id].forEach((r,i)=>b.set(doc(collection(db,"projects",id,"expenses")),{date:r[0],item:r[1],cat:r[2],amt:r[3],meth:r[4],payer:r[5],payee:r[6],st:r[7],ts:i}));await b.commit()}}
