package models

import "go.mongodb.org/mongo-driver/bson/primitive"

type Driver struct {
	ID     primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Name   string             `json:"name" bson:"name"`
	Phone  string             `json:"phone" bson:"phone"` // Campo Novo
	Active bool               `json:"active" bson:"active"`
}

type Vehicle struct {
	ID    primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Model string             `json:"model" bson:"model"`
	Plate string             `json:"plate" bson:"plate"`
}

type Route struct {
	ID   primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	Name string             `json:"name" bson:"name"`
}
