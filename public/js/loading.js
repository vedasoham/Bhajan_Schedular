(function () {
  const loader = document.getElementById("loader-overlay");
  if (!loader) return; // nothing to do if the partial isn't on this page

  const img1 = document.getElementById("loader-image-1");
  const img2 = document.getElementById("loader-image-2");
  const quote = document.getElementById("loader-quote-text");

  let showingFirst = true;
  const MIN_TIME = 1800;      // minimum time to show the loader
  const HARD_TIMEOUT = 5000;  // absolute ceiling — never lock scroll longer than this, no matter what
  const start = Date.now();

  const slogans = [
    "Love All • Serve All",
    "Help Ever • Hurt Never",
    "Bhajan is the path to inner peace",
    "Sing with devotion, not perfection",
    "Start the Day with Love",
    "Life is a Song • Sing It",
    "Let the Heart sing, not merely the lips",
    "Bhajans purify the Mind and sanctity of Heart",
    "The End of Education is Character",
    "Where There is Faith, There is Love",
  ];

  if (quote) quote.textContent = slogans[Math.floor(Math.random() * slogans.length)];

  const swapInterval = setInterval(() => {
    if (img1 && img2) {
      if (showingFirst) { img1.classList.remove("active"); img2.classList.add("active"); }
      else { img2.classList.remove("active"); img1.classList.add("active"); }
    }
    if (quote) {
      quote.style.opacity = 0;
      setTimeout(() => {
        quote.textContent = slogans[Math.floor(Math.random() * slogans.length)];
        quote.style.opacity = 1;
      }, 300);
    }
    showingFirst = !showingFirst;
  }, 1000);

  // CSS-class based lock instead of a raw inline style — easier to guarantee removal
  document.body.classList.add("loading-lock");

  let dismissed = false;
  function dismissLoader() {
    if (dismissed) return;
    dismissed = true;
    clearInterval(swapInterval);
    loader.style.opacity = "0";
    loader.style.visibility = "hidden";
    document.body.classList.remove("loading-lock");
    setTimeout(() => { if (loader.parentNode) loader.remove(); }, 500);
  }

  function scheduleDismiss() {
    const elapsed = Date.now() - start;
    const wait = Math.max(0, MIN_TIME - elapsed);
    setTimeout(dismissLoader, wait);
  }

  // Fix #1: if the page already finished loading before this script ran
  // (cached images etc.), 'load' has already fired — don't wait for it again.
  if (document.readyState === "complete") {
    scheduleDismiss();
  } else {
    window.addEventListener("load", scheduleDismiss);
  }

  // Fix #2: browser Back/Forward restores the page from bfcache without
  // re-firing 'load' — 'pageshow' with e.persisted catches that case.
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) dismissLoader();
  });

  // Fix #3: absolute safety net. If anything above fails for any reason
  // (a JS error elsewhere on the page, a missing image, etc.), this
  // guarantees the scroll lock can never outlive 5 seconds.
  setTimeout(dismissLoader, HARD_TIMEOUT);
})();