import {
  hsvToRgb,
  rgbToHsv,
  rgbToHsl,
  hexToRgba,
  hslToRgb,
  toHex6,
  parseColor,
  serializeColor,
  clamp,
} from "./color-math.js";

let popup = null;
let isDragging = false;
let closeHandler = null;

export function closeColorPopup() {
  if (!popup) return;
  popup.remove();
  popup = null;
  if (closeHandler) {
    document.removeEventListener("mousedown", closeHandler);
    closeHandler = null;
  }
}

const MODES = ["hex", "rgb", "hsl"];

function formatForMode(r, g, b, alpha, mode) {
  switch (mode) {
    case "hex":
      return alpha >= 1
        ? toHex6(r, g, b)
        : toHex6(r, g, b) + Math.round(alpha * 255).toString(16).padStart(2, "0");
    case "rgb":
      return alpha >= 1
        ? `rgb(${r}, ${g}, ${b})`
        : `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 100) / 100})`;
    case "hsl": {
      const { h, s, l } = rgbToHsl(r, g, b);
      return alpha >= 1
        ? `hsl(${h}, ${s}%, ${l}%)`
        : `hsla(${h}, ${s}%, ${l}%, ${Math.round(alpha * 100) / 100})`;
    }
    default:
      return toHex6(r, g, b);
  }
}

function fmtToMode(fmt) {
  if (fmt.startsWith("hsl")) return "hsl";
  if (fmt.startsWith("rgb")) return "rgb";
  return "hex";
}

/**
 * Open the picker anchored to an element.
 * @param {{ anchor: Element, color: string, onChange: (value: { r, g, b, alpha, string, fmt }) => void }} opts
 */
export function openColorPopup({ anchor, color, onChange }) {
  closeColorPopup();
  const parsed = parseColor(color);
  if (!parsed) return;

  let { r, g, b, alpha, fmt } = parsed;
  let { h, s, v } = rgbToHsv(r, g, b);
  let mode = fmtToMode(fmt);

  function emit() {
    const rgb = hsvToRgb(h, s, v);
    r = rgb.r;
    g = rgb.g;
    b = rgb.b;
    const string = serializeColor(r, g, b, alpha, fmt);
    onChange({ r, g, b, alpha, string, fmt });
  }

  popup = document.createElement("div");
  popup.className = "cpick-popup";

  const sv = document.createElement("div");
  sv.className = "cpick-sv";

  const svWhite = document.createElement("div");
  svWhite.className = "cpick-sv-white";
  const svBlack = document.createElement("div");
  svBlack.className = "cpick-sv-black";
  const svCursor = document.createElement("div");
  svCursor.className = "cpick-sv-cursor";
  sv.append(svWhite, svBlack, svCursor);

  const hueSlider = document.createElement("input");
  hueSlider.type = "range";
  hueSlider.className = "cpick-hue";
  hueSlider.min = "0";
  hueSlider.max = "360";
  hueSlider.step = "1";

  const alphaRow = document.createElement("div");
  alphaRow.className = "cpick-alpha-row";
  const alphaSlider = document.createElement("input");
  alphaSlider.type = "range";
  alphaSlider.className = "cpick-alpha";
  alphaSlider.min = "0";
  alphaSlider.max = "1";
  alphaSlider.step = "0.01";
  const alphaNum = document.createElement("span");
  alphaNum.className = "cpick-alpha-num";
  alphaRow.append(alphaSlider, alphaNum);

  // Mode buttons
  const modeRow = document.createElement("div");
  modeRow.className = "cpick-modes";
  const modeBtns = {};
  for (const m of MODES) {
    const btn = document.createElement("button");
    btn.className = "cpick-mode-btn";
    btn.textContent = m;
    btn.addEventListener("click", () => setMode(m));
    modeRow.appendChild(btn);
    modeBtns[m] = btn;
  }

  const valueInput = document.createElement("input");
  valueInput.type = "text";
  valueInput.className = "cpick-value";
  valueInput.spellcheck = false;
  valueInput.autocomplete = "off";

  popup.append(sv, hueSlider, alphaRow, modeRow, valueInput);
  document.body.appendChild(popup);

  function setMode(m) {
    mode = m;
    fmt = m === "rgb" ? "rgb" : m === "hsl" ? "hsl" : "hex";
    updateModeButtons();
    updateValueInput();
    emit();
  }

  function updateModeButtons() {
    for (const m of MODES) {
      if (m === mode) modeBtns[m].setAttribute("data-active", "");
      else modeBtns[m].removeAttribute("data-active");
    }
  }

  function updateValueInput() {
    const rgb = hsvToRgb(h, s, v);
    valueInput.value = formatForMode(rgb.r, rgb.g, rgb.b, alpha, mode);
  }

  function updateUI() {
    sv.style.background = `hsl(${h}, 100%, 50%)`;
    const SV_W = sv.offsetWidth || 148;
    const SV_H = sv.offsetHeight || 80;
    svCursor.style.left = s * SV_W + "px";
    svCursor.style.top = (1 - v) * SV_H + "px";
    hueSlider.value = String(h);
    alphaSlider.value = String(alpha);
    alphaNum.textContent = Math.round(alpha * 100) + "%";
    const rgb = hsvToRgb(h, s, v);
    alphaSlider.style.setProperty("--cpick-color", `${rgb.r},${rgb.g},${rgb.b}`);
    updateModeButtons();
    updateValueInput();
  }

  updateUI();

  const SHIFT_FACTOR = 0.1;
  let lastMX = 0;
  let lastMY = 0;

  function setSVFromEvent(e) {
    const rect = sv.getBoundingClientRect();
    if (e.shiftKey) {
      const dx = ((e.clientX - lastMX) / rect.width) * SHIFT_FACTOR;
      const dy = ((e.clientY - lastMY) / rect.height) * SHIFT_FACTOR;
      s = clamp(s + dx, 0, 1);
      v = clamp(v - dy, 0, 1);
    } else {
      s = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      v = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    }
    lastMX = e.clientX;
    lastMY = e.clientY;
    updateUI();
    emit();
  }

  sv.addEventListener("mousedown", (e) => {
    e.preventDefault();
    isDragging = true;
    lastMX = e.clientX;
    lastMY = e.clientY;
    setSVFromEvent(e);
    function onMove(ev) {
      setSVFromEvent(ev);
    }
    function onUp() {
      isDragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  hueSlider.addEventListener("input", () => {
    h = +hueSlider.value;
    updateUI();
    emit();
  });

  alphaSlider.addEventListener("input", () => {
    alpha = +alphaSlider.value;
    alphaNum.textContent = Math.round(alpha * 100) + "%";
    updateValueInput();
    emit();
  });

  valueInput.addEventListener("change", () => {
    const parsed = parseColor(valueInput.value);
    if (parsed) {
      const hsv = rgbToHsv(parsed.r, parsed.g, parsed.b);
      h = hsv.h;
      s = hsv.s;
      v = hsv.v;
      alpha = parsed.alpha;
      mode = fmtToMode(parsed.fmt);
      fmt = parsed.fmt;
      updateUI();
      emit();
    }
  });

  const ar = anchor.getBoundingClientRect();
  const pr = popup.getBoundingClientRect();
  let top = ar.bottom + 4;
  let left = ar.left;
  if (top + pr.height > window.innerHeight - 8) top = ar.top - pr.height - 4;
  if (left + pr.width > window.innerWidth - 8) left = window.innerWidth - pr.width - 8;
  if (left < 4) left = 4;
  popup.style.top = top + "px";
  popup.style.left = left + "px";

  setTimeout(() => {
    closeHandler = (e) => {
      if (isDragging) return;
      if (popup && popup.contains(e.target)) return;
      closeColorPopup();
    };
    document.addEventListener("mousedown", closeHandler);
  }, 0);
}
