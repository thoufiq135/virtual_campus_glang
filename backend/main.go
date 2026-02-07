package main

import (
	"fmt"
	"log"
	"net/http"

	"github.com/joho/godotenv"
)

func enablecors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization,Content-Type,Accept,Origin")
		w.Header().Set("Access-Control-Allow-Methods", "POST,GET,PUT,DELETE,OPTIONS")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
func main() {
	err := godotenv.Load(".env")
	if err != nil {
		log.Println("err loading env files")
	}
	fmt.Println("loaded env files")
	ConnectDB()
	fmt.Println("connected to db")
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprint(w, "Hello from server")
	})
	http.HandleFunc("/createAccount", CreateAccount)
	http.HandleFunc("/LoginAccount", accountLogin)
	http.HandleFunc("/profile", sendProfile)
	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	handle := enablecors(http.DefaultServeMux)
	log.Fatal(http.ListenAndServe(":5000", handle))
}
