package main

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
)

type user struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Avatar   string `json:"avatar"`
	Name     string `json:"name"`
}

func userExists(mail string) bool {

	var id string
	err := DB.QueryRow(context.Background(),
		"SELECT id FROM users WHERE email=$1",
		mail,
	).Scan(&id)
	if err != nil {
		return false
	}
	return true
}
func addUser(email, avatar, password, name string) string {

	key := os.Getenv("nakama_key")
	if key == "" {
		fmt.Println("nakama key not found")
		return "error"
	}
	payload := `{
	"email":"` + email + `",
	"password": "` + password + `"
	}`

	req, _ := http.NewRequest(
		"POST",
		"https://realtime.gsin.online/v2/account/authenticate/email?create=true",
		strings.NewReader(payload),
	)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", key)
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Println("err at nakama add user")
		return "error"
	}
	bodybytes, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	json.Unmarshal(bodybytes, &result)

	token, ok := result["token"].(string)
	if !ok {
		fmt.Println("TOKEN MISSING")
		return "error"
	}
	defer resp.Body.Close()
	avatarPayload := `{
	"avatar_url":"` + avatar + `",
	"display_name":"` + name + `"
	}`
	res, _ := http.NewRequest(
		"PUT",
		"https://realtime.gsin.online/v2/account",
		strings.NewReader(avatarPayload),
	)
	res.Header.Set("Content-Type", "application/json")
	res.Header.Set("Authorization", "Bearer "+token)
	clients := &http.Client{}
	clients.Do(res)
	return token
}
func CreateAccount(w http.ResponseWriter, r *http.Request) {
	fmt.Println("came to CreateAccount")
	if r.Method != "POST" {
		fmt.Print("incorrect request")

	}
	var data user
	json.NewDecoder(r.Body).Decode(&data)
	if data.Email == "" && data.Password == "" && data.Avatar == "" && data.Name == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "insufficient data",
		})
		return
	}
	fmt.Println("came url data=", data.Avatar)
	fmt.Println("form mail=", data.Email)
	if userExists(data.Email) {
		w.WriteHeader(http.StatusConflict)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "mail already exists",
		})
	} else {
		token := addUser(data.Email, data.Avatar, data.Password, data.Name)
		if token == "" {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "inetrnal server error",
			})
			return
		}
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})
	}
	// if addUser(data.Email, data.Avatar, data.Password) {
	// 	w.WriteHeader(http.StatusAccepted)
	// 	json.NewEncoder(w).Encode(map[string]string{
	// 		"message": "users succesfully added",
	// 	})

	// }

}
func authenticate(email, password string) string {
	key := os.Getenv("nakama_key")
	payload := `{
	"email":"` + email + `",
	"password":"` + password + `"
	}`
	res, _ := http.NewRequest(
		"POST",
		"https://realtime.gsin.online/v2/account/authenticate/email",
		strings.NewReader(payload),
	)
	res.Header.Set("Content-Type", "application/json")
	res.Header.Set("Authorization", key)
	client := &http.Client{}
	resp, err := client.Do(res)
	if err != nil {
		fmt.Println("internal server error", err)
		return "error"
	}
	response, _ := io.ReadAll(resp.Body)
	fmt.Println("Nakama raw response:", string(response))

	var result map[string]interface{}
	json.Unmarshal(response, &result)
	token, ok := result["token"].(string)
	if !ok {
		fmt.Println("TOKEN MISSING", ok)
		return "error"
	}
	return token
}
func accountLogin(w http.ResponseWriter, r *http.Request) {

	if r.Method != http.MethodPost {
		fmt.Println("incorrect method fetch")
		return
	}
	var data user
	json.NewDecoder(r.Body).Decode(&data)

	if data.Email == "" || data.Password == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "data not recived to backend",
		})
		return
	}
	if !userExists(data.Email) {
		fmt.Println("user not exist")
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{
			"error": "user not exists",
		})
		return
	} else {
		token := authenticate(data.Email, data.Password)
		if token == "error" {
			fmt.Println("internal server error")
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{
				"error": "incorrect password or mail",
			})
			return
		}
		// fmt.Println("coming token=", token)
		w.WriteHeader(http.StatusAccepted)
		json.NewEncoder(w).Encode(map[string]string{
			"token": token,
		})

	}

}
