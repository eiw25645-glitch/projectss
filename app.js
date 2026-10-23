import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {getFirestore,collection,collectionGroup,doc,getDoc,setDoc,addDoc,deleteDoc,onSnapshot,arrayUnion,writeBatch} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";
const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const baht=n=>(+n||0).toLocaleString('th-TH',{minimumFractionDigits:2,maximumFractionDigits:2});
const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*6e4).toISOString().slice(0,10);
const fd=d=>d?new Date(d+'T00:00:00Z').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}):'-';
const fdt=s=>s?new Date(s).toLocaleString('th-TH',{dateStyle:'medium',timeStyle:'short'}):'';
const add=(d,n)=>{const t=new Date(d+'T00:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10)};
const diff=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const sum=(a,f)=>a.reduce((s,x)=>s+(+f(x)||0),0);
const pct=(a,b)=>b?a/b*100:0;
const effEnd=p=>p.end?add(p.end,sum(p.ext||[],x=>x.days)):'';
const ST=['รอลงนามสัญญา','กำลังก่อสร้าง','หยุดชั่วคราว','ส่งมอบงานแล้ว','ตรวจรับแล้ว','ปิดโครงการ'];
const SC=['#6b7280','#1d6fb8','#d97706','#7c3aed','#059669','#374151'];
const AG=['กรมโยธาธิการและผังเมือง','เทศบาล','กรมทางหลวง','อบต.','อื่นๆ'];
const CAT=['วัสดุก่อสร้าง','ค่าแรง','ค่าเครื่องจักร-ขนส่ง','ค่าเช่า','ค่าน้ำมัน','ค่าธรรมเนียม-ภาษี','เบ็ดเตล็ด','อื่นๆ'];
const MT=['เงินสด','โอนเงิน','เช็ค','เครดิต-ค้างจ่าย'],IS=['รอเบิก','ส่งเบิกแล้ว','ได้รับเงินแล้ว'],ES=['จ่ายแล้ว','ค้างจ่าย'];
const PF=[['name','ชื่อโครงการ','list','names'],['agency','หน่วยงาน','list','agencies'],['agencyFull','ชื่อหน่วยงานเต็ม','text'],['site','หน้างาน (ที่ตั้ง)','text'],['amount','วงเงินในสัญญา (บาท)','number'],['contractNo','เลขที่สัญญา','text'],['contractDate','ลงวันที่','date'],['start','วันที่เริ่มสัญญา','date'],['end','วันสิ้นสุดสัญญา','date'],['days','จำนวนวัน','number'],['status','สถานะโครงการ','select',ST]];
const XF=[['days','ขยาย (วัน)','number'],['reason','เหตุผล','text'],['date','วันที่อนุมัติ','date']];
const IF=[['no','งวดที่','number'],['pct','% งาน','number'],['amount','จำนวนเงิน','number'],['dSubmit','วันที่ส่งเบิก','date'],['dPaid','วันที่ได้รับเงิน','date'],['status','สถานะ','select',IS],['note','หมายเหตุ','text']];
const EF=[['date','วันที่','date'],['item','รายการ','text'],['cat','หมวด','select',CAT],['amount','จำนวนเงิน','number'],['method','วิธีจ่าย','select',MT],['payer','ผู้จ่าย','list','payers'],['payee','จ่ายให้ใคร','text'],['status','สถานะ','select',ES],['note','หมายเหตุ','text']];
const S={role:'viewer',name:'',P:[],I:[],E:[],set:{},cur:null,loaded:false,f:{q:'',st:'',ag:''},ef:{cat:'',payer:'',m:'',from:'',to:''},un:[]};
const ro=()=>S.role!=='editor',stamp=()=>({updatedBy:S.name,updatedAt:new Date().toISOString()});
const opts=(a,v)=>a.map(o=>`<option ${o===v?'selected':''}>${esc(o)}</option>`).join('');
const badge=s=>`<span class="bd" style="background:${SC[ST.indexOf(s)]||'#6b7280'}">${esc(s)}</span>`;
const claimed=pid=>sum(S.I.filter(i=>i.pid===pid&&i.status!=='รอเบิก'),i=>i.amount);
// ---------- auto-save ----------
const T={},D={};let pend=0,bad=false;
function setSt(s){$('#st').textContent={saving:'กำลังบันทึก…',ok:'บันทึกแล้ว ✓',err:'บันทึกไม่สำเร็จ ลองใหม่'}[s]||''}
function qs(key,patch,fn){D[key]={...D[key],...patch};if(!T[key])pend++;clearTimeout(T[key]);bad=false;setSt('saving');
 T[key]=setTimeout(async()=>{const p=D[key];delete D[key];try{await fn(p)}catch(e){console.error(e);bad=true}delete T[key];pend--;if(!pend)setSt(bad?'err':'ok');else if(bad)setSt('err')},600)}
async function run(fn){setSt('saving');try{await fn();setSt('ok')}catch(e){console.error(e);setSt('err')}}
addEventListener('beforeunload',e=>{if(pend)e.preventDefault()});
const writeP=async(id,p)=>{await setDoc(doc(db,'projects',id),{...p,...stamp()},{merge:true});
 for(const[f,k]of[['name','names'],['agency','agencies']])if(p[f])await setDoc(doc(db,'settings','lists'),{[k]:arrayUnion(p[f])},{merge:true})};
const writeS=(c,pid,id)=>async p=>{await setDoc(doc(db,'projects',pid,c,id),{...p,...stamp()},{merge:true});await setDoc(doc(db,'projects',pid),stamp(),{merge:true});
 if(p.payer)await setDoc(doc(db,'settings','lists'),{payers:arrayUnion(p.payer)},{merge:true})};
// ---------- auth ----------
const show=v=>{$('#login').classList.toggle('hide',v!=='login');$('#app').classList.toggle('hide',v!=='app')};
$('#lf').addEventListener('submit',async e=>{e.preventDefault();$('#lerr').textContent='';
 try{await signInWithEmailAndPassword(auth,$('#em').value.trim(),$('#pw').value)}catch{$('#lerr').textContent='อีเมลหรือรหัสผ่านไม่ถูกต้อง'}});
$('#out').onclick=()=>signOut(auth);
onAuthStateChanged(auth,async u=>{S.un.forEach(f=>f());S.un=[];S.loaded=false;
 if(!u){show('login');return}
 let r=null;try{r=(await getDoc(doc(db,'users',u.email.toLowerCase()))).data()}catch(e){console.error(e)}
 if(!r){$('#lerr').textContent='บัญชีนี้ยังไม่ได้รับสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแล';await signOut(auth);return}
 S.role=r.role==='editor'?'editor':'viewer';S.name=r.name||u.email.split('@')[0];
 document.body.classList.toggle('ro',ro());$('#who').textContent=`${S.name} (${ro()?'ดูอย่างเดียว':'แก้ไขได้'})`;
 show('app');start();route()});
function start(){const sn=(q,f)=>onSnapshot(q,f,e=>{console.error(e);setSt('err')});
 S.un=[sn(collection(db,'projects'),s=>{S.P=s.docs.map(d=>({...d.data(),id:d.id}));S.loaded=true;render()}),
 sn(collectionGroup(db,'installments'),s=>{S.I=s.docs.map(d=>({...d.data(),id:d.id,pid:d.ref.parent.parent.id}));render()}),
 sn(collectionGroup(db,'expenses'),s=>{S.E=s.docs.map(d=>({...d.data(),id:d.id,pid:d.ref.parent.parent.id}));render()}),
 sn(doc(db,'settings','lists'),s=>{S.set=s.data()||{};render()})]}
// ---------- render ----------
let dirty=false;
const typing=()=>{const a=document.activeElement;return a&&/INPUT|SELECT/.test(a.tagName)&&$('#main').contains(a)};
addEventListener('hashchange',route);
function route(){S.cur=location.hash.slice(1)||null;scrollTo(0,0);render(true)}
$('#main').addEventListener('focusout',()=>setTimeout(()=>{if(dirty&&!typing())render()},250));
function render(force){if(!S.loaded)return;if(!force&&typing()){dirty=true;return}dirty=false;
 const L=(k,x)=>`<datalist id="dl-${k}">${[...new Set(x)].filter(Boolean).map(v=>`<option value="${esc(v)}">`).join('')}</datalist>`;
 $('#dls').innerHTML=L('names',[...(S.set.names||[]),...S.P.map(p=>p.name)])+L('agencies',[...AG,...(S.set.agencies||[])])+L('payers',[...(S.set.payers||[]),...S.E.map(e=>e.payer)]);
 S.cur?renderDetail():renderHome()}
function renderHome(){const P=S.P;
 $('#main').innerHTML=`<div class="sum">${[['โครงการทั้งหมด',P.length],['กำลังดำเนินการ',P.filter(p=>p.status==='กำลังก่อสร้าง').length],['เสร็จแล้ว',P.filter(p=>['ส่งมอบงานแล้ว','ตรวจรับแล้ว','ปิดโครงการ'].includes(p.status)).length],['วงเงินสัญญารวม',baht(sum(P,p=>p.amount))],['ยอดเบิกรวม',baht(sum(S.I.filter(i=>i.status!=='รอเบิก'),i=>i.amount))]].map(([l,v])=>`<div class="kpi"><small>${l}</small><b>${v}</b></div>`).join('')}</div>
<div class="bar np"><input data-flt="q" placeholder="ค้นหาชื่อโครงการ / หน่วยงาน / เลขสัญญา" value="${esc(S.f.q)}"><select data-flt="st"><option value="">ทุกสถานะ</option>${opts(ST,S.f.st)}</select><select data-flt="ag"><option value="">ทุกหน่วยงาน</option>${opts([...new Set(P.map(p=>p.agency).filter(Boolean))],S.f.ag)}</select><button class="btn or ed" data-act="newP">+ เพิ่มโครงการใหม่</button></div>
<div id="hl" class="cards"></div>
<div class="tools np"><button class="btn gh" data-act="json">สำรอง JSON</button><button class="btn gh" data-act="csvP">CSV โครงการ</button><button class="btn gh" data-act="csvE">CSV ค่าใช้จ่าย</button>
<label class="btn gh ed" style="display:inline-block">นำเข้า JSON<input type="file" accept=".json" data-act="imp" hidden></label><button class="btn gh ed" data-act="seed">โหลดข้อมูลตัวอย่าง</button><button class="btn gh ed" data-act="unseed">ล้างข้อมูลตัวอย่าง</button></div>`;renderList()}
function renderList(){const f=S.f,q=f.q.trim();
 const L=S.P.filter(p=>(!f.st||p.status===f.st)&&(!f.ag||p.agency===f.ag)&&(!q||[p.name,p.agencyFull,p.agency,p.site,p.contractNo].join(' ').includes(q)));
 $('#hl').innerHTML=L.map(p=>{const c=claimed(p.id),e=effEnd(p.end),left=e?diff(today(),e):null,pc=pct(c,p.amount);
 return `<a class="card" href="#${p.id}">${badge(p.status)}<h3>${esc(p.name||'(ยังไม่ตั้งชื่อ)')}</h3><p>${esc(p.agencyFull||p.agency||'')}</p><p>วงเงิน <b>${baht(p.amount)}</b> บาท</p><div class="pg"><i style="width:${Math.min(100,pc)}%"></i></div><p>เบิกสะสม ${pc.toFixed(1)}% · ${left==null?'ยังไม่กำหนดสัญญา':left<0?`<span class="red">เกินกำหนด ${-left} วัน</span>`:`เหลือ <span class="${left<30?'red':''}">${left}</span> วัน`}</p></a>`}).join('')||'<p>ยังไม่มีโครงการ กด "+ เพิ่มโครงการใหม่" เพื่อเริ่มต้น</p>'}
function fld(c,v,a){const d=ro()?'disabled':'',[,,ty,o]=c;
 if(ty==='select')return `<select ${a} ${d}>${v?'':'<option></option>'}${opts(o,v)}</select>`;
 return `<input ${ty==='list'?`list="dl-${o}"`:`type="${ty}"`} ${ty==='number'?'step="any" inputmode="decimal"':''} value="${esc(v)}" ${a} ${d}>`}
const cell=(t,id,c,v)=>`<label>${c[1]}${fld(c,v,`data-t="${t}" data-id="${id}" data-k="${c[0]}"`)}</label>`;
const rowH=(t,r,cols)=>`<div class="row">${cols.map(c=>cell(t,r.id,c,r[c[0]])).join('')}<button class="btn sm dng ed np" data-act="del" data-t="${t}" data-id="${r.id}">ลบ</button></div>`;
function renderDetail(){const p=S.P.find(x=>x.id===S.cur);if(!p){$('#main').innerHTML='<p>ไม่พบโครงการ</p><a href="#">← กลับหน้าแรก</a>';return}
 const I=S.I.filter(i=>i.pid===p.id).sort((a,b)=>a.no-b.no),E=S.E.filter(x=>x.pid===p.id),c=claimed(p.id),sp=sum(E,e=>e.amount),e=effEnd(p.end),left=e?diff(today(),e):null;
 const tot=p.start&&e?diff(p.start,e)+1:0,el=p.start?Math.max(0,Math.min(tot,diff(p.start,today())+1)):0,tp=pct(el,tot);
 const cats=CAT.map(k=>[k,sum(E.filter(x=>x.cat===k),x=>x.amount)]).filter(x=>x[1]),mx=Math.max(1,...cats.map(x=>x[1]));
 let ce=p.end;const xs=(p.ext||[]).map((x,i)=>{ce=ce?add(ce,+x.days||0):'';return `<div class="small">ครั้งที่ ${i+1} → วันสิ้นสุดใหม่ ${fd(ce)}</div>${rowH('x',{...x,id:i},XF)}`}).join('');
 const profit=c-sp,ip=sum(I,i=>i.pct);
 $('#main').innerHTML=`<div class="top np"><a class="btn gh sm" href="#">← กลับหน้าแรก</a><h1>${esc(p.name||'(ยังไม่ตั้งชื่อ)')}</h1><button class="btn gh sm" data-act="print">พิมพ์สรุป A4</button><button class="btn dng sm ed" data-act="delP">ลบโครงการ</button></div>
<p class="small">${badge(p.status)} แก้ไขล่าสุด: ${esc(p.updatedBy||'-')} · ${fdt(p.updatedAt)}</p>
<section class="box"><h2>สรุปโครงการ</h2><div class="sum">
<div class="kpi"><small>สัญญา ${fd(p.start)} – ${fd(e)}</small><b class="${left!=null&&left<30?'red':''}">${left==null?'-':left<0?`เกินกำหนด ${-left} วัน`:`เหลือ ${left} วัน`}</b></div>
<div class="kpi"><small>วงเงินสัญญา</small><b>${baht(p.amount)}</b></div><div class="kpi"><small>เบิกไปแล้ว</small><b>${baht(c)}</b></div><div class="kpi"><small>คงเหลือ</small><b>${baht((+p.amount||0)-c)}</b></div>
<div class="kpi"><small>ค่าใช้จ่ายรวม</small><b>${baht(sp)}</b></div><div class="kpi"><small>กำไร/ขาดทุนเบื้องต้น</small><b class="${profit<0?'red':''}">${baht(profit)}</b></div></div>
<small>ระยะเวลาสัญญาที่ผ่านไป ${tp.toFixed(0)}%</small><div class="pg ${left!=null&&left<30?'red':''}"><i style="width:${tp}%"></i></div>
${cats.map(([k,v])=>`<div class="cat"><span>${k}</span><i style="width:${v/mx*100}%"></i><span>${baht(v)}</span></div>`).join('')||'<p class="small">ยังไม่มีค่าใช้จ่าย</p>'}</section>
<section class="box"><h2>ข้อมูลโครงการ</h2><div class="grid">${PF.map(c=>cell('p',p.id,c,p[c[0]])).join('')}</div></section>
<section class="box"><h2>ขยายสัญญา</h2>${xs||'<p class="small">ไม่มีการขยายสัญญา</p>'}<button class="btn sm ed np" data-act="addX">+ เพิ่มการขยายสัญญา</button></section>
<section class="box"><h2>เบิกงวด</h2>${I.map(r=>rowH('i',r,IF)).join('')}<button class="btn sm ed np" data-act="addI" style="margin-top:8px">+ เพิ่มงวด</button>
<div class="tot">รวม ${baht(sum(I,i=>i.amount))} บาท · % งานสะสม ${ip.toFixed(1)}% · เบิกแล้ว ${pct(c,p.amount).toFixed(1)}% ของวงเงิน</div></section>
<section class="box"><h2>ค่าใช้จ่าย</h2><div class="grid np"><label>หมวด<select data-eflt="cat"><option value="">ทั้งหมด</option>${opts(CAT,S.ef.cat)}</select></label>
<label>ผู้จ่าย<select data-eflt="payer"><option value="">ทั้งหมด</option>${opts([...new Set(E.map(x=>x.payer).filter(Boolean))],S.ef.payer)}</select></label>
<label>วิธีจ่าย<select data-eflt="m"><option value="">ทั้งหมด</option>${opts(MT,S.ef.m)}</select></label>
<label>ตั้งแต่<input type="date" data-eflt="from" value="${S.ef.from}"></label><label>ถึง<input type="date" data-eflt="to" value="${S.ef.to}"></label></div>
<div id="exb"></div><button class="btn sm ed np" data-act="addE" style="margin-top:8px">+ เพิ่มรายการ</button></section>`;renderEx()}
function renderEx(){const p=S.cur,f=S.ef,E=S.E.filter(x=>x.pid===p&&(!f.cat||x.cat===f.cat)&&(!f.payer||x.payer===f.payer)&&(!f.m||x.method===f.m)&&(!f.from||x.date>=f.from)&&(!f.to||x.date<=f.to)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
 const by=(k,l)=>[...new Set(E.map(x=>x[k]).filter(Boolean))].map(v=>`${esc(v)} ${baht(sum(E.filter(x=>x[k]===v),x=>x.amount))}`).join(' · ')||'-';
 $('#exb').innerHTML=E.map(r=>rowH('e',r,EF)).join('')+`<div class="tot">รวม ${baht(sum(E,x=>x.amount))} บาท · <span class="red">ค้างจ่าย ${baht(sum(E.filter(x=>x.status==='ค้างจ่าย'),x=>x.amount))}</span><div class="small">แยกตามผู้จ่าย: ${by('payer')}</div><div class="small">แยกตามหมวด: ${by('cat')}</div></div>`}
// ---------- events ----------
$('#main').addEventListener('input',onEdit);$('#main').addEventListener('change',onEdit);
function onEdit(e){const el=e.target,d=el.dataset;
 if(d.flt){S.f[d.flt]=el.value;return renderList()}
 if(d.eflt){S.ef[d.eflt]=el.value;return renderEx()}
 if(ro()||!d.t)return;
 const v=el.type==='number'?(el.value===''?'':+el.value):el.value,p=S.P.find(x=>x.id===S.cur),key='P'+p.id,cur={...p,...D[key]};
 if(d.t==='p'){const patch={[d.k]:v};
  if(d.k==='start'||d.k==='end'){const s=d.k==='start'?v:cur.start,en=d.k==='end'?v:cur.end;
   if(s&&en&&en<s){alert('วันสิ้นสุดสัญญาต้องไม่ก่อนวันเริ่มสัญญา');el.value=cur[d.k]||'';return}
   if(s&&en){patch.days=diff(s,en)+1;$('[data-t=p][data-k=days]').value=patch.days}}
  qs(key,patch,w=>writeP(p.id,w))}
 else if(d.t==='x'){const a=structuredClone(cur.ext||[]);a[+d.id][d.k]=v;qs(key,{ext:a},w=>writeP(p.id,w))}
 else qs(d.t+d.id,{[d.k]:v},writeS(d.t==='i'?'installments':'expenses',p.id,d.id))}
$('#main').addEventListener('click',async e=>{const b=e.target.closest('button[data-act]');if(!b)return;const{act,t,id}=b.dataset,p=S.P.find(x=>x.id===S.cur);
 if(act==='newP')run(async()=>{const r=await addDoc(collection(db,'projects'),{name:'',agency:'',amount:0,status:'รอลงนามสัญญา',ext:[],...stamp()});location.hash=r.id});
 else if(act==='addI')run(()=>addDoc(collection(db,'projects',p.id,'installments'),{no:S.I.filter(i=>i.pid===p.id).length+1,pct:'',amount:'',dSubmit:'',dPaid:'',status:'รอเบิก',note:'',...stamp()}));
 else if(act==='addE')run(()=>addDoc(collection(db,'projects',p.id,'expenses'),{date:today(),item:'',cat:CAT[0],amount:'',method:MT[0],payer:'',payee:'',status:ES[0],note:'',...stamp()}));
 else if(act==='addX')run(()=>writeP(p.id,{ext:[...(p.ext||[]),{days:'',reason:'',date:today()}]}));
 else if(act==='del'){if(!confirm('ยืนยันการลบรายการนี้?'))return;
  run(()=>t==='x'?writeP(p.id,{ext:(p.ext||[]).filter((_,i)=>i!==+id)}):deleteDoc(doc(db,'projects',p.id,t==='i'?'installments':'expenses',id)))}
 else if(act==='delP'){if(!confirm(`ยืนยันลบโครงการ "${p.name}" พร้อมเบิกงวดและค่าใช้จ่ายทั้งหมด? (ควรกดสำรอง JSON ก่อน)`))return;
  run(async()=>{const bt=writeBatch(db);S.I.filter(i=>i.pid===p.id).forEach(i=>bt.delete(doc(db,'projects',p.id,'installments',i.id)));S.E.filter(x=>x.pid===p.id).forEach(x=>bt.delete(doc(db,'projects',p.id,'expenses',x.id)));bt.delete(doc(db,'projects',p.id));await bt.commit();location.hash=''})}
 else if(act==='print')print();
 else if(act==='json')dl(`backup-${today()}.json`,JSON.stringify({projects:S.P.map(p=>({...p,installments:S.I.filter(x=>x.pid===p.id),expenses:S.E.filter(x=>x.pid===p.id)})),settings:S.set},null,1),'application/json');
 else if(act==='csvP')dl(`projects-${today()}.csv`,csv([['ชื่อโครงการ','หน่วยงาน','สถานะ','วงเงิน','เบิกแล้ว','เลขที่สัญญา','เริ่ม','สิ้นสุด(ใหม่)'],...S.P.map(p=>[p.name,p.agencyFull||p.agency,p.status,p.amount,claimed(p.id),p.contractNo,p.start,effEnd(p.end)])]),'text/csv');
 else if(act==='csvE')dl(`expenses-${today()}.csv`,csv([['โครงการ','วันที่','รายการ','หมวด','จำนวนเงิน','วิธีจ่าย','ผู้จ่าย','จ่ายให้','สถานะ','หมายเหตุ'],...S.E.map(x=>[S.P.find(p=>p.id===x.pid)?.name,x.date,x.item,x.cat,x.amount,x.method,x.payer,x.payee,x.status,x.note])]),'text/csv');
 else if(act==='seed')run(seed);
 else if(act==='unseed'){if(!confirm('ลบเฉพาะข้อมูลตัวอย่าง?'))return;run(async()=>{const bt=writeBatch(db);S.P.filter(p=>p.sample).forEach(p=>{bt.delete(doc(db,'projects',p.id));S.I.filter(i=>i.pid===p.id).forEach(i=>bt.delete(doc(db,'projects',p.id,'installments',i.id)));S.E.filter(x=>x.pid===p.id).forEach(x=>bt.delete(doc(db,'projects',p.id,'expenses',x.id)))});await bt.commit()})}});
$('#main').addEventListener('change',e=>{if(e.target.dataset.act==='imp'&&e.target.files[0])run(()=>imp(e.target.files[0]))});
const csv=r=>'\ufeff'+r.map(x=>x.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n');
function dl(n,txt,m){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([txt],{type:m+';charset=utf-8'}));a.download=n;a.click()}
async function imp(file){const j=JSON.parse(await file.text());if(!confirm(`นำเข้า ${j.projects.length} โครงการ (รหัสซ้ำจะถูกเขียนทับ) ดำเนินการต่อ?`))return;const ops=[];
 for(const{installments=[],expenses=[],id,...p}of j.projects){ops.push([doc(db,'projects',id),p]);
  installments.forEach(({id:i,pid,...x})=>ops.push([doc(db,'projects',id,'installments',i),x]));expenses.forEach(({id:i,pid,...x})=>ops.push([doc(db,'projects',id,'expenses',i),x]))}
 if(j.settings)ops.push([doc(db,'settings','lists'),j.settings]);
 for(let i=0;i<ops.length;i+=400){const bt=writeBatch(db);ops.slice(i,i+400).forEach(([r,d])=>bt.set(r,d));await bt.commit()}}
async function seed(){const bt=writeBatch(db),t=today(),sm={sample:true,...stamp()};
 const mk=(id,p,ins,ex)=>{bt.set(doc(db,'projects',id),{...p,ext:[],...sm});ins.forEach((x,i)=>bt.set(doc(db,'projects',id,'installments',id+'i'+i),{no:i+1,note:'',...x,...sm}));
  ex.forEach((x,i)=>bt.set(doc(db,'projects',id,'expenses',id+'e'+i),{note:'',...x,...sm}))};
 mk('demo1',{name:'ปรับปรุงถนน คสล. หมู่ 5',agency:'เทศบาล',agencyFull:'เทศบาลตำบลตัวอย่าง',site:'ต.ตัวอย่าง อ.เมือง',amount:2450000,contractNo:'12/2569',contractDate:add(t,-70),start:add(t,-60),end:add(t,100),days:161,status:'กำลังก่อสร้าง'},
  [{pct:30,amount:735000,dSubmit:add(t,-20),dPaid:add(t,-5),status:'ได้รับเงินแล้ว'}],
  [{date:add(t,-30),item:'ปูนซีเมนต์ 200 ถุง',cat:'วัสดุก่อสร้าง',amount:46000,method:'โอนเงิน',payer:'สมชาย',payee:'ร้านวัสดุตัวอย่าง',status:'จ่ายแล้ว'},{date:add(t,-10),item:'ค่าแรงช่าง งวด 1',cat:'ค่าแรง',amount:85000,method:'เงินสด',payer:'สมหญิง',payee:'หัวหน้าช่าง',status:'ค้างจ่าย'}]);
 mk('demo2',{name:'ก่อสร้างอาคารเอนกประสงค์',agency:'อบต.',agencyFull:'องค์การบริหารส่วนตำบลตัวอย่าง',site:'หมู่ 2 ต.ตัวอย่าง',amount:5800000,contractNo:'3/2569',contractDate:add(t,-200),start:add(t,-190),end:add(t,10),days:201,status:'กำลังก่อสร้าง'},
  [{pct:40,amount:2320000,dSubmit:add(t,-90),dPaid:add(t,-70),status:'ได้รับเงินแล้ว'},{pct:30,amount:1740000,dSubmit:add(t,-5),dPaid:'',status:'ส่งเบิกแล้ว'}],
  [{date:add(t,-100),item:'เหล็กเส้น',cat:'วัสดุก่อสร้าง',amount:620000,method:'เช็ค',payer:'สมชาย',payee:'บริษัทเหล็กตัวอย่าง',status:'จ่ายแล้ว'},{date:add(t,-15),item:'ค่าเช่ารถแบคโฮ',cat:'ค่าเครื่องจักร-ขนส่ง',amount:38000,method:'โอนเงิน',payer:'สมหญิง',payee:'ร้านเครื่องจักรตัวอย่าง',status:'จ่ายแล้ว'}]);
 await bt.commit()}
