// leo-book-engine.js
const LEO_BOOK = {
  data: null,
  chapterIndex: 0,
  sectionIndex: 0,

  dom: {
    title: $("#book-title"),
    pageTitle: $("#page-title"),
    chapterList: $("#chapterList"),
    breadcrumb: $("#breadcrumb"),
    reader: $("#readerCard"),
  },

  init(endpointUrl) {
    this.loadBook(endpointUrl);

    // react to manual hash change
    window.addEventListener("hashchange", () => {
      this.routeFromHash();
    });
  },

  loadBook(endpointUrl) {
    BookDataService.getBookByUrl(endpointUrl, {
      onSuccess: (bookJson) => {
        console.log("📘 Book JSON loaded", bookJson.book?.title);
        this.data = bookJson;
        this.renderBookMeta();
        this.renderChapterList();
        // this.loadSection(0, 0);

        // route after JSON ready
        this.routeFromHash();
      },
      onError: (err) => {
        console.error("❌ Failed to load book JSON", err);
      },
    });
  },

  showContentByTag(tag) {
    // TODO: implement filtering content by tag
    console.log("🔎 Filter by tag:", tag);
    $('#search-input').val(tag).trigger('change');

    // Example behaviors (choose one or combine):
    // 1. Filter sections by keyword
    // 2. Highlight matching content
    // 3. Navigate to search results page
    // 4. Trigger AI semantic search

    // POC example: simple alert
    // alert("Show content for tag: " + tag);
  },

  /* ======================================================
       ROUTER
    ====================================================== */

  routeFromHash() {
    const hash = window.location.hash;

    // default
    if (!hash || !hash.startsWith("#book$")) {
      this.renderBookDetails();
      return;
    }

    /**
     * Expected:
     * #book$book_id$section_id
     */
    const parts = hash.replace("#", "").split("$");

    if (parts.length !== 3) {
      console.warn("Invalid hash format");
      this.loadSection(0, 0);
      return;
    }

    const [, bookId, sectionId] = parts;

    // ensure correct book
    if (this.data.book?.book_id !== bookId) {
      console.warn("Book ID mismatch");
      this.loadSection(0, 0);
      return;
    }

    // find section
    const position = this.findSectionById(sectionId);

    if (!position) {
      console.warn("Section not found:", sectionId);
      this.loadSection(0, 0);
      return;
    }

    this.loadSection(position.cIndex, position.sIndex);
  },

  /* ======================================================
       FIND SECTION
    ====================================================== */

  findSectionById(sectionId) {
    for (let c = 0; c < this.data.chapters.length; c++) {
      const chapter = this.data.chapters[c];

      for (let s = 0; s < chapter.sections.length; s++) {
        if (chapter.sections[s].section_id === sectionId) {
          return { cIndex: c, sIndex: s };
        }
      }
    }

    return null;
  },

  renderBookMeta() {
    const book = this.data.book || {};

    const bookTitle = book.title || "LEO LIVE BOOK";
    this.dom.title.text(bookTitle);

    const fullDescription = book.description || "";
    this.dom.title.attr("title", fullDescription);

    this.dom.pageTitle.text((book.title || "LEO LIVE BOOK") + " | AI Learning");

    const coverUrl = book.image_cover_url;
    if (coverUrl) {
      $("#book-cover")
        .attr("src", coverUrl)
        .attr("title", bookTitle)
        .show();
    } 
  },


  renderBookDetails() {
    const book = this.data.book || {};
    const title =  book.title || "LEO LIVE BOOK";
    const fullDescription = book.description || "";
     const coverUrl = book.image_cover_url || "https://img.icons8.com/plasticine/1200/storytelling.jpg";

    // Markdown → HTML
    const descriptionHTML = convertMdToHTML(fullDescription);

    
    // Inject HTML
    this.dom.reader.html(`
        <h1 class="mb-3">${title}</h1>
        <img class="img-fluid rounded shadow mb-2 mx-auto d-block"
                            src="${coverUrl}"
                            style="max-width:90%; height:auto;" alt="Book Cover" />
        <div class="lead">${descriptionHTML}</div>
    `);

  },

  /* ===========================
       Chapters + Sections
    ============================ */

  renderChapterList() {
    const chapters = this.data.chapters || [];
    this.dom.chapterList.empty();

    chapters.forEach((chapter, cIndex) => {
      const chapterEl = $(`
                <div class="mb-2">
                    <div class="fw-semibold text-light small mb-1">
                        ${chapter.chapter_number}. ${chapter.chapter_title}
                    </div>
                </div>
            `);

      (chapter.sections || []).forEach((section, sIndex) => {
        const sectionEl = $(`
                    <a href="#"
                       class="ps-3 d-block small"
                       data-c="${cIndex}"
                       data-s="${sIndex}">
                        ${section.section_number} ${section.section_title}
                    </a>
                `);

        sectionEl.on("click", (e) => {
          e.preventDefault();
          this.loadSection(cIndex, sIndex, true);
        });

        chapterEl.append(sectionEl);
      });

      this.dom.chapterList.append(chapterEl);
    });
  },

  /* ===========================
       Load Section
    ============================ */

  loadSection(cIndex, sIndex, updateHash = false) {
    if ($(window).width() < 768) {
      // close sidebar on mobile after selecting a section
      $("#sidebar").collapse("hide");
    }

    const chapter = this.data.chapters?.[cIndex];
    const section = chapter?.sections?.[sIndex];
    const section_title = section?.section_title || "";

    if (!chapter || !section) return;

    this.chapterIndex = cIndex;
    this.sectionIndex = sIndex;

    this.renderBreadcrumb(chapter, section);
    this.renderReader(section);
    this.highlightSection(cIndex, sIndex);

    // update URL
    if (updateHash) {
      const bookId = this.data.book.book_id;
      window.location.hash = `book$${bookId}$${section.section_id}`;
    }

    if (typeof LeoObserver !== "undefined") {
      document.title = defaultDocumentTitle + " - " + section_title;
      window.srcTouchpointName = document.title;
      LeoObserver.recordEventContentView({ section_title: section_title });
    }
  },

  /* ===========================
       Breadcrumb
    ============================ */

  renderBreadcrumb(chapter, section) {
    this.dom.breadcrumb.html(`
            <li class="breadcrumb-item">${chapter.chapter_title}</li>
            <li class="breadcrumb-item active">
                ${section.section_number} ${section.section_title}
            </li>
        `);
  },

  /* ===========================
       Reader
    ============================ */

  renderReader(section) {
    const summaryMd = section.summary || "";
    const keywords = Array.isArray(section.keywords) ? section.keywords : [];

    const contentMd = Array.isArray(section.content) ? section.content : [];

    const video = section.summary_video?.youtube_id
      ? `
            <div class="ratio ratio-16x9 my-4 rounded overflow-hidden">
                <iframe
                    src="https://www.youtube.com/embed/${section.summary_video.youtube_id}"
                    allowfullscreen>
                </iframe>
            </div>
          `
      : "";

    // Markdown → HTML
    const summaryHTML = convertMdToHTML(summaryMd);
    const paragraphsHTML = contentMd.map((md) => convertMdToHTML(md)).join("");

    // Keywords → clickable tags
    const tagsHTML = keywords
      .map(
        (k) => `
            <span class="tag-clickable"
                  data-tag="${k}">
                ${k}
            </span>
        `,
      )
      .join("");

    // Inject HTML
    this.dom.reader.html(`
        <h1 class="mb-3">${section.section_title}</h1>
        <div class="lead">${summaryHTML}</div>
        ${video}
        ${paragraphsHTML}
        <div class="mt-4 tag-container">
            ${tagsHTML}
        </div>
    `);

    // 🔥 Bind tag click events (AFTER DOM update)
    this.dom.reader
      .find(".tag-clickable")
      .off("click")
      .on("click", (e) => {
        const tag = $(e.currentTarget).data("tag");
        LEO_BOOK.showContentByTag(tag);
      });

    // 🔥 Render MathJax after everything
    renderMath(this.dom.reader[0]);
  },

  /* ===========================
       Highlight
    ============================ */

  highlightSection(cIndex, sIndex) {
    $("#chapterList a").removeClass("active");

    $(`#chapterList a[data-c="${cIndex}"][data-s="${sIndex}"]`).addClass(
      "active",
    );
  },
};

// Fullscreen
$("#btnFullscreen").on("click", () => {
  document.documentElement.requestFullscreen?.();
});
