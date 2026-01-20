package config

import "os"

func GetJWTSecret() []byte {
	// 1. Tenta pegar a chave de uma variável de ambiente (Segurança para Produção)
	envSecret := os.Getenv("JWT_SECRET")
	if envSecret != "" {
		return []byte(envSecret)
	}

	// 2. Fallback: Chave fixa para desenvolvimento local
	// Importante: Esta chave deve ser a mesma usada para GERAR o token no login
	return []byte("oem@secret_key_super_segura#2026")
}
