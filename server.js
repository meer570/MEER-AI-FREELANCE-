```js
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "100kb" }));
app.use(express.static(path.join(__dirname, "public")));

const taskInstructions = {
  "freelance-proposal":
    "Write a professional freelance proposal tailored to the client's needs.",
  "client-reply":
    "Write a polite, professional reply to the client.",
  "website-plan":
    "Create a practical website plan with features and implementation steps.",
  "coding-task":
    "Help solve the coding task. Explain the code and provide testing steps.",
  "youtube-script":
    "Write an original YouTube script with a hook, narration, and ending. Avoid copying copyrighted scripts."
};

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    agent: "Meer AI Freelance",
    status: "running",
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    message: process.env.GEMINI_API_KEY
      ? "Server running; Gemini key detected."
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

  if (!taskInstructions[task]) {
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
      message: "Gemini API key is missing. Check your Codespaces secret."
    });
  }

  try {
    const prompt =
      "You are MEER AI, a helpful freelance assistant.\n" +
      taskInstructions[task] +
      "\nBe accurate, useful, and original. Do not invent facts.\n\n" +
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
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 4096
          }
        }),
        signal: AbortSignal.timeout(60000)
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error(
        "Gemini API status:",
        response.status,
        "Error:",
        data.error?.message || "No error details returned"
      );

      let message = "Gemini API request failed. Check server logs.";

      if (response.status === 400 || response.status === 401 || response.status === 403) {
        message = "Gemini rejected the request. Check API key, API access, and billing/quota settings.";
      } else if (response.status === 404) {
        message = "Gemini model or endpoint not found. Check the model available to your API key.";
      } else if (response.status === 429) {
        message = "Gemini API quota reached. Check your quota and try later.";
      }

      return res.status(502).json({
        success: false,
        message
      });
    }

    const output = (data.candidates || [])
      .flatMap(candidate => candidate.content?.parts || [])
      .map(part => part.text || "")
      .join("\n")
      .trim();

    if (!output) {
      return res.status(502).json({
        success: false,
        message: "Gemini returned no text. Check server logs."
      });
    }

    return res.json({
      success: true,
      agent: "Meer AI Freelance",
      task,
      status: "completed",
      output,
      message: output
    });
  } catch (error) {
    console.error("Gemini connection error:", error.message);

    return res.status(502).json({
      success: false,
      message: "Could not connect to Gemini. Check your server and try again."
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
```
