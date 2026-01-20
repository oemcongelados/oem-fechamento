package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID       primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Username string             `json:"username" bson:"username"`
	// O json:"-" faz com que a senha nunca seja enviada nas respostas da API
	Password string `json:"password,omitempty" bson:"password"`
	IsAdmin  bool   `json:"is_admin" bson:"is_admin"`
}
