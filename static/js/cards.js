const selections = {};

let isDragging = false;

const musicCards =
  document.querySelectorAll(
    ".music-card"
  );

const dropZones =
  document.querySelectorAll(
    ".drop-zone"
  );

const submitButton =
  document.querySelector(
    ".submit-button"
  );

const categoryTabs =
  document.querySelectorAll(
    ".category-tab"
  );

const categoryPanels =
  document.querySelectorAll(
    ".category-panel"
  );


function updateSubmitButton() {
  if (!submitButton) {
    return;
  }

  const completed =
    Array.from(dropZones).every(
      (dropZone) => {
        const categoryId =
          dropZone.dataset.category;

        return Boolean(
          selections[categoryId]
        );
      }
    );

  submitButton.disabled =
    !completed;
}


function showCategory(categoryId) {
  categoryTabs.forEach((tab) => {
    const isActive =
      tab.dataset.category ===
      categoryId;

    tab.classList.toggle(
      "is-active",
      isActive
    );
  });

  categoryPanels.forEach((panel) => {
    const isActive =
      panel.dataset.category ===
      categoryId;

    panel.classList.toggle(
      "is-active",
      isActive
    );
  });
}


function placeCard(
  categoryId,
  cardId,
  label,
  icon
) {
  const dropZone =
    document.querySelector(
      `.drop-zone[data-category="${categoryId}"]`
    );

  if (!dropZone) {
    return;
  }

  const droppedCard =
    dropZone.querySelector(
      ".dropped-card"
    );

  const placeholder =
    dropZone.querySelector(
      ".drop-zone-placeholder"
    );

  if (!droppedCard || !placeholder) {
    return;
  }

  selections[categoryId] = {
    id: cardId,
    label,
    icon,
  };

  const hiddenInput =
    document.getElementById(
      `selected-${categoryId}`
    );

  if (hiddenInput) {
    hiddenInput.value =
      cardId;
  }

  droppedCard.innerHTML = `
    <button
      type="button"
      class="placed-card"
    >
      <span class="placed-card-icon">
        ${icon || "🎵"}
      </span>

      <span class="placed-card-label">
        ${label}
      </span>

      <span class="placed-card-change">
        えらびなおす
      </span>
    </button>
  `;

  placeholder.hidden = true;

  dropZone.classList.add(
    "is-filled"
  );

  const placedButton =
    droppedCard.querySelector(
      ".placed-card"
    );

  if (placedButton) {
    placedButton.addEventListener(
      "click",
      () => {
        clearSelection(
          categoryId
        );
      }
    );
  }

  updateSubmitButton();
}


function clearSelection(categoryId) {
  const dropZone =
    document.querySelector(
      `.drop-zone[data-category="${categoryId}"]`
    );

  if (!dropZone) {
    return;
  }

  const droppedCard =
    dropZone.querySelector(
      ".dropped-card"
    );

  const placeholder =
    dropZone.querySelector(
      ".drop-zone-placeholder"
    );

  delete selections[categoryId];

  const hiddenInput =
    document.getElementById(
      `selected-${categoryId}`
    );

  if (hiddenInput) {
    hiddenInput.value = "";
  }

  if (droppedCard) {
    droppedCard.innerHTML = "";
  }

  if (placeholder) {
    placeholder.hidden = false;
  }

  dropZone.classList.remove(
    "is-filled"
  );

  updateSubmitButton();

  showCategory(categoryId);
}


function getCardData(card) {
  return {
    categoryId:
      card.dataset.category,
    cardId:
      card.dataset.cardId,
    label:
      card.dataset.label,
    icon:
      card.dataset.icon,
  };
}


musicCards.forEach((card) => {
  card.draggable = true;

  card.addEventListener(
    "dragstart",
    (event) => {
      isDragging = true;

      const cardData =
        getCardData(card);

      event.dataTransfer.setData(
        "application/json",
        JSON.stringify(cardData)
      );

      event.dataTransfer.effectAllowed =
        "copy";

      card.classList.add(
        "is-dragging"
      );
    }
  );

  card.addEventListener(
    "dragend",
    () => {
      card.classList.remove(
        "is-dragging"
      );

      setTimeout(() => {
        isDragging = false;
      }, 0);
    }
  );

  card.addEventListener(
    "click",
    () => {
      if (isDragging) {
        return;
      }

      const cardData =
        getCardData(card);

      placeCard(
        cardData.categoryId,
        cardData.cardId,
        cardData.label,
        cardData.icon
      );
    }
  );
});


dropZones.forEach((dropZone) => {
  dropZone.addEventListener(
    "dragover",
    (event) => {
      event.preventDefault();

      event.dataTransfer.dropEffect =
        "copy";

      dropZone.classList.add(
        "is-drag-over"
      );
    }
  );

  dropZone.addEventListener(
    "dragleave",
    () => {
      dropZone.classList.remove(
        "is-drag-over"
      );
    }
  );

  dropZone.addEventListener(
    "drop",
    (event) => {
      event.preventDefault();

      dropZone.classList.remove(
        "is-drag-over"
      );

      const rawData =
        event.dataTransfer.getData(
          "application/json"
        );

      if (!rawData) {
        return;
      }

      let cardData;

      try {
        cardData =
          JSON.parse(rawData);
      } catch (error) {
        console.error(
          "カードデータを読み込めませんでした。",
          error
        );

        return;
      }

      const dropCategoryId =
        dropZone.dataset.category;

      if (
        cardData.categoryId !==
        dropCategoryId
      ) {
        dropZone.classList.add(
          "is-error"
        );

        setTimeout(() => {
          dropZone.classList.remove(
            "is-error"
          );
        }, 500);

        return;
      }

      placeCard(
        cardData.categoryId,
        cardData.cardId,
        cardData.label,
        cardData.icon
      );
    }
  );
});


categoryTabs.forEach((tab) => {
  tab.addEventListener(
    "click",
    () => {
      showCategory(
        tab.dataset.category
      );
    }
  );
});


if (categoryTabs.length > 0) {
  showCategory(
    categoryTabs[0].dataset.category
  );
}

updateSubmitButton();