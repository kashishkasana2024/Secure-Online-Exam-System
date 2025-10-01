const express = require("express")
const fs = require("fs")
const path = require("path")
const cors = require("cors")
const bodyParser = require("body-parser")

const app = express()
const PORT = 4000

app.use(cors())
app.use(bodyParser.json({ limit: "10mb" }))

// Folder for screenshots
const screenshotsDir = path.join(__dirname, "screenshots")
if (!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir)

// Log file for proctoring events
const logFile = path.join(__dirname, "proctor_events.log")

// 📸 Receive snapshot
app.post("/api/proctor/snapshot", (req, res) => {
  const { userId, examId, imageBase64, timestamp } = req.body
  if (!userId || !examId || !imageBase64) {
    return res.status(400).json({ error: "Missing fields" })
  }

  const filename = `${userId}_${examId}_${Date.now()}.png`
  const filePath = path.join(screenshotsDir, filename)
  const base64Data = imageBase64.replace(/^data:image\/png;base64,/, "")

  fs.writeFileSync(filePath, base64Data, "base64")
  console.log("Snapshot saved:", filename)
  res.json({ success: true, file: filename })
})

//  Receive proctoring event
app.post("/api/proctor/event", (req, res) => {
  const { userId, examId, type, details, timestamp } = req.body
  const logEntry = {
    ts: timestamp || new Date().toISOString(),
    userId,
    examId,
    type,
    details
  }
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + "\n")
  console.log("Event logged:", type, logEntry)
  res.json({ success: true })
})

// Start server
app.listen(PORT, () => console.log(`✅ Backend running on http://localhost:${PORT}`))
