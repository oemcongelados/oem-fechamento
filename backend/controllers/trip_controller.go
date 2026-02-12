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
	var isAdmin bool
	if val, ok := claims["admin"].(bool); ok {
		isAdmin = val
	} else if val, ok := claims["admin"].(string); ok {
		isAdmin = (val == "true")
	} else if val, ok := claims["Admin"].(bool); ok {
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

	// Se não for admin, filtra pelo usuário
	filter := bson.M{}
	if !isAdmin {
		// Ajuste: Filtro Case-Insensitive para garantir que "thiago" ache "Thiago"
		filter = bson.M{"user_id": bson.M{"$regex": primitive.Regex{Pattern: "^" + username + "$", Options: "i"}}}
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

	// Tenta buscar tanto por ObjectID quanto por String (compatibilidade backup)
	var filter bson.M
	if objID, err := primitive.ObjectIDFromHex(idParam); err == nil {
		filter = bson.M{"_id": bson.M{"$in": bson.A{objID, idParam}}}
	} else {
		filter = bson.M{"_id": idParam}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	var trip models.Trip
	err := Db.Collection("trips").FindOne(ctx, filter).Decode(&trip)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada"})
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

	// Busca Híbrida (ObjectID ou String)
	var filterID bson.M
	if objID, err := primitive.ObjectIDFromHex(idParam); err == nil {
		filterID = bson.M{"_id": bson.M{"$in": bson.A{objID, idParam}}}
	} else {
		filterID = bson.M{"_id": idParam}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Verifica se existe e se está aprovada
	var existingTrip models.Trip
	if err := Db.Collection("trips").FindOne(ctx, filterID).Decode(&existingTrip); err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "Viagem não encontrada"})
	}
	if existingTrip.Approved {
		return c.Status(403).JSON(fiber.Map{"error": "Viagem já aprovada/fechada. Edição bloqueada."})
	}

	var updateData bson.M
	if err := c.BodyParser(&updateData); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	// Remove campos protegidos
	delete(updateData, "_id")
	delete(updateData, "created_at")
	delete(updateData, "user_id")
	delete(updateData, "approved")
	delete(updateData, "approval_viewed")
	delete(updateData, "romaneio")

	username, isAdmin := getUserFromToken(c)
	if !isAdmin && existingTrip.UserID != username { // Case-insensitive check idealmente seria feito aqui também
		return c.Status(403).JSON(fiber.Map{"error": "Sem permissão."})
	}

	_, err := Db.Collection("trips").UpdateOne(ctx, filterID, bson.M{"$set": updateData})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atualizar"})
	}

	return c.JSON(fiber.Map{"message": "Viagem atualizada com sucesso!", "id": idParam})
}

// --- APROVAR VIAGEM (Admin) ---
func ApproveTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	_, isAdmin := getUserFromToken(c)
	if !isAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "Apenas administradores."})
	}

	// Busca Híbrida
	var filterID bson.M
	if objID, err := primitive.ObjectIDFromHex(idParam); err == nil {
		filterID = bson.M{"_id": bson.M{"$in": bson.A{objID, idParam}}}
	} else {
		filterID = bson.M{"_id": idParam}
	}

	type ApproveRequest struct {
		Romaneio string `json:"romaneio"`
	}
	var req ApproveRequest
	c.BodyParser(&req)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{"$set": bson.M{"approved": true, "approval_viewed": false, "romaneio": req.Romaneio}}
	result, err := Db.Collection("trips").UpdateOne(ctx, filterID, update)

	if err != nil || result.MatchedCount == 0 {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ou não encontrado"})
	}

	return c.JSON(fiber.Map{"message": "Aprovado com sucesso!", "romaneio": req.Romaneio})
}

// --- REABRIR VIAGEM (Admin) ---
func ReopenTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	_, isAdmin := getUserFromToken(c)
	if !isAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "Apenas administradores."})
	}

	var filterID bson.M
	if objID, err := primitive.ObjectIDFromHex(idParam); err == nil {
		filterID = bson.M{"_id": bson.M{"$in": bson.A{objID, idParam}}}
	} else {
		filterID = bson.M{"_id": idParam}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	update := bson.M{"$set": bson.M{"approved": false}}
	if _, err := Db.Collection("trips").UpdateOne(ctx, filterID, update); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao reabrir"})
	}
	return c.JSON(fiber.Map{"message": "Reaberta com sucesso!"})
}

// --- DELETAR VIAGEM (Admin) ---
func DeleteTrip(c *fiber.Ctx) error {
	idParam := c.Params("id")
	_, isAdmin := getUserFromToken(c)
	if !isAdmin {
		return c.Status(403).JSON(fiber.Map{"error": "Apenas administradores."})
	}

	var filterID bson.M
	if objID, err := primitive.ObjectIDFromHex(idParam); err == nil {
		filterID = bson.M{"_id": bson.M{"$in": bson.A{objID, idParam}}}
	} else {
		filterID = bson.M{"_id": idParam}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := Db.Collection("trips").DeleteOne(ctx, filterID); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao excluir"})
	}
	return c.JSON(fiber.Map{"message": "Excluído com sucesso!"})
}

// --- NOTIFICAÇÕES (Mantidas simples) ---
func CheckNotifications(c *fiber.Ctx) error {
	username, _ := getUserFromToken(c)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	filter := bson.M{"user_id": username, "approved": true, "approval_viewed": bson.M{"$ne": true}}
	var trips []models.Trip
	cursor, _ := Db.Collection("trips").Find(ctx, filter)
	if cursor != nil {
		cursor.All(ctx, &trips)
	}
	if trips == nil {
		trips = []models.Trip{}
	}
	return c.JSON(trips)
}

func DismissNotifications(c *fiber.Ctx) error {
	username, _ := getUserFromToken(c)
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	Db.Collection("trips").UpdateMany(ctx, bson.M{"user_id": username, "approved": true}, bson.M{"$set": bson.M{"approval_viewed": true}})
	return c.JSON(fiber.Map{"message": "OK"})
}
