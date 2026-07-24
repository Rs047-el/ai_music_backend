const options = window.APP_OPTIONS;

const categoryLabels = {
  world: "世界観",
  instrument: "楽器",
  speed: "速さ",
  image: "イメージ",
};

const selections = {
  world: null,
  instrument: null,
  speed: null,
  image: null,
};

let activeType = "world";
let dragState = null;

const slots = [...document.querySelectorAll(".selection-slot")];
const optionList = document.getElementById("optionList");
const categoryTitle = document.getElementById("categoryTitle");
const generateButton = document.getElementById("generateButton");
const resetButton = document.getElementById("resetButton");
const freeInput = document.getElementById("freeInput");
const statusPanel = document.getElementById("statusPanel");
const resultPanel = document.getElementById("resultPanel");
const resultMessage = document.getElementById("resultMessage");
const resultSummary = document.getElementById("resultSummary");

function renderOptions(type) {
  activeType = type;
  categoryTitle.textContent = `${categoryLabels[type]}をえらぼう`;
  optionList.innerHTML = "";

  slots.forEach((slot) => {
    slot.classList.toggle("is-active", slot.dataset.type === type);
  });

  options[type].forEach((option) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-card";
    button.dataset.optionId = option.id;
    button.dataset.type = type;

    if (selections[type]?.id === option.id) {
      button.classList.add("is-selected");
    }

    button.innerHTML = `
      <span class="option-icon">${option.icon}</span>
      <span class="option-label">${option.label}</span>
    `;

    button.addEventListener("click", () => selectOption(type, option));
    button.addEventListener("pointerdown", startDrag);

    optionList.appendChild(button);
  });
}

function selectOption(type, option) {
  selections[type] = option;
  updateSlot(type);
  updateGenerateButton();
  saveSelections();
  renderOptions(type);
}

function updateSlot(type) {
  const slot = slots.find((item) => item.dataset.type === type);
  const content = slot.querySelector(".slot-content");
  const option = selections[type];

  if (!option) {
    content.textContent = "ここに入れてね";
    slot.classList.remove("is-complete");
    return;
  }

  content.innerHTML = `
    <span>
      <span class="selected-icon">${option.icon}</span>
      ${option.label}
    </span>
  `;
  slot.classList.add("is-complete");
}

function updateGenerateButton() {
  generateButton.disabled = !Object.values(selections).every(Boolean);
}

function saveSelections() {
  sessionStorage.setItem("musicSelections", JSON.stringify(selections));
}

function restoreSelections() {
  const saved = sessionStorage.getItem("musicSelections");
  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);
    Object.keys(selections).forEach((key) => {
      if (parsed[key]) selections[key] = parsed[key];
    });
  } catch (error) {
    console.warn("保存データを読み込めませんでした。", error);
  }
}

function startDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  event.preventDefault();

  const source = event.currentTarget;
  const rect = source.getBoundingClientRect();
  const clone = source.cloneNode(true);

  clone.classList.add("drag-clone");
  clone.style.left = `${rect.left}px`;
  clone.style.top = `${rect.top}px`;
  document.body.appendChild(clone);

  dragState = {
    pointerId: event.pointerId,
    source,
    clone,
    type: source.dataset.type,
    optionId: source.dataset.optionId,
    offsetX: event.clientX - rect.left,
    offsetY: event.clientY - rect.top,
  };

  source.setPointerCapture(event.pointerId);
  source.addEventListener("pointermove", moveDrag);
  source.addEventListener("pointerup", endDrag);
  source.addEventListener("pointercancel", cancelDrag);
}

function moveDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  dragState.clone.style.left = `${event.clientX - dragState.offsetX}px`;
  dragState.clone.style.top = `${event.clientY - dragState.offsetY}px`;

  slots.forEach((slot) => {
    const rect = slot.getBoundingClientRect();
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom;

    const valid = inside && slot.dataset.type === dragState.type;
    slot.classList.toggle("is-drop-target", valid);
  });
}

function endDrag(event) {
  if (!dragState || event.pointerId !== dragState.pointerId) return;

  const target = document
    .elementFromPoint(event.clientX, event.clientY)
    ?.closest(".selection-slot");

  if (target && target.dataset.type === dragState.type) {
    const option = options[dragState.type].find(
      (item) => item.id === dragState.optionId
    );
    selectOption(dragState.type, option);
  }

  cleanupDrag();
}

function cancelDrag() {
  cleanupDrag();
}

function cleanupDrag() {
  if (!dragState) return;

  dragState.source.removeEventListener("pointermove", moveDrag);
  dragState.source.removeEventListener("pointerup", endDrag);
  dragState.source.removeEventListener("pointercancel", cancelDrag);
  dragState.clone.remove();

  slots.forEach((slot) => slot.classList.remove("is-drop-target"));
  dragState = null;
}

slots.forEach((slot) => {
  slot.addEventListener("click", () => renderOptions(slot.dataset.type));
});

resetButton.addEventListener("click", () => {
  Object.keys(selections).forEach((key) => {
    selections[key] = null;
    updateSlot(key);
  });

  freeInput.value = "";
  sessionStorage.removeItem("musicSelections");
  resultPanel.hidden = true;
  updateGenerateButton();
  renderOptions("world");
});

generateButton.addEventListener("click", async () => {
  generateButton.disabled = true;
  statusPanel.hidden = false;
  resultPanel.hidden = true;

  const payload = {
    ...Object.fromEntries(
      Object.entries(selections).map(([key, value]) => [key, value?.id])
    ),
    freeInput: freeInput.value.trim(),
  };

  try {
    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "生成に失敗しました。");
    }

    await new Promise((resolve) => setTimeout(resolve, 1200));

    resultMessage.textContent = result.message;
    resultSummary.innerHTML = Object.entries(selections)
      .map(([key, value]) => `
        <div class="result-item">
          <strong>${categoryLabels[key]}</strong><br>
          <span>${value.icon} ${value.label}</span>
        </div>
      `)
      .join("");

    resultPanel.hidden = false;
  } catch (error) {
    alert(error.message);
  } finally {
    statusPanel.hidden = true;
    updateGenerateButton();
  }
});

restoreSelections();
Object.keys(selections).forEach(updateSlot);
updateGenerateButton();
renderOptions("world");
