/* Tournament layer: team registry, cricket + volleyball, standings, PDF/Excel export */
let TM=[],sp='cricket',tb='teams';
const T_=()=>TM.filter(t=>t.sport==sp),SP=()=>sp=='vb'?'Volleyball':'Cricket';
const saveTeams=()=>{api('PUT','/api/teams',TM).catch(()=>{})};
const _r=render,_sv=scoreView;
window.render=()=>{if(view=='match'&&M())sp=M().sport=='vb'?'vb':'cricket';document.body.dataset.sp=sp;_r()};
window.scoreView=m=>m.sport=='vb'?vbView(m):_sv(m);
const setSp=s=>{sp=s;render()},setTb=t=>{tb=t;render();if(t=='users')loadUsers()};
const mres=m=>m.res||'In progress';

/* ---------- volleyball engine (rally scoring, replayed from a point log) ---------- */
function vcalc(m){
 const need=Math.ceil(m.best/2),s={sets:[],a:0,b:0,w:[0,0],srv:m.first,done:false,win:null,no:1};
 for(const x of m.log){
  if(s.done)break;
  s[x?'b':'a']++;s.srv=x;
  const tgt=(s.w[0]+s.w[1]==m.best-1)?m.last:m.pts,hi=Math.max(s.a,s.b),lo=Math.min(s.a,s.b);
  if(hi>=tgt&&hi-lo>=2){
   const wi=s.a>s.b?0:1;s.w[wi]++;s.sets.push([s.a,s.b]);s.a=s.b=0;s.no++;s.srv=(m.first+s.no-1)%2;
   if(s.w[wi]==need){s.done=true;s.win=wi}
  }
 }
 s.tgt=(s.w[0]+s.w[1]==m.best-1)?m.last:m.pts;return s;
}
function vres(m){const s=vcalc(m);return m.teams[s.win]+' won '+s.w[s.win]+'-'+s.w[1-s.win]+' ('+s.sets.map(x=>x.join('-')).join(', ')+')'}
function vpt(i){const m=M();m.log.push(i);if(vcalc(m).done)m.res=vres(m);save(m);render()}
function vundo(){const m=M();m.log.pop();m.res='';save(m);render()}
function vbView(m){
 const s=vcalc(m),T=m.teams;
 let h=`<div class="row sp ctl"><button onclick="go('home')">← Matches</button><button onclick="share()">Share</button></div>
 <div class="card" style="margin-top:12px"><div class="mu">Set ${Math.min(s.no,m.best)} · first to ${s.tgt}, win by 2 · best of ${m.best}</div>
 <div class="vsc" style="margin-top:8px">${[0,1].map(i=>`<div class="vt ${!s.done&&s.srv==i?'srv':''}"><div class="mu">${esc(T[i])}${!s.done&&s.srv==i?' 🏐 serving':''}</div><div class="bigger">${i?s.b:s.a}</div><div class="mu">Sets won: <b>${s.w[i]}</b></div></div>`).join('')}</div>
 <div style="margin-top:10px">${s.sets.map((x,i)=>`<span class="ch ${x[0]>x[1]?'b':'x'}">S${i+1} ${x[0]}-${x[1]}</span> `).join('')}</div></div>`;
 if(s.done)return h+`<div class="card"><h2>🏆 ${esc(m.res)}</h2></div>`;
 return h+`<div class="card ctl"><div class="vbtn">${[0,1].map(i=>`<button class="p" onclick="vpt(${i})">+1 ${esc(T[i])}</button>`).join('')}</div><button style="margin-top:10px" onclick="vundo()">↶ Undo last point</button></div>`;
}

/* ---------- summaries & standings ---------- */
function sline(m){
 if(m.sport=='vb'){const s=vcalc(m),x=s.sets.map(t=>t.join('-'));if(s.a||s.b)x.push(s.a+'-'+s.b+'*');return s.w[0]+'-'+s.w[1]+' sets'+(x.length?' ('+x.join(', ')+')':'')}
 const x=[0,1].map(i=>calc(m,i)).filter(s=>s.stage=='play').map(s=>m.teams[s.bt]+' '+s.runs+'/'+s.w+' ('+ovs(s.lb)+')');
 return x.length?x.join(' | '):'Not started';
}
function cw(m){const a=calc(m,0),b=calc(m,1);if(!b.done)return null;if(b.runs>=b.target)return{w:m.teams[b.bt]};if(b.runs==a.runs)return{tie:1};return{w:m.teams[a.bt]}}
function stand(){
 const R={},g=n=>R[n]||(R[n]={t:n,p:0,w:0,l:0,d:0,f:0,a:0,pts:0});
 TM.filter(t=>t.sport==sp).forEach(t=>g(t.name));
 ms.filter(m=>(m.sport||'cricket')==sp).forEach(m=>{
  const A=g(m.teams[0]),B=g(m.teams[1]);
  if(sp=='vb'){const s=vcalc(m);if(!s.done)return;A.f+=s.w[0];A.a+=s.w[1];B.f+=s.w[1];B.a+=s.w[0];
   const[W,L]=s.win?[B,A]:[A,B];W.p++;L.p++;W.w++;L.l++;W.pts+=2;return}
  const r=cw(m);if(!r)return;A.p++;B.p++;
  if(r.tie){A.d++;B.d++;A.pts++;B.pts++}else{const W=r.w==m.teams[0]?A:B,L=W==A?B:A;W.w++;L.l++;W.pts+=2}
 });
 return Object.values(R).sort((x,y)=>y.pts-x.pts||(y.f-y.a)-(x.f-x.a)||y.w-x.w);
}

/* ---------- screens ---------- */
const shell=b=>`<div class="top"><div><div class="brand">🏆 Tournament Scorer</div><div class="who">👤 ${esc(USER)} · ${RO?'Viewer':'Scorer'} · <a href="/logout">Log out</a></div></div><div class="seg">${['cricket','vb'].map(s=>`<button class="${sp==s?'on':''}" onclick="setSp('${s}')">${s=='vb'?'🏐 Volleyball':'🏏 Cricket'}</button>`).join('')}</div></div>
<div class="nav">${[['teams','👥 Teams'],['matches','📅 Matches'],['table','📊 Standings'],...(RO?[]:[['users','🔐 Accounts']])].map(t=>`<button class="${tb==t[0]?'on':''}" onclick="setTb('${t[0]}')">${t[1]}</button>`).join('')}<span class="grow"></span><button onclick="exp('xlsx')">⬇ Excel</button><button onclick="exp('pdf')">⬇ PDF</button></div>${b}`;
window.home=()=>shell(tb=='teams'?teamsTab():tb=='matches'?matchesTab():tb=='users'&&!RO?accountsTab():tableTab());

function teamsTab(){
 const L=T_();
 return `<div class="card ctl"><h2>Add ${SP()} teams</h2><textarea id="bulk" placeholder="Type one team name per line"></textarea><button class="p" style="margin-top:8px" onclick="addTeams()">＋ Add teams</button></div>`+
 (L.length?`<div class="grid">${L.map(t=>`<div class="card"><div class="row sp"><b>${esc(t.name)}</b><button class="ctl" data-i="${t.id}" onclick="delTeam(this)">✕</button></div>${sp=='cricket'?`<details class="ctl"><summary class="mu">Players (${t.players.length||'auto-generated'})</summary><textarea id="pl${t.id}" placeholder="One player per line (optional)">${esc(t.players.join('\n'))}</textarea><button data-i="${t.id}" onclick="savePl(this)">Save players</button></details>`:''}</div>`).join('')}</div>`:'<div class="mu">No teams yet — add your team names above.</div>');
}
function addTeams(){
 const n=$('#bulk').value.split('\n').map(x=>x.trim()).filter(Boolean);let c=0;
 n.forEach((x,i)=>{if(!T_().some(t=>t.name.toLowerCase()==x.toLowerCase())){TM.push({id:Date.now()+i,sport:sp,name:x,players:[]});c++}});
 if(c)saveTeams();render();
}
function delTeam(el){if(confirm('Remove this team?')){TM=TM.filter(t=>t.id!=el.dataset.i);saveTeams();render()}}
function savePl(el){const t=TM.find(x=>x.id==el.dataset.i);t.players=$('#pl'+t.id).value.split('\n').map(x=>x.trim()).filter(Boolean);saveTeams();alert('Players saved')}

function matchesTab(){
 const L=ms.filter(m=>(m.sport||'cricket')==sp);
 return `<button class="p wide ctl" onclick="startNew()">＋ New ${SP()} match</button>`+(L.length?L.map(m=>`<div class="card"><div class="row sp"><b>${esc(m.teams[0])} <span class="mu">vs</span> ${esc(m.teams[1])}</b><span class="badge ${m.res?'d':'l'}">${m.res?'Completed':'Live'}</span></div><div class="mu">${esc(m.created)} · ${m.sport=='vb'?'best of '+m.best:m.overs+' overs'}</div><div style="margin:6px 0">${esc(sline(m))}</div>${m.res?`<div style="color:var(--pr);font-weight:700">🏆 ${esc(m.res)}</div>`:''}<div class="row" style="margin-top:8px"><button class="p" onclick="go('match',${m.id})">${m.res?'View':'Open'}</button><button class="ctl" onclick="del(${m.id})">Delete</button></div></div>`).join(''):'<div class="mu" style="margin-top:12px">No matches yet.</div>');
}
function tableTab(){
 const S=stand(),cr=sp=='cricket';
 return `<div class="card tw"><h2>Points table · ${SP()}</h2><div class="mu">Win = 2 pts, tie = 1 pt${cr?'':' · ties broken by set difference'}</div><table class="st"><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>L</th>${cr?'<th>T</th>':'<th>SW</th><th>SL</th>'}<th>Pts</th></tr>${S.map((r,i)=>`<tr><td>${i+1}</td><td><b>${esc(r.t)}</b></td><td>${r.p}</td><td>${r.w}</td><td>${r.l}</td>${cr?`<td>${r.d}</td>`:`<td>${r.f}</td><td>${r.a}</td>`}<td><b>${r.pts}</b></td></tr>`).join('')}</table></div>`;
}

/* ---------- new match: teams -> toss -> format ---------- */
function startNew(){
 const L=T_();if(L.length<2){alert('Add at least 2 '+SP()+' teams first.');setTb('teams');return}
 nm={a:L[0].id,b:L[1].id,tw:'a',el:sp=='vb'?'serve':'bat',ov:20,best:3,pts:25,last:15};view='new';render();
}
window.newView=()=>{
 const L=T_(),A=L.find(t=>t.id==nm.a),B=L.find(t=>t.id==nm.b);
 const sel=k=>`<select onchange="nm.${k}=+this.value;render()">${L.map(t=>`<option value="${t.id}"${nm[k]==t.id?' selected':''}>${esc(t.name)}</option>`).join('')}</select>`;
 const ch=(k,v,l)=>`<button class="${nm[k]==v?'p':''}" onclick="nm.${k}='${v}';render()">${l}</button>`;
 const cr=sp=='cricket';
 return `<button onclick="go('home')">← Back</button><h1>New ${SP()} match</h1>
 <div class="card"><h2>1 · Select teams</h2><div class="g2"><div><label class="mu">Team 1</label>${sel('a')}</div><div><label class="mu">Team 2</label>${sel('b')}</div></div></div>
 <div class="card"><h2>2 · Toss</h2><div class="mu">Toss won by</div><div class="row">${ch('tw','a',esc(A.name))}${ch('tw','b',esc(B.name))}</div><div class="mu" style="margin-top:8px">Elected to</div><div class="row">${cr?ch('el','bat','Bat')+ch('el','bowl','Bowl'):ch('el','serve','Serve first')+ch('el','recv','Receive')}</div></div>
 <div class="card"><h2>3 · Format</h2>${cr?`<label class="mu">Overs per innings</label><input type="number" min="1" value="${nm.ov}" oninput="nm.ov=this.value">`:`<div class="g2"><div><label class="mu">Best of (sets)</label><select onchange="nm.best=+this.value"><option${nm.best==1?' selected':''}>1</option><option${nm.best==3?' selected':''}>3</option><option${nm.best==5?' selected':''}>5</option></select></div><div><label class="mu">Points per set</label><input type="number" value="${nm.pts}" oninput="nm.pts=+this.value"></div><div><label class="mu">Deciding set points</label><input type="number" value="${nm.last}" oninput="nm.last=+this.value"></div></div>`}</div>
 <button class="p wide" onclick="createMatch()">Start match ▶</button>`;
};
function createMatch(){
 const A=TM.find(t=>t.id==nm.a),B=TM.find(t=>t.id==nm.b);
 if(!A||!B||A.id==B.id){alert('Select two different teams');return}
 const tw=nm.tw=='b'?1:0,id=Date.now(),created=new Date().toLocaleString(),base={id,sport:sp,teams:[A.name,B.name],toss:tw,res:'',created};
 const pl=t=>t.players.length>=2?t.players:Array.from({length:11},(_,i)=>t.name+' '+(i+1));
 const m=sp=='vb'?{...base,best:+nm.best,pts:+nm.pts||25,last:+nm.last||15,first:nm.el=='serve'?tw:1-tw,log:[]}
  :{...base,players:[pl(A),pl(B)],overs:Math.max(1,+nm.ov||20),first:nm.el=='bat'?tw:1-tw,inn:[[],[]],cur:0};
 ms.unshift(m);save(m);tb='matches';go('match',id);
}
window.share=()=>{
 const m=M(),t=m.teams.join(' vs ')+'\n'+sline(m)+'\n'+(m.res||'')+'\n'+location.origin+'/?live='+m.id;
 if(navigator.share)navigator.share({text:t}).catch(()=>{});else try{navigator.clipboard.writeText(t);alert('Score copied')}catch(e){alert(t)}
};

/* ---------- export (data built here, files rendered by Flask) ---------- */
function exData(){
 const cr=sp=='cricket',L=ms.filter(m=>(m.sport||'cricket')==sp).slice().reverse(),S=stand();
 const sh=[{name:'Points Table',rows:[cr?['Team','P','W','L','T','Pts']:['Team','P','W','L','Sets won','Sets lost','Pts'],...S.map(r=>cr?[r.t,r.p,r.w,r.l,r.d,r.pts]:[r.t,r.p,r.w,r.l,r.f,r.a,r.pts])]},
  {name:'Results',rows:[['#','Date','Team 1','Team 2','Score','Result'],...L.map((m,i)=>[i+1,m.created,m.teams[0],m.teams[1],sline(m),mres(m)])]}];
 const d=[];
 if(cr)L.forEach(m=>{
  d.push(['» '+m.teams[0]+' vs '+m.teams[1],mres(m)]);
  [0,1].forEach(i=>{const s=calc(m,i);if(s.stage!='play')return;
   d.push(['» '+m.teams[s.bt]+' innings',s.runs+'/'+s.w+' ('+ovs(s.lb)+' ov)'],['Batter','Dismissal','R','B','4s','6s','SR']);
   s.order.forEach(n=>{const b=s.bat[n];d.push([n,b.out||(n==s.st||n==s.ns?'batting':'not out'),b.r,b.b,b.f,b.s,b.b?(b.r*100/b.b).toFixed(0):'-'])});
   d.push(['Extras','wd '+s.ex.wd+', nb '+s.ex.nb+', b '+s.ex.b,s.ex.wd+s.ex.nb+s.ex.b+s.ex.lb],['Bowler','O','R','W','Econ','Wd','Nb']);
   Object.keys(s.bowl).forEach(n=>{const b=s.bowl[n];d.push([n,ovs(b.b),b.r,b.w,b.b?(b.r*6/b.b).toFixed(1):'-',b.wd,b.nb])});
   if(s.fow.length)d.push(['Fall of wickets',s.fow.join(', ')]);d.push([]);
  });
 });
 else{d.push(['Match','Set','Team 1','Team 2']);L.forEach(m=>{const s=vcalc(m);s.sets.forEach((x,i)=>d.push([m.teams[0]+' vs '+m.teams[1],'Set '+(i+1),x[0],x[1]]))})}
 sh.push({name:cr?'Scorecards':'Set Scores',rows:d});return sh;
}
async function exp(f){
 const r=await fetch('/api/export/'+f,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:'Tournament - '+SP(),sheets:exData()})});
 if(!r.ok){alert('Export failed');return}
 const a=document.createElement('a');a.href=URL.createObjectURL(await r.blob());a.download='tournament-'+SP().toLowerCase()+'.'+f;a.click();
}


/* ---------- accounts (scorers only) ---------- */
let US=[];
function accountsTab(){
 return `<div class="card"><h2>Add / update account</h2><div class="g2"><input id="au" placeholder="Username" autocapitalize="none"><input id="ap" type="password" placeholder="Password (min 6 chars)"></div><div class="row" style="margin-top:8px"><select id="ar" style="width:auto"><option value="viewer">Viewer (can only watch)</option><option value="scorer">Scorer (can enter scores)</option></select><button class="p" onclick="addUser()">Save account</button></div><div class="mu" style="margin-top:6px">Saving an existing username resets its password.</div></div>
 <div class="card tw"><h2>Accounts</h2><table><tr><th>User</th><th>Role</th><th></th></tr>${US.map(u=>`<tr><td>${esc(u.username)}</td><td>${u.role}</td><td>${u.username==USER?'(you)':`<button data-u="${esc(u.username)}" onclick="delUser(this)">Delete</button>`}</td></tr>`).join('')}</table></div>`;
}
async function loadUsers(){try{US=await(await fetch('/api/users')).json();render()}catch(e){}}
async function addUser(){const r=await api('PUT','/api/users',{username:$('#au').value.trim(),password:$('#ap').value,role:$('#ar').value}),d=await r.json().catch(()=>({}));if(r.ok)loadUsers();else alert(d.error||'Failed')}
async function delUser(el){if(!confirm('Delete this account?'))return;const r=await api('DELETE','/api/users/'+encodeURIComponent(el.dataset.u));if(!r.ok)alert((await r.json().catch(()=>({}))).error||'Failed');loadUsers()}

/* ---------- start ---------- */
const jf=u=>fetch(u).then(r=>{if(r.status==401){location='/login';throw 0}return r.json()});
const load=()=>Promise.all([jf('/api/matches'),jf('/api/teams')]).then(([m,t])=>{ms=m;TM=t});
load().catch(()=>{}).then(()=>{const id=+new URLSearchParams(location.search).get('live');if(id){cur=id;if(M())view='match'}render()});
if(RO)setInterval(()=>{if(!document.hidden)load().then(render).catch(()=>{})},4000);
