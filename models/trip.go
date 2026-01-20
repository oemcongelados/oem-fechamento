package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Trip struct {
	ID        primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	UserID    string             `json:"user_id" bson:"user_id"`
	Approved  bool               `json:"approved" bson:"approved"` // <--- CAMPO NOVO
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`

	Route     string `json:"route" bson:"route"`
	StartDate string `json:"start_date" bson:"start_date"`
	Driver    string `json:"driver" bson:"driver"`
	Vehicle   string `json:"vehicle" bson:"vehicle"`

	KmStart float64 `json:"km_start" bson:"km_start"`
	KmEnd   float64 `json:"km_end" bson:"km_end"`

	ValueWithdraw float64 `json:"value_withdraw" bson:"value_withdraw"`
	ValueReceived float64 `json:"value_received" bson:"value_received"`
	ReturnNotes   string  `json:"return_notes" bson:"return_notes"`

	ExpenseFuel      float64 `json:"expense_fuel" bson:"expense_fuel"`
	ExpenseDaily     float64 `json:"expense_daily" bson:"expense_daily"`
	ExpenseAssistant float64 `json:"expense_assistant" bson:"expense_assistant"`
	ExpenseToll      float64 `json:"expense_toll" bson:"expense_toll"`
	ExpenseOther     float64 `json:"expense_other" bson:"expense_other"`
}
