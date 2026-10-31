// Change this if your FastAPI server runs somewhere else
const API_URL = 'https://credit-card-risk-o0wj.onrender.com/predict';

const $ = (id) => document.getElementById(id);
const form = $('form');
const result = $('result');
const field = (name) => form.querySelector(`[name="${name}"]`);
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Dark mode ---------- */
const root = document.documentElement;
function setTheme(theme) {
  root.dataset.theme = theme;
  try { localStorage.setItem('theme', theme); } catch (e) {}
  $('theme').querySelector('md-icon').textContent = theme === 'dark' ? 'light_mode' : 'dark_mode';
}
setTheme(root.dataset.theme);
$('theme').addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));

/* ---------- Auto-calculate loan share of income ---------- */
let pctEdited = false;
field('loan_percent_income').addEventListener('input', () => { pctEdited = true; });
function syncPct() {
  if (pctEdited) return;
  const income = parseFloat(field('person_income').value);
  const amount = parseFloat(field('loan_amnt').value);
  if (income > 0 && amount >= 0) field('loan_percent_income').value = (amount / income).toFixed(2);
}
['person_income', 'loan_amnt'].forEach((n) => field(n).addEventListener('input', syncPct));

/* ---------- Result panel ---------- */
const ICONS = { idle: 'hourglass_empty', loading: 'progress_activity', approved: 'check_circle', declined: 'cancel', error: 'cloud_off' };
function setState(state) {
  result.dataset.state = state;
  $('verdictIcon').textContent = ICONS[state];
}

let countRaf;
function animateGauge(percent) {
  $('arc').style.strokeDashoffset = 100 - percent;
  $('needle').style.transform = `rotate(${-90 + percent * 1.8}deg)`;
  cancelAnimationFrame(countRaf);
  const start = performance.now(), duration = reduceMotion ? 0 : 1600;
  const from = parseFloat($('pctNum').textContent) || 0;
  (function tick(now) {
    const t = duration ? Math.min((now - start) / duration, 1) : 1;
    const eased = 1 - Math.pow(1 - t, 3);
    $('pctNum').textContent = (from + (percent - from) * eased).toFixed(1);
    if (t < 1) countRaf = requestAnimationFrame(tick);
  })(start);
}

function showLoading() {
  setState('loading');
  $('vTitle').textContent = 'Analysing application…';
  $('vDetail').textContent = 'Running the credit risk model.';
  $('riskVal').textContent = $('safeVal').textContent = '–';
  animateGauge(0);
}

function showResult({ prediction, probability }) {
  const risk = probability[1] * 100;
  const safe = probability[0] * 100;
  const approved = Number(prediction) === 0; // 0 = low risk, 1 = high risk

  setState(approved ? 'approved' : 'declined');
  $('vTitle').textContent = approved ? 'Loan can be granted' : 'Loan can not be granted';
  $('vDetail').textContent = approved
    ? 'Low risk. The model expects this applicant to repay the loan.'
    : 'High risk. The model expects this applicant may default.';
  $('riskVal').textContent = risk.toFixed(1) + '%';
  $('safeVal').textContent = safe.toFixed(1) + '%';
  animateGauge(risk);

  if (approved) { setTimeout(confetti, 700); }
  else {
    if (!reduceMotion) setTimeout(() => result.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' },
       { transform: 'translateX(-9px)' }, { transform: 'translateX(9px)' }, { transform: 'translateX(0)' }],
      { duration: 600, easing: 'ease-in-out' }), 900);
  }
}

function showError(err) {
  setState('error');
  $('vTitle').textContent = 'Could not get a result';
  $('vDetail').textContent = `${err.message}. Check that the API is running at ${API_URL} and that CORS is enabled.`;
  animateGauge(0);
}

/* ---------- Submit ---------- */
async function handleSubmit() {
  let valid = true;
  form.querySelectorAll('[name]').forEach((el) => {
    if (typeof el.reportValidity === 'function' && !el.reportValidity()) valid = false;
  });
  if (!valid) return;

  const payload = {
    person_age: parseInt(field('person_age').value, 10),
    person_income: parseFloat(field('person_income').value),
    person_home_ownership: field('person_home_ownership').value,
    person_emp_length: parseFloat(field('person_emp_length').value),
    loan_intent: field('loan_intent').value,
    loan_grade: field('loan_grade').value,
    loan_amnt: parseFloat(field('loan_amnt').value),
    loan_int_rate: parseFloat(field('loan_int_rate').value),
    loan_percent_income: parseFloat(field('loan_percent_income').value),
    cb_person_default_on_file: $('prior_default').selected ? 'Y' : 'N',
  };

  $('submit').disabled = true;
  showLoading();
  if (window.innerWidth <= 900) result.scrollIntoView({ behavior: 'smooth', block: 'start' });

  try {
    const [res] = await Promise.all([
      fetch(API_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }),
      new Promise((r) => setTimeout(r, 900)), // short pause so the scanning animation is visible
    ]);
    if (!res.ok) throw new Error(`The API returned status ${res.status}`);
    showResult(await res.json());
  } catch (err) {
    showError(err instanceof TypeError ? new Error('Could not reach the API') : err);
  } finally {
    $('submit').disabled = false;
  }
}
$('submit').addEventListener('click', handleSubmit);
form.addEventListener('submit', (e) => { e.preventDefault(); handleSubmit(); });

/* ---------- Confetti for approved loans ---------- */
function confetti() {
  if (reduceMotion) return;
  const canvas = $('fx'), ctx = canvas.getContext('2d');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const box = result.getBoundingClientRect();
  const ox = box.left + box.width / 2, oy = Math.max(box.top + 140, 140);
  const colors = ['#d6008f', '#ff6fd0', '#f3c969', '#ffffff', '#1f9d63'];
  const bits = Array.from({ length: 150 }, () => ({
    x: ox, y: oy, vx: (Math.random() - .5) * 16, vy: -Math.random() * 15 - 4,
    w: 5 + Math.random() * 6, h: 3 + Math.random() * 4, a: Math.random() * 6, va: (Math.random() - .5) * .4,
    c: colors[(Math.random() * colors.length) | 0],
  }));
  let frames = 0;
  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bits.forEach((p) => {
      p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
    });
    if (++frames < 220) requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  })();
}
