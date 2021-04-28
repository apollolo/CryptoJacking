package main

import (
	"flag"
	"log"
	"net/http"
	"net/url"

	"github.com/koding/websocketproxy"
)

var (
	flagBackend = flag.String("backend", "", "Backend URL for proxying")
)

func main() {
	u, err := url.Parse(*flagBackend)
	if err != nil {
		log.Fatalln(err)
	}

	err = http.ListenAndServe(":8082", websocketproxy.NewProxy(u))
	if err != nil {
		log.Fatalln(err)
	}
}