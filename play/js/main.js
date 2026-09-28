/* =====================================================================
   Startup. Always the last script.
   ===================================================================== */
"use strict";
// Pick up a saved run, the way Ink Nine does after a refresh. Otherwise start on the home screen.
{ const RUN = loadRun(); if (!(RUN && resumeRun(RUN))) renderTitle(); }
$('ver').textContent = 'Version ' + VERSION;
// Handy for testing in the browser console: __ink.st is the run in progress.
window.__ink = { get st() { return st; }, E };
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => {});
