package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
)

func sendProfile(w http.ResponseWriter, r *http.Request) {
	fmt.Println("came to profile")
	auth := r.Header.Get("Authorization")
	fmt.Println(auth)
	if auth == "" {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "token not found",
		})
		return
	}
	// fmt.Println(auth)
	req, _ := http.NewRequest(
		"GET",
		"http://nakama:7350/v2/account",
		nil,
	)
	req.Header.Set("Authorization", auth)
	req.Header.Set("Content-Type", "application/json")
	client := &http.Client{}
	resp, _ := client.Do(req)
	body, _ := io.ReadAll(resp.Body)

	defer resp.Body.Close()
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	fmt.Println(body)
	w.Write(body)
}
