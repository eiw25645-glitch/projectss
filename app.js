// ระบบเก็บข้อมูลในเบราว์เซอร์ (localStorage) ไม่ต้องใช้ Firebase / ไม่ต้องตั้งค่าอะไร
const KEY="sakk_projects_v1";
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)],main=$("#main");
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const M=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
const STAT={"รอลงนามสัญญา":"gray","กำลังก่อสร้าง":"blue","หยุดชั่วคราว":"amber","ส่งมอบงานแล้ว":"violet","ตรวจรับแล้ว":"green","ปิดโครงการ":"slate"};
const SC={blue:"#2f6bff",amber:"#ff9a3d",green:"#17b26a",violet:"#8a5cf6",gray:"#94a3b8",slate:"#475569"};
const ACTIVE=["รอลงนามสัญญา","กำลังก่อสร้าง","หยุดชั่วคราว"],DONE=["ส่งมอบงานแล้ว","ตรวจรับแล้ว","ปิดโครงการ"];
const AG=["กรมโยธาธิการและผังเมือง","เทศบาล","กรมทางหลวง","อบต."];
const CATS=["วัสดุก่อสร้าง","ค่าแรง","ค่าเครื่องจักร-ขนส่ง","ค่าเช่า","ค่าน้ำมัน","ค่าธรรมเนียม-ภาษี","เบ็ดเตล็ด","อื่นๆ"];
const METH=["เงินสด","โอนเงิน","เช็ค","เครดิต-ค้างจ่าย"],PAY=["จ่ายแล้ว","ค้างจ่าย"],IST=["รอเบิก","ส่งเบิกแล้ว","ได้รับเงินแล้ว"];
const COLS={
 inst:[["no","number","งวดที่"],["pct","number","% งาน"],["amt","number","จำนวนเงิน"],["sent","date","วันที่ส่งเบิก"],["recv","date","วันที่ได้รับเงิน"],["st","sel","สถานะ",IST],["note","text","หมายเหตุ"]],
 exp:[["date","date","วันที่"],["item","text","รายการ"],["cat","sel","หมวด",CATS],["amt","number","จำนวนเงิน"],["meth","sel","วิธีจ่าย",METH],["payer","dl","ผู้จ่าย"],["payee","text","จ่ายให้ใคร"],["st","sel","สถานะ",PAY],["note","text","หมายเหตุ"]]};
const IC={pin:'<svg class="i" viewBox="0 0 24 24"><path d="M12 21s7-6.2 7-11a7 7 0 10-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',trash:'<svg class="i" viewBox="0 0 24 24"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>'};

// ---------- ข้อมูล ----------
let DB={projects:[]};
try{const r=JSON.parse(localStorage.getItem(KEY));if(r&&Array.isArray(r.projects))DB=r}catch{}
try{navigator.storage?.persist?.()}catch{}
const S={view:"dash",pid:null};
const cur=()=>DB.projects.find(p=>p.id==S.pid);
const st=ok=>{const el=$("#save");el.dataset.k=ok?"ok":"err";el.textContent=ok?"บันทึกในเครื่องแล้ว ✓":"บันทึกไม่สำเร็จ (พื้นที่เต็ม หรือเปิดโหมดส่วนตัว)"};
const persist=()=>{try{localStorage.setItem(KEY,JSON.stringify(DB));st(true)}catch{st(false)}};
const save=()=>{const p=cur();if(p)p.updated=Date.now();persist()};

// ---------- helpers ----------
const e=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const baht=n=>Number(n||0).toLocaleString("th-TH",{minimumFractionDigits:2,maximumFractionDigits:2});
const thd=s=>{if(!s)return"-";const[y,m,d]=s.split("-");return`${+d} ${M[m-1]} ${+y+543}`};
const dt=s=>new Date(s+"T00:00:00Z"),diff=(a,b)=>Math.round((dt(b)-dt(a))/864e5);
const addD=(s,n)=>new Date(dt(s).getTime()+n*864e5).toISOString().slice(0,10);
const today=()=>new Date().toLocaleDateString("sv");
const num=v=>+v||0,sum=(a,f="amt")=>a.reduce((s,r)=>s+num(r[f]),0);
const eff=p=>(p.ext?.length&&p.ext[p.ext.length-1].newEnd)||p.end||"";
const drawn=p=>sum((p.inst||[]).filter(r=>r.st!="รอเบิก"));
const recalc=p=>{let c=p.end;(p.ext||[]).forEach(x=>{c=c?addD(c,num(x.days)):"";x.newEnd=c})};
const stampTxt=p=>{if(!p.updated)return"";const d=new Date(p.updated);return`บันทึกล่าสุด ${thd(d.toLocaleDateString("sv"))} ${d.toLocaleTimeString("th-TH",{hour:"2-digit",minute:"2-digit"})} น.`};
function lists(){const f=(id,a)=>$(id).innerHTML=[...new Set(a.filter(Boolean))].map(x=>`<option value="${e(x)}">`).join("");
 f("#dln",DB.projects.map(p=>p.name));f("#dla",[...AG,...DB.projects.map(p=>p.agency)]);f("#dlp",DB.projects.flatMap(p=>(p.exp||[]).map(r=>r.payer)))}
function download(name,type,text){const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([text],{type}));a.download=name;a.click()}
function csv(name,head,rows){const q=v=>`"${String(v??"").replace(/"/g,'""')}"`;download(`${name}_${today()}.csv`,"text/csv","\uFEFF"+[head,...rows].map(r=>r.map(q).join(",")).join("\r\n"))}
function parseCSV(t){const r=[];let row=[],c="",q=0;for(let i=0;i<t.length;i++){const h=t[i];
 if(q){if(h=='"'){if(t[i+1]=='"'){c+='"';i++}else q=0}else c+=h}else if(h=='"')q=1;else if(h==","){row.push(c);c=""}else if(h=="\n"){row.push(c);r.push(row);row=[];c=""}else if(h!="\r")c+=h}
 if(c||row.length){row.push(c);r.push(row)}return r}

// ---------- หน้าแรก ----------
function showHome(v){
 S.view=v||S.view||"dash";S.pid=null;
 $$("nav a").forEach(x=>x.classList.toggle("on",x.dataset.v==S.view));
 const tile=(id,t,s)=>`<button class="tile" id="${id}">${t}<small>${s}</small></button>`;
 main.innerHTML=S.view=="dash"?`<header class="top"><div><h1>แดชบอร์ด</h1><p class="sub">ภาพรวมโครงการก่อสร้างทั้งหมด</p></div><div class="row"><button class="btn" id="hpdf">Export PDF</button></div></header>
 <div class="printonly"><h2>รายงานสรุปโครงการ · ${thd(today())}</h2></div><div id="sum" class="kpis"></div>
 <div class="dg"><div class="box"><h2>ทางลัด</h2><div class="tiles">${tile("addp","+ เพิ่มโครงการ","สร้างโครงการใหม่")}${tile("golist","รายการโครงการ","ดูการ์ดทั้งหมด")}${tile("bak","สำรองข้อมูล","ดาวน์โหลดไฟล์ .json")}${tile("rst","กู้คืนข้อมูล","นำเข้าไฟล์ .json")}${tile("hcsv","Export CSV","สรุปโครงการเป็นตาราง")}${tile("seed","โหลดข้อมูลตัวอย่าง","ดูหน้าตา 2 โครงการ")}${tile("clr","ล้างข้อมูลตัวอย่าง","ลบเฉพาะโครงการตัวอย่าง")}</div><input type="file" id="rfile" accept=".json" hidden></div>
 <div class="box"><h2>แจ้งเตือนสัญญา</h2><div id="alerts"></div></div></div>
 <div class="box sec"><h2>โครงการแยกตามสถานะ</h2><div id="bys"></div></div>`
 :`<header class="top"><div><h1>รายการโครงการ</h1><p class="sub">เลือกโครงการเพื่อดูรายละเอียด</p></div><div class="row"><button class="btn" id="hpdf">Export PDF</button><button class="btn" id="hcsv">Export CSV</button><button class="btn pri" id="addp">+ เพิ่มโครงการใหม่</button></div></header>
 <div id="sum" class="kpis"></div>
 <div class="bar"><input class="f" id="q" placeholder="ค้นหาชื่อโครงการ / เลขที่สัญญา / หน่วยงาน"><select class="f" id="fs"><option value="">ทุกสถานะ</option>${Object.keys(STAT).map(s=>`<option>${s}</option>`).join("")}</select><select class="f" id="fa"></select></div>
 <div id="cards" class="cards"></div>`;
 paintHome()}
function kpis(){const ps=DB.projects;$("#sum").innerHTML=[["โครงการทั้งหมด",ps.length],["กำลังดำเนินการ",ps.filter(p=>ACTIVE.includes(p.status)).length],["เสร็จแล้ว",ps.filter(p=>DONE.includes(p.status)).length],["วงเงินสัญญารวม",baht(sum(ps,"budget"))],["ยอดเบิกรวม",baht(ps.reduce((s,p)=>s+drawn(p),0))]].map(([l,v])=>`<div class="k"><b>${v}</b><span>${l}</span></div>`).join("")}
function paintHome(){
 lists();kpis();const ps=DB.projects;
 if(S.view=="dash"){
  const al=ps.filter(p=>ACTIVE.includes(p.status)&&eff(p)).map(p=>({p,l:diff(today(),eff(p))})).filter(x=>x.l<30).sort((a,b)=>a.l-b.l);
  $("#alerts").innerHTML=al.map(({p,l})=>`<div class="al ${l<0?"r":"a"}" data-open="${p.id}"><b>${e(p.name||"(ไม่มีชื่อ)")}</b><br>${l<0?`เกินกำหนด ${-l} วัน`:`เหลือ ${l} วัน`} · สิ้นสุด ${thd(eff(p))}</div>`).join("")||`<div class="al ok">${ps.length?"ไม่มีสัญญาใกล้หมดหรือเกินกำหนด ✓":"ยังไม่มีโครงการ กด “+ เพิ่มโครงการ” หรือ “โหลดข้อมูลตัวอย่าง”"}</div>`;
  $("#bys").innerHTML=Object.keys(STAT).map(s=>{const n=ps.filter(p=>p.status==s).length;return`<div class="bs"><span>${s}</span><div style="background:#eef1f7;border-radius:7px"><i style="width:${ps.length?n/ps.length*100:0}%;background:${SC[STAT[s]]}"></i></div><b>${n}</b></div>`}).join("");return}
 const q=$("#q").value.trim().toLowerCase(),fs=$("#fs").value,fa0=$("#fa").value;
 $("#fa").innerHTML=`<option value="">ทุกหน่วยงาน</option>`+[...new Set(ps.map(p=>p.agency).filter(Boolean))].map(a=>`<option${a==fa0?" selected":""}>${e(a)}</option>`).join("");
 const fa=$("#fa").value,list=ps.filter(p=>(!fs||p.status==fs)&&(!fa||p.agency==fa)&&(!q||[p.name,p.contractNo,p.agency,p.agencyFull,p.site].join(" ").toLowerCase().includes(q)));
 $("#cards").innerHTML=list.map(p=>{const end=eff(p),left=end?diff(today(),end):null,pc=num(p.budget)?Math.min(100,drawn(p)/num(p.budget)*100):0,warn=left!=null&&left<30&&ACTIVE.includes(p.status);
  return`<div class="pc" data-c="${STAT[p.status]||"gray"}" data-open="${p.id}"><span class="badge ${STAT[p.status]||"gray"}">${e(p.status||"-")}</span><h3>${e(p.name||"(ยังไม่ตั้งชื่อ)")}</h3><p>${e(p.agencyFull||p.agency||"-")}</p><p class="site">${IC.pin} หน้างาน: ${e(p.site||"-")}</p>
  <div class="mt"><span>วงเงินสัญญา</span><b>${baht(p.budget)}</b></div><div class="mt" style="margin-top:6px"><span>เบิกงวดสะสม</span><b>${pc.toFixed(1)}%</b></div><div class="pg"><i style="width:${pc}%"></i></div>
  <div class="mt"><span>วันคงเหลือของสัญญา</span><b style="color:${warn||(left!=null&&left<0)?"var(--red)":"inherit"}">${left==null?"-":left<0?`เกิน ${-left} วัน`:`${left} วัน`}</b></div><div class="vb">ดูรายละเอียด</div></div>`}).join("")||`<p class="sub">ยังไม่มีโครงการ</p>`}

// ---------- หน้าโครงการ ----------
const fld=(f,l,t="text")=>`<label>${l}<input data-p="${f}" type="${t}" ${t=="number"?'step="any"':""}></label>`;
function openProject(id){
 S.pid=id;const p=cur();
 main.innerHTML=`<header class="top"><div><button class="btn" id="back">← กลับ</button></div><div class="row"><button class="btn" id="ppdf">Export PDF / พิมพ์ A4</button><button class="btn" id="pcsv">Export CSV</button><label class="btn" style="margin:0">Import CSV<input id="imp" type="file" accept=".csv" hidden></label><button class="btn dng" id="delp">ลบโครงการ</button></div></header>
 <div id="dash"></div>
 <div class="box sec"><h2>ข้อมูลโครงการ</h2><p id="perr" class="err"></p><div class="grid">
 <label class="w2">ชื่อโครงการ<input data-p="name" list="dln"></label><label>หน่วยงาน<input data-p="agency" list="dla"></label>
 ${fld("agencyFull","ชื่อหน่วยงานเต็ม")}<label class="w2">หน้างาน (ที่ตั้ง/สถานที่ก่อสร้าง)<input data-p="site"></label>
 ${fld("budget","วงเงินในสัญญา (บาท)","number")}${fld("contractNo","เลขที่สัญญา")}${fld("contractDate","ลงวันที่","date")}
 ${fld("start","วันที่เริ่มสัญญา","date")}${fld("end","วันสิ้นสุดสัญญา","date")}${fld("days","จำนวนวัน (คำนวณให้ แก้เองได้)","number")}
 <label>สถานะโครงการ<select data-p="status">${Object.keys(STAT).map(s=>`<option>${s}</option>`).join("")}</select></label></div></div>
 <div class="box sec"><h2>ขยายสัญญา</h2><div class="tw" id="text"></div><button class="btn addb" id="addx">+ เพิ่มการขยายสัญญา</button></div>
 <div class="box sec"><h2>เบิกงวด</h2><div class="tw" id="tinst"></div><div id="isum"></div><button class="btn addb" id="addi">+ เพิ่มงวด</button></div>
 <div class="box sec"><h2>บันทึกค่าใช้จ่าย</h2>
 <div class="fl"><select class="f" id="fc"><option value="">ทุกหมวด</option>${CATS.map(c=>`<option>${c}</option>`).join("")}</select><input class="f" id="fp" list="dlp" placeholder="ผู้จ่าย (ทุกคน)"><select class="f" id="fm"><option value="">ทุกวิธีจ่าย</option>${METH.map(c=>`<option>${c}</option>`).join("")}</select><label style="margin:0">ตั้งแต่<input class="f" id="fd1" type="date"></label><label style="margin:0">ถึง<input class="f" id="fd2" type="date"></label></div>
 <div id="esum"></div><div class="tw" id="texp"></div><button class="btn pri addb" id="adde">+ เพิ่มรายการ</button></div>`;
 $$("[data-p]").forEach(el=>el.value=p[el.dataset.p]??"");
 lists();dash(p);paintExt(p);tbl("inst");tbl("exp");sums();window.scrollTo(0,0)}
function dash(p){
 const end=eff(p),t=today(),tot=p.start&&end?diff(p.start,end):0,pas=p.start?diff(p.start,t):0,left=end?diff(t,end):null,pc=tot>0?Math.max(0,Math.min(100,pas/tot*100)):0;
 const ex=sum(p.exp),dr=drawn(p),pl=dr-ex,warn=left!=null&&left<30&&ACTIVE.includes(p.status);
 const bc=CATS.map(c=>[c,sum(p.exp.filter(r=>r.cat==c))]).filter(x=>x[1]>0),mx=Math.max(1,...bc.map(x=>x[1]));
 $("#dash").innerHTML=`<div class="printonly"><h2>รายงานสรุปโครงการ · ${thd(today())}</h2></div>
 <h1>${e(p.name||"(ยังไม่ตั้งชื่อ)")} <span class="badge ${STAT[p.status]||"gray"}">${e(p.status||"")}</span></h1><p class="sub">${e(p.agencyFull||p.agency||"")} · ${stampTxt(p)}</p>
 <div class="box sec"><div class="mt" style="margin:0"><span>ระยะเวลาสัญญา ${thd(p.start)} – ${thd(end)}${p.ext?.length?` (ขยาย ${p.ext.length} ครั้ง)`:""}</span><b style="color:${warn||(left!=null&&left<0)?"var(--red)":"inherit"}">${left==null?"-":left<0?`เกินกำหนด ${-left} วัน`:`เหลือ ${left} วัน`}</b></div><div class="pg ${warn?"red":""}"><i style="width:${pc}%"></i></div></div>
 <div class="kpis sec"><div class="k"><b>${baht(p.budget)}</b><span>วงเงินสัญญา</span></div><div class="k"><b>${baht(dr)}</b><span>เบิกไปแล้ว</span></div><div class="k"><b>${baht(num(p.budget)-dr)}</b><span>คงเหลือ</span></div><div class="k"><b>${baht(ex)}</b><span>ค่าใช้จ่ายรวม</span></div><div class="k ${pl<0?"r":"g"}"><b>${baht(pl)}</b><span>${pl<0?"ขาดทุน":"กำไร"}เบื้องต้น (เบิก − ค่าใช้จ่าย)</span></div></div>
 <div class="box"><h2>ค่าใช้จ่ายแยกตามหมวด</h2>${bc.map(([c,v])=>`<div class="cb"><span>${c}</span><i style="width:${v/mx*100}%"></i><b>${baht(v)}</b></div>`).join("")||'<p class="sub">ยังไม่มีค่าใช้จ่าย</p>'}</div>`}
function paintExt(p){$("#text").innerHTML=p.ext?.length?`<table data-k="ext"><thead><tr><th>ครั้งที่</th><th>จำนวนวันที่ขยาย</th><th>เหตุผล</th><th>วันที่อนุมัติ</th><th>วันสิ้นสุดสัญญาใหม่</th><th></th></tr></thead><tbody>${p.ext.map((x,i)=>`<tr data-i="${i}"><td>${i+1}</td><td><input data-f="days" type="number" value="${e(x.days)}"></td><td><input data-f="reason" value="${e(x.reason)}"></td><td><input data-f="date" type="date" value="${e(x.date)}"></td><td class="ne">${thd(x.newEnd)}</td><td><button class="x" data-del title="ลบ">${IC.trash}</button></td></tr>`).join("")}</tbody></table>`:'<p class="sub">ไม่มีการขยายสัญญา</p>'}
const cell=(f,t,v,o)=>t=="sel"?`<select data-f="${f}">${o.map(x=>`<option${x==v?" selected":""}>${x}</option>`).join("")}</select>`:`<input data-f="${f}" type="${t=="dl"?"text":t}" value="${e(v)}"${t=="dl"?' list="dlp"':""}${t=="number"?' step="any"':""}>`;
function filt(p){const g=i=>$(i)?.value||"";return p.exp.filter(r=>(!g("#fc")||r.cat==g("#fc"))&&(!g("#fp")||(r.payer||"").includes(g("#fp")))&&(!g("#fm")||r.meth==g("#fm"))&&(!g("#fd1")||r.date>=g("#fd1"))&&(!g("#fd2")||r.date<=g("#fd2")))}
function tbl(k){const p=cur(),el=$("#t"+k);if(!el)return;
 const rows=k=="exp"?filt(p).slice().sort((a,b)=>(a.date||"").localeCompare(b.date||"")):p.inst;
 el.innerHTML=`<table data-k="${k}"><thead><tr>${COLS[k].map(c=>`<th>${c[2]}</th>`).join("")}<th></th></tr></thead><tbody>${rows.map(r=>`<tr data-id="${r.id}">${COLS[k].map(c=>`<td>${cell(c[0],c[1],r[c[0]],c[3])}</td>`).join("")}<td><button class="x" data-del title="ลบ">${IC.trash}</button></td></tr>`).join("")||`<tr><td colspan="${COLS[k].length+1}" class="sub">ยังไม่มีรายการ</td></tr>`}</tbody></table>`}
function sums(){const p=cur();if(!p)return;
 const a=sum(p.inst),pc=num(p.budget)?a/num(p.budget)*100:0;
 $("#isum").innerHTML=`<div class="sumrow" style="padding:8px 10px;margin-top:6px">รวม ${baht(a)} บาท · % งานรวม ${sum(p.inst,"pct")}% · เบิกสะสม ${pc.toFixed(1)}% ของวงเงิน</div>`;
 const rows=filt(p),by=k=>Object.entries(rows.reduce((m,r)=>(m[r[k]||"-"]=(m[r[k]||"-"]||0)+num(r.amt),m),{})).map(([x,y])=>`<li><span>${e(x)}</span><b>${baht(y)}</b></li>`).join("");
 $("#esum").innerHTML=`<div class="chips"><div class="k"><b>${baht(sum(rows))}</b><span>ยอดรวม (${rows.length} รายการ)</span></div><div class="k r"><b>${baht(sum(rows.filter(r=>r.st=="ค้างจ่าย")))}</b><span>ยอดค้างจ่าย</span></div></div><div class="two"><div><h2>แยกตามผู้จ่าย</h2><ul class="l">${by("payer")}</ul></div><div><h2>แยกตามหมวด</h2><ul class="l">${by("cat")}</ul></div></div>`}

// ---------- events ----------
main.addEventListener("input",ev=>{const el=ev.target;
 if(el.classList.contains("f"))return S.pid?(tbl("exp"),sums()):paintHome();
 const p=cur();if(!p)return;
 if(el.dataset.p)return onP(p,el);
 const tb=el.closest("[data-k]"),tr=el.closest("tr"),f=el.dataset.f;if(!tb||!f)return;
 const v=el.type=="number"?(el.value===""?"":+el.value):el.value,k=tb.dataset.k;
 if(k=="ext"){p.ext[tr.dataset.i][f]=v;recalc(p);save();$$("#text .ne").forEach((c,i)=>c.textContent=thd(p.ext[i].newEnd));return dash(p)}
 const row=p[k].find(r=>r.id==tr.dataset.id);if(row)row[f]=v;save();sums();dash(p)});
main.addEventListener("change",()=>lists());
function onP(p,el){
 const f=el.dataset.p,v=el.type=="number"?(el.value===""?"":+el.value):el.value;
 if(f=="start"||f=="end"){const s=f=="start"?v:p.start,en=f=="end"?v:p.end;
  if(s&&en&&en<s){$("#perr").textContent="วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา";return}
  $("#perr").textContent="";p[f]=v;if(s&&en){p.days=diff(s,en)+1;$('[data-p="days"]').value=p.days}recalc(p);paintExt(p)}
 else p[f]=v;
 save();dash(p)}
main.addEventListener("click",ev=>{const t=ev.target,id=t.id,p=cur();
 const open=t.closest("[data-open]");if(open)return openProject(open.dataset.open);
 if(id=="back")return showHome();
 if(id=="golist")return showHome("list");
 if(id=="addp"){const n={id:uid(),name:"",agency:"",agencyFull:"",site:"",budget:0,status:"รอลงนามสัญญา",ext:[],inst:[],exp:[]};DB.projects.unshift(n);S.pid=n.id;save();return openProject(n.id)}
 if(id=="addx"){p.ext.push({days:0,reason:"",date:""});recalc(p);save();return paintExt(p)}
 if(id=="addi"){p.inst.push({id:uid(),no:p.inst.length+1,pct:"",amt:0,st:"รอเบิก",sent:"",recv:"",note:""});save();tbl("inst");sums();return dash(p)}
 if(id=="adde"){p.exp.push({id:uid(),date:today(),item:"",cat:CATS[0],amt:0,meth:METH[0],payer:"",payee:"",st:PAY[0],note:""});save();tbl("exp");sums();return dash(p)}
 if(id=="delp"&&confirm(`ลบโครงการ “${p.name||"ไม่มีชื่อ"}” และข้อมูลค่าใช้จ่าย/เบิกงวดทั้งหมด?\nลบแล้วกู้คืนไม่ได้ (แนะนำให้กด “สำรองข้อมูล” ก่อน)`)){DB.projects=DB.projects.filter(x=>x.id!=p.id);persist();return showHome()}
 const d=t.closest("[data-del]");if(d){const tr=d.closest("tr"),k=d.closest("[data-k]").dataset.k;if(!confirm("ยืนยันการลบรายการนี้?"))return;
  if(k=="ext"){p.ext.splice(+tr.dataset.i,1);recalc(p);save();paintExt(p)}else{p[k]=p[k].filter(r=>r.id!=tr.dataset.id);save();tbl(k);sums()}return dash(p)}
 if(id=="hpdf"||id=="ppdf")return print();
 if(id=="hcsv")return csv("โครงการ",["ชื่อโครงการ","หน่วยงาน","หน่วยงานเต็ม","หน้างาน","วงเงิน","เลขที่สัญญา","ลงวันที่","เริ่ม","สิ้นสุด(รวมขยาย)","จำนวนวัน","สถานะ","เบิกสะสม","ค่าใช้จ่ายรวม"],DB.projects.map(q=>[q.name,q.agency,q.agencyFull,q.site,q.budget,q.contractNo,q.contractDate,q.start,eff(q),q.days,q.status,drawn(q),sum(q.exp)]));
 if(id=="pcsv"){const nm=p.name||"project";csv(nm+"_ค่าใช้จ่าย",COLS.exp.map(c=>c[2]),p.exp.map(r=>COLS.exp.map(c=>r[c[0]])));return csv(nm+"_เบิกงวด",COLS.inst.map(c=>c[2]),p.inst.map(r=>COLS.inst.map(c=>r[c[0]])))}
 if(id=="bak")return download(`สำรองข้อมูลโครงการ_${today()}.json`,"application/json",JSON.stringify(DB,null,1));
 if(id=="rst")return $("#rfile").click();
 if(id=="seed"){const have=DB.projects.some(x=>x.sample);if(have)return alert("มีโครงการตัวอย่างอยู่แล้ว");DB.projects.push(...sample());persist();return paintHome()}
 if(id=="clr"&&confirm("ลบเฉพาะโครงการตัวอย่างทั้งหมด?")){DB.projects=DB.projects.filter(x=>!x.sample);persist();paintHome()}});
main.addEventListener("change",async ev=>{const el=ev.target;
 if(el.id=="rfile"&&el.files[0]){try{const r=JSON.parse(await el.files[0].text());if(!Array.isArray(r.projects))throw 0;
   if(confirm(`กู้คืน ${r.projects.length} โครงการ? ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่`)){DB=r;persist();paintHome()}}catch{alert("ไฟล์สำรองไม่ถูกต้อง")}el.value=""}
 if(el.id=="imp"&&el.files[0]){const rows=parseCSV((await el.files[0].text()).replace(/^\uFEFF/,"")),h=rows.shift()||[],p=cur();
  if(confirm(`นำเข้า ${rows.length} รายการเข้าโครงการนี้?`)){rows.filter(r=>r.some(x=>x)).forEach(r=>{const o={id:uid()};COLS.exp.forEach(c=>{const j=h.indexOf(c[2]);if(j>=0)o[c[0]]=c[1]=="number"?num(r[j]):r[j]});p.exp.push(o)});save();tbl("exp");sums();dash(p)}el.value=""}});

// ---------- ข้อมูลตัวอย่าง ----------
function sample(){
 const I=(a)=>a.map(r=>({id:uid(),no:r[0],pct:r[1],amt:r[2],sent:r[3],recv:r[4],st:r[5],note:""}));
 const E=(a)=>a.map(r=>({id:uid(),date:r[0],item:r[1],cat:r[2],amt:r[3],meth:r[4],payer:r[5],payee:r[6],st:r[7],note:""}));
 return[{id:"sample_1",sample:true,name:"ก่อสร้างถนน คสล. สายบ้านดอนแก้ว",agency:"เทศบาล",agencyFull:"เทศบาลตำบลดอนแก้ว",site:"หมู่ 3 ต.ดอนแก้ว อ.แม่ริม จ.เชียงใหม่",budget:2450000,contractNo:"12/2568",contractDate:"2025-01-20",start:"2025-02-01",end:"2025-07-30",days:180,status:"กำลังก่อสร้าง",ext:[{days:30,reason:"ฝนตกชุก",date:"2025-07-10",newEnd:"2025-08-29"}],
  inst:I([[1,30,735000,"2025-04-01","2025-04-20","ได้รับเงินแล้ว"],[2,60,735000,"2025-06-10","","ส่งเบิกแล้ว"],[3,100,980000,"","","รอเบิก"]]),
  exp:E([["2025-02-10","ซื้อหินคลุก/ทราย","วัสดุก่อสร้าง",180000,"โอนเงิน","สมชาย","ร้านวัสดุแม่ริม","จ่ายแล้ว"],["2025-03-05","ค่าแรงช่างเทพื้น","ค่าแรง",120000,"เงินสด","สมหญิง","ทีมช่างบุญมี","จ่ายแล้ว"],["2025-03-20","ค่าน้ำมันรถบรรทุก","ค่าน้ำมัน",26500,"เครดิต-ค้างจ่าย","สมชาย","ปั๊มน้ำมันดอนแก้ว","ค้างจ่าย"]]),updated:Date.now()},
 {id:"sample_2",sample:true,name:"ปรับปรุงอาคารสำนักงานโยธาธิการ",agency:"กรมโยธาธิการและผังเมือง",agencyFull:"สำนักงานโยธาธิการและผังเมืองจังหวัดเชียงใหม่",site:"ถ.ช้างคลาน อ.เมือง จ.เชียงใหม่",budget:1380000,contractNo:"พ.07/2568",contractDate:"2025-03-01",start:"2025-03-15",end:"2025-09-10",days:180,status:"ส่งมอบงานแล้ว",ext:[],
  inst:I([[1,50,690000,"2025-06-01","2025-06-25","ได้รับเงินแล้ว"],[2,100,690000,"2025-09-15","2025-10-05","ได้รับเงินแล้ว"]]),
  exp:E([["2025-03-25","สีและวัสดุทาสี","วัสดุก่อสร้าง",98000,"โอนเงิน","สมหญิง","ร้านสีเชียงใหม่","จ่ายแล้ว"],["2025-04-12","ค่าเช่านั่งร้าน","ค่าเช่า",45000,"เช็ค","สมชาย","บจก.นั่งร้านไทย","ค้างจ่าย"]]),updated:Date.now()}]}

// ---------- เริ่มทำงาน ----------
$("#nhome").onclick=()=>showHome("dash");$("#nlist").onclick=()=>showHome("list");
st(true);showHome("dash");
