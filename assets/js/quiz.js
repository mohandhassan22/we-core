const SUPABASE_URL = 'https://iygwhapcpdmsasqlfelv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rD9naqrpu1dI-iwchAS0GQ_JkgGysqP';
const params = new URLSearchParams(location.search);
const MODULE = params.get('module') || '', TOPIC = params.get('topic') || '';
const root = document.getElementById('quizRoot');
const backUrl = `trainer.html?module=${encodeURIComponent(MODULE)}&topic=${encodeURIComponent(TOPIC)}`;
document.getElementById('backLink').href = backUrl;
let state = { attemptId: null, questions: [], answers: [], index: 0, pass: 80, busy: false };

function cookie(name){const hit=document.cookie.split('; ').find(x=>x.startsWith(name+'='));return hit?decodeURIComponent(hit.split('=').slice(1).join('=')):''}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
async function call(body){
  const token = cookie('sb-access-token');
  if(!token){location.href='login.html';throw new Error('no_session')}
  const res = await fetch(`${SUPABASE_URL}/functions/v1/trainer-ai`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`,apikey:SUPABASE_KEY},body:JSON.stringify(body)});
  const data = await res.json().catch(()=>({}));
  if(res.status===401){location.href='login.html';throw new Error('unauthorized')}
  if(!res.ok){const e=new Error(data.message||data.error||'failed');e.code=data.error;e.status=res.status;throw e}
  return data;
}
function message(title,text,retry=false){
  root.innerHTML=`<div class="quiz-msg"><h2>${esc(title)}</h2><p>${esc(text)}</p><p>${retry?'<button class="primary-button" id="retryBtn" type="button">حاول تاني</button> &nbsp;':''}<a href="${backUrl}">← رجوع للتدريب</a></p></div>`;
  const b=document.getElementById('retryBtn'); if(b) b.onclick=start;
}
async function start(){
  root.innerHTML='<div class="quiz-msg"><div class="loader"></div><p>بنجهّز 10 أسئلة جديدة ليك بالذكاء الاصطناعي… ممكن ياخد لحظات.</p></div>';
  if(!MODULE||!TOPIC){message('رابط غير صحيح','ارجع لصفحة التدريب واختار موضوع.');return}
  try{
    const d = await call({action:'start_quiz',module:MODULE,topic:TOPIC});
    state={attemptId:d.attempt_id,questions:d.questions,answers:new Array(d.questions.length).fill(-1),index:0,pass:d.pass_percent||80,busy:false,title:d.topic,moduleTitle:d.module};
    render();
  }catch(e){
    if(e.code==='locked') message('اليوم ده مقفول 🔒',e.message||'لازم تخلص اليوم اللي قبله الأول.');
    else if(e.code==='rate_limited') message('محاولات كتير','استنى شوية وحاول تاني.',true);
    else if(e.code==='topic_not_found'||e.code==='module_not_found') message('الموضوع مش متاح','ارجع للتدريب واختار موضوع تاني.');
    else message('تعذر تجهيز الأسئلة','حصلت مشكلة مؤقتة في توليد الأسئلة. جرّب مرة تانية.',true);
  }
}
function render(){
  const q=state.questions[state.index],n=state.questions.length,answered=state.answers.filter(x=>x>=0).length;
  const last=state.index===n-1;
  root.innerHTML=`<div class="quiz-head"><p class="eyebrow">${esc(state.moduleTitle||'')}</p><h1>اختبار: ${esc(state.title)}</h1><small class="muted">النجاح من ${state.pass}% · الإجابات بتظهر بعد التسليم</small><div class="q-progress"><i style="width:${Math.round(answered*100/n)}%"></i></div><small class="muted">${answered} من ${n} تمت الإجابة</small></div>
  <div class="q-dots">${state.questions.map((_,i)=>`<button type="button" class="q-dot ${state.answers[i]>=0?'answered':''} ${i===state.index?'current':''}" data-i="${i}">${i+1}</button>`).join('')}</div>
  <div class="q-card"><p class="eyebrow">سؤال ${state.index+1} من ${n}</p><h2>${esc(q.q)}</h2>${q.o.map((o,i)=>`<button type="button" class="q-opt ${state.answers[state.index]===i?'selected':''}" data-o="${i}"><span>${String.fromCharCode(65+i)}</span>${esc(o)}</button>`).join('')}
  <div class="q-nav"><button class="secondary-button" type="button" id="prevBtn" ${state.index===0?'disabled':''}>السابق</button>${last?`<button class="primary-button" type="button" id="submitBtn" ${answered<n?'disabled':''}>${answered<n?`فاضل ${n-answered} سؤال`:'تسليم الإجابات'}</button>`:`<button class="primary-button" type="button" id="nextBtn">التالي</button>`}</div></div>`;
  root.querySelectorAll('[data-o]').forEach(b=>b.onclick=()=>{state.answers[state.index]=Number(b.dataset.o);render()});
  root.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{state.index=Number(b.dataset.i);render()});
  const p=document.getElementById('prevBtn');if(p)p.onclick=()=>{state.index--;render()};
  const nx=document.getElementById('nextBtn');if(nx)nx.onclick=()=>{state.index++;render()};
  const sb=document.getElementById('submitBtn');if(sb)sb.onclick=submit;
}
async function submit(){
  if(state.busy)return;state.busy=true;
  const btn=document.getElementById('submitBtn');if(btn){btn.disabled=true;btn.textContent='بنصحح…'}
  try{
    const r=await call({action:'submit_quiz',attempt_id:state.attemptId,answers:state.answers});
    showResult(r);
  }catch(e){
    state.busy=false;
    if(e.code==='already_submitted'||e.code==='attempt_expired'||e.code==='attempt_not_found') message('المحاولة دي انتهت','ابدأ محاولة جديدة بأسئلة جديدة.',true);
    else {alert('تعذر تسليم الإجابات، جرّب تاني.');render()}
  }
}
function showResult(r){
  const rev=r.review.map((x,i)=>`<article class="rev ${x.ok?'good':'bad'}"><h3>${i+1}. ${esc(x.q)}</h3><ul>${x.o.map((o,k)=>`<li class="${k===x.correct_index?'ok':(k===x.chosen?'no':'')}">${String.fromCharCode(65+k)}. ${esc(o)}${k===x.correct_index?' ✓ الإجابة الصحيحة':(k===x.chosen?' ✗ إجابتك':'')}</li>`).join('')}</ul>${x.explanation?`<p>${esc(x.explanation)}</p>`:''}</article>`).join('');
  root.innerHTML=`<div class="q-result ${r.passed?'pass':''}"><div class="big">${r.percent}%</div><h2>${r.passed?'ممتاز! عديت الاختبار ✓':'لسه ما وصلتش لـ '+r.pass_percent+'%'}</h2><p>${r.score} من ${r.total} إجابات صحيحة.${r.passed?(r.module_completed?' خلّصت كل اختبارات اليوم، واليوم التالي اتفتح 🎉':' كمّل باقي مواضيع اليوم لفتح اليوم التالي.'):' راجع الإجابات تحت وجرّب تاني بأسئلة جديدة.'}</p><div class="actions"><a class="primary-button" href="${backUrl}"><span>رجوع للتدريب</span></a>${r.passed?'':'<button class="secondary-button" type="button" id="againBtn">أسئلة جديدة</button>'}</div></div><h3>مراجعة الإجابات</h3>${rev}`;
  const a=document.getElementById('againBtn');if(a)a.onclick=start;
  window.scrollTo({top:0,behavior:'smooth'});
}
start();
