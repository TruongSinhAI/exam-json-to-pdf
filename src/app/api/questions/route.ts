import { NextResponse } from "next/server"
import fs from "fs"
import path from "path"
import type { Question } from "@/lib/types"

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "ab-100.json")
    const fileContent = fs.readFileSync(filePath, "utf-8")
    const jsonData = JSON.parse(fileContent)

    if (jsonData.status !== "success" || !Array.isArray(jsonData.data)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 500 })
    }

    const questions: Question[] = jsonData.data

    return NextResponse.json({
      status: "success",
      data: questions,
      total: questions.length,
    })
  } catch (error) {
    console.error("Error reading questions:", error)
    return NextResponse.json({ error: "Failed to load questions" }, { status: 500 })
  }
}
