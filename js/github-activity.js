const cachePrefix = "github-activity-cache";
const cacheTtl = 5 * 60 * 1000;
const requestTimeout = 8000;

class GitHubActivity extends HTMLElement {
  static get observedAttributes() {
    return ["username", "count"];
  }

  constructor() {
    super();
    this.abortController = null;
    this.retryButton = null;
  }

  connectedCallback() {
    this.renderIdle();
    this.loadActivity();
  }

  disconnectedCallback() {
    this.cancelRequest();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) {
      return;
    }

    if (this.isConnected) {
      this.loadActivity();
    }
  }

  get username() {
    return this.getAttribute("username") || "NixonLesmana";
  }

  get count() {
    const parsedCount = Number.parseInt(this.getAttribute("count") || "3", 10);

    if (Number.isNaN(parsedCount)) {
      return 3;
    }

    return Math.min(Math.max(parsedCount, 1), 8);
  }

  get endpoint() {
    return `https://api.github.com/users/${encodeURIComponent(this.username)}/events/public`;
  }

  get cacheKey() {
    return `${cachePrefix}:${this.username}:${this.count}`;
  }

  renderIdle() {
    if (this.hasAttribute("data-state")) {
      return;
    }

    this.setAttribute("data-state", "idle");
  }

  renderFromTemplate() {
    const template = document.querySelector("#github-activity-template");

    if (!template) {
      this.textContent = "GitHub activity template is missing.";
      this.setAttribute("data-state", "error");
      return null;
    }

    const fragment = template.content.cloneNode(true);
    this.replaceChildren(fragment);

    this.retryButton = this.querySelector("[data-activity-retry]");

    if (this.retryButton) {
      this.retryButton.addEventListener("click", () => {
        this.clearCache();
        this.loadActivity();
      });
    }

    return {
      heading: this.querySelector("[data-activity-heading]"),
      status: this.querySelector("[data-activity-status]"),
      list: this.querySelector("[data-activity-list]"),
      source: this.querySelector("[data-activity-source]"),
      retry: this.retryButton
    };
  }

  renderLoading() {
    this.setAttribute("data-state", "loading");

    const parts = this.renderFromTemplate();

    if (!parts) {
      return;
    }

    parts.heading.textContent = "GitHub Activity";
    parts.status.textContent = `Loading recent public activity for ${this.username}...`;
    parts.list.replaceChildren();
    parts.source.textContent = "";
    parts.retry.hidden = true;
  }

  renderSuccess(events, isCached = false) {
    this.setAttribute("data-state", "ready");

    const parts = this.renderFromTemplate();

    if (!parts) {
      return;
    }

    parts.heading.textContent = `Recent GitHub Activity`;
    parts.status.textContent = events.length
      ? `${events.length} recent public event${events.length === 1 ? "" : "s"} for ${this.username}.`
      : `No recent public activity found for ${this.username}.`;
    parts.list.replaceChildren();

    events.forEach((event) => {
      const item = document.createElement("li");
      const repoName = event.repo && event.repo.name ? event.repo.name : "unknown repository";
      const action = this.describeEvent(event);
      const time = event.created_at ? new Date(event.created_at) : null;

      const strong = document.createElement("strong");
      strong.textContent = action;

      const repo = document.createElement("span");
      repo.textContent = ` in ${repoName}`;

      item.append(strong, repo);

      if (time && !Number.isNaN(time.getTime())) {
        const small = document.createElement("small");
        small.textContent = ` - ${time.toLocaleDateString()}`;
        item.append(small);
      }

      parts.list.append(item);
    });

    parts.source.textContent = isCached
      ? "Source: GitHub public events API. Showing a cached response."
      : "Source: GitHub public events API.";
    parts.retry.hidden = true;
  }

  renderError(message) {
    this.setAttribute("data-state", "error");

    const parts = this.renderFromTemplate();

    if (!parts) {
      return;
    }

    parts.heading.textContent = "GitHub Activity";
    parts.status.textContent = message;
    parts.list.replaceChildren();
    parts.source.replaceChildren();

    const fallbackLink = document.createElement("a");
    fallbackLink.href = `https://github.com/${encodeURIComponent(this.username)}`;
    fallbackLink.textContent = `Visit ${this.username} on GitHub`;

parts.source.append(fallbackLink);
    parts.retry.hidden = false;
  }

  describeEvent(event) {
    const labels = {
      PushEvent: "Pushed commits",
      PullRequestEvent: "Opened or updated a pull request",
      IssuesEvent: "Worked on an issue",
      CreateEvent: "Created something new",
      ForkEvent: "Forked a repository",
      WatchEvent: "Starred a repository",
      ReleaseEvent: "Published a release"
    };

    return labels[event.type] || "Updated GitHub activity";
  }

  async loadActivity() {
    this.cancelRequest();

    const cachedEvents = this.readCache();

    if (cachedEvents) {
      this.renderSuccess(cachedEvents, true);
      return;
    }

    this.renderLoading();

    this.abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      this.abortController.abort();
    }, requestTimeout);

    try {
      const response = await fetch(this.endpoint, {
        signal: this.abortController.signal,
        headers: {
          Accept: "application/vnd.github+json"
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub returned ${response.status}`);
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error("GitHub returned an unexpected response.");
      }

      const events = data.slice(0, this.count);
      this.writeCache(events);
      this.renderSuccess(events);
    } catch (error) {
      if (error.name === "AbortError") {
        this.renderError("GitHub activity took too long to load. Try again.");
        return;
      }

      this.renderError("GitHub activity could not be loaded right now. Try again later.");
    } finally {
      window.clearTimeout(timeoutId);
      this.abortController = null;
    }
  }

  cancelRequest() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  readCache() {
    try {
      const cached = sessionStorage.getItem(this.cacheKey);

      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached);

      if (!parsed || !Array.isArray(parsed.events) || typeof parsed.time !== "number") {
        return null;
      }

      if (Date.now() - parsed.time > cacheTtl) {
        sessionStorage.removeItem(this.cacheKey);
        return null;
      }

      return parsed.events;
    } catch {
      return null;
    }
  }

  writeCache(events) {
    try {
      sessionStorage.setItem(
        this.cacheKey,
        JSON.stringify({
          time: Date.now(),
          events
        })
      );
    } catch {
      // If storage is unavailable, the component still works without caching.
    }
  }

  clearCache() {
    try {
      sessionStorage.removeItem(this.cacheKey);
    } catch {
      // If storage is unavailable, retrying still performs a fresh request.
    }
  }
}

customElements.define("github-activity", GitHubActivity);