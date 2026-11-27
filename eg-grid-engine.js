
/* Trace grid sheet renderer — independent of all technical drawing paths. */
(function () {
  "use strict";
  window.EGGridMake = function (enabled, requestedType, requestedSpacing, requestedId, width, height) {
    if (!enabled) return "";
    var type = ["graph", "dots", "iso", "cross"].includes(requestedType) ? requestedType : "graph";
    var spacing = [16, 24, 32, 48].includes(Number(requestedSpacing)) ? Number(requestedSpacing) : 24;
    var id = String(requestedId || "eg-grid").replace(/[^a-zA-Z0-9_-]/g, "");
    var w = Number(width) || 960, h = Number(height) || 540;
    var ink = "#65765D";
    var defs = "";
    var rectangles = "";
    if (type === "graph") {
      var major = spacing * 5;
      defs = '<pattern id="' + id + '-minor" width="' + spacing + '" height="' + spacing + '" patternUnits="userSpaceOnUse"><path d="M ' + spacing + ' 0 H 0 V ' + spacing + '" fill="none" stroke="' + ink + '" stroke-opacity=".24" stroke-width=".65"/></pattern>' +
             '<pattern id="' + id + '-major" width="' + major + '" height="' + major + '" patternUnits="userSpaceOnUse"><path d="M ' + major + ' 0 H 0 V ' + major + '" fill="none" stroke="' + ink + '" stroke-opacity=".34" stroke-width=".95"/></pattern>';
      rectangles = '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + '-minor)" pointer-events="none"/>' +
                   '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + '-major)" pointer-events="none"/>';
    } else if (type === "dots") {
      defs = '<pattern id="' + id + '-dots" width="' + spacing + '" height="' + spacing + '" patternUnits="userSpaceOnUse"><circle cx="' + (spacing / 2) + '" cy="' + (spacing / 2) + '" r=".85" fill="' + ink + '" fill-opacity=".48"/></pattern>';
      rectangles = '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + '-dots)" pointer-events="none"/>';
    } else if (type === "iso") {
      var tileW = spacing * 2;
      var tileH = Math.round(spacing * Math.sqrt(3) * 1000) / 1000;
      var d = 'M 0 0 H ' + tileW + ' M 0 ' + tileH + ' H ' + tileW +
              ' M 0 0 L ' + spacing + ' ' + tileH + ' L ' + tileW + ' 0' +
              ' M 0 ' + tileH + ' L ' + spacing + ' 0 L ' + tileW + ' ' + tileH;
      defs = '<pattern id="' + id + '-iso" width="' + tileW + '" height="' + tileH + '" patternUnits="userSpaceOnUse"><path d="' + d + '" fill="none" stroke="' + ink + '" stroke-opacity=".28" stroke-width=".7"/></pattern>';
      rectangles = '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + '-iso)" pointer-events="none"/>';
    } else if (type === "cross") {
      var mid = spacing / 2;
      var arm = Math.min(3.7, spacing / 6);
      defs = '<pattern id="' + id + '-cross" width="' + spacing + '" height="' + spacing + '" patternUnits="userSpaceOnUse"><path d="M ' + (mid - arm) + ' ' + mid + ' H ' + (mid + arm) + ' M ' + mid + ' ' + (mid - arm) + ' V ' + (mid + arm) + '" fill="none" stroke="' + ink + '" stroke-opacity=".46" stroke-width=".85"/></pattern>';
      rectangles = '<rect width="' + w + '" height="' + h + '" fill="url(#' + id + '-cross)" pointer-events="none"/>';
    }
    return '<g class="eg-grid-layer" aria-hidden="true" pointer-events="none"><defs>' + defs + '</defs>' + rectangles + '</g>';
  };
})();
