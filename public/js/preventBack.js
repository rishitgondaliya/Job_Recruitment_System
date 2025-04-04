// (function () {
//   if (window.history.replaceState) {
//     window.history.replaceState(null, null, window.location.href);
//   }
//   window.onpopstate = function () {
//     window.history.go(1); // Prevents going back
//   };
// })();

(function () {
  history.pushState(null, null, location.href);
  window.onpopstate = function () {
    history.go(1); // Forces the user to stay on the current page
  };
})();