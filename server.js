
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const instructions = {
  "freelance-proposal": "Write a professional, tailored freelance proposal.",
  "client-reply": "Write a polite, professional reply to the client.",
  "website-plan": "Create a practical website plan with features and steps.",
  "coding-task": "Solve the coding task with safe, clear code and testing steps.",
  "youtube-script": "Write an original YouTube script with a hook, narration and ending."
};

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    agent: "Meer AI Freelance",
    status: "running",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    message: process.env.GEMINI_API_KEY
      ? "Server and AI configuration detected."
      : "GEMINI_API_KEY is missing."
  });
});

app.post("/api/task", async (req, res) => {
  const { task, brief } = req.body || {};

  if (
    typeof task !== "string" ||
    typeof brief !== "string" ||
    !brief.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Please enter your task details."
    });
  }

  if (!instructions[task]) {
    return res.status(400).json({
      success: false,
      message: "Unsupported task type."
    });
  }

  if (brief.length > 12000) {
    return res.status(400).json({
      success: false,
      message: "Please keep task details under 12,000 characters."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      success: false,
      message: "Gemini key missing. Restart your Codespace after adding the secret."
    });
  }

  try {
    const prompt =
      "You are MEER AI, a helpful freelance assistant.\n\n" +
      instructions[task] +
      "\nBe accurate. Do not invent facts. State assumptions when needed.\n\n" +
      "USER TASK:\n" + brief.trim();

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 4096 }
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", response.status);
      return res.status(502).json({
        success: false,
        message: response.status === 429
          ? "Gemini quota reached. Check your API quota."
          : "Gemini request failed. Check your key, model access and server logs."
      });
    }

    const output = (data.candidates || [])
      .flatMap(c => c.content?.parts || [])
      .map(p => p.text || "")
      .join("\n")
      .trim();

    if (!output) {
      return res.status(502).json({
        success: false,
        message: "Gemini returned no text. Please try again."
      });
    }

    res.json({
      success: true,
      agent: "Meer AI Freelance",
      task,
      status: "completed",
      output,
      message: output
    });
  } catch (error) {
    console.error("Gemini request failed:", error.message);
    res.status(502).json({
      success: false,
      message: "Could not reach Gemini. Please try again."
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.listen(PORT, () => {
  console.log("Meer AI Freelance is running on port " + PORT);
});
