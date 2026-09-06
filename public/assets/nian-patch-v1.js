(() => {
  "use strict";
  // Keep the historical asset URL for old cached clients. Native voices load
  // asynchronously: never replace speechSynthesis just because getVoices is empty.
  // Word-room playback is now delegated to the shared speech controller.
})();
