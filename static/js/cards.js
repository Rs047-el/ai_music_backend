const categoryDataElement =
  document.getElementById("category-data");

if (!categoryDataElement) {
  throw new Error(
    "category-dataが見つかりません。"
  );
}

const categories =
  JSON.parse(
    categoryDataElement.textContent
  );

if (categories.length === 0) {
  throw new Error(
    "カテゴリデータがありません。"
  );
}

const selections = {};

let activeCategoryId =
  categories[0].id;

const cardGrid =
  document.getElementById("cardGrid");

const categoryTitle =
  document.getElementById(
    "categoryTitle"
  );

const categoryDescription =
  document.getElementById(
    "categoryDescription"
  );

const submitButton =
  document.querySelector(
    ".submit-button"
  );


function getActiveCategory() {
  return categories.find(
    (category) =>
      category.id ===
      activeCategoryId
  );
}


function renderCards() {
  const category =
    getActiveCategory();

  if (!category) {
    return;
  }

  categoryTitle.textContent =
    `${category.title}をえらぼう`;

  categoryDescription.textContent =
    category.description;

  cardGrid.innerHTML = "";

  category.cards.forEach((card) => {
    const button =
      document.createElement(
        "button"
      );

    button.type = "button";
    button.className = "card";

    if (
      selections[category.id]?.id
      === card.id
    ) {
      button.classList.add(
        "is-selected"
      );
    }

    button.innerHTML = `
      <img
        src="/static/${card.image}"
        alt=""
        class="card-image"
      >

      <span class="card-label">
        ${card.label}
      </span>
    `;

    button.addEventListener(
      "click",
      () => {
        selectCard(
          category.id,
          card
        );
      }
    );

    cardGrid.appendChild(
      button
    );
  });
}


function selectCard(
  categoryId,
  card
) {
  selections[categoryId] =
    card;

  const hiddenInput =
    document.getElementById(
      `selected-${categoryId}`
    );

  if (!hiddenInput) {
    console.error(
      `selected-${categoryId}が見つかりません。`
    );

    return;
  }

  hiddenInput.value =
    card.id;

  renderTabs();
  renderCards();
  renderSelectedCards();
  updateSubmitButton();
}


function renderTabs() {
  document
    .querySelectorAll(
      ".category-tab"
    )
    .forEach((tab) => {
      const categoryId =
        tab.dataset.category;

      tab.classList.toggle(
        "is-active",
        categoryId ===
          activeCategoryId
      );

      tab.classList.toggle(
        "is-complete",
        Boolean(
          selections[categoryId]
        )
      );

      const result =
        tab.querySelector(
          ".category-result"
        );

      if (result) {
        result.textContent =
          selections[categoryId]
            ?.label
          ?? "まだえらんでいません";
      }
    });
}


function renderSelectedCards() {
  const selectedCards =
    document.getElementById(
      "selectedCards"
    );

  selectedCards.innerHTML = "";

  categories.forEach(
    (category) => {
      const selected =
        selections[category.id];

      const item =
        document.createElement(
          "button"
        );

      item.type = "button";
      item.className =
        "selected-card";

      item.innerHTML = selected
        ? `
          <span class="selected-category">
            ${category.title}
          </span>

          <span class="card-icon-text">
            ${card.icon}
          </span>

          <span class="selected-label">
            ${selected.label}
          </span>
        `
        : `
          <span class="selected-category">
            ${category.title}
          </span>

          <span class="empty-text">
            まだえらんでいません
          </span>
        `;

      item.addEventListener(
        "click",
        () => {
          activeCategoryId =
            category.id;

          renderTabs();
          renderCards();
        }
      );

      selectedCards.appendChild(
        item
      );
    }
  );
}


function updateSubmitButton() {
  const completed =
    categories.every(
      (category) =>
        Boolean(
          selections[
            category.id
          ]
        )
    );

  submitButton.disabled =
    !completed;
}


document
  .querySelectorAll(
    ".category-tab"
  )
  .forEach((tab) => {
    tab.addEventListener(
      "click",
      () => {
        activeCategoryId =
          tab.dataset.category;

        renderTabs();
        renderCards();
      }
    );
  });


renderTabs();
renderCards();
renderSelectedCards();
updateSubmitButton();