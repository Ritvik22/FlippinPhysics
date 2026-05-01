const state = {
  units: [],
  cedSource: null,
  selectedUnitId: "",
  selectedTopic: "",
  type: "mcq",
  difficulty: "foundational",
  currentQuestion: null,
  selectedChoice: "",
  answeredCurrent: false,
  authMode: "login",
  user: null,
  leaderboard: [],
  progress: loadProgress()
};

const els = {
  landingView: document.querySelector("#landingView"),
  appShell: document.querySelector(".app-shell"),
  loginTab: document.querySelector("#loginTab"),
  signupTab: document.querySelector("#signupTab"),
  authForm: document.querySelector("#authForm"),
  nameField: document.querySelector("#nameField"),
  nameInput: document.querySelector("#nameInput"),
  emailInput: document.querySelector("#emailInput"),
  passwordInput: document.querySelector("#passwordInput"),
  authSubmit: document.querySelector("#authSubmit"),
  authError: document.querySelector("#authError"),
  accountName: document.querySelector("#accountName"),
  logoutBtn: document.querySelector("#logoutBtn"),
  refreshLeaderboard: document.querySelector("#refreshLeaderboard"),
  leaderboardList: document.querySelector("#leaderboardList"),
  unitSelect: document.querySelector("#unitSelect"),
  topicSelect: document.querySelector("#topicSelect"),
  unitTitle: document.querySelector("#unitTitle"),
  unitStrip: document.querySelector("#unitStrip"),
  topicBadge: document.querySelector("#topicBadge"),
  kindBadge: document.querySelector("#kindBadge"),
  difficultyBadge: document.querySelector("#difficultyBadge"),
  apiBadge: document.querySelector("#apiBadge"),
  questionPrompt: document.querySelector("#questionPrompt"),
  diagramFrame: document.querySelector("#diagramFrame"),
  diagramArea: document.querySelector("#diagramArea"),
  graphHint: document.querySelector("#graphHint"),
  answerArea: document.querySelector("#answerArea"),
  submitBtn: document.querySelector("#submitBtn"),
  nextBtn: document.querySelector("#nextBtn"),
  generateBtn: document.querySelector("#generateBtn"),
  feedbackEmpty: document.querySelector("#feedbackEmpty"),
  feedbackContent: document.querySelector("#feedbackContent"),
  scorePill: document.querySelector("#scorePill"),
  feedbackText: document.querySelector("#feedbackText"),
  modelAnswerBlock: document.querySelector("#modelAnswerBlock"),
  nextStepBlock: document.querySelector("#nextStepBlock"),
  answeredCount: document.querySelector("#answeredCount"),
  accuracyCount: document.querySelector("#accuracyCount"),
  streakCount: document.querySelector("#streakCount"),
  topicProgress: document.querySelector("#topicProgress"),
  resetProgress: document.querySelector("#resetProgress")
};

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem("ap-physics-em-progress")) || {
      answered: 0,
      correct: 0,
      streak: 0,
      byTopic: {}
    };
  } catch {
    return { answered: 0, correct: 0, streak: 0, byTopic: {} };
  }
}

function saveProgress() {
  localStorage.setItem("ap-physics-em-progress", JSON.stringify(state.progress));
}

function syncProgressFromUser(user) {
  if (!user) return;
  state.progress.answered = user.answered || 0;
  state.progress.correct = user.correct || 0;
  state.progress.streak = user.streak || 0;
  saveProgress();
}

async function api(path, body) {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function currentUnit() {
  return state.units.find((unit) => unit.id === state.selectedUnitId) || state.units[0];
}

function setLoading(isLoading) {
  document.body.classList.toggle("loading", isLoading);
  els.generateBtn.disabled = isLoading;
  els.nextBtn.disabled = isLoading;
  els.submitBtn.disabled = isLoading || !canSubmit();
}

function canSubmit() {
  if (!state.currentQuestion) return false;
  if (state.answeredCurrent) return true;
  if (state.currentQuestion.type === "mcq") return Boolean(state.selectedChoice);
  return true;
}

function renderControls() {
  els.unitSelect.innerHTML = state.units
    .map((unit) => `<option value="${unit.id}">Unit ${unit.number}: ${unit.title}</option>`)
    .join("");
  els.unitSelect.value = state.selectedUnitId;
  renderTopics();
}

function renderAuthMode() {
  const isSignup = state.authMode === "signup";
  els.loginTab.classList.toggle("active", !isSignup);
  els.signupTab.classList.toggle("active", isSignup);
  els.nameField.classList.toggle("hidden", !isSignup);
  els.nameInput.required = isSignup;
  els.authSubmit.textContent = isSignup ? "Create account" : "Log in";
  els.passwordInput.autocomplete = isSignup ? "new-password" : "current-password";
  els.authError.textContent = "";
}

function renderSession() {
  const signedIn = Boolean(state.user);
  els.landingView.classList.toggle("hidden", signedIn);
  els.appShell.classList.toggle("hidden", !signedIn);
  els.accountName.textContent = signedIn ? state.user.name : "";
  renderLeaderboard();
}

function renderLeaderboard() {
  if (!state.leaderboard.length) {
    els.leaderboardList.innerHTML = `<div class="empty-state">No completed questions yet.</div>`;
    return;
  }
  els.leaderboardList.innerHTML = state.leaderboard
    .map(
      (row) => `
        <div class="leaderboard-row">
          <span class="rank">${row.rank}</span>
          <strong>${escapeHtml(row.name)}</strong>
          <span>${row.correct} correct</span>
          <span>${row.accuracy}%</span>
        </div>
      `
    )
    .join("");
}

function renderTopics() {
  const unit = currentUnit();
  els.unitTitle.textContent = `Unit ${unit.number}: ${unit.title}`;
  els.topicSelect.innerHTML = [
    `<option value="">Mixed topics in this unit</option>`,
    ...unit.topics.map((topic) => `<option value="${escapeHtml(topic)}">${escapeHtml(topic)}</option>`)
  ].join("");
  els.topicSelect.value = state.selectedTopic;
}

function renderUnitStrip() {
  els.unitStrip.innerHTML = state.units
    .map(
      (unit) => `
        <button class="unit-chip ${unit.id === state.selectedUnitId ? "active" : ""}" data-unit-id="${unit.id}" type="button">
          <strong>Unit ${unit.number}</strong>
          <span>${escapeHtml(unit.examWeight)} of MCQ score</span>
        </button>
      `
    )
    .join("");
}

function renderQuestion() {
  const question = state.currentQuestion;
  if (!question) return;

  state.selectedChoice = "";
  state.answeredCurrent = false;
  els.topicBadge.textContent = question.topic;
  els.kindBadge.textContent = question.questionKind || question.type.toUpperCase();
  els.difficultyBadge.textContent = question.difficulty;
  els.questionPrompt.innerHTML = formatMath(question.prompt);
  els.submitBtn.disabled = true;
  els.submitBtn.textContent = "Submit Answer";
  els.nextBtn.textContent = "Skip Question";

  renderDiagram(question.diagramSvg);

  if (question.graphHint) {
    els.graphHint.innerHTML = `<strong>Representation cue</strong><span>${formatMath(question.graphHint)}</span>`;
    els.graphHint.classList.remove("hidden");
  } else {
    els.graphHint.classList.add("hidden");
  }

  if (question.type === "mcq") {
    els.answerArea.innerHTML = question.choices
      .map(
        (choice) => `
          <button class="choice" data-choice="${choice.id}" type="button">
            <span class="letter">${choice.id}</span>
            <span class="choice-text">${formatMath(choice.text)}</span>
          </button>
        `
      )
      .join("");
  } else {
    els.answerArea.innerHTML = `
      <textarea id="frqAnswer" placeholder="Write your response. Include laws, variables, units, sign conventions, calculus steps, and physical reasoning."></textarea>
    `;
    els.submitBtn.disabled = false;
  }

  clearFeedback();
  typesetMath();
}

function renderStats() {
  const { answered, correct, streak } = state.progress;
  els.answeredCount.textContent = answered;
  els.accuracyCount.textContent = answered ? `${Math.round((correct / answered) * 100)}%` : "0%";
  els.streakCount.textContent = streak;
}

function renderTopicProgress() {
  const unit = currentUnit();
  els.topicProgress.innerHTML = unit.topics
    .map((topic) => {
      const key = `${unit.id}:${topic}`;
      const record = state.progress.byTopic[key] || { answered: 0, correct: 0 };
      const pct = record.answered ? Math.round((record.correct / record.answered) * 100) : 0;
      return `
        <div class="topic-card">
          <strong>${escapeHtml(topic)}</strong>
          <span>${record.answered} answered · ${pct}% correct</span>
          <div class="meter" aria-hidden="true"><div style="width:${pct}%"></div></div>
        </div>
      `;
    })
    .join("");
}

function clearFeedback() {
  els.feedbackEmpty.classList.remove("hidden");
  els.feedbackContent.classList.add("hidden");
  els.scorePill.className = "score-pill";
  els.feedbackText.textContent = "";
  els.modelAnswerBlock.textContent = "";
  els.nextStepBlock.textContent = "";
}

function showFeedback(evaluation) {
  els.feedbackEmpty.classList.add("hidden");
  els.feedbackContent.classList.remove("hidden");
  els.scorePill.textContent = `${evaluation.score}/${evaluation.maxScore}`;
  els.scorePill.className = `score-pill ${evaluation.isCorrect ? "correct" : "missed"}`;
  els.feedbackText.innerHTML = formatMath(evaluation.feedback);

  const answer = state.currentQuestion?.correctAnswer;
  els.modelAnswerBlock.innerHTML = answer
    ? `<strong>Model answer</strong><div>${formatMath(answer)}</div>`
    : "";
  els.nextStepBlock.innerHTML = evaluation.nextStep
    ? `<strong>Next step</strong><div>${formatMath(evaluation.nextStep)}</div>`
    : "";
  typesetMath();
}

async function generateQuestion() {
  setLoading(true);
  els.apiBadge.textContent = "Generating";
  try {
    const payload = await api("/api/generate", {
      unitId: state.selectedUnitId,
      topic: state.selectedTopic,
      type: state.type,
      difficulty: state.difficulty
    });
    state.currentQuestion = payload.question;
    els.apiBadge.textContent = payload.usedFallback
      ? "Local fallback"
      : `${payload.provider || "AI"} generated`;
    renderQuestion();
  } catch (error) {
    els.apiBadge.textContent = "Error";
    els.questionPrompt.textContent = error.message;
    els.answerArea.innerHTML = "";
    renderDiagram("");
    clearFeedback();
  } finally {
    setLoading(false);
  }
}

async function submitAnswer() {
  if (state.answeredCurrent) {
    await generateQuestion();
    return;
  }
  if (!state.currentQuestion) return;
  const answer =
    state.currentQuestion.type === "mcq"
      ? state.selectedChoice
      : document.querySelector("#frqAnswer")?.value || "";
  if (!answer.trim()) return;

  setLoading(true);
  try {
    const payload = await api("/api/evaluate", {
      question: state.currentQuestion,
      answer
    });
    updateProgress(payload.evaluation);
    if (payload.account?.user) {
      state.user = payload.account.user;
      state.leaderboard = payload.account.leaderboard || state.leaderboard;
      syncProgressFromUser(state.user);
      renderSession();
    }
    showFeedback(payload.evaluation);
    state.answeredCurrent = true;
    els.submitBtn.disabled = false;
    els.submitBtn.textContent = "Next Question";
    els.nextBtn.textContent = "Next Question";
  } catch (error) {
    showFeedback({
      score: 0,
      maxScore: 1,
      isCorrect: false,
      feedback: error.message,
      strengths: [],
      nextStep: "Check the server console and API key configuration."
    });
  } finally {
    setLoading(false);
  }
}

function updateProgress(evaluation) {
  if (state.user) return;
  const question = state.currentQuestion;
  const topicKey = `${question.unitId}:${question.topic}`;
  const topic = state.progress.byTopic[topicKey] || { answered: 0, correct: 0 };
  const correct = evaluation.isCorrect || evaluation.score / Math.max(evaluation.maxScore, 1) >= 0.75;

  state.progress.answered += 1;
  state.progress.correct += correct ? 1 : 0;
  state.progress.streak = correct ? state.progress.streak + 1 : 0;
  topic.answered += 1;
  topic.correct += correct ? 1 : 0;
  state.progress.byTopic[topicKey] = topic;

  saveProgress();
  renderStats();
  renderTopicProgress();
}

async function submitAuth(event) {
  event.preventDefault();
  els.authError.textContent = "";
  const path = state.authMode === "signup" ? "/api/signup" : "/api/login";
  try {
    const payload = await api(path, {
      name: els.nameInput.value,
      email: els.emailInput.value,
      password: els.passwordInput.value
    });
    state.user = payload.user;
    state.leaderboard = payload.leaderboard || [];
    syncProgressFromUser(state.user);
    renderSession();
    renderStats();
    renderTopicProgress();
    await generateQuestion();
  } catch (error) {
    els.authError.textContent = error.message;
  }
}

async function logout() {
  await api("/api/logout", {});
  state.user = null;
  state.currentQuestion = null;
  state.selectedChoice = "";
  state.answeredCurrent = false;
  renderSession();
}

async function refreshLeaderboard() {
  const payload = await api("/api/leaderboard");
  state.leaderboard = payload.leaderboard || [];
  renderLeaderboard();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMath(value) {
  return escapeHtml(value).replace(/\n/g, "<br>");
}

function renderDiagram(svg) {
  const cleanSvg = sanitizeSvg(svg);
  if (!cleanSvg) {
    els.diagramArea.innerHTML = "";
    els.diagramFrame.classList.add("hidden");
    return;
  }
  els.diagramArea.innerHTML = cleanSvg;
  els.diagramFrame.classList.remove("hidden");
}

function sanitizeSvg(svg) {
  const value = String(svg || "").trim();
  if (!value.startsWith("<svg") || !value.endsWith("</svg>")) return "";
  if (/<script|<foreignObject|\son\w+=|javascript:/i.test(value)) return "";
  return value;
}

function typesetMath() {
  if (window.MathJax?.typesetPromise) {
    window.MathJax.typesetPromise().catch(() => {});
  }
}

function bindEvents() {
  els.loginTab.addEventListener("click", () => {
    state.authMode = "login";
    renderAuthMode();
  });
  els.signupTab.addEventListener("click", () => {
    state.authMode = "signup";
    renderAuthMode();
  });
  els.authForm.addEventListener("submit", submitAuth);
  els.logoutBtn.addEventListener("click", logout);
  els.refreshLeaderboard.addEventListener("click", refreshLeaderboard);

  els.unitSelect.addEventListener("change", () => {
    state.selectedUnitId = els.unitSelect.value;
    state.selectedTopic = "";
    renderTopics();
    renderUnitStrip();
    renderTopicProgress();
  });

  els.topicSelect.addEventListener("change", () => {
    state.selectedTopic = els.topicSelect.value;
  });

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.type = button.dataset.type;
      document.querySelectorAll(".segment").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
    });
  });

  document.querySelectorAll(".difficulty").forEach((button) => {
    button.addEventListener("click", () => {
      state.difficulty = button.dataset.difficulty;
      document.querySelectorAll(".difficulty").forEach((node) => node.classList.remove("active"));
      button.classList.add("active");
    });
  });

  els.unitStrip.addEventListener("click", (event) => {
    const button = event.target.closest("[data-unit-id]");
    if (!button) return;
    state.selectedUnitId = button.dataset.unitId;
    state.selectedTopic = "";
    els.unitSelect.value = state.selectedUnitId;
    renderTopics();
    renderUnitStrip();
    renderTopicProgress();
  });

  els.answerArea.addEventListener("click", (event) => {
    const choice = event.target.closest("[data-choice]");
    if (!choice) return;
    state.selectedChoice = choice.dataset.choice;
    document.querySelectorAll(".choice").forEach((node) => node.classList.remove("selected"));
    choice.classList.add("selected");
    els.submitBtn.disabled = false;
  });

  els.generateBtn.addEventListener("click", generateQuestion);
  els.nextBtn.addEventListener("click", generateQuestion);
  els.submitBtn.addEventListener("click", submitAnswer);
  els.resetProgress.addEventListener("click", () => {
    state.progress = { answered: 0, correct: 0, streak: 0, byTopic: {} };
    saveProgress();
    renderStats();
    renderTopicProgress();
  });
}

async function init() {
  const [cedPayload, sessionPayload] = await Promise.all([api("/api/ced"), api("/api/me")]);
  state.units = cedPayload.units;
  state.cedSource = cedPayload.cedSource;
  state.user = sessionPayload.user;
  state.leaderboard = sessionPayload.leaderboard || [];
  syncProgressFromUser(state.user);
  state.selectedUnitId = state.units[0].id;
  renderAuthMode();
  renderControls();
  renderUnitStrip();
  renderStats();
  renderTopicProgress();
  bindEvents();
  renderSession();
  if (state.user) generateQuestion();
}

init().catch((error) => {
  els.unitTitle.textContent = "Could not load app";
  els.questionPrompt.textContent = error.message;
});
