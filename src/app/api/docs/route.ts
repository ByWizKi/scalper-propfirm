/**
 * Route pour servir la documentation Swagger
 */

import { swaggerSpec } from "@/api/config/swagger.config"
import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(swaggerSpec)
}

