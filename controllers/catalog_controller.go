package controllers

import (
	"context"
	"time"

	"backend/models"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// --- GET (Listar TODOS - Visível para qualquer usuário logado) ---

func GetDrivers(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var drivers []models.Driver

	// Filtro vazio (bson.M{}) = Traz TODOS os registros do banco
	// Ordenação alfabética (Value: 1)
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, _ := Db.Collection("drivers").Find(ctx, bson.M{}, opts)
	cursor.All(ctx, &drivers)

	if drivers == nil {
		drivers = []models.Driver{}
	}
	return c.JSON(drivers)
}

func GetVehicles(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var vehicles []models.Vehicle

	// Filtro vazio = Todos veem todos os veículos
	opts := options.Find().SetSort(bson.D{{Key: "model", Value: 1}})

	cursor, _ := Db.Collection("vehicles").Find(ctx, bson.M{}, opts)
	cursor.All(ctx, &vehicles)

	if vehicles == nil {
		vehicles = []models.Vehicle{}
	}
	return c.JSON(vehicles)
}

func GetRoutes(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var routes []models.Route

	// Filtro vazio = Todos veem todas as rotas
	opts := options.Find().SetSort(bson.D{{Key: "name", Value: 1}})

	cursor, _ := Db.Collection("routes").Find(ctx, bson.M{}, opts)
	cursor.All(ctx, &routes)

	if routes == nil {
		routes = []models.Route{}
	}
	return c.JSON(routes)
}

// --- SAVE (Criar ou Editar - Apenas Admin deve ter acesso no Front, mas a rota existe) ---

func SaveDriver(c *fiber.Ctx) error {
	var input models.Driver
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).SendString("Erro dados")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if input.ID.IsZero() {
		input.ID = primitive.NewObjectID()
		Db.Collection("drivers").InsertOne(ctx, input)
	} else {
		Db.Collection("drivers").UpdateOne(ctx, bson.M{"_id": input.ID}, bson.M{"$set": input})
	}
	return c.JSON(fiber.Map{"message": "Salvo com sucesso"})
}

func SaveVehicle(c *fiber.Ctx) error {
	var input models.Vehicle
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).SendString("Erro dados")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if input.ID.IsZero() {
		input.ID = primitive.NewObjectID()
		Db.Collection("vehicles").InsertOne(ctx, input)
	} else {
		Db.Collection("vehicles").UpdateOne(ctx, bson.M{"_id": input.ID}, bson.M{"$set": input})
	}
	return c.JSON(fiber.Map{"message": "Salvo com sucesso"})
}

func SaveRoute(c *fiber.Ctx) error {
	var input models.Route
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).SendString("Erro dados")
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if input.ID.IsZero() {
		input.ID = primitive.NewObjectID()
		Db.Collection("routes").InsertOne(ctx, input)
	} else {
		Db.Collection("routes").UpdateOne(ctx, bson.M{"_id": input.ID}, bson.M{"$set": input})
	}
	return c.JSON(fiber.Map{"message": "Salvo com sucesso"})
}
