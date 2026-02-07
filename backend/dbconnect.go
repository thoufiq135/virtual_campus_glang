package main

import (
	"context"
	"fmt"
	"os"

	"github.com/jackc/pgx/v5"
)

var DB *pgx.Conn

func ConnectDB() {
	url := os.Getenv("db_url")
	if url == "" {
		panic("url not found")
	}
	fmt.Println(url)
	conn, err := pgx.Connect(context.Background(), url)
	if err != nil {
		fmt.Println("err at connecting db", err)
		return
	}
	DB = conn

}
