(async () => {
  const parts = Array.from({ length: 9 }, (_, i) => `./chunks/sideview-${String(i + 1).padStart(3, "0")}.part?v=smooth-net-1`);
  let code = "";
  for (const part of parts) {
    const response = await fetch(part, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Failed to load ${part}`);
    code += await response.text();
  }
  (0, eval)(`${code}\n//# sourceURL=sideview.full.js`);
})();
