/**
 * =========================================
 * SEARCH ENGINE (DOMAIN LOGIC)
 * =========================================
 */
class LeoSearchEngine {
  constructor(data) {
    this.index = [];
    this.buildIndex(data);
  }

  /**
   * Normalize string:
   * - lowercase
   * - remove Vietnamese accents
   */
  normalize(str = "") {
    return str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  /**
   * Build flat search index from nested book structure
   */
  buildIndex(data) {
    if (!data?.chapters) return;

    data.chapters.forEach((chapter) => {
      chapter.sections.forEach((section) => {
        const contentStr = section.content.join(" ");

        this.index.push({
          id: section.section_id,
          chapter_title: chapter.chapter_title,
          chapter_number: chapter.chapter_number,
          section_number: section.section_number,
          section_title: section.section_title,
          keywords: section.keywords,
          summary: section.summary,
          content: contentStr,

          // Precomputed search blob (performance optimization)
          _searchBlob: this.normalize(
            `${chapter.chapter_title} 
             ${section.section_title} 
             ${section.keywords.join(" ")} 
             ${section.summary} 
             ${contentStr}`
          ),
        });
      });
    });
  }

  /**
   * Core search scoring algorithm
   */
  search(query) {
    if (!query || query.trim().length === 0) return [];

    const terms = this.normalize(query)
      .split(/\s+/)
      .filter(Boolean);

    const results = [];

    this.index.forEach((doc) => {
      let score = 0;

      terms.forEach((term) => {
        if (this.normalize(doc.section_title).includes(term)) score += 10;
        if (this.normalize(doc.chapter_title).includes(term)) score += 8;
        if (doc.keywords.some((k) => this.normalize(k).includes(term)))
          score += 8;
        if (this.normalize(doc.summary).includes(term)) score += 2;
        if (this.normalize(doc.content).includes(term)) score += 1;
      });

      if (score > 0) {
        results.push({ ...doc, score, terms });
      }
    });

    return results.sort((a, b) => b.score - a.score);
  }
}

/**
 * =========================================
 * SEARCH RENDERER (UI ONLY)
 * =========================================
 */
class LeoSearchRenderer {
  constructor(container) {
    this.container = container;
  }

  /**
   * Highlight matched terms
   */
  highlight(text = "", terms = []) {
    if (!terms.length) return text;

    const sorted = [...terms].sort((a, b) => b.length - a.length);
    const pattern = new RegExp(`(${sorted.join("|")})`, "gi");

    return text.replace(pattern, '<span class="highlight">$1</span>');
  }

  /**
   * Render search results
   */
  render(results, query) {
    this.container.innerHTML = "";

    if (query.trim() !== "" && results.length === 0) {
      this.container.innerHTML = `
        <div class="no-results">No matches found for "${query}"</div>
      `;
      return;
    }

    if (query.trim() === "") return;

    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);

    results.forEach((res) => {
      const div = document.createElement("div");
      div.className = "result-item";
      div.dataset.sectionId = res.id;

      const titleH = this.highlight(res.section_title, terms);
      const summaryH = this.highlight(res.summary, terms);
      const chapterH = this.highlight(res.chapter_title, terms);

      const tagsHtml = res.keywords
        .map((k) => {
          const isMatch = terms.some((t) => k.toLowerCase().includes(t));
          return `
            <span class="keyword-tag" style="${
              isMatch ? "background:#bbf7d0;color:#166534;" : ""
            }">${k}</span>
          `;
        })
        .join("");

      div.innerHTML = `
        <div class="result-meta">
          Chapter ${res.chapter_number}: ${chapterH}
        </div>
        <h3 class="result-title">
          ${res.section_number} ${titleH}
        </h3>
        <div class="result-snippet">${summaryH}</div>
        <div class="result-keywords">${tagsHtml}</div>
      `;

      this.container.appendChild(div);
    });
  }
}

/**
 * =========================================
 * SEARCH CONTROLLER (EVENTS & FLOW)
 * =========================================
 */
class LeoSearchController {
  constructor(bookData, inputEl, resultsEl) {
    this.bookId = bookData.book?.book_id;
    this.engine = new LeoSearchEngine(bookData);
    this.renderer = new LeoSearchRenderer(resultsEl);
    this.inputEl = inputEl;
    this.resultsEl = resultsEl;

    // Bind + debounce search handler
    this.handleSearch = this.debounce(this.handleSearch.bind(this), 150);

    this.bindEvents();
  }

  /**
   * Debounce utility to prevent excessive computation
   */
  debounce(fn, delay = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  /**
   * Centralized search execution
   * → ALL events must go through this
   */
  handleSearch(query) {
    const q = (query ?? this.inputEl.value ?? "").trim();
    const results = this.engine.search(q);
    this.renderer.render(results, q);
  }

  /**
   * Bind ALL event sources:
   * - typing (input)
   * - change (blur / manual trigger)
   * - jQuery trigger support
   */
  bindEvents() {
    // Native typing
    this.inputEl.addEventListener("input", (e) => {
      this.handleSearch(e.target.value);
    });

    // Native change
    this.inputEl.addEventListener("change", (e) => {
      this.handleSearch(e.target.value);
    });

    // jQuery compatibility (CRITICAL for your use case)
    if (window.jQuery) {
      $(this.inputEl).on("input change", (e) => {
        this.handleSearch(e.target.value);
      });
    }

    // Result click delegation
    this.resultsEl.addEventListener("click", (e) => {
      const item = e.target.closest(".result-item");
      if (!item) return;

      const sectionId = item.dataset.sectionId;
      this.onResultClick(sectionId);
    });
  }

  /**
   * Handle click on result
   */
  onResultClick(sectionId) {
    const hashId = `book$${this.bookId}$${sectionId}`;
    console.log("Clicked hashId:", hashId);
    location.hash = hashId;
  }
}

/**
 * =========================================
 * APP INIT
 * =========================================
 */
function initSearchService(endpointUrl) {
  BookDataService.getBookByUrl(endpointUrl, {
    onSuccess: (bookJson) => {
      console.log("📘 Book JSON loaded", bookJson.book?.title);

      new LeoSearchController(
        bookJson,
        document.getElementById("search-input"),
        document.getElementById("results-container")
      );
    },
    onError: (err) => {
      console.error("❌ Failed to load book JSON", err);
    },
  });
}