package controllers

import (
	"context"
	"fmt"
	"time"

	"backend/config"
	"backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

// Variável global do banco
var Db *mongo.Database

// --- LOGIN ---
func Login(c *fiber.Ctx) error {
	input := new(models.User)
	if err := c.BodyParser(input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	collection := Db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// 1. Busca o usuário pelo Username
	var foundUser models.User
	err := collection.FindOne(ctx, bson.M{"username": input.Username}).Decode(&foundUser)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Usuário não encontrado"})
	}

	// 2. Compara a senha (Hash)
	// OBS: A velocidade aqui depende de como a senha foi CRIADA.
	// Se foi criada com custo 14, vai demorar. Se for 10, será rápido.
	err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(input.Password))
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Senha incorreta"})
	}

	// 3. Gera o Token JWT
	claims := jwt.MapClaims{
		"user":  foundUser.Username,
		"admin": foundUser.IsAdmin,
		"exp":   time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t, err := token.SignedString(config.GetJWTSecret())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao gerar token"})
	}

	return c.JSON(fiber.Map{
		"message": "Login realizado com sucesso",
		"token":   t,
		"isAdmin": foundUser.IsAdmin,
		"user":    foundUser.Username,
	})
}

// --- CADASTRO (CRIAR) ---
func RegisterUser(c *fiber.Ctx) error {
	user := new(models.User)

	if err := c.BodyParser(user); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	collection := Db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	count, _ := collection.CountDocuments(ctx, bson.M{"username": user.Username})
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Este nome de usuário já existe"})
	}

	// CORREÇÃO: Alterado de 14 para 10 (Muito mais rápido)
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), 10)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criptografar senha"})
	}
	user.Password = string(hashedPassword)

	_, err = collection.InsertOne(ctx, bson.M{
		"username": user.Username,
		"password": user.Password,
		"is_admin": user.IsAdmin,
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criar usuário"})
	}

	return c.Status(201).JSON(fiber.Map{"message": "Usuário criado com sucesso!"})
}

// --- LISTAR USUÁRIOS ---
func GetUsers(c *fiber.Ctx) error {
	collection := Db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var users []models.User
	cursor, err := collection.Find(ctx, bson.M{})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao buscar usuários"})
	}
	defer cursor.Close(ctx)
	cursor.All(ctx, &users)

	if users == nil {
		users = []models.User{}
	}
	return c.JSON(users)
}

// --- ATUALIZAR USUÁRIO ---
func UpdateUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, _ := primitive.ObjectIDFromHex(idParam)

	var input models.User
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Dados inválidos"})
	}

	collection := Db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	updateFields := bson.M{
		"username": input.Username,
		"is_admin": input.IsAdmin,
	}

	if input.Password != "" {
		// CORREÇÃO: Alterado de 14 para 10
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
		updateFields["password"] = string(hashedPassword)
	}

	_, err := collection.UpdateOne(ctx, bson.M{"_id": objID}, bson.M{"$set": updateFields})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao atualizar usuário"})
	}

	return c.JSON(fiber.Map{"message": "Usuário atualizado com sucesso!"})
}

// --- EXCLUIR USUÁRIO ---
func DeleteUser(c *fiber.Ctx) error {
	idParam := c.Params("id")
	objID, _ := primitive.ObjectIDFromHex(idParam)

	collection := Db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao excluir usuário"})
	}

	if result.DeletedCount == 0 {
		return c.Status(404).JSON(fiber.Map{"error": "Usuário não encontrado"})
	}

	return c.JSON(fiber.Map{"message": "Usuário excluído com sucesso!"})
}

// --- SEED: ADMIN PADRÃO ---
func EnsureAdminExists() {
	if Db == nil {
		return
	}

	collection := Db.Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var existingUser models.User
	err := collection.FindOne(ctx, bson.M{"username": "Admin"}).Decode(&existingUser)

	if err == mongo.ErrNoDocuments {
		fmt.Println("⚙️  Usuário 'Admin' não encontrado. Criando padrão...")

		// CORREÇÃO: Alterado de 14 para 10
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Rota@2026"), 10)

		_, err := collection.InsertOne(ctx, bson.M{
			"username": "Admin",
			"password": string(hashedPassword),
			"is_admin": true,
		})

		if err != nil {
			fmt.Println("❌ Erro ao criar Admin padrão:", err)
		} else {
			fmt.Println("✅ Usuário 'Admin' criado com sucesso!")
		}
	} else {
		// Garante permissão
		collection.UpdateOne(ctx, bson.M{"username": "Admin"}, bson.M{"$set": bson.M{"is_admin": true}})
		fmt.Println("ℹ️  Usuário 'Admin' verificado.")
	}
}
