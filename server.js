import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { cedSource, getUnit, units } from "./data/ced.js";
import { generateLocalQuestion } from "./data/questionTemplates.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = join(__dirname, "public");

await loadEnvFile(join(__dirname, ".env"));

const host = process.env.HOST || "127.0.0.1";
const port = Number(process.env.PORT || 5173);
const aiProvider = "gemini";
const model = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || "";
const memoryStore = { users: [] };
const sessionSecret = process.env.SESSION_SECRET || "local-dev-session-secret-change-me";
let sql;
let dbReady;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

async function loadEnvFile(path) {
  try {
    const file = await readFile(path, "utf8");
    for (const line of file.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (process.env[key]) continue;
      process.env[key] = rawValue.replace(/^["']|["']$/g, "");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

const questionSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "type",
    "unitId",
    "unitTitle",
    "topic",
    "difficulty",
    "questionKind",
    "prompt",
    "choices",
    "correctAnswer",
    "rubric",
    "explanation",
    "wrongAnswerFeedback",
    "graphHint",
    "diagramSvg",
    "cedAlignment"
  ],
  properties: {
    type: { type: "string", enum: ["mcq", "frq"] },
    unitId: { type: "string" },
    unitTitle: { type: "string" },
    topic: { type: "string" },
    difficulty: { type: "string", enum: ["foundational", "exam", "challenge"] },
    questionKind: { type: "string" },
    prompt: { type: "string" },
    choices: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["id", "text"],
        properties: {
          id: { type: "string", enum: ["A", "B", "C", "D"] },
          text: { type: "string" }
        }
      }
    },
    correctAnswer: { type: "string" },
    rubric: { type: "array", items: { type: "string" } },
    explanation: { type: "string" },
    wrongAnswerFeedback: {
      type: "object",
      additionalProperties: false,
      required: ["A", "B", "C", "D"],
      properties: {
        A: { type: "string" },
        B: { type: "string" },
        C: { type: "string" },
        D: { type: "string" }
      }
    },
    graphHint: { type: "string" },
    diagramSvg: { type: "string" },
    cedAlignment: { type: "string" }
  }
};

const evaluationSchema = {
  type: "object",
  additionalProperties: false,
  required: ["score", "maxScore", "isCorrect", "feedback", "strengths", "nextStep"],
  properties: {
    score: { type: "number" },
    maxScore: { type: "number" },
    isCorrect: { type: "boolean" },
    feedback: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    nextStep: { type: "string" }
  }
};

function json(res, status, payload) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function setJsonCookie(res, token) {
  const parts = [
    `ap_em_session=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    "Max-Age=2592000"
  ];
  res.setHeader("Set-Cookie", parts.join("; "));
}

function clearSessionCookie(res) {
  res.setHeader("Set-Cookie", "ap_em_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function getCookie(req, name) {
  const cookies = String(req.headers.cookie || "").split(";").map((item) => item.trim());
  const pair = cookies.find((item) => item.startsWith(`${name}=`));
  return pair ? decodeURIComponent(pair.slice(name.length + 1)) : "";
}

function signSession(userId, nonce = randomBytes(12).toString("hex")) {
  const payload = Buffer.from(JSON.stringify({ userId, nonce })).toString("base64url");
  const signature = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(token) {
  const [payload, signature] = String(token || "").split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", sessionSecret).update(payload).digest("base64url");
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")).userId || null;
  } catch {
    return null;
  }
}

async function parseJson(req) {
  let body = "";
  for await (const chunk of req) body += chunk;
  return body ? JSON.parse(body) : {};
}

function hasUsableKey(value, placeholder) {
  return Boolean(value && value.trim() && value.trim() !== placeholder);
}

async function readStore() {
  if (!databaseUrl) return memoryStore;
  await ensureDb();
  const rows = await sql`
    select id, name, email, salt, password_hash, answered, correct, streak, created_at, updated_at
    from users
    order by created_at asc
  `;
  return {
    users: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      salt: row.salt,
      passwordHash: row.password_hash,
      answered: Number(row.answered || 0),
      correct: Number(row.correct || 0),
      streak: Number(row.streak || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }))
  };
}

async function writeStore(store) {
  if (!databaseUrl) {
    memoryStore.users = store.users;
    return;
  }
  await ensureDb();
  for (const user of store.users) {
    await sql`
      insert into users (id, name, email, salt, password_hash, answered, correct, streak, created_at, updated_at)
      values (
        ${user.id},
        ${user.name},
        ${user.email},
        ${user.salt},
        ${user.passwordHash},
        ${user.answered || 0},
        ${user.correct || 0},
        ${user.streak || 0},
        ${user.createdAt ? new Date(user.createdAt) : new Date()},
        ${user.updatedAt ? new Date(user.updatedAt) : null}
      )
      on conflict (id) do update set
        name = excluded.name,
        email = excluded.email,
        salt = excluded.salt,
        password_hash = excluded.password_hash,
        answered = excluded.answered,
        correct = excluded.correct,
        streak = excluded.streak,
        updated_at = excluded.updated_at
    `;
  }
}

async function ensureDb() {
  if (!databaseUrl) return;
  if (!dbReady) {
    dbReady = (async () => {
      const postgres = (await import("postgres")).default;
      sql = postgres(databaseUrl, {
        max: 3,
        ssl: databaseUrl.includes("sslmode=disable") ? false : "require"
      });
      await sql`
        create table if not exists users (
          id text primary key,
          name text not null,
          email text not null unique,
          salt text not null,
          password_hash text not null,
          answered integer not null default 0,
          correct integer not null default 0,
          streak integer not null default 0,
          created_at timestamptz not null default now(),
          updated_at timestamptz
        )
      `;
    })();
  }
  await dbReady;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    answered: user.answered || 0,
    correct: user.correct || 0,
    streak: user.streak || 0
  };
}

function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

function verifyPassword(password, user) {
  const candidate = Buffer.from(hashPassword(password, user.salt).hash, "hex");
  const stored = Buffer.from(user.passwordHash, "hex");
  return candidate.length === stored.length && timingSafeEqual(candidate, stored);
}

async function getCurrentUser(req) {
  const token = getCookie(req, "ap_em_session");
  const userId = verifySession(token);
  if (!userId) return null;
  const store = await readStore();
  return store.users.find((user) => user.id === userId) || null;
}

async function handleSignup(req, res) {
  const body = await parseJson(req);
  const name = String(body.name || "").trim();
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (name.length < 2 || !email.includes("@") || password.length < 6) {
    json(res, 400, { error: "Enter a name, valid email, and password with at least 6 characters." });
    return;
  }
  const store = await readStore();
  if (store.users.some((user) => user.email === email)) {
    json(res, 409, { error: "An account with that email already exists." });
    return;
  }
  const { salt, hash } = hashPassword(password);
  const user = {
    id: randomBytes(12).toString("hex"),
    name,
    email,
    salt,
    passwordHash: hash,
    answered: 0,
    correct: 0,
    streak: 0,
    createdAt: new Date().toISOString()
  };
  store.users.push(user);
  await writeStore(store);
  setJsonCookie(res, signSession(user.id));
  json(res, 201, { user: publicUser(user), leaderboard: leaderboardFromStore(store) });
}

async function handleLogin(req, res) {
  const body = await parseJson(req);
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  const store = await readStore();
  const user = store.users.find((item) => item.email === email);
  if (!user || !verifyPassword(password, user)) {
    json(res, 401, { error: "Invalid email or password." });
    return;
  }
  setJsonCookie(res, signSession(user.id));
  json(res, 200, { user: publicUser(user), leaderboard: leaderboardFromStore(store) });
}

async function handleLogout(req, res) {
  clearSessionCookie(res);
  json(res, 200, { ok: true });
}

async function handleMe(req, res) {
  const [user, store] = await Promise.all([getCurrentUser(req), readStore()]);
  json(res, 200, { user: publicUser(user), leaderboard: leaderboardFromStore(store) });
}

function leaderboardFromStore(store) {
  return [...store.users]
    .sort((a, b) => (b.correct || 0) - (a.correct || 0) || (b.answered || 0) - (a.answered || 0))
    .slice(0, 20)
    .map((user, index) => ({
      rank: index + 1,
      name: user.name,
      correct: user.correct || 0,
      answered: user.answered || 0,
      accuracy: user.answered ? Math.round(((user.correct || 0) / user.answered) * 100) : 0
    }));
}

async function recordResult(req, evaluation) {
  const token = getCookie(req, "ap_em_session");
  const userId = verifySession(token);
  if (!userId) return null;
  const store = await readStore();
  const user = store.users.find((item) => item.id === userId);
  if (!user) return null;
  const correct = evaluation.isCorrect || evaluation.score / Math.max(evaluation.maxScore, 1) >= 0.75;
  user.answered = (user.answered || 0) + 1;
  user.correct = (user.correct || 0) + (correct ? 1 : 0);
  user.streak = correct ? (user.streak || 0) + 1 : 0;
  user.updatedAt = new Date().toISOString();
  await writeStore(store);
  return { user: publicUser(user), leaderboard: leaderboardFromStore(store) };
}

function createAgentPrompt(unit, topic, difficulty, type) {
  return [
    `You are the AP Physics C: Electricity and Magnetism Unit ${unit.number} practice-question agent.`,
    `Unit: ${unit.title}. Exam weighting: ${unit.examWeight}. Unit theme: ${unit.theme}`,
    `Allowed topics for this unit: ${unit.topics.join("; ")}.`,
    `Target topic: ${topic || "choose the most useful topic from the unit"}.`,
    `Question type: ${type}. Difficulty: ${difficulty}.`,
    "Generate one original AP-style practice question. Do not quote, paraphrase closely, or reproduce released College Board questions.",
    "Match the style of AP Physics C: Electricity and Magnetism: compact scenario, symbolic variables, calculus-based reasoning, physical justification, and plausible distractors based on common errors.",
    "Use released AP materials only as style inspiration, never as text to copy. Avoid distinctive published numbers, diagrams, names, and wording.",
    "Keep physics precise. This is calculus-based AP Physics C: Electricity and Magnetism, so use vectors, integrals, derivatives, units, signs, and limiting cases when appropriate.",
    "Prefer AP-appropriate constants and variables. Include enough numerical or symbolic information for a unique solution.",
    "Set questionKind to a short label naming the task type, such as 'Gauss law derivation', 'Electric flux', 'RC differential equation', 'Right-hand rule', or 'Motional emf'.",
    "For MCQ, provide exactly four choices A-D and make only one answer correct.",
    "For FRQ, put an empty choices array, use correctAnswer as a concise model solution, and include rubric bullets.",
    "Explanations must teach why the correct answer is right and why tempting mistakes fail. Show dimensional reasoning when helpful.",
    "If a diagram, graph, field-line sketch, circuit schematic, or sign convention is relevant, describe what the student should draw or inspect in graphHint; otherwise use an empty string.",
    "If a simple diagram is useful, include a clean inline SVG in diagramSvg. Otherwise use an empty string. Use no scripts, event handlers, external images, or foreignObject in SVG."
  ].join("\n");
}

async function callGemini({ messages, schema }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!hasUsableKey(apiKey, "replace_with_a_gemini_key")) return null;

  const systemText = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const userText = messages
    .filter((message) => message.role !== "system")
    .map((message) => message.content)
    .join("\n\n");

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: systemText
        ? {
            parts: [{ text: systemText }]
          }
        : undefined,
      contents: [
        {
          role: "user",
          parts: [{ text: userText }]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseJsonSchema: schema
      }
    })
    }
  );

  const payload = await response.json();
  if (!response.ok) {
    const message = payload?.error?.message || "Gemini request failed.";
    throw new Error(message);
  }

  const outputText = payload.candidates?.[0]?.content?.parts
    ?.map((part) => part.text || "")
    .join("")
    .trim();

  if (!outputText) throw new Error("Gemini returned no structured output.");
  return JSON.parse(outputText);
}

async function callAI(options) {
  try {
    return await callGemini(options);
  } catch (error) {
    console.warn(`AI provider unavailable; using fallback. ${error.message}`);
    return null;
  }
}

async function handleGenerate(req, res) {
  const body = await parseJson(req);
  const unit = getUnit(body.unitId) || units[0];
  const type = body.type === "frq" ? "frq" : "mcq";
  const difficulty = ["foundational", "exam", "challenge"].includes(body.difficulty)
    ? body.difficulty
    : "exam";
  const topic = unit.topics.includes(body.topic) ? body.topic : "";

  const messages = [
    { role: "system", content: createAgentPrompt(unit, topic, difficulty, type) },
    {
      role: "user",
      content:
        "Create the next unique practice item now. Use fresh names, numbers, and scenarios when useful."
    }
  ];

  const generated = await callAI({
    messages,
    schema: questionSchema,
    name: "ap_physics_em_question"
  });

  json(res, 200, {
    question: generated || generateLocalQuestion(unit, topic, difficulty, type),
    usedFallback: !generated,
    provider: generated ? aiProvider : "local",
    model: generated ? model : null
  });
}

async function handleEvaluate(req, res) {
  const body = await parseJson(req);
  const question = body.question;
  const answer = String(body.answer || "").trim();
  if (!question || !answer) {
    json(res, 400, { error: "Question and answer are required." });
    return;
  }

  if (question.type === "mcq") {
    const isCorrect = answer === question.correctAnswer;
    const evaluation = {
        score: isCorrect ? 1 : 0,
        maxScore: 1,
        isCorrect,
        feedback: isCorrect
          ? question.explanation
          : question.wrongAnswerFeedback?.[answer] || question.explanation,
        strengths: isCorrect ? ["You identified the correct physical relationship."] : [],
        nextStep: isCorrect
          ? "Try a harder version or switch to a related topic."
          : "Review the explanation, then generate another item on the same topic."
      };
    const account = await recordResult(req, evaluation);
    json(res, 200, { evaluation, account });
    return;
  }

  const messages = [
    {
      role: "system",
      content:
        "You are an AP Physics C: Electricity and Magnetism FRQ grader. Grade the student's answer against the provided rubric. Be fair, concise, and instructional. Check units, signs, calculus, diagrams, and physical reasoning. Return JSON only."
    },
    {
      role: "user",
      content: JSON.stringify({ question, studentAnswer: answer })
    }
  ];

  const evaluation = await callAI({
    messages,
    schema: evaluationSchema,
    name: "ap_physics_em_evaluation"
  });

  const finalEvaluation =
    evaluation || {
        score: 0,
        maxScore: question.rubric?.length || 4,
        isCorrect: false,
        feedback:
          "AI grading is unavailable, so compare your response to the model answer and rubric.",
        strengths: [],
        nextStep: "Check that your answer defines variables, uses the correct law, includes units, and justifies direction or sign."
      };
  const account = await recordResult(req, finalEvaluation);
  json(res, 200, { evaluation: finalEvaluation, account });
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const safePath = normalize(requestedPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);
  if (!filePath.startsWith(publicDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { "content-type": mimeTypes[extname(filePath)] || "application/octet-stream" });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/signup") {
      await handleSignup(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/login") {
      await handleLogin(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/logout") {
      await handleLogout(req, res);
      return;
    }
    if (req.url === "/api/me") {
      await handleMe(req, res);
      return;
    }
    if (req.url === "/api/leaderboard") {
      json(res, 200, { leaderboard: leaderboardFromStore(await readStore()) });
      return;
    }
    if (req.url === "/api/ced") {
      json(res, 200, { units, cedSource });
      return;
    }
    if (req.method === "POST" && req.url === "/api/generate") {
      await handleGenerate(req, res);
      return;
    }
    if (req.method === "POST" && req.url === "/api/evaluate") {
      await handleEvaluate(req, res);
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, { error: error.message || "Unexpected server error." });
  }
}).listen(port, host, () => {
  console.log(`AP Physics C: E&M Practice Agents running at http://${host}:${port}`);
});
