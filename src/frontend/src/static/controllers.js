// Shared helpers for the controller pages (controller_config.html and controller_buttons.html).
// Controllers are read with the browser's Gamepad API.

// ---------- Hat switches ----------
// The browser reports a hat (8-way thumb switch) as ONE axis: -1 = up, then clockwise in
// steps of 2/7, and ~1.29 when centered. We turn it into 4 buttons: hat up/down/left/right.
const HAT_DIRECTIONS = ["up", "down", "left", "right"];
const HAT_POSITIONS = [["up"], ["up", "right"], ["right"], ["down", "right"], ["down"], ["down", "left"], ["left"], ["up", "left"]];
const hatAxesFound = {};  // controller key -> axis numbers that turned out to be hats

// Which directions a hat axis value means, e.g. ["up", "right"], or [] when centered
function hatDirections(value) {
  if (Math.abs(value) > 1.01) return [];
  return HAT_POSITIONS[Math.round((value + 1) * 3.5)] || [];
}

// ---------- Controllers ----------

// Connected controllers: { key, gamepad, hatAxes }.
// The key is the name the controller reports; if two report the same name, the 2nd gets " #2".
// An axis counts as a hat once it has been seen centered (value outside -1..1).
function getControllers() {
  const seen = {};
  return [...navigator.getGamepads()].filter(gamepad => gamepad).map(function (gamepad) {
    seen[gamepad.id] = (seen[gamepad.id] || 0) + 1;
    const key = seen[gamepad.id] === 1 ? gamepad.id : `${gamepad.id} #${seen[gamepad.id]}`;
    const hatAxes = hatAxesFound[key] = hatAxesFound[key] || [];
    gamepad.axes.forEach(function (value, i) {
      if (Math.abs(value) > 1.01 && !hatAxes.includes(i)) hatAxes.push(i);
    });
    return { key, gamepad, hatAxes };
  });
}

// Inputs are written as "<controller key> / axis 1", "<controller key> / button 3" or
// "<controller key> / hat 9 up". Without "<controller key> / " they mean the first controller.
function parseInput(input) {
  const split = input.lastIndexOf(" / ");
  const controller = split === -1 ? null : input.slice(0, split);
  const [type, number, direction] = input.slice(split === -1 ? 0 : split + 3).split(" ");
  return { controller, type, number: Number(number), direction };
}

// Current value of an input: axes give -1..1, buttons and hat directions give 0..1
// (0 if the controller isn't connected)
function readInput(controllers, input) {
  if (!input) return 0;
  const { controller, type, number, direction } = parseInput(input);
  const found = controller === null ? controllers[0] : controllers.find(c => c.key === controller);
  if (!found) return 0;
  if (type === "hat") return hatDirections(found.gamepad.axes[number]).includes(direction) ? 1 : 0;
  if (type === "axis") {
    const value = found.gamepad.axes[number] || 0;
    // A hat used as a plain axis gives junk values (and ~1.29 when centered): read it as 0 so the ROV doesn't move
    return found.hatAxes.includes(number) || Math.abs(value) > 1.01 ? 0 : value;
  }
  return found.gamepad.buttons[number] ? found.gamepad.buttons[number].value : 0;
}

// Draw a -1..1 value as a bar growing left/right from the middle (clamped so it never overflows)
function drawBar(bar, value) {
  value = Math.max(-1, Math.min(1, value));
  bar.style.left = `${50 + Math.min(value, 0) * 50}%`;
  bar.style.width = `${Math.abs(value) * 50}%`;
}

// Short name of an input without the controller: "button 3", "axis 1", "hat 9 up"
function shortName(type, number, direction) {
  return type === "hat" ? `hat ${number} ${direction}` : `${type} ${number}`;
}

// Nickname saved on the Controller Buttons page for one input, or ""
// (saved = one controller's names: { name, buttons: {"3": ..}, axes: {"1": ..}, hats: {"9 up": ..} })
function nicknameFor(saved, type, number, direction) {
  saved = saved || {};
  if (type === "hat") return (saved.hats || {})[`${number} ${direction}`] || "";
  return (saved[type === "axis" ? "axes" : "buttons"] || {})[number] || "";
}

// Readable name for an input, using nicknames from the Controller Buttons page,
// e.g. "Left stick · button 1 (Top right button)"
function inputLabel(input, names) {
  if (!input) return "-";
  const { controller, type, number, direction } = parseInput(input);
  const saved = names[controller] || {};
  const nickname = nicknameFor(saved, type, number, direction);
  const controllerName = controller === null ? "" : (saved.name || controller) + " · ";
  return `${controllerName}${shortName(type, number, direction)}${nickname ? ` (${nickname})` : ""}`;
}
