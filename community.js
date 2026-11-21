/* COMMUNITY: partners/sponsors-logo's + berichten tussen gebruikers en admins
   1) Admins zien in de footer een plus-vakje om een logo toe te voegen (en een kruisje om te verwijderen). Bezoekers zien alleen de logo's.
   2) Ingelogde gebruikers krijgen rechtsonder een knop "Berichten": een gesprek met de admins over
      suggesties, bugs/problemen of een aantal goals dat niet klopt. Admins zien alle gesprekken, antwoorden en markeren ze als afgehandeld.
   Firestore-collecties: partners, chats, msgs  (regels: zie firestore-regels-toevoegen.txt) */
import {getApps,getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,where,orderBy,runTransaction} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const css=`
#chat-fab{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:60;display:none;align-items:center;gap:8px;font:700 .95rem Archivo,system-ui,sans-serif;color:#fff;cursor:pointer;padding:11px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:var(--glass-spec),var(--glass-bg);backdrop-filter:blur(22px) saturate(2) brightness(1.1);-webkit-backdrop-filter:blur(22px) saturate(2) brightness(1.1);box-shadow:var(--glass-sh),0 0 18px rgba(255,214,10,.28);transition:transform .25s cubic-bezier(.2,.9,.3,1.3)}
#chat-fab:hover{transform:translateY(-2px) scale(1.04)}#chat-fab:active{transform:scale(.97)}
#chat-fab.on{display:flex}
#chat-fab b{min-width:22px;height:22px;display:none;place-items:center;border-radius:999px;background:#d6213a;color:#fff;font-size:.78rem;padding:0 6px}
#chat-fab b.has{display:grid}
html.pre-blocked #chat-fab{display:none!important}
#chatd{width:min(560px,calc(100% - 24px));max-height:calc(100% - 24px);padding:0;border:1px solid rgba(255,255,255,.4);border-radius:30px;color:#fff;font-family:Archivo,system-ui,sans-serif;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.05) 42%,rgba(255,255,255,.12)),rgba(6,28,16,.62);backdrop-filter:blur(26px) saturate(2);-webkit-backdrop-filter:blur(26px) saturate(2);box-shadow:inset 0 1.5px 1px rgba(255,255,255,.7),0 30px 80px rgba(0,0,0,.55)}
#chatd[open]{display:flex;flex-direction:column}
#chatd::backdrop{background:rgba(3,12,7,.75);backdrop-filter:blur(6px)}
.cm-h{position:relative;flex:none;display:flex;align-items:center;justify-content:space-between;margin:10px 10px 0;padding:10px 12px 10px 20px;border-radius:24px;border:1px solid rgba(255,255,255,.34);font:700 .85rem "Archivo Narrow",sans-serif;letter-spacing:.2em;color:#ffe27a;background:var(--glass-spec),var(--glass-bg);backdrop-filter:blur(22px) saturate(2) brightness(1.1);-webkit-backdrop-filter:blur(22px) saturate(2) brightness(1.1);box-shadow:var(--glass-sh)}
.cm-x{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.5);background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.08));box-shadow:inset 0 1px 1px rgba(255,255,255,.8);color:#fff;font-size:1.3rem;cursor:pointer;line-height:1}
.cm-b{flex:1;min-height:0;overflow-y:auto;padding:14px 18px 20px}
.cm-intro{margin:4px 0 14px;opacity:.85;line-height:1.45}
.cm-note{margin:10px 0 0;padding:10px 12px;border-radius:14px;background:rgba(255,226,70,.12);border:1px solid rgba(255,226,70,.4);font-size:.88rem;color:#ffeeb0}
.cm-th{display:flex;flex-direction:column;gap:10px;max-height:min(44vh,360px);overflow-y:auto;padding:2px 2px 6px}
.cm-m{max-width:86%;padding:10px 13px;border-radius:18px;font-size:.95rem;line-height:1.4;overflow-wrap:anywhere;white-space:pre-wrap;border:1px solid rgba(255,255,255,.3);background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.04))}
.cm-m.me{align-self:flex-end;color:#2a1c00;border-color:rgba(255,255,255,.8);background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 55%),linear-gradient(90deg,#ffe246,#ebb600)}
.cm-m small{display:block;margin-bottom:4px;font-size:.74rem;opacity:.75;white-space:normal}
.cm-m i{font-style:normal;display:inline-block;margin-right:6px;padding:1px 8px;border-radius:999px;background:rgba(0,0,0,.18);font-weight:700}
.cm-m .cl{display:block;margin-top:6px;font-weight:700;white-space:normal}
.cm-seg{display:flex;flex-wrap:wrap;gap:6px;padding:4px;margin-top:14px;border-radius:22px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.08)}
.cm-seg button{flex:1 1 auto;font:600 .88rem Archivo,sans-serif;color:#fff;background:none;border:0;border-radius:999px;padding:9px 10px;cursor:pointer}
.cm-seg button[aria-pressed="true"]{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.12));box-shadow:inset 0 1px 1px rgba(255,255,255,.8)}
#chatd label{display:block;margin:12px 0 6px;font-size:.84rem;opacity:.85}
#chatd textarea,#chatd input[type=number]{width:100%;font:inherit;font-size:1rem;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.4);border-radius:14px;padding:11px 13px;box-shadow:inset 0 2px 4px rgba(0,0,0,.25)}
#chatd textarea{min-height:96px;resize:vertical;margin-top:12px}
.cm-cnt{display:block;text-align:right;font-size:.74rem;opacity:.7;margin-top:3px}
.cm-btns{display:grid;grid-template-columns:1fr;gap:10px;margin-top:12px}
.cm-btns.two{grid-template-columns:1fr 1fr}
.cm-go{font:700 1.05rem "Archivo Narrow",sans-serif;color:#0f1a13;padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.75);background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 55%),linear-gradient(90deg,rgba(255,226,70,.95),rgba(235,182,0,.98));box-shadow:inset 0 1px 1px #fff,0 0 14px rgba(255,214,10,.4)}
.cm-go:disabled{opacity:.5}
.cm-no{font:600 1rem Archivo,sans-serif;color:#fff;padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.5);background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,.06))}
.cm-st{min-height:1.3em;margin-top:10px;font-size:.9rem;text-align:center;color:#ffeeb0}
.cm-it{display:flex;align-items:center;gap:12px;width:100%;margin-top:8px;padding:10px 12px;text-align:left;font:inherit;color:#fff;cursor:pointer;border-radius:16px;border:1px solid rgba(255,255,255,.3);background:linear-gradient(180deg,rgba(255,255,255,.14),rgba(255,255,255,.03))}
.cm-it:hover{border-color:rgba(255,255,255,.7)}
.cm-av{flex:none;width:44px;height:44px;border-radius:50%;display:grid;place-items:center;font:700 1.2rem "Archivo Narrow",sans-serif;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.6),transparent 52%),#1f9d55;box-shadow:0 0 0 3px rgba(255,255,255,.45)}
.cm-it span.t{flex:1;min-width:0}
.cm-it strong{display:block;font:700 1.05rem "Archivo Narrow",sans-serif;text-transform:uppercase}
.cm-it em{display:block;font-style:normal;font-size:.85rem;opacity:.75;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cm-it small{flex:none;opacity:.7;font-size:.75rem}
.cm-dot{flex:none;width:12px;height:12px;border-radius:50%;background:#d6213a;box-shadow:0 0 10px #d6213a}
.cm-top{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.cm-top strong{display:block;font:700 1.3rem "Archivo Narrow",sans-serif;text-transform:uppercase}
.cm-top small{opacity:.75}
.cm-back{font:600 .9rem Archivo,sans-serif;color:#fff;cursor:pointer;margin-bottom:10px;padding:7px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.45);background:rgba(255,255,255,.08)}
.cm-empty{padding:22px 0;text-align:center;opacity:.75}
.cm-lock{flex:none;display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:1px 9px;border-radius:999px;font-size:.72rem;font-weight:700;color:#2a1c00;background:linear-gradient(90deg,#ffe246,#ebb600);white-space:nowrap}
.cm-lock.other{color:#fff;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.4)}
.cm-claim{margin-top:14px;padding:14px;border-radius:18px;border:1px solid rgba(255,226,70,.5);background:rgba(255,226,70,.1);text-align:center}
.cm-claim p{margin:0 0 10px;font-size:.92rem;line-height:1.4;color:#ffeeb0}
.cm-claim .cm-btns{margin-top:0}
.cm-mine{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:12px;padding:9px 12px;border-radius:14px;background:rgba(255,226,70,.12);border:1px solid rgba(255,226,70,.4);font-size:.88rem;color:#ffeeb0}
.cm-mine button{font:600 .82rem Archivo,sans-serif;color:#fff;cursor:pointer;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.5);background:rgba(255,255,255,.1)}
@media (prefers-reduced-motion:reduce){#chat-fab{transition:none}}
`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
const ini=n=>String(n||"?").trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
const fmt=ms=>new Date(ms).toLocaleString("nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const PHRE=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
const phOk=x=>typeof x==="string"&&x.length<300000&&PHRE.test(x);
function phSet(e,src,txt){if(phOk(src)){e.style.backgroundImage='url("'+src+'")';e.style.backgroundSize="cover";e.style.backgroundPosition="center";e.textContent=""}else e.textContent=txt}
const nameOf=x=>((x.first||"")+" "+(x.last||"")).trim()||"Onbekend";
const TY={suggestie:"Suggestie",bug:"Bug of probleem",goals:"Goals kloppen niet"};
const PH={suggestie:"Wat zou de website beter maken?",bug:"Wat ging er mis en waar zag je het? Beschrijf zo precies mogelijk wat je deed.",goals:"Leg uit waarom je aantal goals niet klopt, bijvoorbeeld wanneer je hebt gescoord."};
const MAX=600;

/* ---------- state ---------- */
let db,auth,uid=null,ME=null,subs=[],roleSubs=[],roleOf=null;
let PART=[],MY=null,MSGS=[],CH=[],ALLP=[],sel=null,tsub=null;
let type="suggestie",draft="",claim="",status="",busy=false,filter="open";
const isAdm=()=>!!(ME&&ME.admin===true);   /* server-regels eisen daarnaast de beveiligingscode (zie adminpanel.js) */
const okMe=()=>!!(uid&&ME&&(ME.admin===true||(ME.rejected!==true&&ME.approved!==false)));

/* ---------- DOM ---------- */
const fab=h("button");fab.id="chat-fab";fab.type="button";fab.append("Berichten ",Object.assign(h("b"),{id:"chat-badge"}));document.body.appendChild(fab);
const dlg=document.createElement("dialog");dlg.id="chatd";dlg.setAttribute("aria-label","Berichten");document.body.appendChild(dlg);

const needs=c=>c.lastFrom==="user"&&!c.done;
/* claimen: een admin neemt een gesprek over, zodat een andere admin het niet ook beantwoordt */
const claimedBy=c=>c&&c.claimedBy||null;
const claimedOther=c=>!!(c&&claimedBy(c)&&claimedBy(c)!==uid);
const claimedMine=c=>!!(c&&claimedBy(c)&&claimedBy(c)===uid);
const needsMe=c=>needs(c)&&!claimedOther(c);
const seenKey=()=>"cs_"+uid;
const seenMs=()=>{try{return parseInt(localStorage.getItem(seenKey())||"0",10)||0}catch(e){return 0}};
function badgeN(){
 if(!okMe())return 0;
 if(isAdm())return CH.filter(needsMe).length;
 return MY&&MY.lastFrom==="admin"&&MY.ms>seenMs()?1:0;
}
function renderFab(){
 fab.classList.toggle("on",okMe());
 const n=badgeN(),b=document.getElementById("chat-badge");b.textContent=n;b.classList.toggle("has",n>0);
}
fab.onclick=()=>openChat();
function openChat(){if(!okMe())return;if(isAdm())leaveThread();render(true);if(!dlg.open)dlg.showModal();markSeen()}
function markSeen(){if(!isAdm()&&MY&&dlg.open){try{localStorage.setItem(seenKey(),String(MY.ms||Date.now()))}catch(e){}renderFab()}}
document.addEventListener("click",e=>{
 const b=e.target.closest&&e.target.closest("[data-open-chat]");if(!b)return;
 if(okMe())openChat();else{const a=document.getElementById("acc");if(a)a.click()}
});

/* ---------- venster ---------- */
function render(force){
 if(!dlg.open&&!force)return;
 const ta=dlg.querySelector("textarea"),had=ta&&document.activeElement===ta,pos=had?ta.selectionStart:0;
 dlg.textContent="";
 const head=h("div","cm-h");head.append(h("span",null,"BERICHTEN"));
 const x=h("button","cm-x","×");x.type="button";x.setAttribute("aria-label","Sluiten");x.onclick=()=>dlg.close();head.appendChild(x);dlg.appendChild(head);
 const body=h("div","cm-b");dlg.appendChild(body);
 if(isAdm())sel?viewThread(body):viewList(body);else viewUser(body);
 const th=dlg.querySelector(".cm-th");if(th)th.scrollTop=th.scrollHeight;
 if(had){const n=dlg.querySelector("textarea");if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}
}
dlg.addEventListener("close",()=>{if(!isAdm())return;leaveThread()});

function thread(body,adminView){
 const th=h("div","cm-th");
 MSGS.forEach(m=>{
  const mine=adminView?m.from==="admin":m.from==="user";
  const b=h("div","cm-m"+(mine?" me":""));
  const s=h("small");
  if(m.from==="user"&&TY[m.type])s.appendChild(h("i",null,TY[m.type]));
  s.append((m.from==="admin"?(m.name||"Admin"):(adminView?(m.name||"Gebruiker"):"Jij"))+" · "+fmt(m.ms));
  b.appendChild(s);b.append(m.text);
  if(typeof m.claim==="number"){
   let t="Volgens de gebruiker klopt: "+m.claim+" goals";
   if(adminView){const p=ALLP.find(a=>a.id===uidOfThread());if(p)t+=" (nu op de site: "+(p.goals||0)+")"}
   else t="Jij geeft aan: "+m.claim+" goals";
   b.appendChild(h("span","cl",t));
  }
  th.appendChild(b);
 });
 body.appendChild(th);
}
const uidOfThread=()=>sel;

function composer(body,adm){
 if(adm){
  const c=CH.find(a=>a.id===sel);
  if(!claimedMine(c)){
   const box=h("div","cm-claim");
   if(claimedOther(c)){
    box.appendChild(h("p",null,"🔒 "+(c.claimedByName||"Een andere admin")+" behandelt dit bericht al. Jij kunt niet antwoorden, zodat jullie elkaar niet in de weg zitten."));
    const bt=h("div","cm-btns"),ov=h("button","cm-no","Toch overnemen");ov.type="button";ov.disabled=busy;
    ov.onclick=()=>{if(confirm("Weet je zeker dat je dit bericht van "+(c.claimedByName||"de andere admin")+" wilt overnemen?"))claimChat(true)};
    bt.appendChild(ov);box.appendChild(bt);
   }else{
    box.appendChild(h("p",null,"Claim dit bericht voordat je antwoordt. Dan weten de andere admins dat jij het behandelt."));
    const bt=h("div","cm-btns"),cl=h("button","cm-go","Claim dit bericht");cl.type="button";cl.disabled=busy;cl.onclick=()=>claimChat(false);
    bt.appendChild(cl);box.appendChild(bt);
   }
   body.appendChild(box);body.appendChild(h("p","cm-st",status));
   const dn=h("div","cm-btns"),dd=h("button","cm-no",c&&c.done?"Heropenen":"Afgehandeld");dd.type="button";dd.onclick=toggleDone;dn.appendChild(dd);body.appendChild(dn);
   return;
  }
  const mine=h("div","cm-mine");mine.appendChild(h("span",null,"🔒 Jij behandelt dit bericht"));
  const rl=h("button",null,"Vrijgeven");rl.type="button";rl.onclick=releaseChat;mine.appendChild(rl);body.appendChild(mine);
 }
 if(!adm){
  const seg=h("div","cm-seg");
  Object.keys(TY).forEach(k=>{const b=h("button",null,TY[k]);b.type="button";b.setAttribute("aria-pressed",type===k);b.onclick=()=>{type=k;status="";render()};seg.appendChild(b)});
  body.appendChild(seg);
  if(type==="goals"){
   body.appendChild(h("label",null,"Hoeveel goals heb jij volgens jou?"));
   const n=h("input");n.type="number";n.min="0";n.max="999";n.inputMode="numeric";n.value=claim;n.setAttribute("aria-label","Aantal goals dat volgens jou klopt");n.oninput=()=>{claim=n.value};body.appendChild(n);
  }
 }
 const ta=h("textarea");ta.maxLength=MAX;ta.value=draft;ta.placeholder=adm?"Schrijf je antwoord":PH[type];ta.setAttribute("aria-label",adm?"Antwoord":"Je bericht");
 const cnt=h("span","cm-cnt",draft.length+"/"+MAX);
 ta.oninput=()=>{draft=ta.value;cnt.textContent=draft.length+"/"+MAX};
 body.append(ta,cnt);
 const btns=h("div","cm-btns"+(adm?" two":""));
 const go=h("button","cm-go",adm?"Antwoord sturen":"Versturen");go.type="button";go.disabled=busy;go.onclick=()=>adm?sendAdmin():sendUser();btns.appendChild(go);
 if(adm){const c=CH.find(a=>a.id===sel),dn=h("button","cm-no",c&&c.done?"Heropenen":"Afgehandeld");dn.type="button";dn.onclick=toggleDone;btns.appendChild(dn)}
 body.appendChild(btns);
 body.appendChild(h("p","cm-st",status));
}

function viewUser(body){
 if(!MSGS.length)body.appendChild(h("p","cm-intro","Stuur een bericht naar de admins. Hun antwoord verschijnt hier in dit venster."));
 else thread(body,false);
 if(MY&&MY.done)body.appendChild(h("p","cm-note","Dit gesprek is afgehandeld. Stuur een nieuw bericht als er nog iets is."));
 composer(body,false);
}
function viewList(body){
 const need=CH.filter(needsMe).length;
 const seg=h("div","cm-seg");
 [["open","Te beantwoorden ("+need+")"],["all","Alle gesprekken"]].forEach(a=>{const b=h("button",null,a[1]);b.type="button";b.setAttribute("aria-pressed",filter===a[0]);b.onclick=()=>{filter=a[0];render()};seg.appendChild(b)});
 body.appendChild(seg);
 const list=CH.filter(c=>filter==="all"||needs(c));
 if(!list.length){body.appendChild(h("p","cm-empty",filter==="all"?"Er zijn nog geen berichten.":"Alle gesprekken zijn beantwoord."));return}
 list.forEach(c=>{
  const it=h("button","cm-it");it.type="button";
  const av=h("span","cm-av"),p=ALLP.find(a=>a.id===c.id);phSet(av,p&&p.photo,ini(c.name));
  const t=h("span","t");t.append(h("strong",null,c.name||"Onbekend"),h("em",null,(TY[c.type]?TY[c.type]+": ":"")+(c.last||"")));
  it.append(av,t,h("small",null,fmt(c.ms)));
  if(claimedBy(c)&&!c.done){const lk=h("span","cm-lock"+(claimedOther(c)?" other":""),"🔒 "+(claimedOther(c)?(c.claimedByName||"Admin"):"Jij"));t.appendChild(lk)}
  if(needsMe(c))it.appendChild(h("span","cm-dot"));
  else if(c.done){it.append(h("small",null,"✓"))}
  it.onclick=()=>openThread(c.id);
  body.appendChild(it);
 });
}
function viewThread(body){
 const c=CH.find(a=>a.id===sel)||{name:"Onbekend"},p=ALLP.find(a=>a.id===sel);
 const back=h("button","cm-back","← Alle gesprekken");back.type="button";back.onclick=()=>{leaveThread();render()};body.appendChild(back);
 const top=h("div","cm-top"),av=h("span","cm-av");phSet(av,p&&p.photo,ini(c.name));
 const t=h("div");t.appendChild(h("strong",null,c.name||"Onbekend"));
 t.appendChild(h("small",null,[(c.club||p&&p.club||"").toString().toUpperCase(),p?(p.goals||0)+" goals op de site":""].filter(Boolean).join(" · ")));
 top.append(av,t);body.appendChild(top);
 if(!MSGS.length)body.appendChild(h("p","cm-empty","Berichten laden."));else thread(body,true);
 if(c.done)body.appendChild(h("p","cm-note","Afgehandeld. Zodra de gebruiker opnieuw schrijft, komt het gesprek weer bovenaan."));
 composer(body,true);
}

/* ---------- gesprekken ---------- */
function openThread(id){
 leaveThread();sel=id;MSGS=[];draft="";status="";
 tsub=onSnapshot(query(collection(db,"msgs"),where("uid","==",id)),s=>{MSGS=s.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>a.ms-b.ms);render()},()=>{status="Berichten laden mislukt.";render()});
 render();
}
function leaveThread(){if(tsub){tsub();tsub=null}sel=null;if(isAdm()){MSGS=[]}}
async function sendUser(){
 const text=draft.trim();
 if(!text){status="Schrijf eerst een bericht.";render();return}
 let cl;
 if(type==="goals"){cl=parseInt(claim,10);if(isNaN(cl)||cl<0||cl>999){status="Vul het aantal goals in dat volgens jou klopt.";render();return}}
 busy=true;status="Versturen…";render();
 const ms=Date.now(),name=nameOf(ME);
 try{
  const m={uid,from:"user",name,text:text.slice(0,MAX),type,ms};if(cl!==undefined)m.claim=cl;
  await addDoc(collection(db,"msgs"),m);
  await setDoc(doc(db,"chats",uid),{uid,name,club:ME.club||"",last:text.slice(0,90),lastFrom:"user",type,ms,done:false},{merge:true});
  draft="";claim="";status="Verstuurd. De admins reageren hier.";
 }catch(e){console.error(e);status="Versturen mislukt. Probeer het later opnieuw."}
 busy=false;render();
}
async function sendAdmin(){
 const text=draft.trim();
 if(!text||!sel){status="Schrijf eerst een antwoord.";render();return}
 const cc=CH.find(a=>a.id===sel);
 if(!claimedMine(cc)){status=claimedOther(cc)?"Dit bericht wordt al behandeld door "+(cc.claimedByName||"een andere admin")+".":"Claim het bericht eerst.";render();return}
 busy=true;status="Versturen…";render();
 const ms=Date.now();
 try{
  await addDoc(collection(db,"msgs"),{uid:sel,from:"admin",name:nameOf(ME),text:text.slice(0,MAX),type:"antwoord",ms});
  await setDoc(doc(db,"chats",sel),{uid:sel,last:text.slice(0,90),lastFrom:"admin",ms},{merge:true});
  draft="";status="Verstuurd.";
 }catch(e){console.error(e);status="Versturen mislukt. Controleer de Firestore-regels."}
 busy=false;render();
}
async function claimChat(force){
 const id=sel;if(!id)return;
 busy=true;status="Claimen…";render();
 try{
  const ref=doc(db,"chats",id);
  await runTransaction(db,async tx=>{
   const sn=await tx.get(ref);if(!sn.exists())throw new Error("weg");
   const d=sn.data();
   if(!force&&d.claimedBy&&d.claimedBy!==uid){const e=new Error("al geclaimd");e.code="claimed";throw e}
   tx.update(ref,{claimedBy:uid,claimedByName:nameOf(ME),claimedMs:Date.now()});
  });
  status="Je hebt dit bericht geclaimd. Andere admins zien dat jij het behandelt.";
 }catch(e){console.error(e);status=e&&e.code==="claimed"?"Een andere admin was je net voor.":"Claimen mislukt. Probeer het opnieuw."}
 busy=false;render();
}
async function releaseChat(){
 const id=sel;if(!id)return;
 try{await updateDoc(doc(db,"chats",id),{claimedBy:null,claimedByName:null,claimedMs:null});status="Vrijgegeven. Een andere admin kan het nu claimen."}
 catch(e){console.error(e);status="Vrijgeven mislukt."}
 render();
}
async function toggleDone(){
 const c=CH.find(a=>a.id===sel);if(!c)return;
 try{await updateDoc(doc(db,"chats",sel),c.done?{done:false}:{done:true,claimedBy:null,claimedByName:null,claimedMs:null})}catch(e){console.error(e);status="Opslaan mislukt.";render()}
}

/* ---------- partners en sponsors ---------- */
function toLogo(file){
 /* Elk logo wordt automatisch passend gemaakt voor het vakje (3:2): de afbeelding wordt verkleind
    of vergroot tot hij er helemaal in past, gecentreerd, zonder uitsnijden of uitrekken. */
 return new Promise((res,rej)=>{
  const fr=new FileReader();fr.onerror=rej;
  fr.onload=()=>{const im=new Image();im.onerror=rej;im.onload=()=>{
   const iw=im.naturalWidth||im.width||300,ih=im.naturalHeight||im.height||200;
   let W=600,q=.92,d="";
   for(let k=0;k<7;k++){
    const H=Math.round(W*2/3),pad=Math.round(W*.04),c=document.createElement("canvas");
    c.width=W;c.height=H;
    const r=Math.min((W-2*pad)/iw,(H-2*pad)/ih),w=Math.max(1,Math.round(iw*r)),h2=Math.max(1,Math.round(ih*r));
    const x=c.getContext("2d");x.imageSmoothingQuality="high";
    x.drawImage(im,Math.round((W-w)/2),Math.round((H-h2)/2),w,h2);
    d=c.toDataURL("image/webp",q);if(!/^data:image\/webp/.test(d))d=c.toDataURL("image/png");
    if(d.length<150000)break;W=Math.round(W*.8);q=Math.max(.5,q-.08);
   }
   phOk(d)?res(d):rej(new Error("te groot"));
  };im.src=fr.result};
  fr.readAsDataURL(file);
 });
}
function renderPartners(){
 document.querySelectorAll("ul.slots[data-kind]").forEach(ul=>{
  const kind=ul.dataset.kind,label=kind==="sponsor"?"Sponsor":"Partner";
  ul.textContent="";
  PART.filter(p=>p.kind===kind&&phOk(p.img)).sort((a,b)=>a.ms-b.ms).forEach(p=>{
   const li=h("li","slot-i"),im=document.createElement("img");im.src=p.img;im.alt=label+"logo";im.loading="lazy";li.appendChild(im);
   if(isAdm()){const x=h("button","slot-x","×");x.type="button";x.setAttribute("aria-label",label+" verwijderen");x.onclick=async()=>{if(!confirm(label+" verwijderen?"))return;try{await deleteDoc(doc(db,"partners",p.id))}catch(e){console.error(e);alert("Verwijderen mislukt.")}};li.appendChild(x)}
   ul.appendChild(li);
  });
  if(isAdm()){
   const li=h("li","slot-a"),b=h("button","slot-p","+");b.type="button";b.setAttribute("aria-label",label+"foto toevoegen");
   const f=document.createElement("input");f.type="file";f.accept="image/*";f.hidden=true;
   b.onclick=()=>f.click();
   f.onchange=async()=>{
    const file=f.files&&f.files[0];f.value="";if(!file)return;
    b.disabled=true;b.textContent="…";
    try{const img=await toLogo(file);await setDoc(doc(collection(db,"partners")),{kind,img,ms:Date.now(),by:uid})}
    catch(e){console.error(e);alert("Foto toevoegen mislukt. Kies een andere afbeelding of controleer de Firestore-regels.")}
    b.disabled=false;b.textContent="+";
   };
   li.append(b,f);ul.appendChild(li);
  }
 });
}

/* ---------- Firebase ---------- */
function clearRole(){roleSubs.forEach(f=>f());roleSubs=[];roleOf=null;CH=[];ALLP=[];MY=null;MSGS=[];leaveThread()}
function setupRole(){
 const r=!uid?null:isAdm()?"admin":"user";
 if(r===roleOf)return;
 clearRole();roleOf=r;if(!r)return;
 const map=s=>s.docs.map(d=>Object.assign({id:d.id},d.data()));
 if(r==="admin"){
  roleSubs.push(onSnapshot(query(collection(db,"chats"),orderBy("ms","desc")),s=>{CH=map(s);renderFab();render()},()=>{}));
  roleSubs.push(onSnapshot(collection(db,"players"),s=>{ALLP=map(s);render()},()=>{}));
 }else{
  roleSubs.push(onSnapshot(doc(db,"chats",uid),d=>{MY=d.exists()?d.data():null;markSeen();renderFab();render()},()=>{}));
  roleSubs.push(onSnapshot(query(collection(db,"msgs"),where("uid","==",uid)),s=>{MSGS=map(s).sort((a,b)=>a.ms-b.ms);render()},()=>{}));
 }
}
function start(){
 const app=getApp();db=getFirestore(app);auth=getAuth(app);
 onSnapshot(collection(db,"partners"),s=>{PART=s.docs.map(d=>Object.assign({id:d.id},d.data()));renderPartners()},()=>{});
 onAuthStateChanged(auth,u=>{
  subs.forEach(f=>f());subs=[];clearRole();uid=u?u.uid:null;ME=null;
  if(dlg.open)dlg.close();renderFab();renderPartners();
  if(!u)return;
  subs.push(onSnapshot(doc(db,"players",uid),d=>{ME=d.exists()?d.data():{};setupRole();renderFab();renderPartners();render()},()=>{}));
 });
}
let tries=0;(function wait(){if(getApps().length)start();else if(tries++<150)setTimeout(wait,100)})();
