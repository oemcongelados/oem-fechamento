package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Trip struct {
	ID        primitive.ObjectID `json:"id,omitempty" bson:"_id,omitempty"`
	UserID    string             `json:"user_id" bson:"user_id"`
	CreatedAt time.Time          `json:"created_at" bson:"created_at"`

	// Campos da Viagem
	Driver    string    `json:"driver" bson:"driver"`
	Vehicle   string    `json:"vehicle" bson:"vehicle"`
	Route     string    `json:"route" bson:"route"`
	StartDate time.Time `json:"start_date" bson:"start_date"`
	EndDate   time.Time `json:"end_date" bson:"end_date"`

	// Financeiro
	KmStart       float64 `json:"km_start" bson:"km_start"`
	KmEnd         float64 `json:"km_end" bson:"km_end"`
	ValueWithdraw float64 `json:"value_withdraw" bson:"value_withdraw"`
	ValueReceived float64 `json:"value_received" bson:"value_received"`

	// Despesas
	ExpenseFuel      float64 `json:"expense_fuel" bson:"expense_fuel"`
	ExpenseDaily     float64 `json:"expense_daily" bson:"expense_daily"`
	ExpenseAssistant float64 `json:"expense_assistant" bson:"expense_assistant"`
	ExpenseToll      float64 `json:"expense_toll" bson:"expense_toll"`
	ExpenseOther     float64 `json:"expense_other" bson:"expense_other"`
	ExpenseOtherDesc string  `json:"expense_other_desc" bson:"expense_other_desc"`

	// Retorno e Aprovação
	ReturnNotes    string `json:"return_notes" bson:"return_notes"`
	Approved       bool   `json:"approved" bson:"approved"`
	ApprovalViewed bool   `json:"approval_viewed" bson:"approval_viewed"`

	// --- CAMPO CRUCIAL QUE FALTAVA ---
	Romaneio string `json:"romaneio" bson:"romaneio"`
}
