// Utility helpers

export function formatName(firstName, lastName) {
  if (!firstName) return lastName || "";
  return `${firstName} ${lastName || ""}`.trim();
}

export const multiply = (a, b) => {
  return a * b;
};

export default function runDiagnostics() {
  return { status: "ready", timestamp: Date.now() };
}
