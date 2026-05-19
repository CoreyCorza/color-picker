/** Color conversions, parse, and serialize (hex / rgb / hsl + alpha). */

export function hsvToRgb(h, s, v) {
  const f = (n) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return {
    r: Math.round(f(5) * 255),
    g: Math.round(f(3) * 255),
    b: Math.round(f(1) * 255),
  };
}

export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const v = Math.max(r, g, b);
  const d = v - Math.min(r, g, b);
  const s = v === 0 ? 0 : d / v;
  let h = 0;
  if (d !== 0) {
    if (v === r) h = ((g - b) / d) % 6;
    else if (v === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s, v };
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) {
    r = c;
    g = x;
  } else if (h < 120) {
    r = x;
    g = c;
  } else if (h < 180) {
    g = c;
    b = x;
  } else if (h < 240) {
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return { h: 0, s: 0, l: Math.round(l * 100) };
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  let h;
  if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (mx === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hexExpand(hex) {
  hex = hex.replace(/^#/, "");
  if (hex.length === 3 || hex.length === 4) return hex.split("").map((c) => c + c).join("");
  return hex;
}

export function hexToRgba(hex) {
  const h = hexExpand(hex);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
    a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
  };
}

export function toHex6(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function parseColor(raw) {
  const s = raw.trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(s)) {
    const rgba = hexToRgba(s);
    return {
      r: rgba.r,
      g: rgba.g,
      b: rgba.b,
      alpha: rgba.a,
      fmt: hexExpand(s).length > 6 ? "hex8" : "hex",
    };
  }
  let m = s.match(
    /^(rgba?)\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i
  );
  if (m) {
    const [, fn, r, g, b, a] = m;
    return { r: +r, g: +g, b: +b, alpha: a !== undefined ? +a : 1, fmt: fn.toLowerCase() };
  }
  m = s.match(/^(rgba?)\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/i);
  if (m) {
    const [, fn, r, g, b, a] = m;
    const alpha = a ? (a.endsWith("%") ? parseFloat(a) / 100 : +a) : 1;
    return { r: +r, g: +g, b: +b, alpha, fmt: fn.toLowerCase() + "-space" };
  }
  m = s.match(
    /^(hsla?)\(\s*([\d.]+)(?:deg|rad|grad|turn)?\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+%?))?\s*\)$/i
  );
  if (m) {
    const [, fn, h, sv, lv, a] = m;
    const alpha = a ? (a.endsWith("%") ? parseFloat(a) / 100 : +a) : 1;
    const { r, g, b } = hslToRgb(+h, +sv / 100, +lv / 100);
    return { r, g, b, alpha, fmt: fn.toLowerCase() };
  }
  m = s.match(
    /^(hsla?)\(\s*([\d.]+)(?:deg|rad|grad|turn)?\s+([\d.]+)%\s+([\d.]+)%(?:\s*\/\s*([\d.]+%?))?\s*\)$/i
  );
  if (m) {
    const [, fn, h, sv, lv, a] = m;
    const alpha = a ? (a.endsWith("%") ? parseFloat(a) / 100 : +a) : 1;
    const { r, g, b } = hslToRgb(+h, +sv / 100, +lv / 100);
    return { r, g, b, alpha, fmt: fn.toLowerCase() + "-space" };
  }
  return null;
}

export function serializeColor(r, g, b, alpha, fmt) {
  const hex6 = toHex6(r, g, b);
  const a = Math.round(alpha * 100) / 100;
  const aStr = String(a);
  switch (fmt) {
    case "hex":
      return alpha >= 1 ? hex6 : hex6 + Math.round(alpha * 255).toString(16).padStart(2, "0");
    case "hex8":
      return hex6 + Math.round(alpha * 255).toString(16).padStart(2, "0");
    case "rgb":
      return alpha >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${aStr})`;
    case "rgba":
      return `rgba(${r}, ${g}, ${b}, ${aStr})`;
    case "rgb-space":
    case "rgba-space":
      return alpha >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${aStr})`;
    case "hsl":
    case "hsl-space": {
      const { h, s, l } = rgbToHsl(r, g, b);
      return alpha >= 1 ? `hsl(${h}, ${s}%, ${l}%)` : `hsla(${h}, ${s}%, ${l}%, ${aStr})`;
    }
    case "hsla":
    case "hsla-space": {
      const { h, s, l } = rgbToHsl(r, g, b);
      return `hsla(${h}, ${s}%, ${l}%, ${aStr})`;
    }
    default:
      return hex6;
  }
}

export { clamp };
