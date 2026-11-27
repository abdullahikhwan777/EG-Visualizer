
/* Trace — interface transitions only.
   Reads text of two interface elements and plays short Web Animations on
   interface containers. It never touches the drawing, its viewport, React
   state, or any construction step. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!document.documentElement.animate) return;

  function play(el, frames, options) {
    if (!el || (reduce && reduce.matches)) return;
    try { el.animate(frames, options); } catch (_) { /* optional polish */ }
  }

  var lastQuestion = null;
  var lastStep = null;
  var attached = false;

  function onQuestionChange(h1) {
    var title = h1.textContent;
    if (lastQuestion !== null && title !== lastQuestion) {
      var rise = [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }];
      var opts = { duration: 520, easing: "cubic-bezier(.22,.61,.36,1)" };
      play(h1, rise, opts);
      play(document.querySelector(".header .header-description"), rise, { duration: 520, delay: 70, easing: opts.easing, fill: "backwards" });
      play(document.querySelector(".question-text"), rise, { duration: 560, delay: 120, easing: opts.easing, fill: "backwards" });
    }
    lastQuestion = title;
  }

  function onStepChange(content) {
    var heading = content.querySelector("h3");
    var key = heading ? heading.textContent : "";
    if (lastStep !== null && key !== lastStep) {
      play(content, [{ opacity: 0, transform: "translateY(6px)" }, { opacity: 1, transform: "none" }],
        { duration: 380, easing: "cubic-bezier(.22,.61,.36,1)" });
      play(document.querySelector(".step-badge"),
        [{ backgroundColor: "rgba(204,179,99,.55)" }, { backgroundColor: "rgba(204,179,99,0)" }],
        { duration: 750, easing: "ease-out" });
    }
    lastStep = key;
  }

  function attach() {
    var h1 = document.querySelector(".header h1");
    var guide = document.querySelector(".guide-content");
    if (!h1 || !guide) return false;
    onQuestionChange(h1);
    onStepChange(guide);
    var scheduled = false;
    function run() {
      scheduled = false;
      onQuestionChange(h1);
      onStepChange(guide);
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(run);
    }
    var opts = { childList: true, characterData: true, subtree: true };
    new MutationObserver(schedule).observe(h1, opts);
    new MutationObserver(schedule).observe(guide, opts);
    return true;
  }

  var tries = 0;
  function boot() {
    if (attached) return;
    if (attach()) { attached = true; return; }
    if (++tries < 120) requestAnimationFrame(boot);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, { once: true });
  else boot();
})();
