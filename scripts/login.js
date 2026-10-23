import { getCases, importCollectionBundle, initializeArchive } from "./data.js";
import { parseAndValidateImport } from "./case-format.js";
import demoBundle from "./demo-data.js";

const SESSION_KEY = "aftercase.session";
const form = document.querySelector("#login-form");
const username = document.querySelector("#username");
const password = document.querySelector("#password");
const usernameError = document.querySelector("#username-error");
const passwordError = document.querySelector("#password-error");
const formMessage = document.querySelector("#login-message");
const submitButton = document.querySelector("#sign-in");

function setError(input, errorNode, message) {
  errorNode.textContent = message;
  input.setAttribute("aria-invalid", String(Boolean(message)));
}

function validateCredentials() {
  const missingUsername = !username.value.trim();
  const missingPassword = !password.value;
  setError(username, usernameError, missingUsername ? "Enter your username." : "");
  setError(password, passwordError, missingPassword ? "Enter your password." : "");
  if (missingUsername) username.focus();
  else if (missingPassword) password.focus();
  return !missingUsername && !missingPassword;
}

async function addDemoCasesIfNeeded() {
  await initializeArchive();
  if (localStorage.getItem("aftercase.demoDismissed") === "true" || (await getCases()).length > 0) return;
  const result = parseAndValidateImport(JSON.stringify(demoBundle));
  if (!result.bundle || result.errors.length || result.warnings.length) {
    throw new Error([...result.errors, ...result.warnings].join(" ") || "Sample cases did not pass validation.");
  }
  await importCollectionBundle(result.bundle);
}

function createSession(name, guest = false) {
  const now = Date.now();
  const keepSignedIn = document.querySelector("#keep-signed-in").checked;
  const duration = keepSignedIn ? 30 * 24 * 60 * 60 * 1000 : 12 * 60 * 60 * 1000;
  localStorage.setItem(SESSION_KEY, JSON.stringify({
    name,
    guest,
    signedInAt: new Date(now).toISOString(),
    expiresAt: new Date(now + duration).toISOString()
  }));
}

async function enter(name, guest = false) {
  submitButton.disabled = true;
  formMessage.className = "form-message";
  formMessage.textContent = "";
  createSession(name, guest);
  try {
    await addDemoCasesIfNeeded();
  } catch {
    formMessage.className = "form-message error";
    formMessage.textContent = "Sample cases could not be loaded. You can still continue to your archive.";
  }
  window.location.assign("home.html");
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateCredentials()) return;
  await enter(username.value.trim());
});

document.querySelector("#continue-guest").addEventListener("click", () => enter("Guest", true));
document.querySelector("#toggle-password").addEventListener("click", (event) => {
  const button = event.currentTarget;
  const reveal = password.type === "password";
  password.type = reveal ? "text" : "password";
  button.textContent = reveal ? "Hide" : "Show";
  button.setAttribute("aria-label", reveal ? "Hide password" : "Show password");
  button.setAttribute("aria-pressed", String(reveal));
});

for (const input of [username, password]) {
  input.addEventListener("input", () => {
    if (input === username && username.value.trim()) setError(username, usernameError, "");
    if (input === password && password.value) setError(password, passwordError, "");
  });
}
