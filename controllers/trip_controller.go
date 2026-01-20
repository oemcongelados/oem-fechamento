package controllers

import (
	"context"
	"time"

	"backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Função auxiliar SEGURA para pegar dados do Token
func getUserFromToken(c *fiber.Ctx) (string, bool) {
	userLocals := c.Locals("user")

	if userLocals == nil {
		return "", false
	}

	userToken, ok := userLocals.(*jwt.Token)
	if !ok {
		return "", false
	}

	claims, ok := userToken.Claims.(jwt.MapClaims)
	if !ok {
		return "", false
	}

	username, _ := claims["user"].(string)

	// CORREÇÃO: Verificação robusta do campo admin (aceita bool ou string)
	var isAdmin bool
	if val, ok := claims["Admin"].(bool); ok {
		isAdmin = val
	} else if val, ok := claims["Admin"].(string); ok {
		isAdmin = (val == "true")
	}

	return username, isAdmin
}

// --- LISTAR VIAGENS ---
func GetAllTrips(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	username, isAdmin := getUserFromToken(c)

	// Se não conseguiu identificar o usuário, retorna erro
	if username == "" && !isAdmin {
		return c.Status(401).JSON(fiber.Map{"error": "Usuário não identificado"})
	}

	filter := bson.M{}

	// SE NÃO FOR ADMIN, filtra apenas pelas viagens DELE
	// SE FOR ADMIN, o filtro continua vazio ({}) e retorna tudo.
	if !isAdmin {
		filter = bson.M{"user_id": username}
	}

	opts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})

	var trips []models.Trip
	cursor, err := Db.Collection("trips").Find(ctx, filter, opts)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar viagens"})
	}

	cursor.All(ctx, &trips)
	if trips == nil {
		trips = []models.Trip{}
	}

	return c.JSON(trips)
}

// --- PEGAR UMA VIAGEM ---
func GetTripByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, _ := primitive.ObjectIDFromHex(idParam)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	username, isAdmin := getUserFromToken(c)

	var trip models.Trip
	err := Db.Collection("trips").FindOne(ctx, bson.M{"_id": objID}).Decode(&trip)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada"})
	}

	if !isAdmin && trip.UserID != username {
		return c.Status(403).JSON(fiber.Map{"error": "Acesso negado a este registro."})
	}

	return c.JSON(trip)
}

// --- CRIAR NOVA VIAGEM ---
func CreateTrip(c *fiber.Ctx) error {
	trip := new(models.Trip)
	if err := c.BodyParser(trip); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	username, _ := getUserFromToken(c)
	if username == "" {
		return c.Status(401).JSON(fiber.Map{"error": "Erro de autenticação"})
	}

	trip.CreatedAt = time.Now()
	trip.UserID = username
	trip.Approved = false

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := Db.Collection("trips").InsertOne(ctx, trip)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao salvar"})
	}

	return c.Status(201).JSON(fiber.Map{"message": "Sucesso", "id": result.InsertedID})
}

// --- ATUALIZAR VIAGEM ---
func UpdateTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verifica se já está aprovada
	var existingTrip models.Trip
	err = Db.Collection("trips").FindOne(ctx, bson.M{"_id": objID}).Decode(&existingTrip)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada"})
	}

	if existingTrip.Approved {
		return c.Status(403).JSON(fiber.Map{"error": "Viagem já aprovada/fechada. Edição bloqueada."})
	}

	var updateData bson.M
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	delete(updateData, "_id")
	delete(updateData, "created_at")
	delete(updateData, "user_id")
	delete(updateData, "approved")

	username, isAdmin := getUserFromToken(c)

	filter := bson.M{"_id": objID}
	if !isAdmin {
		filter["user_id"] = username
	}

	result, err := Db.Collection("trips").UpdateOne(ctx, filter, bson.M{"$set": updateData})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atualizar"})
	}

	if result.MatchedCount == 0 {
		return c.Status(403).JSON(fiber.Map{"error": "Sem permissão ou registro não encontrado."})
	}

	return c.JSON(fiber.Map{"message": "Viagem atualizada com sucesso!", "id": idParam})
}

// --- APROVAR VIAGEM (Admin) ---
func ApproveTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
	}

	_, isAdmin := getUserFromToken(c)
	if !isAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "Apenas administradores podem aprovar fechamentos."})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{"$set": bson.M{"approved": true}}

	result, err := Db.Collection("trips").UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao aprovar"})
	}

	if result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada."})
	}

	return c.JSON(fiber.Map{"message": "Fechamento aprovado e bloqueado com sucesso!"})
}

// --- REABRIR VIAGEM (Admin) ---
func ReopenTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
	}

	_, isAdmin := getUserFromToken(c)
	if !isAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "Apenas administradores podem reabrir viagens."})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{"$set": bson.M{"approved": false}}

	result, err := Db.Collection("trips").UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao reabrir viagem"})
	}

	if result.MatchedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada."})
	}

	return c.JSON(fiber.Map{"message": "Viagem reaberta para edição com sucesso!"})
}

// --- DELETAR VIAGEM (Admin) ---
func DeleteTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, err := primitive.ObjectIDFromHex(idParam)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "ID inválido"})
	}

	_, isAdmin := getUserFromToken(c)
	if !isAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "Apenas administradores podem excluir registros."})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	result, err := Db.Collection("trips").DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao excluir"})
	}

	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada."})
	}

	return c.JSON(fiber.Map{"message": "Viagem excluída com sucesso!"})
}
