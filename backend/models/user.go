package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type User struct {
	ID primitive.ObjectID `json:"id" bson:"_id,omitempty"`

	Username string `json:"username" bson:"username"`
	Password string `json:"password" bson:"password"`

	// A CORREÇÃO IMPORTANTE ESTÁ AQUI:
	IsAdmin bool `json:"isAdmin" bson:"is_admin"`
}
