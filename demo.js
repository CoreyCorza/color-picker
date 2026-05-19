import { openColorPopup } from "./color-popup.js";

const swatch = document.getElementById("swatch");
const pickBtn = document.getElementById("pick-btn");
const valueEl = document.getElementById("value");

let current = "#6b8aff";

function apply(colorString) {
  current = colorString;
  swatch.style.background = colorString;
  if (valueEl) valueEl.textContent = colorString;
}

apply(current);

function open(anchor) {
  openColorPopup({
    anchor,
    color: current,
    onChange({ string }) {
      apply(string);
    },
  });
}

swatch.addEventListener("click", () => open(swatch));
pickBtn?.addEventListener("click", () => open(pickBtn));
