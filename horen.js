const partList = document.getElementById("part-cards");
const contentContainer = document.getElementById("horen-content");
const summarySection = document.getElementById("horen-summary");
const checkBtn = document.getElementById("horen-check-btn");
const nextBtn = document.getElementById("horen-next-btn");
const prevBtn = document.getElementById("horen-prev-btn");
const checkToggle = document.getElementById("check-one-by-one");
const returnBtn = document.getElementById("return-btn");
const levelPill = document.getElementById("level-pill");
const themeTitle = document.getElementById("theme-title");
const fontSizeInput = document.getElementById("font-size-input");
const fontSizeValue = document.getElementById("font-size-value");
const settingsBtn = document.getElementById("settings-btn");
const settingsPanel = document.getElementById("settings-panel");
const hideAussageToggle = document.getElementById("hide-aussage-toggle");
const progressDisplay = document.getElementById("horen-progress");
const HIDE_AUSSAGE_KEY = "horenHideAussage";

const PART_ORDER = ["teil-1", "teil-2", "teil-3"];
const PART_LABELS = {
  "teil-1": "Teil 1",
  "teil-2": "Teil 2",
  "teil-3": "Teil 3"
};

const state = {
  data: null,
  levelKey: "b1",
  partKey: "teil-1",
  responses: {},
  activeTopicIndex: 0,
  checkOneByOne: getStoredCheckOneByOne(),
  topicFeedbacks: {},
  topicOrder: {},
  checkedAll: false,
  lastSummary: null,
  hideAussage: getStoredHideAussage()
};

function getStoredCheckOneByOne() {
  return window.localStorage.getItem("horenCheckOneByOne") === "true";
}

function persistCheckOneByOne(value) {
  state.checkOneByOne = value;
  window.localStorage.setItem("horenCheckOneByOne", value ? "true" : "false");
}

function getStoredHideAussage() {
  return window.localStorage.getItem(HIDE_AUSSAGE_KEY) === "true";
}

function persistHideAussage(value) {
  state.hideAussage = value;
  window.localStorage.setItem(HIDE_AUSSAGE_KEY, value ? "true" : "false");
}

function getLevelEntry() {
  return state.data?.levels?.[state.levelKey] || null;
}

function getThemeEntry() {
  const level = getLevelEntry();
  const key = level?.themeOrder?.[0];
  if (!key) {
    return null;
  }
  return level?.themes?.[key] || null;
}

function getPart(partKey) {
  const theme = getThemeEntry();
  return theme?.hören?.parts?.[partKey] || null;
}

function ensurePartState(partKey) {
  if (!state.responses[partKey]) {
    state.responses[partKey] = {};
  }
  return {
    responses: state.responses[partKey]
  };
}

function recordResponse(partKey, statementId, value) {
  state.responses[partKey] = { ...(state.responses[partKey] || {}), [statementId]: value };
  state.checkedAll = false;
  state.topicFeedbacks = {};
  state.lastSummary = null;
}

function getResponse(partKey, statementId) {
  return state.responses[partKey]?.[statementId];
}

function flattenStatements(partKey) {
  const part = getPart(partKey);
  if (!part) {
    return [];
  }
  const topics = part.content?.topics || [];
  return topics.flatMap((topic) => topic.statements || []);
}

function getTopicsForPart(partKey) {
  const part = getPart(partKey);
  if (!part) {
    return [];
  }
  return part.content?.topics || [];
}

function renderPartList() {
  const theme = getThemeEntry();
  const order = theme?.hören?.partOrder || PART_ORDER;
  if (!partList) {
    return;
  }
  partList.innerHTML = "";
  if (!order.length) {
    partList.classList.add("hidden");
    return;
  }
  partList.classList.remove("hidden");
  order.forEach((partKey) => {
    const button = createEl(
      "button",
      classNames(
        "flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[10px] font-display uppercase tracking-[0.2em] transition-colors",
        partKey === state.partKey
          ? "border-azure/60 bg-azure/10 text-azure ring-2 ring-azure/20"
          : "border-stone-300 bg-white text-slate shadow-sm hover:border-stone-300"
      ),
      PART_LABELS[partKey] || partKey
    );
    button.type = "button";
    button.addEventListener("click", () => {
      if (state.partKey === partKey) {
        return;
      }
      state.partKey = partKey;
      state.activeTopicIndex = 0;
      state.topicFeedbacks = {};
      renderPartList();
      renderActivePart();
    });
    partList.append(button);
  });
}

function renderStatementRow(partKey, statement, topicKey, topicIndex, topicChecked) {
  const row = createEl("tr");
  const selected = getResponse(partKey, statement.id);
  const normalized = selected ?? false;
  const isWrong = topicChecked && normalized !== statement.correct;
  const isCorrect = topicChecked && normalized === statement.correct;
  if (isWrong) {
    row.classList.add("bg-rose/10");
  } else if (isCorrect) {
    row.classList.add("bg-emerald/5");
  }
  const textCell = createEl("td", "text-sm text-ink pr-3");
  textCell.append(renderStatementText(statement));
  row.append(
    createEl("td", "text-xs font-display uppercase tracking-[0.2em] text-slate", String(statement.number)),
    createChoiceCell(partKey, statement.id, true, topicKey, topicIndex),
    createChoiceCell(partKey, statement.id, false, topicKey, topicIndex),
    textCell
  );
  return row;
}

function createChoiceCell(partKey, statementId, value, topicKey, topicIndex) {
  const cell = createEl("td", "text-center");
  const input = document.createElement("input");
  input.type = "radio";
  const safeTopic = topicKey || `${partKey}-topic-${topicIndex ?? 0}`;
  input.name = `${safeTopic}--${statementId}-choice`;
  input.value = value ? "true" : "false";
  input.className = "h-4 w-4 text-azure accent-azure/70";
  input.checked = getResponse(partKey, statementId) === value;
  input.addEventListener("change", () => {
    recordResponse(partKey, statementId, value);
    renderActivePart();
  });
  cell.append(input);
  return cell;
}

function renderStatementText(statement) {
  if (!state.hideAussage) {
    return createEl("span", null, statement.text || "–");
  }
  const wrapper = createEl("div", "flex items-center gap-2 text-xs text-slate");
  wrapper.append(makeLucideIcon("eye-off", "h-4 w-4 text-slate"));
  wrapper.append(createEl("span", "uppercase tracking-[0.3em] text-[10px] font-display", "Aussage verborgen"));
  return wrapper;
}

function makeLucideIcon(name, className) {
  const icon = createEl("i", className);
  icon.setAttribute("data-lucide", name);
  icon.setAttribute("aria-hidden", "true");
  return icon;
}

function hasResponseValue(value) {
  return value !== undefined && value !== null && String(value).trim() !== "";
}

function renderActivePart() {
  const part = getPart(state.partKey);
  if (!part) {
    contentContainer.innerHTML = "<p class=\"text-sm text-slate\">Teil ist noch nicht verfügbar.</p>";
    return;
  }
  const topics = getTopicsForPart(state.partKey);
  contentContainer.innerHTML = "";
  if (part.content?.instruction) {
    const instruction = createEl("p", "mb-4 rounded-2xl border border-amber/40 bg-amber/10 px-4 py-2 text-sm text-ink", part.content.instruction);
    contentContainer.append(instruction);
  }
  const { responses } = ensurePartState(state.partKey);
  topics.forEach((topic, index) => {
    if (!topic.statements?.length) {
      return;
    }
    const wrapper = createEl("article", "horen-topic");
    if (state.checkOneByOne && index !== state.activeTopicIndex) {
      wrapper.classList.add("hidden");
    }
    const header = createEl("div", "flex items-center justify-between gap-3");
    header.append(
      createEl("div", "font-display text-lg text-ink", topic.title),
      createEl("div", "text-xs uppercase tracking-[0.2em] text-slate", topic.tag || `Thema ${index + 1}`)
    );
    wrapper.append(header);
    const table = createEl("table", "horen-table mt-4 w-full");
    const thead = createEl("thead");
    thead.innerHTML = `
      <tr>
        <th>Nr.</th>
        <th>Richtig</th>
        <th>Falsch</th>
        <th>Aussage</th>
      </tr>
    `;
    table.append(thead);
    const topicKey = getTopicKey(topic, index);
    const feedback = state.topicFeedbacks[topicKey];
    const tbody = createEl("tbody");
    topic.statements.forEach((statement) => {
      tbody.append(renderStatementRow(state.partKey, statement, topicKey, index, Boolean(feedback)));
    });
    table.append(tbody);
    wrapper.append(table);
    if (feedback) {
      wrapper.append(renderTopicFeedback(feedback));
    }
    const topicComplete = isTopicComplete(topic, responses);
    const topicControls = createEl("div", "flex items-center justify-between mt-3");
    const completeMsg = !topicComplete
      ? createEl("p", "text-[10px] uppercase tracking-[0.2em] text-slate font-display", "Bitte alle Aussagen beantworten.")
      : createEl("span");
    const checkTopicBtn = createEl(
      "button",
      "rounded-full border border-azure/40 bg-white px-4 py-2 text-[10px] font-display uppercase tracking-[0.3em] text-azure shadow-sm",
      "Check topic"
    );
    checkTopicBtn.type = "button";
    checkTopicBtn.disabled = !topicComplete;
    checkTopicBtn.addEventListener("click", () => {
      if (!isTopicComplete(topic, responses)) {
        return;
      }
      const fb = buildTopicFeedback(state.partKey, topic, index);
      state.topicFeedbacks[topicKey] = fb;
      state.checkedAll = false;
      state.lastSummary = null;
      renderActivePart();
    });
    topicControls.append(completeMsg, checkTopicBtn);
    wrapper.append(topicControls);
    contentContainer.append(wrapper);
  });
  renderFooterControls(topics);
  renderSummary();
  if (typeof refreshIcons === "function") {
    refreshIcons();
  }
}

function isTopicComplete(topic, responses) {
  if (!topic || !responses) {
    return false;
  }
  const statements = topic.statements || [];
  if (!statements.length) {
    return false;
  }
  return statements.every((statement) => hasResponseValue(responses[statement.id]));
}

function countTotalStatements(topics) {
  if (!topics || !Array.isArray(topics)) {
    return 0;
  }
  return topics.reduce((total, topic) => {
    const statements = topic.statements || [];
    return total + statements.length;
  }, 0);
}

function countAnsweredStatements(topics, responses) {
  if (!topics || !Array.isArray(topics) || !responses) {
    return 0;
  }
  return topics.reduce((total, topic) => {
    const statements = topic.statements || [];
    const answered = statements.filter((statement) => hasResponseValue(responses[statement.id])).length;
    return total + answered;
  }, 0);
}

function buildTopicFeedback(partKey, topic, index = 0) {
  if (!topic) {
    return null;
  }
  const { responses } = ensurePartState(partKey);
  const statements = topic.statements || [];
  const userTrue = statements
    .filter((statement) => responses[statement.id] === true)
    .map((statement) => statement.number)
    .sort((a, b) => a - b);
  const correctTrue = statements
    .filter((statement) => statement.correct)
    .map((statement) => statement.number)
    .sort((a, b) => a - b);
  const complete = isTopicComplete(topic, responses);
  const perfect = complete
    && userTrue.length === correctTrue.length
    && userTrue.every((value, index) => value === correctTrue[index]);
  return {
    user: userTrue,
    correct: correctTrue,
    perfect,
    complete,
    title: topic.title || topic.tag || `Thema ${index + 1}`
  };
}

function renderTopicFeedback(feedback) {
  const wrapper = createEl("div", "mt-4 flex flex-wrap items-center gap-2");
  const userLabel = feedback.user.length ? feedback.user.join("") : "-";
  const correctLabel = feedback.correct.length ? feedback.correct.join("") : "-";
  wrapper.append(makePill(`Your: ${userLabel}`, feedback.perfect ? "correct" : "wrong"));
  wrapper.append(makePill(`Correct: ${correctLabel}`, "correct"));
  return wrapper;
}

function makePill(label, variant) {
  const base = "rounded-full px-3 py-1 text-[10px] font-display uppercase tracking-[0.2em]";
  if (variant === "correct") {
    return createEl("span", `${base} bg-mint/20 text-mint border border-mint/40`, label);
  }
  if (variant === "wrong") {
    return createEl("span", `${base} bg-rose/15 text-rose border border-rose/40`, label);
  }
  return createEl("span", `${base} bg-azure/10 text-azure border border-azure/40`, label);
}

function getCurrentPartTopics() {
  return getTopicsForPart(state.partKey);
}

function getTopicKey(topic, index) {
  const baseId = topic?.id ? String(topic.id) : `topic-${index}`;
  return `${state.partKey}-${baseId}-${index}`;
}

function renderFooterControls(topics) {
  const { responses } = ensurePartState(state.partKey);
  const allComplete = topics.length > 0 && topics.every((topic) => isTopicComplete(topic, responses));
  const atLastTopic = topics.length ? state.activeTopicIndex >= topics.length - 1 : false;
  if (checkBtn) {
    checkBtn.disabled = !(allComplete && atLastTopic);
    checkBtn.classList.toggle("opacity-50", checkBtn.disabled);
    checkBtn.classList.toggle("pointer-events-none", checkBtn.disabled);
  }
  if (nextBtn) {
    if (state.checkOneByOne && topics.length > 1) {
      nextBtn.classList.remove("hidden");
      const nextTopicIndex = state.activeTopicIndex + 1;
      const canAdvance = nextTopicIndex < topics.length && isTopicComplete(topics[state.activeTopicIndex], responses);
      nextBtn.disabled = !canAdvance;
      nextBtn.classList.toggle("opacity-50", nextBtn.disabled);
      nextBtn.classList.toggle("pointer-events-none", nextBtn.disabled);
    } else {
      nextBtn.classList.add("hidden");
    }
  }
  if (prevBtn) {
    if (state.checkOneByOne && topics.length > 1) {
      prevBtn.classList.remove("hidden");
      prevBtn.disabled = state.activeTopicIndex <= 0;
    } else {
      prevBtn.classList.add("hidden");
    }
  }
  const totalStatements = countTotalStatements(topics);
  const answeredStatements = countAnsweredStatements(topics, responses);
  if (progressDisplay) {
    if (state.checkOneByOne && topics.length) {
      progressDisplay.classList.remove("hidden");
      progressDisplay.textContent = `${answeredStatements}/${totalStatements}`;
    } else {
      progressDisplay.classList.add("hidden");
      progressDisplay.textContent = "";
    }
  }
}

function renderSummary() {
  if (!summarySection) {
    return;
  }
  const summary = state.lastSummary;
  if (!summary) {
    summarySection.classList.add("hidden");
    summarySection.innerHTML = "";
    return;
  }
  summarySection.classList.remove("hidden");
  summarySection.innerHTML = "";
  const header = createEl(
    "div",
    "rounded-3xl border border-stone-200 bg-white/90 p-4 shadow-panel",
    ""
  );
  header.append(
    createEl("div", "text-xs uppercase tracking-[0.2em] text-slate font-display", "Teilergebnisse"),
    createEl("div", "mt-2 flex items-baseline gap-2", `${summary.correctCount} / ${summary.total} richtig`)
  );
  const table = createEl("div", "mt-4 overflow-hidden rounded-2xl border border-stone-200 bg-white/90 shadow-panel");
  const tableHeader = createEl("div", "grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 text-[10px] uppercase tracking-[0.3em] text-slate font-display bg-stone-50");
  tableHeader.append(
    createEl("span", null, "Thema"),
    createEl("span", null, "Your answer"),
    createEl("span", null, "Right answer")
  );
  table.append(tableHeader);
  summary.rows.forEach((row) => {
    const rowClass = row.perfect ? "bg-mint/10" : "bg-rose/10";
    const rowEl = createEl("div", `grid grid-cols-[2fr_1fr_1fr] gap-2 p-3 text-sm ${rowClass}`);
    rowEl.append(
      createEl("div", "font-semibold text-ink", row.title),
      createEl("div", "text-ink font-display uppercase tracking-[0.3em]", row.user || "-"),
      createEl("div", "text-ink font-display uppercase tracking-[0.3em]", row.correct || "-")
    );
    table.append(rowEl);
  });
  summarySection.append(header, table);
}

function applyFontScale(factor) {
  if (!fontSizeInput || !fontSizeValue) {
    return;
  }
  document.documentElement.style.setProperty("--font-scale", String(factor));
  fontSizeValue.textContent = `${Math.round(factor * 100)}%`;
}

function goToNextTopic() {
  const part = getPart(state.partKey);
  const topics = getTopicsForPart(state.partKey);
  const totalTopics = topics.length;
  if (totalTopics === 0 || state.activeTopicIndex >= totalTopics - 1) {
    return;
  }
  state.activeTopicIndex += 1;
  renderActivePart();
}

function applyHeaderInfo() {
  if (levelPill) {
    levelPill.textContent = (state.levelKey || "B1").toUpperCase();
  }
  if (themeTitle) {
    themeTitle.textContent = `Hören Codes (${state.levelKey?.toUpperCase() || "B1"})`;
  }
}

function handleCheckClick() {
  const topics = getCurrentPartTopics();
  if (!topics.length) {
    return;
  }
  const { responses } = ensurePartState(state.partKey);
  const feedbacks = {};
  const rows = [];
  let correctCount = 0;
  topics.forEach((topic, index) => {
    const topicKey = getTopicKey(topic, index);
    const feedback = buildTopicFeedback(state.partKey, topic, index);
    if (!feedback) {
      return;
    }
    feedbacks[topicKey] = feedback;
    if (feedback.perfect) {
      correctCount += 1;
    }
    rows.push({
      title: feedback.title,
      user: (feedback.user && feedback.user.length) ? feedback.user.join("") : "-",
      correct: (feedback.correct && feedback.correct.length) ? feedback.correct.join("") : "-",
      perfect: feedback.perfect
    });
  });
  state.topicFeedbacks = feedbacks;
  state.checkedAll = true;
  state.lastSummary = {
    total: topics.length,
    correctCount,
    rows
  };
  renderActivePart();
}

function notch() {
  renderPartList();
  renderActivePart();
  applyHeaderInfo();
  if (typeof refreshIcons === "function") {
    refreshIcons();
  }
}

if (checkBtn) {
  checkBtn.addEventListener("click", handleCheckClick);
}
if (nextBtn) {
  nextBtn.addEventListener("click", goToNextTopic);
}
if (prevBtn) {
  prevBtn.addEventListener("click", () => {
    if (state.activeTopicIndex > 0) {
      state.activeTopicIndex -= 1;
      renderActivePart();
    }
  });
}
if (checkToggle) {
  checkToggle.checked = state.checkOneByOne;
  checkToggle.addEventListener("change", () => {
    persistCheckOneByOne(checkToggle.checked);
    state.activeTopicIndex = 0;
    state.topicOrder = checkToggle.checked ? { ...state.topicOrder, [state.partKey]: shuffleTopics(state.partKey) } : {};
    state.topicFeedbacks = {};
    state.checkedAll = false;
    state.lastSummary = null;
    renderActivePart();
  });
}
if (hideAussageToggle) {
  hideAussageToggle.checked = state.hideAussage;
  hideAussageToggle.addEventListener("change", () => {
    persistHideAussage(hideAussageToggle.checked);
    renderActivePart();
  });
}
if (fontSizeInput) {
  const initialValue = Number.parseFloat(fontSizeInput.value) || 1;
  applyFontScale(initialValue);
  fontSizeInput.addEventListener("input", () => {
    const value = Number.parseFloat(fontSizeInput.value) || 1;
    applyFontScale(value);
  });
}
if (settingsBtn && settingsPanel) {
  settingsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    settingsPanel.classList.toggle("hidden", !settingsPanel.classList.contains("hidden"));
  });
  settingsPanel.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  document.addEventListener("click", () => {
    settingsPanel.classList.add("hidden");
  });
}
if (returnBtn) {
  returnBtn.addEventListener("click", () => {
    window.location.href = "index.html";
  });
}

async function init() {
  const response = await fetch("database/horen-codes.json");
  state.data = await response.json();
  const params = new URLSearchParams(window.location.search);
  const requestedLevel = params.get("level");
  const availableLevels = Object.keys(state.data.levels || {});
  if (availableLevels.includes(requestedLevel)) {
    state.levelKey = requestedLevel;
  } else if (availableLevels.length) {
    state.levelKey = availableLevels[0];
  }
  notch();
}

init();
