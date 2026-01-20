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

// Variável global do banco (injetada pelo main.go)
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
	err = bcrypt.CompareHashAndPassword([]byte(foundUser.Password), []byte(input.Password))
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"error": "Senha incorreta"})
	}

	// 3. Gera o Token JWT
	claims := jwt.MapClaims{
		"user":  foundUser.Username,
		"admin": foundUser.IsAdmin, // O valor aqui vem do struct carregado do banco
		"exp":   time.Now().Add(time.Hour * 72).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	t, err := token.SignedString(config.GetJWTSecret())
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao gerar token"})
	}

	// 4. Retorna Token e Dados
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

	// 1. Verifica se usuário já existe
	count, _ := collection.CountDocuments(ctx, bson.M{"username": user.Username})
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{"error": "Este nome de usuário já existe"})
	}

	// 2. Criptografa a senha
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(user.Password), 14)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao criptografar senha"})
	}
	user.Password = string(hashedPassword)

	// 3. Salva no banco (Força is_admin minúsculo)
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

	if err = cursor.All(ctx, &users); err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao processar lista"})
	}

	if users == nil {
		users = []models.User{}
	}

	return c.JSON(users)
}

// --- ATUALIZAR USUÁRIO (EDITAR) ---
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

	// Campos a atualizar (Força is_admin minúsculo)
	updateFields := bson.M{
		"username": input.Username,
		"is_admin": input.IsAdmin,
	}

	// Só atualiza a senha se foi enviada uma nova
	if input.Password != "" {
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), 14)
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

// --- SEED: GARANTIR QUE ADMIN EXISTE ---
func EnsureAdminExists() {
	if Db == nil {
		return
	}

	collection := Db.Collection("users")
	// Timeout generoso de 30s para o Atlas Gratuito acordar
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var existingUser models.User
	err := collection.FindOne(ctx, bson.M{"username": "Admin"}).Decode(&existingUser)

	if err == mongo.ErrNoDocuments {
		fmt.Println("⚙️  Usuário 'Admin' não encontrado. Criando padrão...")
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("Rota@2026"), 14)

		// Criação forçada com nomes de campo explícitos (snake_case)
		_, err := collection.InsertOne(ctx, bson.M{
			"username": "Admin",
			"password": string(hashedPassword),
			"is_admin": true, // <--- Aqui está o segredo: minúsculo
		})

		if err != nil {
			fmt.Println("❌ Erro ao criar Admin padrão:", err)
		} else {
			fmt.Println("✅ Usuário 'Admin' criado com sucesso!")
		}
	} else {
		// SE O USUÁRIO JÁ EXISTE: FORÇAR A ATUALIZAÇÃO DA PERMISSÃO
		// Isso corrige o problema da imagem onde ele aparece como "Usuário"
		fmt.Println("ℹ️  Usuário 'Admin' detectado. Forçando permissão de administrador...")

		_, err := collection.UpdateOne(ctx, bson.M{"username": "Admin"}, bson.M{
			"$set": bson.M{"is_admin": true}, // Garante que vira TRUE e usa o campo certo
		})

		if err != nil {
			fmt.Println("⚠️ Aviso: Não foi possível atualizar permissão do Admin:", err)
		} else {
			fmt.Println("✅ Permissões do Admin verificadas/corrigidas.")
		}
	}
}
