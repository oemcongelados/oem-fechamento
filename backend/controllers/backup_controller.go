package controllers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/robfig/cron/v3"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"gopkg.in/gomail.v2"
)

// Estrutura do arquivo de backup
type BackupData struct {
	Timestamp time.Time           `json:"timestamp"`
	Data      map[string][]bson.M `json:"data"`
}

var collectionsToBackup = []string{"users", "trips", "drivers", "vehicles", "routes"}

// --- INICIALIZAR AGENDADOR (Chamado no main.go) ---
func StartBackupScheduler() {
	c := cron.New()

	// "0 3 * * *" significa: Todo dia às 03:00 da manhã
	_, err := c.AddFunc("0 3 * * *", func() {
		fmt.Println("⏳ Iniciando backup automático diário...")
		performAutomaticBackup()
	})

	if err != nil {
		log.Println("❌ Erro ao agendar backup:", err)
		return
	}

	c.Start()
	fmt.Println("📅 Agendador de Backup iniciado: Rodará diariamente às 03:00")
}

// --- LÓGICA DO BACKUP AUTOMÁTICO ---
func performAutomaticBackup() {
	// 1. Gerar os dados
	backupData, err := generateBackupData()
	if err != nil {
		log.Println("❌ Erro ao gerar dados do backup:", err)
		return
	}

	// 2. Criar pasta local se não existir
	backupDir := "./backups"
	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		os.Mkdir(backupDir, 0755)
	}

	// 3. Salvar Arquivo Localmente
	filename := fmt.Sprintf("backup_auto_%s.json", time.Now().Format("2006-01-02_15-04-05"))
	filepath := fmt.Sprintf("%s/%s", backupDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		log.Println("❌ Erro ao criar arquivo local:", err)
		return
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(backupData); err != nil {
		log.Println("❌ Erro ao escrever JSON:", err)
		return
	}

	log.Println("✅ Backup salvo localmente:", filepath)

	// 4. Enviar por E-mail
	// CORREÇÃO: Removemos o segundo argumento 'filename' que não era usado
	sendBackupEmail(filepath)
}

// --- ENVIO DE EMAIL (SMTP) ---
// CORREÇÃO: Removemos o parâmetro 'filename' da assinatura da função
func sendBackupEmail(attachmentPath string) {
	// Configurações do E-mail
	emailFrom := "backup@oemcontelados.com.br"
	emailTo := "backup@oemcontelados.com.br"
	emailPass := "#copia@2026"
	smtpHost := "smtp.hostinger.com"
	smtpPort := 465

	m := gomail.NewMessage()
	m.SetHeader("From", emailFrom)
	m.SetHeader("To", emailTo)
	m.SetHeader("Subject", fmt.Sprintf("Backup Diário - %s", time.Now().Format("02/01/2006")))
	m.SetBody("text/plain", "Segue em anexo o backup automático do sistema OEM Sales.")
	m.Attach(attachmentPath)

	d := gomail.NewDialer(smtpHost, smtpPort, emailFrom, emailPass)

	// Envio
	if err := d.DialAndSend(m); err != nil {
		log.Println("❌ Erro ao enviar e-mail:", err)
	} else {
		log.Println("📧 E-mail de backup enviado com sucesso para", emailTo)
	}
}

// --- FUNÇÃO AUXILIAR PARA GERAR A STRUCT (Reutilizável) ---
func generateBackupData() (BackupData, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	fullBackup := BackupData{
		Timestamp: time.Now(),
		Data:      make(map[string][]bson.M),
	}

	for _, colName := range collectionsToBackup {
		cursor, err := Db.Collection(colName).Find(ctx, bson.M{})
		if err != nil {
			return fullBackup, err
		}

		var docs []bson.M
		if err = cursor.All(ctx, &docs); err != nil {
			return fullBackup, err
		}
		fullBackup.Data[colName] = docs
	}
	return fullBackup, nil
}

// --- DOWNLOAD MANUAL (Rota API) ---
func DownloadBackup(c *fiber.Ctx) error {
	data, err := generateBackupData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao gerar dados"})
	}

	filename := fmt.Sprintf("backup_manual_%s.json", time.Now().Format("2006-01-02_15-04"))
	c.Set("Content-Disposition", "attachment; filename="+filename)
	c.Set("Content-Type", "application/json")

	return c.JSON(data)
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

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	// 3. Processar cada coleção
	for colName, docs := range backup.Data {
		// Validação de segurança
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

		// Limpar e Restaurar
		collection.Drop(ctx)

		if len(docs) == 0 {
			continue
		}

		var interfaces []interface{}
		for _, doc := range docs {
			// Correção de _id
			if idStr, ok := doc["_id"].(string); ok {
				if oid, err := primitive.ObjectIDFromHex(idStr); err == nil {
					doc["_id"] = oid
				}
			}
			// Correção de Datas
			dateFields := []string{"start_date", "created_at", "CreatedAt", "timestamp"}
			for _, field := range dateFields {
				if val, ok := doc[field].(string); ok {
					if parsed, err := time.Parse(time.RFC3339, val); err == nil {
						doc[field] = parsed
					}
				}
			}
			interfaces = append(interfaces, doc)
		}

		if _, err := collection.InsertMany(ctx, interfaces); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Erro ao inserir em " + colName})
		}
	}

	return c.JSON(fiber.Map{"message": "Sistema restaurado com sucesso!", "timestamp": backup.Timestamp})
}
