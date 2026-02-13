package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"backend/controllers"
	"backend/middleware"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv" // <--- BIBLIOTECA NOVA
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

var collection *mongo.Collection

func connectDB() {
	uri := os.Getenv("MONGO_URI")
	if uri == "" {
		uri = "mongodb://127.0.0.1:27017/?directConnection=true&serverSelectionTimeoutMS=2000"
		fmt.Println("⚠️  Rodando LOCAL (MongoDB Localhost)")
	} else {
		fmt.Println("☁️  Rodando CLOUD (MongoDB Atlas)")
	}

	clientOptions := options.Client().ApplyURI(uri)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOptions)
	if err != nil {
		log.Fatal("❌ Erro ao criar cliente Mongo:", err)
	}

	err = client.Ping(ctx, nil)
	if err != nil {
		log.Fatal("❌ Erro ao conectar no MongoDB:", err)
	}

	db := client.Database("oem_sales")
	collection = db.Collection("trips")
	controllers.Db = db
	controllers.EnsureAdminExists()

	fmt.Println("✅ Conectado ao MongoDB com sucesso!")
}

func main() {
	// --- CARREGA O ARQUIVO .ENV (NOVO) ---
	// Isso faz o Go ler as senhas do arquivo .env como se fossem do sistema
	if err := godotenv.Load(); err != nil {
		fmt.Println("ℹ️  Nenhum arquivo .env encontrado (usando variáveis de ambiente do sistema)")
	}

	connectDB()

	// Inicia Agendador
	controllers.StartBackupScheduler()

	app := fiber.New()

	frontendURL := os.Getenv("FRONTEND_URL")
	if frontendURL == "" {
		frontendURL = "http://localhost:5173"
	}

	app.Use(cors.New(cors.Config{
		AllowOrigins: frontendURL,
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, PATCH",
	}))

	// Rota Pública
	app.Post("/api/login", controllers.Login)

	// Rotas Protegidas
	api := app.Group("/api", middleware.Protected())

	// Viagens
	api.Post("/trips", controllers.CreateTrip)
	api.Get("/trips", controllers.GetAllTrips)
	api.Get("/trips/:id", controllers.GetTripByID)
	api.Put("/trips/:id", controllers.UpdateTrip)

	api.Patch("/trips/:id/approve", controllers.ApproveTrip)
	api.Patch("/trips/:id/reopen", controllers.ReopenTrip)
	api.Delete("/trips/:id", controllers.DeleteTrip)

	// Notificações
	api.Get("/notifications", controllers.CheckNotifications)
	api.Post("/notifications/dismiss", controllers.DismissNotifications)

	// Usuários
	api.Post("/register", controllers.RegisterUser)
	api.Get("/users", controllers.GetUsers)
	api.Put("/users/:id", controllers.UpdateUser)
	api.Delete("/users/:id", controllers.DeleteUser)

	// Cadastros
	api.Get("/drivers", controllers.GetDrivers)
	api.Post("/drivers", controllers.SaveDriver)
	api.Get("/vehicles", controllers.GetVehicles)
	api.Post("/vehicles", controllers.SaveVehicle)
	api.Get("/routes", controllers.GetRoutes)
	api.Post("/routes", controllers.SaveRoute)

	// Backup
	api.Get("/backup", controllers.DownloadBackup)
	api.Post("/restore", controllers.RestoreBackup)

	app.Get("/", func(c *fiber.Ctx) error {
		return c.SendString("API OEM Sales Rodando 🚀")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	fmt.Println("🚀 Servidor rodando na porta:", port)
	log.Fatal(app.Listen(":" + port))
}
