const SESSION_KEY = "aftercase.session";

export function readSession() {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null");
    if (!session || typeof session.name !== "string" || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function currentPage() {
  const file = window.location.pathname.split("/").pop() || "home.html";
  return file === "case.html" ? "index.html" : file;
}

function renderHeader(session) {
  const target = document.querySelector("#site-header");
  if (!target) return;
  target.replaceChildren();
  target.className = "site-header";

  const nav = element("nav", "navigation");
  nav.setAttribute("aria-label", "Main navigation");
  const brand = element("a", "brand", "AFTERCASE");
  brand.href = "home.html";
  brand.setAttribute("aria-label", "AFTERCASE dashboard");
  const toggle = element("button", "nav-toggle", "Menu");
  toggle.type = "button";
  toggle.setAttribute("aria-expanded", "false");
  toggle.setAttribute("aria-controls", "primary-navigation");
  const content = element("div", "nav-content");
  content.id = "primary-navigation";
  const links = element("div", "nav-links");
  const page = currentPage();
  const linkItems = [
    ["home.html", "Home"],
    ["index.html", "Explore Cases"],
    ["my-archive.html", "My Archive"]
  ];
  // Mystery Lab can return here once that feature is part of the prototype.
  for (const [href, label] of linkItems) {
    const link = element("a", "", label);
    link.href = href;
    if (page === href) {
      link.classList.add("active");
      link.setAttribute("aria-current", "page");
    }
    links.append(link);
  }
  const addCase = element("a", "primary-button nav-add", "Add Case");
  addCase.href = "case-form.html";
  if (page === "case-form.html") {
    addCase.classList.add("active");
    addCase.setAttribute("aria-current", "page");
  }
  links.append(addCase);
  const search = element("a", "search-link", "Search");
  search.href = "index.html#search";
  links.append(search);

  const account = element("details", "account-menu");
  const summary = element("summary", "account-summary");
  summary.append(element("span", "account-initial", session.name === "Guest" ? "G" : (session.name.trim()[0] ?? "A").toLocaleUpperCase()));
  summary.append(element("span", "account-name", session.name === "Guest" ? "Guest" : session.name));
  account.append(summary);
  const menu = element("div", "account-dropdown");
  const archive = element("a", "", "My Archive");
  archive.href = "my-archive.html";
  const signOut = element("button", "text-button", "Sign out");
  signOut.type = "button";
  signOut.addEventListener("click", () => {
    localStorage.removeItem(SESSION_KEY);
    window.location.replace("login.html");
  });
  menu.append(archive, signOut);
  account.append(menu);

  content.append(links, account);
  nav.append(brand, toggle, content);
  target.append(nav);

  toggle.addEventListener("click", () => {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!isOpen));
    content.classList.toggle("is-open", !isOpen);
    toggle.textContent = isOpen ? "Menu" : "Close";
  });
  content.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      content.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Menu";
    }
  });
  nav.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      content.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Menu";
      toggle.focus();
      account.open = false;
    }
  });

  // Avoid carrying a stationary pointer's hover highlight onto the newly loaded page.
  document.documentElement.classList.add("nav-hover-pending");
  document.addEventListener("pointermove", () => {
    document.documentElement.classList.remove("nav-hover-pending");
  }, { once: true, passive: true });
}

function renderFooter() {
  const target = document.querySelector("#site-footer");
  if (!target) return;
  target.replaceChildren();
  target.className = "site-footer";
  const line = element("p", "", "AFTERCASE · A personal mystery archive");
  target.append(line);
}

if (window.location.pathname.split("/").pop() !== "login.html") {
  const session = readSession();
  renderFooter();
  if (!session) window.location.replace("login.html");
  else renderHeader(session);
}
