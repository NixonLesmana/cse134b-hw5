const storageKey = "nixon-fm-theme";
const validThemes = ["light", "dark", "system"];

function getSavedTheme() {
  try {
    const savedTheme = localStorage.getItem(storageKey);
    return validThemes.includes(savedTheme) ? savedTheme : "system";
  } catch {
    return "system";
  }
}

function saveTheme(theme) {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // If localStorage is unavailable, the page still keeps working.
  }
}

function applyTheme(theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function updateRadios(theme) {
  const radios = document.querySelectorAll('input[name="theme"]');

  radios.forEach((radio) => {
    radio.checked = radio.value === theme;
  });
}

const picker = document.querySelector("[data-theme-picker]");
const startingTheme = getSavedTheme();

applyTheme(startingTheme);

if (picker) {
  picker.hidden = false;
  updateRadios(startingTheme);

  picker.addEventListener("change", (event) => {
    const radio = event.target;

    if (!(radio instanceof HTMLInputElement)) {
      return;
    }

    if (radio.name !== "theme") {
      return;
    }

    if (!validThemes.includes(radio.value)) {
      return;
    }

    applyTheme(radio.value);
    saveTheme(radio.value);
    updateRadios(radio.value);
  });
}