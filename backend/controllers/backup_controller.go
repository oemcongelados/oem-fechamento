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

// --- INICIALIZAR AGENDADOR ---
func StartBackupScheduler() {
	c := cron.New()

	// Backup Automático Diário às 03:00
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
	data, err := generateBackupData()
	if err != nil {
		log.Println("❌ Erro ao gerar dados:", err)
		return
	}

	filepath, err := saveBackupLocally(data, "auto")
	if err != nil {
		log.Println("❌ Erro ao salvar arquivo:", err)
		return
	}

	log.Println("✅ Backup automático salvo:", filepath)

	// Tenta enviar e-mail (ignora erro no automático para não travar log)
	if err := sendBackupEmail(filepath); err != nil {
		log.Println("⚠️ Falha no envio de e-mail automático:", err)
	}
}

// --- DOWNLOAD MANUAL (Rota API) ---
func DownloadBackup(c *fiber.Ctx) error {
	// 1. Gerar Dados
	data, err := generateBackupData()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao gerar dados do banco"})
	}

	// 2. Salvar Localmente
	filepath, err := saveBackupLocally(data, "manual")
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao salvar arquivo local"})
	}

	// 3. Enviar E-mail (Síncrono para confirmação)
	emailErr := sendBackupEmail(filepath)

	// Adiciona cabeçalho personalizado para avisar o frontend sobre o status do email
	if emailErr != nil {
		c.Set("X-Email-Status", "failed")
		log.Println("❌ Erro ao enviar e-mail manual:", emailErr)
	} else {
		c.Set("X-Email-Status", "sent")
		log.Println("📧 E-mail manual enviado com sucesso!")
	}

	// 4. Retornar Download
	filename := fmt.Sprintf("backup_manual_%s.json", time.Now().Format("2006-01-02_15-04"))
	c.Set("Content-Disposition", "attachment; filename="+filename)
	c.Set("Content-Type", "application/json")

	return c.JSON(data)
}

// --- FUNÇÃO AUXILIAR: SALVAR ARQUIVO LOCAL ---
func saveBackupLocally(data BackupData, prefix string) (string, error) {
	backupDir := "./backups"
	if _, err := os.Stat(backupDir); os.IsNotExist(err) {
		os.Mkdir(backupDir, 0755)
	}

	filename := fmt.Sprintf("backup_%s_%s.json", prefix, time.Now().Format("2006-01-02_15-04-05"))
	filepath := fmt.Sprintf("%s/%s", backupDir, filename)

	file, err := os.Create(filepath)
	if err != nil {
		return "", err
	}
	defer file.Close()

	encoder := json.NewEncoder(file)
	encoder.SetIndent("", "  ")
	if err := encoder.Encode(data); err != nil {
		return "", err
	}

	return filepath, nil
}

// --- ENVIO DE EMAIL (SMTP) ---
// Agora retorna 'error' para confirmação
func sendBackupEmail(attachmentPath string) error {
	emailFrom := "backup@oemcontelados.com.br"
	emailTo := "backup@oemcontelados.com.br"
	emailPass := "#copia@2026"
	smtpHost := "smtp.hostinger.com"
	smtpPort := 465

	m := gomail.NewMessage()
	m.SetHeader("From", emailFrom)
	m.SetHeader("To", emailTo)
	m.SetHeader("Subject", fmt.Sprintf("Backup do Sistema - %s", time.Now().Format("02/01/2006 15:04")))
	m.SetBody("text/plain", "Segue em anexo o arquivo de backup.")
	m.Attach(attachmentPath)

	d := gomail.NewDialer(smtpHost, smtpPort, emailFrom, emailPass)

	if err := d.DialAndSend(m); err != nil {
		return err
	}
	return nil
}

// --- FUNÇÃO AUXILIAR PARA GERAR DADOS ---
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

// --- RESTAURAR BACKUP (Upload) ---
func RestoreBackup(c *fiber.Ctx) error {
	file, err := c.FormFile("backup_file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Arquivo não enviado"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "Erro ao abrir arquivo"})
	}
	defer f.Close()

	var backup BackupData
	if err := json.NewDecoder(f).Decode(&backup); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "Arquivo inválido ou corrompido"})
	}

	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	for colName, docs := range backup.Data {
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
		collection.Drop(ctx)

		if len(docs) == 0 {
			continue
		}

		var interfaces []interface{}
		for _, doc := range docs {
			if idStr, ok := doc["_id"].(string); ok {
				if oid, err := primitive.ObjectIDFromHex(idStr); err == nil {
					doc["_id"] = oid
				}
			}
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
