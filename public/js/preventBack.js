// if (window.history && window.history.pushState) {
//   window.history.pushState(null, "", window.location.href);
//   window.onpopstate = function () {
//     // When back button is pressed
//     window.history.pushState(null, "", window.location.href); // redirect to your home route
//   };
// }

(function () {
  history.pushState(null, null, location.href);
  window.onpopstate = function () {
    // console.log(history)
    history.go(0); // Forces the user to stay on the current page
  };
})();
