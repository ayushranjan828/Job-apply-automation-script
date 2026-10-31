(async () => {
  // ===== SETTINGS =====
  const MAX_APPLIES = 30;       // stop after this many
  const MIN_DELAY = 3000;       // ms between jobs
  const MAX_DELAY = 6000;
  const MAX_EMPTY_ROUNDS = 5;   // stop after this many scrolls with no new jobs
  const KEYWORD_FILTER = true;  // only apply if the job card matches KEYWORDS
  const KEYWORDS = ["ai", "ml", "machine learning", "data scien", "data engineer",
                    "sde", "software engineer", "software developer", "software development"];
  // ====================

  window.stopApply = false;     // type stopApply = true to halt
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = () => MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const seen = new WeakSet();
  let applied = 0, skipped = 0, empty = 0;

  const cardText = btn => {
    let el = btn;
    for (let i = 0; i < 8 && el.parentElement; i++) {
      el = el.parentElement;
      if (el.innerText && el.innerText.length > 100) return el.innerText;
    }
    return "";
  };
  const matches = t => KEYWORDS.some(k =>
    k.length <= 3 ? new RegExp(`\\b${k}\\b`, "i").test(t) : t.toLowerCase().includes(k));

  const getViewButtons = () =>
    [...document.querySelectorAll("button.btn-interested")]
      .filter(b => visible(b) && !b.disabled && !seen.has(b));

  // wait until the Apply button in the popup appears
  const waitForApply = async (timeout = 6000) => {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const b = [...document.querySelectorAll("button.new-btn, button.btn-primary.btn-lg")]
        .find(x => visible(x) && /^apply$/i.test(x.innerText.trim()));
      if (b) return b;
      await sleep(300);
    }
    return null;
  };

  const closePopup = async () => {
    await sleep(800);
    const close = document.querySelector(
      ".modal .close, [class*=modal] [class*=close], button.close, [aria-label=Close], [aria-label=close]");
    if (close && visible(close)) close.click();
    else document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
    await sleep(800);
  };

  console.log("🚀 Started. Type `stopApply = true` to stop.");

  while (!window.stopApply && applied < MAX_APPLIES && empty < MAX_EMPTY_ROUNDS) {
    const btns = getViewButtons();
    if (!btns.length) {
      empty++;
      window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      const more = [...document.querySelectorAll("button, a")]
        .find(b => visible(b) && /load more|show more|view more/i.test(b.innerText || ""));
      if (more) more.click();
      await sleep(2500);
      continue;
    }
    empty = 0;

    const btn = btns[0];
    seen.add(btn);
    const text = cardText(btn);
    const title = text.split("\n")[0] || "(job)";

    if (KEYWORD_FILTER && !matches(text)) {
      skipped++;
      console.log("⏭️ Skipped:", title);
      continue;
    }

    btn.scrollIntoView({ block: "center", behavior: "smooth" });
    await sleep(800);
    btn.click();                         // Step 1: View job

    const applyBtn = await waitForApply();
    if (applyBtn) {
      applyBtn.click();                  // Step 2: Apply
      applied++;
      console.log(`✅ Applied #${applied}:`, title);
      await sleep(1500);
    } else {
      console.log("⚠️ No Apply button found for:", title);
    }

    await closePopup();
    await sleep(rand());
  }

  console.log(`🏁 Done. Applied: ${applied}, Skipped: ${skipped}`);
})();
