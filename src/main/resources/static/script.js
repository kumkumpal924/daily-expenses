const api = '/api/expenses';
let expenses = [], pie, bar, me = null;
const byId = id => document.getElementById(id);
const modal = byId('modalBackdrop');
const form = byId('expenseForm');
const money = v => new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR'}).format(Number(v || 0));
const safe = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const CATS = ['Food','Travel','Shopping','Bills','Education','Health','Entertainment','Other'];
const COLORS = ['#6558dc','#22c55e','#f59e0b','#ef4444','#06b6d4','#ec4899','#8b5cf6','#94a3b8'];
const KEYWORDS = {Food:'chai tea coffee lunch dinner breakfast swiggy zomato pizza burger snacks maggi juice',Travel:'uber ola rapido metro bus petrol diesel auto train cab flight',Shopping:'amazon flipkart myntra shirt shoes clothes',Bills:'recharge rent electricity wifi bill netflix spotify prime',Education:'book books course fees exam notes',Health:'medicine doctor gym pharmacy',Entertainment:'movie game party concert'};

// ---------- helpers ----------
const budgetKey = () => 'budget_' + (me ? me.id : 'guest');   // budget is stored per user, never shared on a browser
const getBudget = () => Number(localStorage.getItem(budgetKey()) || 0);
const localISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const today = () => localISO(new Date());
const daysAgo = n => { const d = new Date(); d.setDate(d.getDate()-n); return localISO(d); };
function notify(m){const t=byId('toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)}
async function request(url, options={}){const r=await fetch(url,{headers:{'Content-Type':'application/json'},...options});if(r.status===401){location.href='/login.html';throw new Error('Session expired. Please log in again.')}if(!r.ok){let m='Something went wrong';try{m=(await r.json()).error||m}catch{}throw new Error(m)}return r.json()}

// ---------- theme ----------
function setTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem('theme',t);byId('themeBtn').textContent=t==='dark'?'Light mode':'Dark mode';if(typeof Chart!=='undefined')Chart.defaults.color=t==='dark'?'#b8bdd2':'#74798d';drawCharts()}
byId('themeBtn').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');

// ---------- filtering ----------
function inRange(d){const r=byId('rangeFilter').value,t=today();
  if(r==='today')return d===t;
  if(r==='week')return d>=daysAgo(6)&&d<=t;
  if(r==='month')return d.slice(0,7)===t.slice(0,7);
  if(r==='custom'){const f=byId('fromDate').value,e=byId('toDate').value;return(!f||d>=f)&&(!e||d<=e)}
  return true}
function filtered(){const s=byId('searchInput').value.trim().toLowerCase(),c=byId('categoryFilter').value;
  return expenses.filter(i=>(!c||i.category===c)&&inRange(String(i.date))&&`${i.title} ${i.description||''} ${i.category} ${i.paymentMethod||''}`.toLowerCase().includes(s)).sort((a,b)=>String(b.date).localeCompare(String(a.date)))}

// ---------- render ----------
async function loadExpenses(){try{expenses=await request(api);render()}catch(e){byId('expenseRows').innerHTML=`<tr><td colspan="6" class="empty-state">${safe(e.message)}. Check that the backend and database are running.</td></tr>`}}
function render(){
  const list=filtered();
  byId('expenseRows').innerHTML=list.length?list.map(i=>`<tr><td>${safe(i.title)}${i.description?`<div style="font-size:10px;color:#999;margin-top:4px;font-weight:400">${safe(i.description)}</div>`:''}</td><td><span class="category-pill">${safe(i.category)}</span></td><td class="pay-pill">${safe(i.paymentMethod||'—')}</td><td>${safe(i.date)}</td><td class="amount-cell">${money(i.amount)}</td><td><button class="action-button" data-edit="${i.id}">Edit</button><button class="action-button delete-button" data-delete="${i.id}">Delete</button></td></tr>`).join(''):'<tr><td colspan="6" class="empty-state">No expenses found. Add your first expense to get started.</td></tr>';
  const m=today().slice(0,7);
  byId('totalAmount').textContent=money(expenses.reduce((s,i)=>s+Number(i.amount),0));
  byId('monthlyAmount').textContent=money(monthTotal());
  byId('transactionCount').textContent=expenses.length;
  updateBudget();drawCharts();renderInsights();renderStreak();
}
const monthTotal=()=>expenses.filter(i=>String(i.date).slice(0,7)===today().slice(0,7)).reduce((s,i)=>s+Number(i.amount),0);

// ---------- budget ----------
let alerted=false;
function updateBudget(){const b=getBudget(),spent=monthTotal(),bar=byId('budgetBar');
  if(!b){byId('budgetText').textContent='No budget set. Set one to track your spending.';bar.style.width='0';return}
  const pct=spent/b*100;bar.style.width=Math.min(pct,100)+'%';bar.className='progress-bar'+(pct>=100?' over':pct>=80?' warn':'');
  byId('budgetText').textContent=`${money(spent)} of ${money(b)} used (${pct.toFixed(0)}%)`+(pct>=100?' — Budget exceeded!':pct>=80?' — Careful, 80% crossed':'');
  if(pct>=80&&!alerted){alerted=true;notify(pct>=100?'Monthly budget exceeded!':'You have used 80% of your budget')}}
byId('budgetBtn').onclick=()=>{const v=prompt('Monthly budget (₹):',getBudget()||'');if(v===null)return;const n=Number(v);if(!(n>=0)){notify('Enter a valid number');return}localStorage.setItem(budgetKey(),n);alerted=false;updateBudget()};

// ---------- charts ----------
function drawCharts(){
  if(typeof Chart==='undefined')return;
  const list=filtered(),by={};list.forEach(i=>by[i.category]=(by[i.category]||0)+Number(i.amount));
  const labels=Object.keys(by);pie&&pie.destroy();
  pie=new Chart(byId('pieChart'),{type:'doughnut',data:{labels,datasets:[{data:labels.map(l=>by[l]),backgroundColor:labels.map(l=>COLORS[CATS.indexOf(l)%COLORS.length]),borderWidth:0}]},options:{maintainAspectRatio:false,cutout:'62%',plugins:{legend:{position:'right'}}}});
  const months=[];for(let k=5;k>=0;k--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-k);months.push(localISO(d).slice(0,7))}
  const vals=months.map(m=>expenses.filter(i=>String(i.date).slice(0,7)===m).reduce((s,i)=>s+Number(i.amount),0));
  bar&&bar.destroy();
  bar=new Chart(byId('barChart'),{type:'bar',data:{labels:months.map(m=>new Date(m+'-01T00:00:00').toLocaleString('en-IN',{month:'short'})),datasets:[{data:vals,backgroundColor:'#6558dc',borderRadius:6}]},options:{maintainAspectRatio:false,plugins:{legend:{display:false}}}});
}

// ---------- CSV export ----------
byId('exportBtn').onclick=()=>{const list=filtered();if(!list.length){notify('Nothing to export');return}
  const q=v=>`"${String(v??'').replace(/"/g,'""')}"`;
  const rows=[['Title','Category','Payment','Date','Amount','Description'],...list.map(i=>[i.title,i.category,i.paymentMethod,i.date,i.amount,i.description])];
  const blob=new Blob(['\ufeff'+rows.map(r=>r.map(q).join(',')).join('\n')],{type:'text/csv;charset=utf-8'});
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`expenses-${today()}.csv`;a.click();URL.revokeObjectURL(a.href);notify('CSV downloaded')};

// ---------- quick add ----------
function parseQuick(text){
  const tk=text.trim().split(/\s+/).filter(Boolean);
  const ni=tk.findIndex(t=>/^₹?\d+(\.\d+)?$/.test(t));if(ni<0)return null;
  const amount=Number(tk[ni].replace('₹',''));let rest=tk.filter((_,i)=>i!==ni),payment='UPI';
  const pi=rest.findIndex(t=>['upi','cash','card','wallet'].includes(t.toLowerCase()));
  if(pi>=0){payment=rest[pi][0].toUpperCase()+rest[pi].slice(1).toLowerCase();rest.splice(pi,1)}
  let category=null;const ci=rest.findIndex(t=>CATS.some(c=>c.toLowerCase()===t.toLowerCase()));
  if(ci>=0){category=CATS.find(c=>c.toLowerCase()===rest[ci].toLowerCase());rest.splice(ci,1)}
  if(!category)category=Object.keys(KEYWORDS).find(c=>rest.some(t=>KEYWORDS[c].split(' ').includes(t.toLowerCase())))||'Other';
  let title=rest.join(' ');title=title?title[0].toUpperCase()+title.slice(1):category;
  return{title,amount,category,paymentMethod:payment,date:today(),description:''}}
async function quickAdd(){const p=parseQuick(byId('quickInput').value);if(!p){notify('Type like: chai 20');return}
  try{await request(api,{method:'POST',body:JSON.stringify(p)});byId('quickInput').value='';notify(`Added ${p.title} · ${money(p.amount)} · ${p.category}`);await loadExpenses()}catch(e){notify(e.message)}}
byId('quickBtn').onclick=quickAdd;byId('quickInput').addEventListener('keydown',e=>{if(e.key==='Enter')quickAdd()});

// ---------- modal / CRUD ----------
function openModal(item){form.reset();byId('expenseId').value=item?.id||'';byId('modalTitle').textContent=item?'Edit expense':'Add expense';byId('title').value=item?.title||'';byId('amount').value=item?.amount??'';byId('category').value=item?.category||'';byId('date').value=item?.date||today();byId('paymentMethod').value=item?.paymentMethod||'UPI';byId('description').value=item?.description||'';modal.hidden=false}
function closeModal(){modal.hidden=true}
byId('addTop').onclick=()=>openModal();byId('closeModal').onclick=closeModal;byId('cancelModal').onclick=closeModal;
modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});
['searchInput','categoryFilter','rangeFilter','fromDate','toDate'].forEach(id=>byId(id).addEventListener(id==='searchInput'?'input':'change',()=>{byId('customRange').hidden=byId('rangeFilter').value!=='custom';render()}));
byId('expenseRows').addEventListener('click',async e=>{const ed=e.target.dataset.edit,rm=e.target.dataset.delete;
  if(ed){const i=expenses.find(x=>x.id===Number(ed));if(i)openModal(i)}
  if(rm&&confirm('Delete this expense?')){try{await request(`${api}/${rm}`,{method:'DELETE'});notify('Expense deleted');await loadExpenses()}catch(err){notify(err.message)}}});
form.addEventListener('submit',async e=>{e.preventDefault();const id=byId('expenseId').value;
  const payload={title:byId('title').value.trim(),amount:Number(byId('amount').value),category:byId('category').value,date:byId('date').value,paymentMethod:byId('paymentMethod').value,description:byId('description').value.trim()};
  try{await request(id?`${api}/${id}`:api,{method:id?'PUT':'POST',body:JSON.stringify(payload)});closeModal();notify(id?'Expense updated':'Expense added');await loadExpenses()}catch(err){notify(err.message)}});

// ---------- Phase 2: streak ----------
function renderStreak(){
  const days=new Set(expenses.map(i=>String(i.date)));let n=0,d=new Date();
  const done=days.has(today());if(!done)d.setDate(d.getDate()-1);
  while(days.has(localISO(d))){n++;d.setDate(d.getDate()-1)}
  const sorted=[...days].sort();let best=0,run=0,prev=null;
  sorted.forEach(x=>{const t=Date.parse(x+'T00:00:00Z');run=(prev!==null&&t-prev===864e5)?run+1:1;prev=t;best=Math.max(best,run)});
  byId('streakNum').textContent=n;byId('streakLabel').textContent='day streak';
  byId('streakText').textContent=(done?'Aaj ki entry ho gayi.':'Aaj abhi tak koi entry nahi. Streak bachane ke liye expense add karo.')+` Best streak: ${best} din.`}

// ---------- Phase 2: insights ----------
function renderInsights(){
  const t=today(),cm=t.slice(0,7),pd=new Date();pd.setDate(1);pd.setMonth(pd.getMonth()-1);const pm=localISO(pd).slice(0,7);
  const inM=m=>expenses.filter(i=>String(i.date).slice(0,7)===m);
  const sum=l=>l.reduce((s,i)=>s+Number(i.amount),0);
  const grp=l=>l.reduce((o,i)=>(o[i.category]=(o[i.category]||0)+Number(i.amount),o),{});
  const cur=inM(cm),prev=inM(pm),ct=sum(cur),pt=sum(prev),out=[],add=(t,h)=>out.push({t,h});
  if(!cur.length)add('info','Is mahine abhi koi expense nahi hai. Pehla expense add karo, insights yahin dikhenge.');
  else{
    const g=grp(cur),pg=grp(prev),top=Object.keys(g).sort((a,b)=>g[b]-g[a])[0];
    add('info',`Is mahine sabse zyada kharch <b>${safe(top)}</b> pe hua: ${money(g[top])} (${(g[top]/ct*100).toFixed(0)}%).`);
    if(pt>0){const df=(ct-pt)/pt*100;add(df>=0?'warn':'good',df>=0?`Pichhle mahine se <b>${df.toFixed(0)}% zyada</b> kharch hua.`:`Pichhle mahine se <b>${Math.abs(df).toFixed(0)}% kam</b> kharch hua. Badhiya!`)}
    let worst=null,wp=0;Object.keys(g).forEach(c=>{if(pg[c]>0){const p=(g[c]-pg[c])/pg[c]*100;if(p>=20&&p>wp){wp=p;worst=c}}});
    if(worst)add('warn',`<b>${safe(worst)}</b> pe pichhle mahine se ${wp.toFixed(0)}% zyada kharch hua.`);
    const now=new Date(),dim=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),proj=ct/now.getDate()*dim,b=getBudget();
    if(b)add(proj>b?'bad':'good',proj>b?`Is raftaar se mahine ke end tak ~${money(proj)} ho jayega, budget ${money(b)} se zyada.`:`Is raftaar se mahine ke end tak ~${money(proj)}. Budget ke andar ho.`);else add('info',`Is raftaar se mahine ke end tak ~${money(proj)} kharch hoga.`);
    const big=cur.reduce((a,x)=>Number(x.amount)>Number(a.amount)?x:a);add('info',`Sabse bada kharch: ${safe(big.title)} (${money(big.amount)}).`)}
  const st=subs.reduce((s,x)=>s+x.amount,0);if(st>0)add('info',`Subscriptions pe har mahine ${money(st)} jaate hain.`);
  byId('insightList').innerHTML=out.slice(0,6).map(x=>`<li class="ins ${x.t}">${x.h}</li>`).join('')}

// ---------- Phase 2: subscriptions & goals ----------
let subs=[],goals=[];
function nextRenewal(day){const n=new Date(),t0=new Date(n.getFullYear(),n.getMonth(),n.getDate()),last=(y,m)=>new Date(y,m+1,0).getDate();
  let m=n.getMonth(),dt=new Date(n.getFullYear(),m,Math.min(day,last(n.getFullYear(),m)));
  if(dt<t0){m++;dt=new Date(n.getFullYear(),m,Math.min(day,last(n.getFullYear(),m)))}return Math.round((dt-t0)/864e5)}
function renderSubs(){
  byId('subTotal').textContent=subs.length?`${money(subs.reduce((s,x)=>s+x.amount,0))} / month`:'';
  byId('subList').innerHTML=subs.length?subs.map(x=>{const d=nextRenewal(x.billingDay);return`<li><div><strong>${safe(x.name)}</strong><small>${money(x.amount)} · renews ${d===0?'aaj':d===1?'kal':d+' din mein'} (${x.billingDay} tareekh)</small></div><button class="link-btn del" data-sdel="${x.id}">Remove</button></li>`}).join(''):'<li><small>Koi subscription nahi. Netflix, Spotify jaise add karo.</small></li>';
  renderInsights()}
function renderGoals(){
  byId('goalList').innerHTML=goals.length?goals.map(x=>{const p=Math.min(x.savedAmount/x.targetAmount*100,100);return`<li class="goal-item"><div class="goal-top"><div><strong>${safe(x.name)}</strong><small>${money(x.savedAmount)} of ${money(x.targetAmount)} (${p.toFixed(0)}%)</small></div><div><button class="link-btn" data-gsave="${x.id}">+ Add savings</button><button class="link-btn del" data-gdel="${x.id}">Remove</button></div></div><div class="progress"><div class="progress-bar${p>=100?' done':''}" style="width:${p}%"></div></div></li>`}).join(''):'<li><small>Koi goal nahi. Jaise "iPhone" ya "Trip" add karo.</small></li>'}
async function loadExtras(){try{subs=await request('/api/subscriptions');goals=await request('/api/goals');renderSubs();renderGoals()}catch(e){notify('Subscriptions/goals load nahi hue. Backend restart karo.')}}
byId('subAdd').onclick=async()=>{try{await request('/api/subscriptions',{method:'POST',body:JSON.stringify({name:byId('subName').value.trim(),amount:Number(byId('subAmount').value),billingDay:Number(byId('subDay').value)})});['subName','subAmount','subDay'].forEach(i=>byId(i).value='');notify('Subscription added');await loadExtras()}catch(e){notify(e.message)}};
byId('goalAdd').onclick=async()=>{try{await request('/api/goals',{method:'POST',body:JSON.stringify({name:byId('goalName').value.trim(),targetAmount:Number(byId('goalTarget').value),savedAmount:0})});['goalName','goalTarget'].forEach(i=>byId(i).value='');notify('Goal added');await loadExtras()}catch(e){notify(e.message)}};
byId('subList').addEventListener('click',async e=>{const id=e.target.dataset.sdel;if(id&&confirm('Remove this subscription?')){try{await request('/api/subscriptions/'+id,{method:'DELETE'});await loadExtras()}catch(err){notify(err.message)}}});
byId('goalList').addEventListener('click',async e=>{const del=e.target.dataset.gdel,sv=e.target.dataset.gsave;
  if(del&&confirm('Remove this goal?')){try{await request('/api/goals/'+del,{method:'DELETE'});await loadExtras()}catch(err){notify(err.message)}}
  if(sv){const g=goals.find(x=>x.id===Number(sv)),v=Number(prompt('Kitne rupay save kiye? (₹)'));if(!(v>0))return;try{await request('/api/goals/'+sv,{method:'PUT',body:JSON.stringify({...g,savedAmount:g.savedAmount+v})});notify('Savings added');await loadExtras()}catch(err){notify(err.message)}}});

// ---------- account: logout / change password ----------
byId('logoutBtn').onclick=()=>{fetch('/api/auth/logout',{method:'POST'}).finally(()=>{location.href='/login.html'})};
const pwBackdrop=byId('pwBackdrop');
function pwError(m){const b=byId('pwError');b.textContent=m||'';b.hidden=!m}
function closePw(){pwBackdrop.hidden=true}
byId('pwBtn').onclick=()=>{byId('pwForm').reset();pwError('');pwBackdrop.hidden=false;byId('curPw').focus()};
byId('closePw').onclick=closePw;byId('cancelPw').onclick=closePw;
pwBackdrop.addEventListener('click',e=>{if(e.target===pwBackdrop)closePw()});
byId('pwForm').addEventListener('submit',async e=>{e.preventDefault();pwError('');
  const cur=byId('curPw').value,n1=byId('newPw').value,n2=byId('newPw2').value;
  if(n1.length<6){pwError('New password must be at least 6 characters');return}
  if(n1!==n2){pwError('The two new passwords do not match');return}
  try{await request('/api/auth/password',{method:'POST',body:JSON.stringify({currentPassword:cur,newPassword:n1})});closePw();notify('Password updated')}catch(err){pwError(err.message)}});

// ---------- init ----------
async function init(){
  setTheme(document.documentElement.dataset.theme||'light');
  try{me=await request('/api/auth/me')}catch(e){return}
  byId('profName').textContent=me.fullName;
  byId('profRole').textContent=me.role==='ADMIN'?'Administrator':'Personal workspace';
  byId('avatar').textContent=me.fullName.split(/\s+/).map(w=>w[0]).join('').slice(0,2).toUpperCase();
  byId('subheading').textContent=`Welcome back, ${me.fullName.split(' ')[0]}. Track your spending, one day at a time.`;
  if(me.role==='ADMIN'){byId('adminNav').hidden=false;byId('adminLinkM').hidden=false}
  await Promise.all([loadExpenses(),loadExtras()]);
}
init();
