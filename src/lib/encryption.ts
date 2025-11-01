/**
 * Chiffrement des données sensibles
 */

import crypto from "crypto"

const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-key-change-me-in-production-32-chars!!"
const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16

export function encrypt(text: string): string {
  try {
    // Générer un IV aléatoire
    const iv = crypto.randomBytes(IV_LENGTH)

    // Créer le cipher
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv)

    // Chiffrer
    let encrypted = cipher.update(text, "utf8", "hex")
    encrypted += cipher.final("hex")

    // Récupérer l'auth tag
    const authTag = cipher.getAuthTag()

    // Retourner iv:authTag:encrypted
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
  } catch (error) {
    console.error("Erreur de chiffrement:", error)
    throw new Error("Échec du chiffrement")
  }
}

export function decrypt(encryptedData: string): string {
  try {
    // Séparer iv:authTag:encrypted
    const parts = encryptedData.split(":")
    if (parts.length !== 3) {
      throw new Error("Format de données chiffrées invalide")
    }

    const iv = Buffer.from(parts[0], "hex")
    const authTag = Buffer.from(parts[1], "hex")
    const encrypted = parts[2]

    // Créer le decipher
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      Buffer.from(ENCRYPTION_KEY.slice(0, 32)),
      iv
    )

    decipher.setAuthTag(authTag)

    // Déchiffrer
    let decrypted = decipher.update(encrypted, "hex", "utf8")
    decrypted += decipher.final("utf8")

    return decrypted
  } catch (error) {
    console.error("Erreur de déchiffrement:", error)
    throw new Error("Échec du déchiffrement")
  }
}

// Fonction pour hacher (one-way, pour les données qui n'ont pas besoin d'être déchiffrées)
export function hash(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex")
}

// Vérifier si une clé de chiffrement est configurée
export function isEncryptionConfigured(): boolean {
  return (
    ENCRYPTION_KEY !== "default-key-change-me-in-production-32-chars!!" &&
    ENCRYPTION_KEY.length >= 32
  )
}
