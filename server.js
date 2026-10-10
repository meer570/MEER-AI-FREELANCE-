
const express = require("express");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    agent: "Meer AI Freelance",
    status: "running",
    message: "Server is working!"
  });
});

app.post("/api/task", (req, res) => {
  const { task, brief } = req.body;

  if (!task || !brief || !brief.trim()) {
    return res.status(400).json({
      success: false,
      message: "Please provide a task and task details."
    });
  }

  const allowedTasks = [
    "freelance-proposal",
    "client-reply",
    "website-plan",
    "coding-task",
    "youtube-script"
  ];

  if (!allowedTasks.includes(task)) {
    return res.status(400).json({
      success: false,
      message: "This task type is not supported yet."
    });
  }

  res.json({
    success: true,
    agent: "Meer AI Freelance",
    task,
    brief: brief.trim(),
    status: "received",
    message:
      "Task received. AI generation will be connected in a later step."
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found."
  });
});

app.listen(PORT, () => {
  console.log(`Meer AI Freelance is running on port ${PORT}`);
});
