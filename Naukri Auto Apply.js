/*
 * Naukri Auto-Apply Bot  (paste into DevTools Console)  -- v2: fixed Save/Submit clicking
 * ---------------------------------------------------------------
 * Run on:
 *   - a Naukri SEARCH RESULTS page  -> applies to up to CFG.maxJobs jobs on that page
 *   - a single JOB page (/job-listings-...) -> applies to just that job
 * Stop anytime:  window.__nbotStop = true
 * First time: allow popups for naukri.com (bot opens ONE worker window and reuses it).
 */
(async () => {
  'use strict';

  // ===================== YOUR SETTINGS =====================
  const CFG = {
    maxJobs: 25,              // total applications per run (all roles combined)
    // Roles the bot will search for automatically (leave [] to just use the current page)
    roles: [
      'Software Development Engineer', 'SDE', 'Software Engineer', 'Python Developer',
      'AI Engineer', 'Generative AI Engineer', 'GenAI Developer', 'LLM Engineer',
      'Machine Learning Engineer', 'AI ML Engineer', 'Data Scientist', 'Data Science',
      'Junior Data Scientist', 'NLP Engineer'
    ],
    searchLocation: '',       // '' = all India (you're open to relocation), or e.g. 'chennai'
    searchExperience: 1,      // Naukri experience filter (years)
    // Only apply when the job title matches this, and never when it matches titleSkip
    titleMust: /\b(sde|software|developer|engineer|ai|genai|gen ai|ml|machine learning|llm|nlp|data scien\w*|python|backend|full ?stack)\b/i,
    titleSkip: /\b(senior|sr\.?|lead|principal|staff|manager|head|architect|director|vp|sales|marketing|hr|recruiter|support|trainer|faculty|intern(ship)?)\b/i,
    name: 'Ayush Ranjan',
    email: 'ayushranjan94300@gmail.com',
    phone: '9122492377',
    currentLocation: 'Chennai',
    currentCtc: 5.5,       // LPA
    expectedCtc: 10,       // LPA
    noticeDays: 30,
    totalExp: '1',         // total experience (years) - edit if you want
    skillExp: '1',         // experience in any specific skill (years)
    relocate: 'Yes',
    preferredLocations: [
      'Chennai', 'Bengaluru', 'Hyderabad', 'Pune', 'Mumbai', 'Delhi NCR',
      'Gurgaon', 'Noida', 'Kolkata', 'Ahmedabad', 'Remote'
    ],
    manualSeconds: 90,  // if a question can't be answered, wait this long for YOU to answer it in the bot window, then continue
    minDelay: 1200, maxDelay: 2600
  };
  // =========================================================

  window.__nbotStop = false;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rnd = () => sleep(CFG.minDelay + Math.random() * (CFG.maxDelay - CFG.minDelay));
  const log = (...a) => console.log('%c[NaukriBot]', 'color:#4a90e2;font-weight:bold', ...a);
  const results = [], unknown = [];

  const waitFor = async (fn, timeout = 10000, step = 300) => {
    const t = Date.now();
    while (Date.now() - t < timeout) {
      try { const v = fn(); if (v) return v; } catch (e) {}
      await sleep(step);
    }
    return null;
  };

  const visible = el => !!el && (el.offsetParent !== null || (el.getClientRects && el.getClientRects().length));
  const txt = el => (el.innerText || el.textContent || '').trim();

  const setVal = (el, v) => {
    const win = el.ownerDocument.defaultView;
    el.focus();
    if (el.isContentEditable) {
      const dd = el.ownerDocument;
      dd.execCommand('selectAll', false, null);
      if (!dd.execCommand('insertText', false, v)) {
        el.textContent = v;
        el.dispatchEvent(new win.InputEvent('input', { bubbles: true, data: v }));
      }
      return;
    }
    const desc = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value');
    desc.set.call(el, v);
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  };

  const pressEnter = el => {
    const win = el.ownerDocument.defaultView;
    ['keydown', 'keypress', 'keyup'].forEach(t =>
      el.dispatchEvent(new win.KeyboardEvent(t, { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true })));
  };

  // Full mouse sequence - chat widgets often ignore a bare .click()
  const clickEl = el => {
    const win = el.ownerDocument.defaultView;
    try { el.scrollIntoView({ block: 'center' }); } catch (e) {}
    ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'].forEach(t =>
      el.dispatchEvent(new win.MouseEvent(t, { bubbles: true, cancelable: true, view: win })));
  };

  // Fake key events so the widget enables its Save button after typing
  const fireKeys = el => {
    const win = el.ownerDocument.defaultView;
    ['keydown', 'keypress', 'keyup'].forEach(t =>
      el.dispatchEvent(new win.KeyboardEvent(t, { key: 'a', code: 'KeyA', bubbles: true })));
  };

  // ---------- question -> answer ----------
  const money = (v, q) => {
    if (/lakh|lpa|lac|lpa/.test(q)) return String(v);
    if (/\b(inr|rs\.?|rupees)\b|in rupees/.test(q)) return String(v * 100000);
    return String(v);
  };

  function answer(qRaw) {
    const q = qRaw.toLowerCase().replace(/\s+/g, ' ');
    const yes = { text: 'Yes', pick: [/^yes/i, /^y$/i] };
    const no = { text: 'No', pick: [/^no/i, /^n$/i] };

    if (/relocat/.test(q)) return { text: CFG.relocate, pick: [/^yes/i] };
    if (/prefer.*location|location.*prefer|which location|work location|locations? (do you|are you)/.test(q))
      return { text: CFG.preferredLocations.join(', '), all: true, pick: [/any|all|anywhere/i] };
    if (/serving.*notice|currently.*notice/.test(q)) return no;
    if (/immediate/.test(q)) return no;
    if (/notice|joining|join (in|within)|how soon|available to join|lwd|last working/.test(q))
      return { text: `${CFG.noticeDays} days`, pick: [/\b30\b/, /1 month|one month/i, /15.*30/, /15 days/i] };
    if (/expect.*(ctc|salary|compensation|package)|(ctc|salary|compensation|package).*expect/.test(q))
      return { text: money(CFG.expectedCtc, q), num: true };
    if (/(current|present|last|existing).*(ctc|salary|compensation|package)|\bctc\b|fixed salary/.test(q))
      return { text: money(CFG.currentCtc, q), num: true };
    if (/current (location|city)|currently (located|residing|based)|where are you (based|located)/.test(q))
      return { text: CFG.currentLocation, pick: [new RegExp(CFG.currentLocation, 'i')] };
    if (/e-?mail/.test(q)) return { text: CFG.email };
    if (/mobile|phone|contact number|whatsapp/.test(q)) return { text: CFG.phone };
    if (/full name|your name|^name/.test(q)) return { text: CFG.name };
    if (/experience|how many years|years of|yrs/.test(q)) {
      const n = /total|overall/.test(q) ? CFG.totalExp : CFG.skillExp;
      return { text: n, num: true, pick: [new RegExp('\\b' + n + '\\b'), /0\s*(-|–|to)\s*1\b/i, /1\s*(-|–|to)\s*2\b/i, /less than 1|<\s*1/i] };
    }
    if (/offer.*hand|other offer/.test(q)) return no;
    if (/^(are|do|did|have|can|will|would|is|could)\b|willing|comfortable|ready|open to|available|agree/.test(q)) return yes;
    return null;
  }

  // ---------- chatbot helpers (structure-tolerant) ----------
  const norm = x => (x || '').replace(/\s+/g, ' ').trim();

  const getOptions = box => {
    const set = new Set();
    box.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(i => {
      const lab = (i.id && box.querySelector(`label[for="${CSS.escape(i.id)}"]`)) || i.closest('label') ||
        (i.parentElement && i.parentElement.querySelector('label')) || i.parentElement;
      if (lab && norm(txt(lab))) set.add(lab);
    });
    box.querySelectorAll('[class*="Chip"], [class*="ssrc__label"], [class*="mcc__label"]').forEach(e => { if (norm(txt(e))) set.add(e); });
    let arr = [...set].filter(e => visible(e) && norm(txt(e)).length < 80 && !/^(save|submit|send|skip)$/i.test(norm(txt(e))));
    return arr.filter(e => !arr.some(o => o !== e && e.contains(o)));   // drop wrappers that contain other options
  };

  const getInput = box =>
    [...box.querySelectorAll('[contenteditable="true"], [contenteditable=""], textarea, input')]
      .filter(e => visible(e) && !/^(radio|checkbox|hidden|button|submit|file)$/i.test(e.type || ''))[0];

  // Finds the INNERMOST visible, enabled element whose text is Save/Submit/Send/Next/Continue
  const sendBtn = box => {
    const c = [...box.querySelectorAll('button, [role="button"], div, span, a')]
      .filter(e => visible(e) && !e.disabled &&
        e.getAttribute('aria-disabled') !== 'true' && !/\bdisabled\b/i.test(e.className || '') &&
        /^(save|submit|send|next|continue)$/i.test(norm(txt(e))));
    const deepest = c.filter(e => !c.some(o => o !== e && e.contains(o)));
    return deepest[deepest.length - 1] ||
      [...box.querySelectorAll('[class*="sendMsg"]')].filter(visible)[0];
  };

  const chatBox = d => {
    const els = [...d.querySelectorAll('[class*="chatbot"]')]
      .filter(e => visible(e) && e.querySelector('[class*="botMsg"], [class*="botItem"], [contenteditable], textarea, input, [class*="Chip"]'));
    els.sort((x, y) => txt(y).length - txt(x).length);
    return els[0] || null;
  };

  const lastBotMsg = box => {
    const msgs = [...box.querySelectorAll('[class*="botMsg"], [class*="botItem"], [class*="botMessage"]')].map(e => norm(txt(e))).filter(Boolean);
    if (msgs.length) return msgs[msgs.length - 1];
    const optTexts = new Set(getOptions(box).map(o => norm(txt(o))));
    const lines = txt(box).split('\n').map(norm).filter(l => l && !optTexts.has(l) && !/^(save|submit|send|skip|type here.*)$/i.test(l));
    return lines.length ? lines[lines.length - 1] : '';
  };

  const applied = d => {
    const body = (d.body && d.body.innerText) || '';
    return !!d.querySelector('#already-applied') ||
      /successfully applied|applied successfully|you have (already )?applied|application (has been )?(sent|submitted)/i.test(body);
  };

  const quotaHit = d => /daily (apply )?(limit|quota)|limit (has been )?reached/i.test((d.body && d.body.innerText) || '');

  const dump = (box, why) => {
    window.__nbotLastChat = box ? box.outerHTML : '(no chat box found)';
    console.warn('[NaukriBot] ' + why + '. Chat HTML saved in window.__nbotLastChat (run copy(window.__nbotLastChat) and send it to me if this keeps happening):\n', (window.__nbotLastChat).slice(0, 3500));
  };

  async function manual(d, box, q, why) {
    dump(box, why);
    log(`⚠ ${why}. Answer it yourself in the bot window within ${CFG.manualSeconds}s - the bot will continue afterwards.`);
    try { W.focus(); } catch (e) {}
    const t = Date.now();
    while (Date.now() - t < CFG.manualSeconds * 1000) {
      if (window.__nbotStop) return false;
      await sleep(1000);
      const b = chatBox(d);
      if (!b) return true;
      if (lastBotMsg(b) !== q) return true;
    }
    return false;
  }

  // returns true if we managed to answer
  async function respond(box, a) {
    const opts = getOptions(box);
    if (opts.length) {
      if (a.all) {
        const anyOpt = opts.find(o => /^(any|all|anywhere|select all)/i.test(norm(txt(o))));
        if (anyOpt) clickEl(anyOpt);
        else opts.filter(o => !/none|other/i.test(txt(o))).forEach(o => clickEl(o));
      } else {
        const hit = (a.pick || []).map(rx => opts.find(o => rx.test(norm(txt(o))))).find(Boolean);
        if (!hit) { unknown.push('(no matching option) options: ' + opts.map(o => norm(txt(o))).join(' | ')); return false; }
        clickEl(hit);
      }
      await sleep(900);
      const sb = sendBtn(box); if (sb) clickEl(sb);
      return true;
    }
    const inp = getInput(box);
    if (!inp) return false;
    setVal(inp, a.text);
    fireKeys(inp);
    await sleep(800);                       // give the widget time to enable Save
    const sb = sendBtn(box);
    if (sb) clickEl(sb); else pressEnter(inp);
    return true;
  }

  async function runChat(d) {
    let last = '', same = 0, retried = 0;
    for (let i = 0; i < 40; i++) {
      if (window.__nbotStop) return 'stopped';
      if (quotaHit(d)) return 'quota';
      const box = chatBox(d);
      if (!box) {
        if (applied(d)) return 'applied';
        await sleep(1500);
        if (!chatBox(d)) return applied(d) ? 'applied' : 'applied?';
        continue;
      }

      const q = lastBotMsg(box);
      if (!q) {
        if (++same > 8) { if (await manual(d, box, q, 'could not read the question')) { same = 0; last = ''; continue; } return 'stuck'; }
        await sleep(1000); continue;
      }

      if (q === last) {
        if (++same < 4) { await sleep(1200); continue; }
        if (retried++ < 1) {
          const sb = sendBtn(box), inp = getInput(box);
          if (sb) clickEl(sb); else if (inp) pressEnter(inp);
          same = 0; await sleep(1500); continue;
        }
        if (await manual(d, box, q, 'bot did not accept my answer')) { last = ''; same = 0; retried = 0; continue; }
        return 'stuck';
      }
      last = q; same = 0; retried = 0;

      const a = answer(q);
      log('Q:', q, '->', a ? a.text : '??');
      if (!a) {
        unknown.push(q);
        if (await manual(d, box, q, 'unknown question')) { last = ''; continue; }
        return 'unknown';
      }
      if (!(await respond(box, a))) {
        unknown.push(q);
        if (await manual(d, box, q, 'could not find where to answer')) { last = ''; continue; }
        return 'unknown';
      }
      await rnd();
    }
    return 'stuck';
  }

  // ---------- apply on one job document ----------
  async function applyOn(d) {
    const btn = await waitFor(() => {
      if (d.querySelector('#already-applied')) return 'already';
      const cands = [...d.querySelectorAll('button, a')].filter(visible);
      const b = d.querySelector('#apply-button') ||
        cands.find(e => /^apply$/i.test(txt(e)) && !/company/i.test(e.id + e.className));
      if (b) return b;
      if (d.querySelector('#company-site-button') || cands.some(e => /apply on company site/i.test(txt(e)))) return 'external';
      return null;
    }, 12000);

    if (!btn) return 'no-button';
    if (btn === 'already') return 'already-applied';
    if (btn === 'external') return 'external-site';

    clickEl(btn);
    await sleep(2500);
    return await runChat(d);
  }

  // ---------- main ----------
  const done = new Set(JSON.parse(localStorage.getItem('nbot_done') || '[]'));
  const saveDone = () => localStorage.setItem('nbot_done', JSON.stringify([...done]));

  if (/job-listings/.test(location.pathname)) {
    const r = await applyOn(document);
    log('Result:', r);
    if (unknown.length) console.warn('Unrecognised questions:', unknown);
    return;
  }

  const slug = x => x.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const collect = d => {
    const sel = '.srp-jobtuple-wrapper a.title, article.jobTuple a.title, [class*="jobTuple"] a.title, a.title[href*="job-listings"], a[href*="job-listings"]';
    const seenU = new Set(), out = [];
    d.querySelectorAll(sel).forEach(a => {
      const u = (a.href || '').split('?')[0];
      const t = txt(a) || a.getAttribute('title') || '';
      if (u && t && !seenU.has(u)) { seenU.add(u); out.push({ url: u, title: t }); }
    });
    return out;
  };
  const titleOk = t => !CFG.titleSkip.test(t) && CFG.titleMust.test(t);

  // One worker window, opened immediately (while the browser still allows popups) and reused for everything
  const W = window.open('https://www.naukri.com/', 'naukribot', 'width=1100,height=800');
  if (!W) return console.error('Popup blocked. Click the blocked-popup icon in the address bar, choose "Always allow", then paste the script again.');

  const go = async url => {
    try { W.__old = true; } catch (e) {}
    W.location.href = url;
    const ok = await waitFor(() => {
      try { return !W.__old && W.location.href.includes('naukri.com') && W.document.readyState === 'complete' && W.document.body; }
      catch (e) { return false; }
    }, 25000);
    return ok ? W.document : null;
  };

  let jobs = [];
  if (CFG.roles.length) {
    for (const role of CFG.roles) {
      if (window.__nbotStop) break;
      const loc = CFG.searchLocation ? `-in-${slug(CFG.searchLocation)}` : '';
      const url = `https://www.naukri.com/${slug(role)}-jobs${loc}?experience=${CFG.searchExperience}`;
      log('Searching:', role);
      const d = await go(url);
      if (!d) { log('  page did not load (timeout / redirected away). URL tried:', url); continue; }
      log('  loaded:', W.location.href, '| title:', W.document.title);
      const found = await waitFor(() => {
        try { W.scrollBy(0, 500); const c = collect(W.document); return c.length ? c : null; } catch (e) { return null; }
      }, 20000, 800);
      if (found) { log(`  ${found.length} jobs found`); jobs.push(...found); }
      else log('  0 jobs found. Page text starts with:', (W.document.body.innerText || '').slice(0, 200).replace(/\s+/g, ' '));
      await sleep(1200);
    }
  } else {
    jobs = collect(document);
  }

  const seen = new Set();
  jobs = jobs.filter(j => !seen.has(j.url) && seen.add(j.url) && !done.has(j.url) && titleOk(j.title))
             .slice(0, CFG.maxJobs);
  const links = jobs.map(j => j.url);
  const titles = Object.fromEntries(jobs.map(j => [j.url, j.title]));

  log(`Found ${links.length} matching new jobs. Starting...`);
  if (!links.length) { try { W.close(); } catch (e) {} return log('No matching jobs found. Check roles / titleMust in settings.'); }

  for (const [i, url] of links.entries()) {
    if (window.__nbotStop) break;
    log(`(${i + 1}/${links.length})`, titles[url]);

    let r = 'error';
    try {
      const d = await go(url);
      r = d ? await applyOn(d) : 'load-timeout/external';
    } catch (e) {
      r = 'external/redirect';
    }

    results.push({ title: titles[url], url, result: r });
    if (!/unknown|stuck|no-button|load-timeout|error/.test(r)) { done.add(url); saveDone(); }
    log('->', r);
    if (r === 'quota') { log('Daily limit reached. Stopping.'); break; }
    await sleep(2500 + Math.random() * 3000);
  }

  try { W.close(); } catch (e) {}
  console.table(results);
  if (unknown.length) console.warn('Questions I could not answer (add rules in answer()):', [...new Set(unknown)]);
  log('Finished.');
})();
