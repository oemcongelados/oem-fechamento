package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Estrutura do arquivo de backup
type BackupData struct {
	Timestamp time.Time           `json:"timestamp"`
	Data      map[string][]bson.M `json:"data"` // Mapa: Nome da Coleção -> Lista de Documentos
}

// Lista das coleções que queremos salvar
var collectionsToBackup = []string{"users", "trips", "drivers", "vehicles", "routes"}

// --- GERAR BACKUP (Download) ---
func DownloadBackup(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	fullBackup := BackupData{
		Timestamp: time.Now(),
		Data:      make(map[string][]bson.M),
	}

	// 1. Itera sobre cada coleção e pega todos os dados
	for _, colName := range collectionsToBackup {
		cursor, err := Db.Collection(colName).Find(ctx, bson.M{})
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Erro ao ler coleção " + colName})
		}

		var docs []bson.M
		if err = cursor.All(ctx, &docs); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Erro ao decodificar " + colName})
		}

		fullBackup.Data[colName] = docs
	}

	// 2. Define o nome do arquivo com data
	filename := fmt.Sprintf("backup_oem_%s.json", time.Now().Format("2006-01-02_15-04"))
	c.Set("Content-Disposition", "attachment; filename="+filename)
	c.Set("Content-Type", "application/json")

	return c.JSON(fullBackup)
}

// --- RESTAURAR BACKUP (Upload) ---
func RestoreBackup(c *fiber.Ctx) error {
	// 1. Ler o arquivo enviado
	file, err := c.FormFile("backup_file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Arquivo não enviado"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao abrir arquivo"})
	}
	defer f.Close()

	// 2. Decodificar JSON
	var backup BackupData
	if err := json.NewDecoder(f).Decode(&backup); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Arquivo inválido ou corrompido"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	// 3. Processar cada coleção
	for colName, docs := range backup.Data {
		// Pular coleções desconhecidas por segurança
		valid := false
		for _, v := range collectionsToBackup {
			if v == colName {
				valid = true
				break
			}
		}
		if !valid {
			continue
		}

		collection := Db.Collection(colName)

		// A: Limpar coleção atual (Restore completo)
		collection.Drop(ctx)

		if len(docs) == 0 {
			continue
		}

		// B: Converter Tipos (JSON transformou ObjectID e Date em String)
		var interfaces []interface{}
		for _, doc := range docs {
			// Corrige _id
			if idStr, ok := doc["_id"].(string); ok {
				if oid, err := primitive.ObjectIDFromHex(idStr); err == nil {
					doc["_id"] = oid
				}
			}

			// Corrige campos de Data conhecidos
			dateFields := []string{"start_date", "created_at", "CreatedAt", "timestamp"}
			for _, field := range dateFields {
				if val, ok := doc[field].(string); ok {
					// Tenta parsear datas ISO do JSON
					if parsed, err := time.Parse(time.RFC3339, val); err == nil {
						doc[field] = parsed
					}
				}
			}

			interfaces = append(interfaces, doc)
		}

		// C: Inserir dados restaurados
		if _, err := collection.InsertMany(ctx, interfaces); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Erro ao inserir dados em " + colName})
		}
	}

	return c.JSON(fiber.Map{"message": "Sistema restaurado com sucesso!", "timestamp": backup.Timestamp})
}
