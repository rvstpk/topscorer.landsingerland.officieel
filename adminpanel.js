/* ADMIN-PANEEL + MELDINGEN
   - Admins krijgen linksonder een knop "Admin" met een paneel vol tools:
       1) Aanvragen goedkeuren / weigeren (volledig profiel zichtbaar)
       2) Gebruikers: alle gebruikers met hun kaart, goals en awards aanpassen
       3) Gebruikers melding sturen (naar 1, meerdere of alle gebruikers)
       4) Activiteit van gebruikers (o.a. wanneer iemand zijn profiel bewerkt)
   - Alle gebruikers ontvangen meldingen live; wie niet actief was, krijgt ze zodra die weer op de website is. */
import {getApps,getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,collection,doc,getDoc,setDoc,addDoc,updateDoc,deleteDoc,onSnapshot,query,where,orderBy,limit} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const css=`
#adm-fab{position:fixed;left:18px;bottom:calc(18px + env(safe-area-inset-bottom,0px));z-index:60;display:none;align-items:center;gap:8px;font:700 .95rem Archivo,system-ui,sans-serif;color:#fff;cursor:pointer;padding:11px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:var(--glass-spec),var(--glass-bg);backdrop-filter:blur(22px) saturate(2) brightness(1.1);-webkit-backdrop-filter:blur(22px) saturate(2) brightness(1.1);box-shadow:var(--glass-sh),0 0 18px rgba(255,214,10,.28);transition:transform .25s cubic-bezier(.2,.9,.3,1.3)}
#adm-fab:hover{transform:translateY(-2px) scale(1.04)}#adm-fab:active{transform:scale(.97)}
#adm-fab.on{display:flex}
#adm-fab b{min-width:22px;height:22px;display:none;place-items:center;border-radius:999px;background:#d6213a;color:#fff;font-size:.78rem;padding:0 6px}
#adm-fab b.has{display:grid}
html.pre-blocked #adm-fab{display:none!important}
#adminp,#notif{width:min(560px,calc(100% - 24px));max-height:calc(100% - 24px);padding:0;border:1px solid rgba(255,255,255,.4);border-radius:30px;color:#fff;font-family:Archivo,system-ui,sans-serif;overflow:hidden;background:linear-gradient(135deg,rgba(255,255,255,.22),rgba(255,255,255,.05) 42%,rgba(255,255,255,.12)),rgba(6,28,16,.62);backdrop-filter:blur(26px) saturate(2);-webkit-backdrop-filter:blur(26px) saturate(2);box-shadow:inset 0 1.5px 1px rgba(255,255,255,.7),0 30px 80px rgba(0,0,0,.55)}
#adminp[open],#notif[open]{display:flex;flex-direction:column}
#adminp::backdrop,#notif::backdrop{background:rgba(3,12,7,.75);backdrop-filter:blur(6px)}
.ap-h{position:relative;flex:none;display:flex;align-items:center;justify-content:space-between;margin:10px 10px 0;padding:10px 12px 10px 20px;border-radius:24px;border:1px solid rgba(255,255,255,.34);font:700 .85rem "Archivo Narrow",sans-serif;letter-spacing:.2em;color:#ffe27a;background:var(--glass-spec),var(--glass-bg);backdrop-filter:blur(22px) saturate(2) brightness(1.1);-webkit-backdrop-filter:blur(22px) saturate(2) brightness(1.1);box-shadow:var(--glass-sh)}
.ap-x{width:34px;height:34px;border-radius:50%;border:1px solid rgba(255,255,255,.5);background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.08));box-shadow:inset 0 1px 1px rgba(255,255,255,.8);color:#fff;font-size:1.3rem;cursor:pointer;line-height:1}
.ap-tabs{flex:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:14px 16px 4px}
.ap-tab{font:600 .95rem Archivo,sans-serif;color:#fff;cursor:pointer;padding:12px 10px;border-radius:16px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.07);display:flex;align-items:center;justify-content:center;gap:8px}
.ap-tab[aria-pressed="true"]{background:linear-gradient(180deg,rgba(255,255,255,.4),rgba(255,255,255,.08));border-color:rgba(255,255,255,.8);box-shadow:inset 0 1px 1px rgba(255,255,255,.7)}
.ap-tab i{font-style:normal;min-width:20px;height:20px;border-radius:999px;background:#d6213a;display:none;place-items:center;font-size:.72rem;padding:0 6px}
.ap-tab i.has{display:grid}
.ap-b{flex:1;min-height:0;overflow-y:auto;padding:12px 20px 22px}
@media (prefers-reduced-motion:reduce){#adm-fab{transition:none}}
.ap-b h3{margin:6px 0 4px;font:700 1.5rem/1.1 "Archivo Narrow",sans-serif;text-transform:uppercase}
.ap-b h4{margin:20px 0 8px;font:700 1rem "Archivo Narrow",sans-serif;opacity:.85}
.ap-sum{margin:0 0 14px;padding:10px 12px;border-radius:14px;background:rgba(255,226,70,.12);border:1px solid rgba(255,226,70,.4);font-size:.88rem;line-height:1.45;color:#ffeeb0}
.ap-b label{display:block;margin:10px 0 6px;font-size:.84rem;opacity:.85}
.ap-b textarea,.ap-b input[type=search]{width:100%;font:inherit;font-size:1rem;color:#fff;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.4);border-radius:14px;padding:11px 13px;box-shadow:inset 0 2px 4px rgba(0,0,0,.25)}
.ap-b textarea{min-height:110px;resize:vertical}
.ap-cnt{display:block;text-align:right;font-size:.74rem;opacity:.7;margin-top:3px}
.ap-seg{display:flex;gap:6px;padding:4px;border-radius:999px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.08)}
.ap-seg button{flex:1;font:600 .9rem Archivo,sans-serif;color:#fff;background:none;border:0;border-radius:999px;padding:9px 6px;cursor:pointer}
.ap-seg button[aria-pressed="true"]{background:linear-gradient(180deg,rgba(255,255,255,.5),rgba(255,255,255,.12));box-shadow:inset 0 1px 1px rgba(255,255,255,.8)}
.ap-list{max-height:210px;overflow-y:auto;margin-top:8px;border:1px solid rgba(255,255,255,.25);border-radius:14px}
.ap-list label{display:flex;align-items:center;gap:10px;margin:0;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.12);font-size:.92rem;opacity:1;cursor:pointer}
.ap-list label:last-child{border:0}
.ap-list input{width:18px;height:18px;accent-color:#ffd60a}
.ap-list small{opacity:.7;margin-left:auto}
.ap-go,.ap-yes{font:700 1.05rem "Archivo Narrow",sans-serif;color:#0f1a13;padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.75);background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 55%),linear-gradient(90deg,rgba(255,226,70,.95),rgba(235,182,0,.98));box-shadow:inset 0 1px 1px rgba(255,255,255,.95),0 0 12px rgba(255,214,10,.4)}
.ap-go{width:100%;margin-top:14px}.ap-go:disabled{opacity:.5}
.ap-no{font:600 1rem Archivo,sans-serif;color:#fff;padding:12px 18px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.5);background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,.06))}
.ap-st{min-height:1.3em;margin-top:10px;font-size:.9rem;text-align:center;color:#ffeeb0}
.ap-req{margin-top:12px;padding:14px;border-radius:18px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.07)}
.ap-top{display:flex;align-items:center;gap:12px;margin-bottom:6px}
.ap-av{flex:none;width:52px;height:52px;border-radius:50%;display:grid;place-items:center;font:700 1.4rem "Archivo Narrow",sans-serif;background:radial-gradient(circle at 35% 28%,rgba(255,255,255,.6),transparent 52%),#1f9d55;box-shadow:0 0 0 3px rgba(255,255,255,.5)}
.ap-top strong{font:700 1.3rem "Archivo Narrow",sans-serif;text-transform:uppercase}
.ap-row{display:flex;justify-content:space-between;gap:14px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.16);font-size:.93rem}
.ap-row span:first-child{opacity:.7}.ap-row span:last-child{text-align:right;overflow-wrap:anywhere;font-weight:600}
.ap-btns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}
.ap-empty{padding:20px 0;text-align:center;opacity:.75}
.ap-hist{padding:10px 12px;margin-top:8px;border-radius:14px;background:rgba(255,255,255,.07);font-size:.88rem}
.ap-hist small{display:block;opacity:.7;margin-bottom:3px}
.ap-del{margin-top:8px;font:600 .8rem Archivo,sans-serif;color:#ffd0d0;cursor:pointer;padding:6px 12px;border-radius:999px;border:1px solid rgba(255,120,120,.6);background:rgba(214,33,58,.18)}
.nt-i{margin-bottom:12px;padding:14px 16px;border-radius:18px;border:1px solid rgba(255,255,255,.4);background:linear-gradient(180deg,rgba(255,255,255,.16),rgba(255,255,255,.04))}
.nt-i small{display:block;opacity:.7;margin-bottom:6px;font-size:.78rem}
.nt-i p{margin:0;font-size:1rem;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere}
.ap-u{margin-top:10px;border-radius:18px;border:1px solid rgba(255,255,255,.3);border-left:6px solid var(--c,#b87333);background:rgba(255,255,255,.07);overflow:hidden}
.ap-u summary{list-style:none;display:flex;align-items:center;gap:12px;padding:12px 14px;cursor:pointer}
.ap-u summary::-webkit-details-marker{display:none}
.ap-u summary .ap-av{width:44px;height:44px;font-size:1.1rem}
.ap-ut{min-width:0;flex:1;display:grid}
.ap-ut strong{font:700 1.15rem "Archivo Narrow",sans-serif;text-transform:uppercase;overflow-wrap:anywhere}
.ap-ut small{opacity:.75;overflow-wrap:anywhere}
.ap-ug{flex:none;font:700 1.05rem "Archivo Narrow",sans-serif;padding:4px 12px;border-radius:999px;background:var(--c,#b87333);color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.45)}
.ap-card{padding:0 14px 16px}
.ap-ch{margin:0 -14px 14px;padding:9px 14px;font:700 .75rem "Archivo Narrow",sans-serif;letter-spacing:.2em;color:#2a1c00;background:linear-gradient(180deg,rgba(255,255,255,.65),rgba(255,255,255,0) 55%),linear-gradient(90deg,#ffe246,#ebb600)}
.ap-ctop{display:flex;align-items:center;gap:14px;margin-bottom:8px}
.ap-ctop .ap-av{width:84px;height:84px;font-size:2.4rem}
.ap-big{font:700 3rem/.9 "Archivo Narrow",sans-serif}
.ap-cname{font:700 1.4rem "Archivo Narrow",sans-serif;text-transform:uppercase;overflow-wrap:anywhere}
.ap-cg h4{text-align:center;margin:16px 0 6px}
.ap-ctl{display:flex;gap:6px;align-items:center;justify-content:center}
.ap-ctl input{width:84px;text-align:center;font:inherit;font-size:1rem;color:#fff;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.45);border-radius:10px;padding:8px}
.ap-ctl button{font:600 .88rem Archivo,sans-serif;color:#2a1c00;cursor:pointer;padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.7);background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 55%),linear-gradient(90deg,#ffe246,#ebb600)}
.ap-ms{display:block;min-height:1.1em;margin-top:5px;text-align:center;font-size:.8rem;opacity:.85}
`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

const h=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e};
const ini=n=>String(n||"?").trim().split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
const fmtDate=ms=>new Date(ms).toLocaleString("nl-NL",{day:"numeric",month:"short",hour:"2-digit",minute:"2-digit"});
const PHRE=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/;
const phOk=x=>typeof x==="string"&&x.length<300000&&PHRE.test(x);
function phSet(e,src,txt){if(phOk(src)){e.style.backgroundImage='url("'+src+'")';e.style.backgroundSize="cover";e.style.backgroundPosition="center";e.textContent=""}else e.textContent=txt}
const tierC=g=>g>=30?"#d6213a":g>=20?"#e0a800":g>=10?"#b5bdc9":"#b87333";
const statusOf=p=>p.owner===true?"Hoofdbeheerder":p.admin===true?"Beheerder":p.rejected?"Afgewezen":p.approved?"Goedgekeurd":"Wacht op goedkeuring";
/* goal streak (zelfde berekening als op de website): weeknummer toevoegen als goals omhoog gaan */
const ymd=d=>d.getFullYear()+"-"+("0"+(d.getMonth()+1)).slice(-2)+"-"+("0"+d.getDate()).slice(-2);
const wk=d=>{const a=d.split("-"),t=new Date(+a[0],a[1]-1,+a[2]);t.setDate(t.getDate()-(t.getDay()+6)%7);return Math.floor(Date.UTC(t.getFullYear(),t.getMonth(),t.getDate())/6048e5)};
const wkN=()=>wk(ymd(new Date()));
const addW=a=>{const c=wkN();a=a||[];return a.indexOf(c)>-1?a:a.concat(c).slice(-60)};

/* ---------- DOM ---------- */
const fab=h("button");fab.id="adm-fab";fab.type="button";fab.append("Admin ",Object.assign(h("b"),{id:"adm-badge"}));document.body.appendChild(fab);
const ap=document.createElement("dialog");ap.id="adminp";document.body.appendChild(ap);
const nt=document.createElement("dialog");nt.id="notif";document.body.appendChild(nt);

/* ---------- state ---------- */
let DRAFT="",LASTST="",db,auth,uid=null,ME=null,ALL=[],EM={},HIST=[],tab="req",mode="all",SEL=new Set(),filter="",subs=[],lastSeen=0,A=[],B=[],seen=new Set();
let EV=[],evF="",usrF="";const USROPEN=new Set();
const EVL={login:"Ingelogd",card:"Kaart bekeken",zoek:"Zocht",profiel:"Profiel geopend",bewerkt:"Profiel bewerkt",beheer:"Beheer"};
const isAdmin=()=>!!(ME&&ME.admin===true);
const isOwner=()=>!!(ME&&ME.admin===true&&ME.owner===true);   /* hoofdbeheerder: instellen via Firebase, niet via de website */
const pending=()=>ALL.filter(x=>x.admin!==true&&!x.approved&&!x.rejected);
const clubD=c=>String(c==null?"":c).replace(/\s+/g," ").trim().toUpperCase()||"-";
const nameOf=x=>((x.first||"")+" "+(x.last||"")).trim()||"Onbekend";

/* ---------- ADMIN PANEEL ---------- */
function renderBadge(){
 const n=pending().length;
 fab.classList.toggle("on",isAdmin());
 const b=document.getElementById("adm-badge");b.textContent=n;b.classList.toggle("has",n>0);
refreshPanel();
}
function refreshPanel(){
 if(!ap.open)return;
 const a=document.activeElement;
 if((tab==="msg"||tab==="act"||tab==="usr")&&a&&ap.contains(a)&&/^(TEXTAREA|INPUT)$/.test(a.tagName))return;
 renderPanel(true)
}
fab.onclick=()=>{renderPanel();ap.showModal()};
function renderPanel(keepScroll){
 const ob=ap.querySelector(".ap-b"),sc=ob?ob.scrollTop:0;ap.innerHTML="";
 const head=h("div","ap-h");head.append(h("span",null,"ADMIN PANEEL"));
 const x=h("button","ap-x","×");x.type="button";x.setAttribute("aria-label","Sluiten");x.onclick=()=>ap.close();head.appendChild(x);ap.appendChild(head);
 const tabs=h("div","ap-tabs");
 const mkT=(id,label,badge)=>{const b=h("button","ap-tab");b.type="button";b.setAttribute("aria-pressed",tab===id);b.append(label);if(badge!==undefined)b.append(" ",h("i",badge?"has":"",badge));b.onclick=()=>{tab=id;if(id==="msg")LASTST="";renderPanel()};tabs.appendChild(b)};
 mkT("req","Aanvragen",pending().length);mkT("usr","Gebruikers");mkT("msg","Melding sturen");mkT("act","Activiteit");
 ap.appendChild(tabs);
 const body=h("div","ap-b");ap.appendChild(body);
 tab==="req"?renderReq(body):tab==="usr"?renderUsr(body):tab==="act"?renderAct(body):renderMsg(body);
 if(keepScroll)body.scrollTop=sc;
}
function row(parent,k,v){const r=h("div","ap-row");r.append(h("span",null,k),h("span",null,v));parent.appendChild(r)}
function renderReq(body){
 body.appendChild(h("h3",null,"Aanvragen"));
 body.appendChild(h("p","ap-sum","Hier keur je nieuwe gebruikers goed of af. Je ziet hun volledige profiel. Pas na goedkeuring krijgen ze toegang en staan ze in de lijst met topscorers."));
 const list=pending();
 if(!list.length){body.appendChild(h("div","ap-empty","Geen openstaande aanvragen."));return}
 list.forEach(p=>{
  const c=h("div","ap-req"),top=h("div","ap-top");
  const av=h("div","ap-av");phSet(av,p.photo,ini(nameOf(p)));top.append(av,h("strong",null,nameOf(p)));c.appendChild(top);
  row(c,"Naam",p.first||"-");row(c,"Achternaam",p.last||"-");row(c,"Rugnummer","#"+(p.num??"-"));row(c,"Club",clubD(p.club));row(c,"Voetbal.nl",p.voetbalnl||"-");row(c,"Leeftijd",(p.age??"-")+" jaar");row(c,"E-mail",EM[p.id]||"onbekend (zie Firebase > Authentication)");
  const bt=h("div","ap-btns"),yes=h("button","ap-yes","Goedkeuren"),no=h("button","ap-no","Weigeren");yes.type=no.type="button";
  const set=d=>{yes.disabled=no.disabled=true;updateDoc(doc(db,"players",p.id),d).catch(()=>{yes.disabled=no.disabled=false;alert("Opslaan mislukt. Controleer de Firestore-regels.")})};
  yes.onclick=()=>set({approved:true});no.onclick=()=>set({rejected:true});
  bt.append(yes,no);c.appendChild(bt);body.appendChild(c);
 });
}
function renderMsg(body){
 body.appendChild(h("h3",null,"Gebruikers melding sturen"));
 body.appendChild(h("p","ap-sum","In het kort: schrijf in je eigen woorden een melding en stuur die naar één gebruiker, meerdere gebruikers of de hele website. De melding komt live binnen. Was iemand niet actief, dan ziet hij of zij de melding zodra die weer op de website is."));
 body.appendChild(Object.assign(h("label",null,"Je bericht (in je eigen woorden)"),{htmlFor:"ap-text"}));
 const ta=h("textarea");ta.id="ap-text";ta.maxLength=1000;ta.value=DRAFT;ta.placeholder="Bijvoorbeeld: Goed bezig! Morgen worden de nieuwe doelpunten bijgewerkt.";body.appendChild(ta);
 const cnt=h("small","ap-cnt",DRAFT.length+" / 1000");ta.oninput=()=>{DRAFT=ta.value;cnt.textContent=ta.value.length+" / 1000"};body.appendChild(cnt);
 body.appendChild(h("label",null,"Naar wie?"));
 const seg=h("div","ap-seg"),b1=h("button",null,"Hele website"),b2=h("button",null,"Kies gebruikers");b1.type=b2.type="button";seg.append(b1,b2);body.appendChild(seg);
 const pick=h("div");body.appendChild(pick);
 const sync=()=>{b1.setAttribute("aria-pressed",mode==="all");b2.setAttribute("aria-pressed",mode==="pick");pick.innerHTML="";if(mode==="pick")buildPick(pick)};
 b1.onclick=()=>{mode="all";sync()};b2.onclick=()=>{mode="pick";sync()};sync();
 const go=h("button","ap-go","Verstuur melding");go.type="button";body.appendChild(go);
 const sts=h("div","ap-st",LASTST);body.appendChild(sts);
 go.onclick=async()=>{
  const text=ta.value.trim();
  if(!text){sts.textContent=LASTST="Schrijf eerst een bericht.";return}
  const all=mode==="all",to=all?[]:[...SEL];
  if(!all&&!to.length){sts.textContent=LASTST="Kies minstens één gebruiker.";return}
  go.disabled=true;sts.textContent=LASTST="Versturen…";
  try{
   await addDoc(collection(db,"notifications"),{text,all,to,createdMs:Date.now(),by:uid,byName:nameOf(ME)});
   DRAFT="";ta.value="";cnt.textContent="0 / 1000";const n=all?"de hele website":to.length+(to.length===1?" gebruiker":" gebruikers");SEL.clear();sts.textContent=LASTST="Verstuurd naar "+n+". Het komt live binnen.";sync();
  }catch(e){sts.textContent=LASTST=e&&e.code==="permission-denied"?"Geen toestemming. Controleer de Firestore-regels.":"Versturen mislukt. Probeer het opnieuw."}
  go.disabled=false;
 };
 body.appendChild(h("h4",null,"Eerder verstuurd"));
 const hist=[...HIST].sort((a,b)=>b.createdMs-a.createdMs).slice(0,8);
 if(!hist.length)body.appendChild(h("div","ap-empty","Nog geen meldingen verstuurd."));
 hist.forEach(n=>{const d=h("div","ap-hist"),to=n.all?"Hele website":(n.to||[]).map(i=>{const p=ALL.find(x=>x.id===i);return p?nameOf(p):"?"}).join(", ");d.append(h("small",null,fmtDate(n.createdMs)+(n.byName?" · van "+n.byName:"")+" · naar: "+to),h("div",null,n.text));
  const del=h("button","ap-del","Verwijderen");del.type="button";
  del.onclick=()=>{
   if(!del.dataset.sure){del.dataset.sure="1";del.textContent="Zeker weten? Tik nogmaals";return}
   del.disabled=true;del.textContent="Verwijderen…";
   deleteDoc(doc(db,"notifications",n.id)).catch(()=>{del.disabled=false;del.textContent="Verwijderen mislukt, probeer opnieuw";delete del.dataset.sure});
  };
  d.appendChild(del);body.appendChild(d)});
}
function logAdm(detail){
 try{setDoc(doc(collection(db,"activity")),{uid,name:nameOf(ME),type:"beheer",detail:String(detail).slice(0,200),ms:Date.now()}).catch(()=>{})}catch(e){}
}
function userCard(p){
 const g=Math.max(0,+p.goals||0),aw=Math.max(0,+p.awards||0),c=tierC(g);
 const d=document.createElement("details");d.className="ap-u";d.style.setProperty("--c",c);d.open=USROPEN.has(p.id);
 d.addEventListener("toggle",()=>{d.open?USROPEN.add(p.id):USROPEN.delete(p.id)});
 const sm=document.createElement("summary"),sa=h("div","ap-av");phSet(sa,p.photo,ini(nameOf(p)));
 const t=h("div","ap-ut");t.append(h("strong",null,nameOf(p)),h("small",null,clubD(p.club)+(p.approved===true&&p.admin!==true?"":" · "+statusOf(p))));
 sm.append(sa,t,h("span","ap-ug",g+" goals"));d.appendChild(sm);
 /* de kaart, zoals de gebruiker die zelf ziet bij "Mijn profiel" */
 const card=h("div","ap-card");card.appendChild(h("div","ap-ch","SPELERSPAS"));
 const top=h("div","ap-ctop"),av=h("div","ap-av");phSet(av,p.photo,ini(nameOf(p)));
 const nm=h("div");nm.append(h("div","ap-big","#"+(p.num??"-")),h("div","ap-cname",nameOf(p)));
 top.append(av,nm);card.appendChild(top);
 row(card,"Naam",p.first||"-");row(card,"Achternaam",p.last||"-");row(card,"Rugnummer","#"+(p.num??"-"));row(card,"Club",clubD(p.club));
 row(card,"Voetbal.nl",p.voetbalnl||"-");row(card,"Leeftijd",(p.age??"-")+" jaar");row(card,"E-mail",EM[p.id]||"onbekend (zie Firebase > Authentication)");
 row(card,"Doelpunten",g);row(card,"Awards (Gouden Schoen)",aw);row(card,"Status",statusOf(p));
 const ctl=(title,val,field,lab)=>{
  const wrap=h("div","ap-cg");wrap.appendChild(h("h4",null,title));
  const r=h("div","ap-ctl"),i=h("input"),m=h("small","ap-ms","");
  i.type="number";i.min="0";i.value=val;i.inputMode="numeric";i.setAttribute("aria-label",title);
  const mk=(x,fn)=>{const b=h("button",null,x);b.type="button";b.onclick=fn;return b};
  const save=async v=>{
   v=Math.max(0,Math.round(+v)||0);i.value=v;m.textContent="Opslaan…";
   try{
    const up={[field]:v};if(field==="goals"&&v>g)up.gw=addW(p.gw);
    await updateDoc(doc(db,"players",p.id),up);
    m.textContent="Opgeslagen";logAdm(lab+" "+nameOf(p)+" naar "+v);
   }catch(e){m.textContent=e&&e.code==="permission-denied"?"Geen toestemming. Controleer de Firestore-regels.":"Opslaan mislukt. Probeer het opnieuw."}
  };
  r.append(mk("−1",()=>save(+i.value-1)),i,mk("+1",()=>save(+i.value+1)),mk("Opslaan",()=>save(i.value)));
  wrap.append(r,m);return wrap};
 row(card,"Rol",p.owner===true?"\uD83D\uDC51 Hoofdbeheerder":p.admin===true?"Beheerder":"Speler");
 /* de Firestore-regels: gewone beheerders passen alleen gewone spelers aan, de hoofdbeheerder iedereen */
 if(isOwner()||(p.admin!==true&&p.id!==uid)){
  card.appendChild(ctl("Goals aanpassen",g,"goals","goals"));
  card.appendChild(ctl("Awards aanpassen (Gouden Schoen)",aw,"awards","awards"));
 }else card.appendChild(h("p","ap-sum","Alleen de hoofdbeheerder kan de goals en awards van beheerders aanpassen."));
 d.appendChild(card);return d;
}
function renderUsr(body){
 body.appendChild(h("h3",null,"Gebruikers"));
 body.appendChild(h("p","ap-sum","Alle gebruikers met hun spelerskaart. Tik op een gebruiker om de kaart te openen en de goals of het aantal awards (Gouden Schoen) aan te passen."));
 const s=h("input");s.type="search";s.placeholder="Zoek gebruiker of club…";s.value=usrF;s.setAttribute("aria-label","Zoek gebruiker");body.appendChild(s);
 const box=h("div");body.appendChild(box);
 const draw=()=>{box.innerHTML="";const q=usrF.toLowerCase().trim();
  const arr=ALL.filter(p=>!q||(nameOf(p)+" "+(p.club||"")).toLowerCase().includes(q)).sort((a,b)=>nameOf(a).localeCompare(nameOf(b),"nl"));
  box.appendChild(h("h4",null,arr.length+(arr.length===1?" gebruiker":" gebruikers")));
  if(!arr.length){box.appendChild(h("div","ap-empty","Geen gebruikers gevonden."));return}
  arr.forEach(p=>box.appendChild(userCard(p)));
 };
 s.oninput=()=>{usrF=s.value;draw()};draw();
}
function renderAct(body){
 body.appendChild(h("h3",null,"Gebruikersactiviteit"));
 body.appendChild(h("p","ap-sum","Hier zie je wat gebruikers op de website doen: inloggen, kaarten bekijken, zoeken, het profiel openen en het profiel bewerken. Je ziet de laatste 300 acties."));
 const s=h("input");s.type="search";s.placeholder="Filter op naam of actie…";s.value=evF;s.setAttribute("aria-label","Filter");body.appendChild(s);
 const box=h("div");body.appendChild(box);
 const draw=()=>{box.innerHTML="";const q=evF.toLowerCase().trim(),seenU={},sum=[];
  EV.forEach(e=>{if(e.type==="beheer")return;let u=seenU[e.uid];if(!u){u=seenU[e.uid]={name:e.name||"Onbekend",n:0,ms:e.ms};sum.push(u)}u.n++});
  box.appendChild(h("h4",null,"Per gebruiker (laatst actief eerst)"));
  if(!sum.length)box.appendChild(h("div","ap-empty","Nog geen activiteit."));
  sum.forEach(u=>{const r=h("div","ap-row");r.append(h("span",null,u.name),h("span",null,u.n+" acties · "+fmtDate(u.ms)));box.appendChild(r)});
  box.appendChild(h("h4",null,"Alle acties"));
  const l=EV.filter(e=>!q||((e.name||"")+" "+(EVL[e.type]||e.type)+" "+(e.detail||"")).toLowerCase().includes(q));
  if(!l.length)box.appendChild(h("div","ap-empty","Geen acties gevonden."));
  l.slice(0,100).forEach(e=>{const d=h("div","ap-hist");d.append(h("small",null,fmtDate(e.ms)+" · "+(e.name||"Onbekend")),h("div",null,(EVL[e.type]||e.type)+(e.detail?": "+e.detail:"")));box.appendChild(d)});
 };
 s.oninput=()=>{evF=s.value;draw()};draw();
}
function buildPick(box){
 const s=h("input");s.type="search";s.placeholder="Zoek gebruiker of club…";s.value=filter;s.setAttribute("aria-label","Zoek gebruiker");box.appendChild(s);
 const list=h("div","ap-list");box.appendChild(list);
 const draw=()=>{list.innerHTML="";const q=filter.toLowerCase();const arr=ALL.filter(p=>p.id!==uid&&(nameOf(p)+" "+(p.club||"")).toLowerCase().includes(q));
  if(!arr.length){list.appendChild(h("div","ap-empty","Geen gebruikers gevonden."));return}
  arr.forEach(p=>{const l=h("label"),c=h("input");c.type="checkbox";c.checked=SEL.has(p.id);c.onchange=()=>{c.checked?SEL.add(p.id):SEL.delete(p.id);cnt.textContent=SEL.size+" geselecteerd"};l.append(c,h("span",null,nameOf(p)),h("small",null,(p.club?clubD(p.club):"")+(p.approved?"":" · wacht")));list.appendChild(l)})};
 const cnt=h("small","ap-cnt",SEL.size+" geselecteerd");box.appendChild(cnt);
 s.oninput=()=>{filter=s.value;draw()};draw();
}

/* ---------- MELDINGEN ONTVANGEN (alle gebruikers) ---------- */
function ready(){return uid&&ME!==null&&!document.documentElement.classList.contains("pre-blocked")&&!document.querySelector("#boot-overlay.active")}
function unread(){const m=new Map();[...A,...B].forEach(n=>m.set(n.id,n));return [...m.values()].filter(n=>n.createdMs>lastSeen&&!seen.has(n.id)&&n.by!==uid).sort((a,b)=>a.createdMs-b.createdMs)}
let shown=[];
function persist(){
 try{localStorage.setItem("nt_"+uid,String(lastSeen))}catch(e){}
 setDoc(doc(db,"notifReads",uid),{lastSeen}).catch(()=>{});
}
function markSeen(list){
 list.forEach(n=>seen.add(n.id));
 lastSeen=Math.max(lastSeen,...list.map(n=>n.createdMs));
 persist();
}
function showNotes(){
 const ids=new Set([...A,...B].map(n=>n.id));
 shown=shown.filter(n=>ids.has(n.id));               /* verwijderde meldingen verdwijnen meteen */
 const fresh=ready()?unread():[];
 if(fresh.length){shown=shown.concat(fresh);markSeen(fresh)}   /* zodra getoond = gelezen, dus nooit meer terug */
 if(!shown.length){if(nt.open)nt.close();return}
 if(!ready()&&!nt.open)return;
 nt.innerHTML="";
 const head=h("div","ap-h");head.append(h("span",null,shown.length>1?"MELDINGEN VAN DE BEHEERDER":"MELDING VAN DE BEHEERDER"));nt.appendChild(head);
 const b=h("div","ap-b");
 shown.forEach(n=>{const i=h("div","nt-i");i.append(h("small",null,(n.byName?"Van "+n.byName+" · ":"")+fmtDate(n.createdMs)),h("p",null,n.text));b.appendChild(i)});
 const ok=h("button","ap-go","Begrepen");ok.type="button";
 ok.onclick=()=>{shown=[];nt.close()};
 b.appendChild(ok);nt.appendChild(b);
 if(!nt.open)nt.showModal();
}
nt.addEventListener("cancel",e=>e.preventDefault());
setInterval(()=>{if((unread().length||shown.length)&&!nt.open)showNotes()},1500);

/* ---------- Oude aanvragenlijst uit het profiel halen ---------- */
const pf=document.getElementById("pf");
if(pf){const clean=()=>[...pf.children].forEach(el=>{if(el.classList.contains("pq"))el.remove();else if(el.tagName==="P"&&/^(Aanvragen om goed te keuren|Geen openstaande aanvragen)/.test(el.textContent))el.remove()});
 new MutationObserver(clean).observe(pf,{childList:true});}

/* ---------- Firebase ---------- */
function start(){
 const app=getApp();db=getFirestore(app);auth=getAuth(app);
 onAuthStateChanged(auth,async u=>{
  subs.forEach(f=>f());subs=[];uid=u?u.uid:null;ME=null;ALL=[];EM={};HIST=[];EV=[];A=[];B=[];seen=new Set();shown=[];SEL.clear();
  if(ap.open)ap.close();if(nt.open)nt.close();renderBadge();
  if(!u)return;
  let ls=Date.parse((u.metadata&&u.metadata.creationTime)||0)||0;
  try{const d=await getDoc(doc(db,"notifReads",u.uid));if(d.exists()&&typeof d.data().lastSeen==="number")ls=Math.max(ls,d.data().lastSeen)}catch(e){}
  try{const l=parseInt(localStorage.getItem("nt_"+u.uid)||"0",10);if(l>ls)ls=l}catch(e){}
  if(uid!==u.uid)return;lastSeen=ls;
  const map=s=>s.docs.map(d=>Object.assign({id:d.id},d.data()));
  subs.push(onSnapshot(query(collection(db,"notifications"),where("all","==",true)),s=>{A=map(s);showNotes()},()=>{}));
  subs.push(onSnapshot(query(collection(db,"notifications"),where("to","array-contains",u.uid)),s=>{B=map(s);showNotes()},()=>{}));
  let adminSubs=false;
  subs.push(onSnapshot(doc(db,"players",u.uid),d=>{
   ME=d.exists()?d.data():{};
   if(isAdmin()&&!adminSubs){adminSubs=true;
    subs.push(onSnapshot(collection(db,"players"),s=>{ALL=map(s);renderBadge()},()=>{}));
    subs.push(onSnapshot(collection(db,"private"),s=>{EM={};s.docs.forEach(x=>EM[x.id]=x.data().email);renderBadge()},()=>{}));
    subs.push(onSnapshot(collection(db,"notifications"),s=>{HIST=map(s);refreshPanel()},()=>{}));
    subs.push(onSnapshot(query(collection(db,"activity"),orderBy("ms","desc"),limit(300)),s=>{EV=map(s);refreshPanel()},()=>{}));
   }
   renderBadge();showNotes();
  },e=>console.error("Admin-paneel: eigen speler lezen mislukt (Firestore-regels of verbinding)",e)));
 });
}
let tries=0;(function wait(){if(getApps().length)start();else if(tries++<150)setTimeout(wait,100)})();
