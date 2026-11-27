
/* Apply icon-only appearance to action buttons without touching their React handlers. */
(function () {
  "use strict";
  const root = document.getElementById("root") || document.body;
  let queued = false;

  function classify(button) {
    if (button.closest(".questions-nav") || button.classList.contains("sidebar-backdrop")) return null;
    if (button.classList.contains("mobile-menu-button")) return ["menu", "Open navigation"];
    if (button.classList.contains("eg-spotify-toggle")) return ["music", "Study Music"];
    if (button.classList.contains("eg-spotify-close")) return ["close", "Close music panel"];
    if (button.classList.contains("eg-spotify-load")) return ["load", "Load Spotify link"];

    const isAction = button.matches(".control-button, .eg-viewer-toolbar-actions button, .eg-viewer-step-actions button");
    if (!isAction) return null;

    const label = (button.textContent || "").replace(/\s+/g, " ").trim();
    if (label === "Reset") return ["reset", "Reset drawing"];
    if (/Previous/i.test(label)) return ["previous", "Previous step"];
    if (/Next Line/i.test(label)) return ["next", "Next step"];
    if (/Show Complete Drawing/i.test(label)) return ["complete", "Show complete drawing"];
    if (/Exit Full Screen/i.test(label)) return ["exit-fullscreen", "Exit fullscreen"];
    if (/Full Screen/i.test(label)) return ["fullscreen", "Enter fullscreen"];
    if (/Fit to Screen/i.test(label)) return ["fit", "Fit drawing to screen"];
    if (label === "−" || label === "-") return ["zoom-out", "Zoom out"];
    if (label === "+") return ["zoom-in", "Zoom in"];
    if (/Download Final Answer|Preparing PNG/i.test(label) || button.classList.contains("eg-download-answer-button"))
      return ["download", label.includes("Preparing") ? "Preparing final answer PNG" : "Download final answer"];
    return null;
  }

  function applyIcons() {
    queued = false;
    root.querySelectorAll("button").forEach((button) => {
      const result = classify(button);
      if (!result) return;
      const [icon, label] = result;
      if (button.dataset.egIcon !== icon) button.dataset.egIcon = icon;
      if (!button.classList.contains("eg-icon-only")) button.classList.add("eg-icon-only");
      if (button.getAttribute("aria-label") !== label) button.setAttribute("aria-label", label);
      if (button.getAttribute("title") !== label) button.setAttribute("title", label);
    });
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(applyIcons);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", schedule, {once: true});
  else schedule();
  new MutationObserver(schedule).observe(root, {childList: true, subtree: true, characterData: true});
  document.addEventListener("fullscreenchange", schedule);
})();
