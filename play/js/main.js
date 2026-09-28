/* =====================================================================
   Startup. Always the last script.
   ===================================================================== */
"use strict";
// Start on the home screen.
renderTitle();
$('ver').textContent = 'Version ' + VERSION;
// Handy for testing in the browser console: __ink.st is the run in progress.
window.__ink = { get st() { return st; }, E };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
