/* PRE-ORDER SYSTEEM
   Nieuwe gebruikers mogen zich registreren, maar de website is voor hen dicht tot een beheerder hen goedkeurt.
   Bestaande accounts (goedgekeurd, beheerder, of van vóór het goedkeuringssysteem) kunnen gewoon inloggen. */
import {getApps,getApp} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {getAuth,onAuthStateChanged,signOut} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {getFirestore,doc,onSnapshot} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

const css=`
html.pre-check body>*:not(dialog):not(#preorder){visibility:hidden}
html.pre-blocked body>*:not(#preorder){display:none!important}
html.pre-blocked dialog:not(#preorder){display:none!important}
html.pre-blocked body{background:radial-gradient(ellipse at 50% 0,#145230,transparent 60%),#04100a!important}
#preorder{width:min(400px,calc(100% - 32px));padding:0;border:0;background:transparent;color:#fff;overflow:visible;margin:auto;font-family:Archivo,system-ui,sans-serif}
#preorder::backdrop{background:rgba(3,12,7,.9);backdrop-filter:blur(8px)}
#preorder .tk{position:relative;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at 50% -20%,#2a8a4f,transparent 60%),linear-gradient(180deg,#0f3d22,#07130c 88%);border:1px solid rgba(255,255,255,.45);box-shadow:0 30px 80px rgba(0,0,0,.6),0 0 50px rgba(255,214,10,.22),inset 0 1px 2px rgba(255,255,255,.55);-webkit-mask:radial-gradient(circle 13px at 0 62%,transparent 98%,#000) left/51% 100% no-repeat,radial-gradient(circle 13px at 100% 62%,transparent 98%,#000) right/51% 100% no-repeat;mask:radial-gradient(circle 13px at 0 62%,transparent 98%,#000) left/51% 100% no-repeat,radial-gradient(circle 13px at 100% 62%,transparent 98%,#000) right/51% 100% no-repeat;animation:poIn .5s cubic-bezier(.2,.9,.3,1.1)}
@keyframes poIn{from{opacity:0;transform:translateY(24px) scale(.94)}to{opacity:1;transform:none}}
#preorder .po-top{padding:22px 24px 16px;text-align:center}
#preorder .po-tag{display:inline-block;font:700 .78rem "Archivo Narrow",sans-serif;letter-spacing:.22em;color:#2a1c00;padding:5px 16px;border-radius:999px;background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,255,255,0) 55%),linear-gradient(90deg,#ffe246,#ebb600);box-shadow:0 0 18px rgba(255,214,10,.55)}
#preorder h2{margin:14px 0 6px;font:700 2.3rem/1 "Archivo Narrow",sans-serif;text-transform:uppercase}
#preorder p{margin:0;color:rgba(255,255,255,.82);font-size:.95rem;line-height:1.45}
#preorder .po-perf{margin:0 18px;border-top:2px dashed rgba(255,255,255,.3)}
#preorder .po-body{padding:16px 24px 24px}
#preorder .po-row{display:flex;justify-content:space-between;gap:16px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.18)}
#preorder .po-row span:first-child{opacity:.72}
#preorder .po-row span:last-child{text-align:right;overflow-wrap:anywhere;font-weight:600}
#preorder .po-st{display:flex;align-items:center;justify-content:center;gap:9px;margin:16px 0 4px;font-weight:600;color:#ffe27a}
#preorder .po-st i{width:10px;height:10px;border-radius:50%;background:#ffd60a;box-shadow:0 0 12px #ffd60a;animation:poP 1.6s ease-in-out infinite}
#preorder.rej .po-st{color:#ffb4b4}#preorder.rej .po-st i{background:#ff5a5a;box-shadow:0 0 12px #ff5a5a;animation:none}
@keyframes poP{50%{opacity:.35;transform:scale(.8)}}
#preorder button{display:block;width:100%;margin-top:16px;font:700 1.05rem "Archivo Narrow",sans-serif;color:#fff;padding:11px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,.5);background:linear-gradient(180deg,rgba(255,255,255,.3),rgba(255,255,255,.06))}
@media (prefers-reduced-motion:reduce){#preorder .tk,#preorder .po-st i{animation:none}}`;
const st=document.createElement("style");st.textContent=css;document.head.appendChild(st);

const dlg=document.createElement("dialog");dlg.id="preorder";dlg.setAttribute("aria-labelledby","po-t");
dlg.innerHTML='<div class="tk"><div class="po-top"><span class="po-tag">WACHTLIJST</span><h2 id="po-t"></h2><p id="po-p"></p></div><div class="po-perf"></div><div class="po-body"><div id="po-rows"></div><div class="po-st"><i></i><span id="po-s"></span></div><button type="button" id="po-out">Uitloggen</button></div></div>';
document.body.appendChild(dlg);
dlg.addEventListener("cancel",e=>e.preventDefault());
const $=id=>document.getElementById(id);
const root=document.documentElement;

function show(d,uid,rejected){
 $("po-t").textContent=rejected?"Aanvraag afgewezen":"Je staat op de wachtlijst";
 $("po-p").textContent=rejected
  ?"Je aanvraag voor toegang is helaas afgewezen. Neem contact op met de beheerder als je denkt dat dit niet klopt."
  :"Bedankt voor je registratie"+(d&&d.first?", "+d.first:"")+"! De website is nog niet toegankelijk voor nieuwe gebruikers. Zodra een beheerder je account vrijgeeft, krijg je automatisch toegang.";
 const rows=$("po-rows");rows.innerHTML="";
 const add=(k,v)=>{const r=document.createElement("div");r.className="po-row";const a=document.createElement("span"),b=document.createElement("span");a.textContent=k;b.textContent=v;r.append(a,b);rows.appendChild(r)};
 add("Ticket","#"+uid.slice(0,6).toUpperCase());
 if(d){add("Naam",(d.first||"")+" "+(d.last||""));add("Club",String(d.club||"-").replace(/\s+/g," ").trim().toUpperCase());add("Rugnummer","#"+(d.num||"-"))}
 $("po-s").textContent=rejected?"Afgewezen":"Ticket · in behandeling";
 dlg.classList.toggle("rej",!!rejected);
 root.classList.remove("pre-check");root.classList.add("pre-blocked");
 if(!dlg.open)dlg.showModal();
}
function allow(){
 root.classList.remove("pre-check","pre-blocked");
 if(dlg.open)dlg.close();
}
function start(){
 const app=getApp(),auth=getAuth(app),db=getFirestore(app);
 $("po-out").onclick=()=>signOut(auth);
 let un=null;
 onAuthStateChanged(auth,u=>{
  if(un){un();un=null}
  if(!u){allow();return}
  root.classList.add("pre-check");
  const isNew=Date.now()-Date.parse((u.metadata&&u.metadata.creationTime)||0)<120000;
  un=onSnapshot(doc(db,"players",u.uid),snap=>{
   const d=snap.exists()?snap.data():null;
   if(!d){isNew?show(null,u.uid,false):allow();return}
   if(d.admin===true){allow();return}
   if(d.rejected===true){show(d,u.uid,true);return}
   if(d.approved===false){show(d,u.uid,false);return}
   allow();
  },()=>allow());
 });
}
let tries=0;
(function wait(){if(getApps().length)start();else if(tries++<150)setTimeout(wait,100)})();
