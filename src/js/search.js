function initializeSearch() {
  if (typeof PagefindUI === "undefined") {
    return;
  }

  new PagefindUI({
    element: "#search-results",
    showSubResults: true,
    resetStyles: false
  });

  const pagefindInput = document.querySelector("#search-results input[type='text']");
  const customInput = document.querySelector("#search-input");

  if (!pagefindInput || !customInput) {
    return;
  }

  pagefindInput.setAttribute("aria-label", "Search Nixon FM");
  pagefindInput.hidden = true;

  customInput.addEventListener("input", () => {
    pagefindInput.value = customInput.value;
    pagefindInput.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

initializeSearch();