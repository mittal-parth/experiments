import { G, boot, debugState, draw, frame, keyDown, keyUp, pointerDown, pointerMove, pointerUp } from "./game.js";

const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");

function fit() {
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
}

function enterFullscreen() {
  const root = document.documentElement;
  if (document.fullscreenElement || !root.requestFullscreen) return;
  root.requestFullscreen().catch(() => {});
}

fit();
window.addEventListener("resize", fit);
document.addEventListener("fullscreenchange", fit);
boot();

let last = performance.now();
function loop(now) {
  const dt = (now - last) / 1000;
  last = now;
  frame(dt);
  draw(ctx);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

canvas.addEventListener("mousemove", (e) => pointerMove(e, canvas));
canvas.addEventListener("mousedown", (e) => {
  enterFullscreen();
  pointerDown(e, canvas);
});
window.addEventListener("mouseup", () => pointerUp());
window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.code === "Space" || e.code.startsWith("Arrow") || e.code === "KeyF") e.preventDefault();
  if (e.code === "KeyF") {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else enterFullscreen();
    return;
  }
  enterFullscreen();
  keyDown(e.code);
});
window.addEventListener("keyup", (e) => keyUp(e.code));

window.__CRICKET = {
  G,
  debugState,
  keyDown,
  keyUp,
  canvas,
};
