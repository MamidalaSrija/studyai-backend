const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// AI helper with retry
async function askAI(prompt) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: prompt,
      });

      return response.text;
    } catch (error) {
      console.log(`AI attempt ${attempt} failed:`, error.status);

      if (attempt === 5) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

// Home
app.get("/", (req, res) => {
  res.json({
    message: "StudyAI backend is running",
  });
});

// Doubt Solver
app.post("/api/doubt", async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || !question.trim()) {
      return res.status(400).json({
        error: "Please provide a question.",
      });
    }

    const answer = await askAI(`
You are StudyAI, a helpful college study assistant.

Answer the student's question clearly and simply.
Explain difficult concepts step by step.
Use examples when useful.
Do not invent facts.

Student question:
${question}
`);

    res.json({ answer });
  } catch (error) {
    console.error("Doubt Solver Error:", error);

    res.status(500).json({
      error: "Unable to generate an answer right now.",
    });
  }
});

// Notes Summarizer
app.post("/api/summarize", async (req, res) => {
  try {
    const { notes } = req.body;

    if (!notes || !notes.trim()) {
      return res.status(400).json({
        error: "Please provide notes.",
      });
    }

    const summary = await askAI(`
You are StudyAI, a college study assistant.

Summarize the following study notes.

Give:
1. Short Summary
2. Key Points
3. Important Terms
4. Revision Tip

Keep everything clear and easy to understand.

Notes:
${notes}
`);

    res.json({ summary });
 } catch (error) {
  console.error("Summarizer Error:", error);

  res.status(500).json({
    error: "Unable to summarize the notes right now.",
    details: error.message,
    status: error.status,
  });
}
});

// Quiz Generator
app.post("/api/quiz", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic || !topic.trim()) {
      return res.status(400).json({
        error: "Please provide a topic.",
      });
    }

    const quizText = await askAI(`
You are StudyAI, a college quiz generator.

Create exactly 5 multiple-choice questions about:
${topic}

Return ONLY valid JSON in this format:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "answer": "Correct option"
    }
  ]
}

Each question must have exactly 4 options.
The answer must exactly match one of the options.
`);

    const cleanText = quizText
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const quiz = JSON.parse(cleanText);

    res.json(quiz);
  } catch (error) {
    console.error("Quiz Generator Error:", error);

    res.status(500).json({
      error: "Unable to generate the quiz right now.",
    });
  }
});

// Study Planner
app.post("/api/plan", async (req, res) => {
  try {
    const { subject, hours } = req.body;

    if (!subject || !subject.trim()) {
      return res.status(400).json({
        error: "Please provide a subject.",
      });
    }

    if (!hours || Number(hours) <= 0) {
      return res.status(400).json({
        error: "Please provide valid study hours.",
      });
    }

    const plan = await askAI(`
You are StudyAI, a college study planner.

Create a practical study plan for:

Subject: ${subject}
Available study time: ${hours} hour(s)

Include:
- Learning concepts
- Examples
- Practice questions
- Revision
- Short breaks

Make the plan realistic and easy for a college student to follow.
`);

    res.json({ plan });
  } catch (error) {
    console.error("Study Planner Error:", error);

    res.status(500).json({
      error: "Unable to create the study plan right now.",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`StudyAI backend running on port ${PORT}`);
});