const API_URL = 'http://127.0.0.1:5000/api';
let currentUser = JSON.parse(sessionStorage.getItem('dziennik_session') || 'null');
let testTimerInterval = null, toastInst = null;
let allUsers = [], allCodes = [], allGrades = [], allAttendance = [], allTimetable = [], allTests = [], allSubmissions = [], allMessages = [];

function showToast(msg, isErr=false) {
  const el = document.getElementById('toast');
  if(!el) return;
  document.getElementById('toastBody').textContent = msg;
  el.className = `toast align-items-center border-0 ${isErr ? 'text-bg-danger' : 'text-bg-dark'}`;
  if(!toastInst) toastInst = new bootstrap.Toast(el);
  toastInst.show();
}

function calcAvg(studentId) {
  const g = allGrades.filter(x => x.studentId === studentId);
  if(!g.length) return 'Brak';
  const sum = g.reduce((acc, curr) => acc + parseFloat(curr.value || 0), 0);
  return (sum / g.length).toFixed(2);
}

const authTabs = document.querySelectorAll('#authTabs .nav-link');
if(authTabs) {
  authTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      authTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const tab = btn.dataset.tab;
      document.getElementById('loginForm').classList.toggle('d-none', tab !== 'login');
      document.getElementById('registerForm').classList.toggle('d-none', tab !== 'register');
    });
  });
}

async function doLogin() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;
  const err = document.getElementById('loginError');
  err.classList.add('d-none');
  
  try {
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if(res.ok && data.status === 'ok') {
      currentUser = data.user;
      sessionStorage.setItem('dziennik_session', JSON.stringify(currentUser));
      await loadAllData();
      initApp();
    } else {
      err.textContent = data.message || 'Błędny login lub hasło';
      err.classList.remove('d-none');
    }
  } catch(e) {
    err.textContent = 'Błąd połączenia z serwerem Flask!';
    err.classList.remove('d-none');
  }
}

async function doRegister() {
  const fn = document.getElementById('regFirstName').value.trim();
  const ln = document.getElementById('regLastName').value.trim();
  const un = document.getElementById('regUsername').value.trim();
  const pw = document.getElementById('regPassword').value;
  const sw = document.getElementById('regSecretWord').value.trim();
  const vc = document.getElementById('regVerificationCode').value.trim();
  const err = document.getElementById('regError'); 
  const succ = document.getElementById('regSuccess');
  err.classList.add('d-none'); succ.classList.add('d-none');
  
  if(!fn||!ln||!un||!pw||!sw||vc.length!==6) { 
    err.textContent='Wypełnij pola i 6-cyfrowy kod!'; 
    err.classList.remove('d-none'); 
    return; 
  }
  
  try {
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ firstName: fn, lastName: ln, username: un, password: pw, secretWord: sw, code: vc })
    });
    const data = await res.json();
    if(res.ok && data.status === 'ok') {
      succ.textContent='Konto założone! Możesz się zalogować.';
      succ.classList.remove('d-none');
    } else {
      err.textContent = data.message || 'Błąd rejestracji';
      err.classList.remove('d-none');
    }
  } catch(e) {
    err.textContent = 'Błąd połączenia z serwerem!';
    err.classList.remove('d-none');
  }
}

function doLogout() { 
  if(testTimerInterval) clearInterval(testTimerInterval); 
  currentUser=null; 
  sessionStorage.removeItem('dziennik_session'); 
  location.reload(); 
}

async function loadAllData() {
  try {
    const [uRes, cRes, gRes, aRes, ttRes, tRes, subRes, mRes] = await Promise.all([
      fetch(`${API_URL}/users`),
      fetch(`${API_URL}/codes`),
      fetch(`${API_URL}/grades`),
      fetch(`${API_URL}/attendance`),
      fetch(`${API_URL}/timetable`),
      fetch(`${API_URL}/tests`),
      fetch(`${API_URL}/submissions`),
      fetch(`${API_URL}/messages`)
    ]);
    allUsers = await uRes.json();
    allCodes = await cRes.json();
    allGrades = await gRes.json();
    allAttendance = await aRes.json();
    allTimetable = await ttRes.json();
    allTests = await tRes.json();
    allSubmissions = await subRes.json();
    allMessages = await mRes.json();
  } catch(e) {
    console.error('Błąd pobierania danych:', e);
  }
}

function initApp() {
  if(!currentUser) { 
    document.getElementById('auth').style.display='block'; 
    document.getElementById('app').style.display='none'; 
    return; 
  }
  document.getElementById('auth').style.display='none'; 
  document.getElementById('app').style.display='block';
  document.getElementById('userInfo').innerHTML = `<span class="role-badge ${currentUser.role==='teacher'?'bg-warning text-dark':'bg-info'}">${currentUser.role==='teacher'?'Nauczyciel':'Uczeń'}</span> ${currentUser.firstName} ${currentUser.lastName}`;
  buildNav(); 
  router(currentUser.role==='teacher'?'dash':'s_dash');
}

function buildNav() {
  const nav = document.getElementById('sideNav');
  if(!nav) return;
  if(currentUser.role==='teacher') {
    nav.innerHTML = `
      <a class="nav-link active" href="#" data-v="dash"><i class="bi bi-speedometer2"></i> Panel główny</a>
      <a class="nav-link" href="#" data-v="codes"><i class="bi bi-key"></i> Kody weryfikacyjne</a>
      <a class="nav-link" href="#" data-v="students"><i class="bi bi-people"></i> Uczniowie & Średnie</a>
      <a class="nav-link" href="#" data-v="grades"><i class="bi bi-star"></i> Oceny</a>
      <a class="nav-link" href="#" data-v="attendance"><i class="bi bi-calendar-check"></i> Frekwencja</a>
      <a class="nav-link" href="#" data-v="timetable"><i class="bi bi-calendar3"></i> Plan lekcji</a>
      <a class="nav-link" href="#" data-v="tests"><i class="bi bi-stopwatch"></i> Testy czasowe</a>
      <a class="nav-link" href="#" data-v="chat"><i class="bi bi-chat-dots"></i> Komunikator</a>
    `;
  } else {
    nav.innerHTML = `
      <a class="nav-link active" href="#" data-v="s_dash"><i class="bi bi-speedometer2"></i> Mój panel</a>
      <a class="nav-link" href="#" data-v="s_grades"><i class="bi bi-star"></i> Moje oceny</a>
      <a class="nav-link" href="#" data-v="s_attendance"><i class="bi bi-calendar-check"></i> Frekwencja</a>
      <a class="nav-link" href="#" data-v="s_timetable"><i class="bi bi-calendar3"></i> Plan lekcji</a>
      <a class="nav-link" href="#" data-v="s_tests"><i class="bi bi-stopwatch"></i> Testy czasowe</a>
      <a class="nav-link" href="#" data-v="s_chat"><i class="bi bi-chat-dots"></i> Komunikator</a>
    `;
  }
  nav.querySelectorAll('.nav-link').forEach(l => l.addEventListener('click', e => {
    e.preventDefault(); 
    nav.querySelectorAll('.nav-link').forEach(x=>x.classList.remove('active')); 
    l.classList.add('active'); 
    router(l.dataset.v);
  }));
}

async function router(view) {
  if(testTimerInterval) clearInterval(testTimerInterval);
  await loadAllData();
  const c = document.getElementById('content');
  const students = allUsers.filter(u=>u.role==='student');

  if(view==='dash') {
    c.innerHTML = `
      <h4>Panel Nauczyciela</h4>
      <div class="row g-3 mb-4">
        <div class="col-md-3"><div class="card p-3 bg-light"><h6>Uczniowie</h6><h3>${students.length}</h3></div></div>
        <div class="col-md-3"><div class="card p-3 bg-light"><h6>Wolne kody</h6><h3>${allCodes.filter(x=>!x.used).length}</h3></div></div>
        <div class="col-md-3"><div class="card p-3 bg-light"><h6>Aktywne testy</h6><h3>${allTests.length}</h3></div></div>
        <div class="col-md-3"><div class="card p-3 bg-light"><h6>Wpisy ocen</h6><h3>${allGrades.length}</h3></div></div>
      </div>`;
  } else if(view==='codes') {
    window.genCode = async () => { 
      await fetch(`${API_URL}/codes`, { method: 'POST' }); 
      showToast('Wygenerowano 6-cyfrowy kod'); 
      router('codes'); 
    };
    c.innerHTML = `
      <h4>Zarządzanie 6-cyfrowymi kodami</h4>
      <button class="btn btn-primary mb-3" onclick="genCode()">Generuj nowy kod weryfikacyjny</button>
      <div class="table-responsive"><table class="table table-bordered bg-white"><thead><tr><th>Kod</th><th>Status</th><th>Zużyty przez</th></tr></thead><tbody>
      ${allCodes.map(x=>`<tr><td><span class="code-display">${x.code}</span></td><td>${x.used?'<span class="badge bg-secondary">Zużyty</span>':'<span class="badge bg-success">Wolny</span>'}</td><td>${x.usedBy||'-'}</td></tr>`).join('')}
      </tbody></table></div>`;
  } else if(view==='students') {
    c.innerHTML = `
      <h4>Lista uczniów i średnie</h4>
      <div class="table-responsive"><table class="table table-striped bg-white"><thead><tr><th>Imię i nazwisko</th><th>Login</th><th>Średnia ocen</th></tr></thead><tbody>
      ${students.map(u=>`<tr><td>${u.firstName} ${u.lastName}</td><td>${u.username}</td><td><strong>${calcAvg(u.id)}</strong></td></tr>`).join('')}
      </tbody></table></div>`;
  } else if(view==='grades') {
    window.addGrade = async () => {
      const val = prompt('Wpisz ocenę (1, 1+, 2, 3, 4, 5, 5+, 6):');
      const stId = document.getElementById('gStudent')?.value;
      const sub = document.getElementById('gSubject')?.value || 'Matematyka';
      if(val && stId) { 
        await fetch(`${API_URL}/grades`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({studentId: stId, value: val, subject: sub})
        }); 
        showToast('Dodano ocenę'); 
        router('grades'); 
      }
    };
    c.innerHTML = `
      <h4>Wystawianie ocen</h4>
      <div class="mb-4 d-flex gap-2 flex-wrap">
        <select class="form-select w-auto" id="gStudent">${students.map(s=>`<option value="${s.id}">${s.firstName} ${s.lastName}</option>`).join('')}</select>
        <input type="text" id="gSubject" class="form-control w-auto" placeholder="Przedmiot" value="Matematyka">
        <button class="btn btn-primary" onclick="addGrade()">Dodaj ocenę</button>
      </div>
      <div class="table-responsive"><table class="table table-bordered bg-white"><thead><tr><th>Uczeń</th><th>Przedmiot</th><th>Ocena</th></tr></thead><tbody>
      ${allGrades.map(g=>{ const st=students.find(s=>s.id===g.studentId); return `<tr><td>${st?st.firstName+' '+st.lastName:'Uczeń'}</td><td>${g.subject}</td><td><span class="grade-badge">${g.value}</span></td></tr>`; }).join('')}
      </tbody></table></div>`;
  } else if(view==='attendance') {
    window.saveAtt = async () => {
      const stId = document.getElementById('attStudent').value;
      const status = document.getElementById('attStatus').value;
      await fetch(`${API_URL}/attendance`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({studentId: stId, status, date: new Date().toLocaleDateString()})
      });
      showToast('Zapisano frekwencję'); 
      router('attendance');
    };
    c.innerHTML = `
      <h4>Frekwencja</h4>
      <div class="mb-4 d-flex gap-2 flex-wrap">
        <select class="form-select w-auto" id="attStudent">${students.map(s=>`<option value="${s.id}">${s.firstName} ${s.lastName}</option>`).join('')}</select>
        <select class="form-select w-auto" id="attStatus"><option value="obecny">Obecny</option><option value="nieobecny">Nieobecny</option><option value="spóźniony">Spóźniony</option></select>
        <button class="btn btn-primary" onclick="saveAtt()">Zapisz frekwencję</button>
      </div>
      <ul>${allAttendance.map(a=>{ const st=students.find(s=>s.id===a.studentId); return `<li>${a.date}: ${st?st.firstName+' '+st.lastName:''}: <span class="badge badge-${a.status}">${a.status}</span></li>`; }).join('')}</ul>`;
  } else if(view==='timetable' || view==='s_timetable') {
    window.addTt = currentUser.role==='teacher' ? async () => {
      const day = prompt('Dzień (np. Poniedziałek):'); const hour = prompt('Godzina (np. 9:45):'); const sub = prompt('Przedmiot:');
      if(day && hour && sub) { 
        await fetch(`${API_URL}/timetable`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({day, hour, subject: sub, className:'1A'})
        }); 
        showToast('Dodano lekcję'); 
        router(view); 
      }
    } : null;
    c.innerHTML = `
      <h4>Plan lekcji</h4>
      ${currentUser.role==='teacher'?`<button class="btn btn-primary mb-3" onclick="addTt()">Dodaj wpis planu</button>`:''}
      <table class="table table-bordered bg-white"><thead><tr><th>Dzień</th><th>Godzina</th><th>Przedmiot</th><th>Klasa</th></tr></thead><tbody>
      ${allTimetable.map(t=>`<tr><td>${t.day}</td><td>${t.hour}</td><td>${t.subject}</td><td>${t.className}</td></tr>`).join('')}
      </tbody></table>`;
  } else if(view==='tests') {
    window.createTest = async () => {
      const title = prompt('Tytuł testu:'); const timeSec = parseInt(prompt('Limit sekund (np. 60):')||'60'); const q = prompt('Pytanie:'); const ans = prompt('Poprawna odpowiedź:');
      if(title && q && ans) { 
        await fetch(`${API_URL}/tests`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({title, timeSec, q, ans})
        }); 
        showToast('Utworzono test'); 
        router('tests'); 
      }
    };
    c.innerHTML = `
      <h4>Testy czasowe</h4>
      <button class="btn btn-primary mb-3" onclick="createTest()">Utwórz test czasowy</button>
      ${allTests.map(t=>`<div class="card p-3 mb-2"><h5>${t.title}</h5><p>${t.q}</p><small class="text-muted">Limit: ${t.timeSec}s | Wyniki: ${allSubmissions.filter(s=>s.testId===t.id).length} oddanych</small></div>`).join('')}`;
  } else if(view==='chat' || view==='s_chat') {
    window.sendChatMsg = async () => {
      const inp = document.getElementById('chatInput'); if(!inp.value.trim()) return;
      await fetch(`${API_URL}/messages`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sender: currentUser.firstName+' '+currentUser.lastName, text: inp.value, time: new Date().toLocaleTimeString()})
      });
      inp.value=''; 
      router(currentUser.role==='teacher'?'chat':'s_chat');
    };
    c.innerHTML = `
      <h4>Komunikator szkolny</h4>
      <div class="chat-box mb-2" id="chatArea">${allMessages.map(m=>`<div><strong>${m.sender}</strong> [${m.time}]: ${m.text}</div>`).join('')||'Brak wiadomości'}</div>
      <div class="input-group"><input type="text" id="chatInput" class="form-control" placeholder="Napisz wiadomość..."><button class="btn btn-primary" onclick="sendChatMsg()">Wyślij</button></div>`;
  } else if(view==='s_dash') {
    c.innerHTML = `<h4>Witaj, ${currentUser.firstName}!</h4><p>Twoje konto ucznia jest zweryfikowane. Średnia ocen: <strong>${calcAvg(currentUser.id)}</strong></p>`;
  } else if(view==='s_grades') {
    const myGrades = allGrades.filter(g=>g.studentId===currentUser.id);
    c.innerHTML = `<h4>Moje oceny (Średnia: ${calcAvg(currentUser.id)})</h4><div class="d-flex gap-2 flex-wrap">${myGrades.map(g=>`<span class="grade-badge" title="${g.subject}">${g.value}</span>`).join('')||'<p class="text-muted">Brak ocen</p>'}</div>`;
  } else if(view==='s_attendance') {
    const myAtt = allAttendance.filter(a=>a.studentId===currentUser.id);
    c.innerHTML = `<h4>Moje frekwencje</h4><ul>${myAtt.map(a=>`<li>${a.date}: <span class="badge badge-${a.status}">${a.status}</span></li>`).join('')||'Brak wpisów'}</ul>`;
  } else if(view==='s_tests') {
    window.startStudentTest = (tId) => {
      const t = allTests.find(x=>x.id===tId); if(!t) return;
      let remaining = t.timeSec;
      c.innerHTML = `
        <h4>Test: ${t.title}</h4>
        <div id="testTimer" class="timer-alert mb-3">Pozostało: ${remaining}s</div>
        <p><strong>Pytanie:</strong> ${t.q}</p>
        <input type="text" id="studentAns" class="form-control mb-3" placeholder="Twoja odpowiedź">
        <button class="btn btn-success" onclick="submitStudentTest('${tId}')">Oddaj test</button>`;
      testTimerInterval = setInterval(()=>{
        remaining--;
        const el = document.getElementById('testTimer');
        if(el) el.textContent = `Pozostało: ${remaining}s`;
        if(remaining<=0) { clearInterval(testTimerInterval); submitStudentTest(tId, true); }
      }, 1000);
    };
    window.submitStudentTest = async (tId, auto=false) => {
      if(testTimerInterval) clearInterval(testTimerInterval);
      const t = allTests.find(x=>x.id===tId);
      const ans = document.getElementById('studentAns')?.value || '';
      const ok = t && ans.trim().toLowerCase() === t.ans.trim().toLowerCase();
      await fetch(`${API_URL}/submissions`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({testId: tId, studentId: currentUser.id, ok, auto})
      });
      showToast(auto?'Czas minął! Automatycznie oddano.':(ok?'Poprawnie!':'Błędna odpowiedź')); 
      router('s_tests');
    };
    c.innerHTML = `<h4>Testy czasowe</h4>${allTests.map(t=>`<div class="card p-3 mb-2"><h5>${t.title}</h5><button class="btn btn-primary btn-sm" onclick="startStudentTest('${t.id}')">Rozpocznij test</button></div>`).join('')||'<p>Brak testów</p>'}`;
  }
}

if(currentUser) {
  loadAllData().then(() => initApp());
} else {
  document.getElementById('auth').style.display='block';
}
  
