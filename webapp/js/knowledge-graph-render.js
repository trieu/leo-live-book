/**
 * ==========================================================
 * LEO LIVE BOOK – Knowledge Graph Renderer
 * ==========================================================
 *
 * Features
 * ----------------------------------------------------------
 * ✔ Load book data via jQuery AJAX
 * ✔ Endpoint-based JSON loading
 * ✔ Breadthfirst hierarchical layout
 * ✔ Book → Chapter → Section → Keyword
 * ✔ Zoom controls
 * ✔ Fit-to-screen
 * ✔ Grid rulers
 * ✔ Production-safe architecture
 *
 * Endpoint:
 *   http://127.0.0.1:5500/webapp/data/book-demo.json
 *
 * Required DOM IDs:
 * ----------------------------------------------------------
 * #knowledgeGraph
 * #zoomInBtn
 * #zoomOutBtn
 * #fitBtn
 * #zoomIndicator
 *
 * Dependencies:
 * ----------------------------------------------------------
 * jQuery 3.x
 * Cytoscape.js
 *
 * ==========================================================
 */

(function (window, $) {
  /* ======================================================
       CONFIGURATION
    ====================================================== */

  const CONFIG = {
    containerId: "knowledgeGraph",
    zoomInBtn: "zoomInBtn",
    zoomOutBtn: "zoomOutBtn",
    fitBtn: "fitBtn",
    zoomIndicator: "zoomIndicator",

    minZoom: 0.3,
    maxZoom: 3,
    zoomStep: 1.2,
    fitPadding: 60,
  };

  let cy = null;

  /* ======================================================
       INITIALIZATION
    ====================================================== */

  function init(endpointUrl) {
    if (!window.cytoscape) {
      console.error("❌ Cytoscape.js not loaded");
      return;
    }

    if (!document.getElementById(CONFIG.containerId)) {
      console.error("❌ knowledgeGraph container not found");
      return;
    }

    loadBookFromApi(endpointUrl);
  }

  /* ======================================================
       LOAD BOOK JSON (AJAX)
    ====================================================== */

  function loadBookFromApi(endpointUrl) {
    BookDataService.getBookByUrl(endpointUrl, {
      onSuccess: (bookJson) => renderFromBookJson(bookJson),
      onError: (err) => {
        console.error("❌ Failed to load book JSON", err);
      },
    });
  }

  /* ======================================================
       JSON → GRAPH CONVERSION
    ====================================================== */

  function buildGraph(bookJson) {
    const nodes = [];
    const edges = [];

    /* ---------- Root Book ---------- */

    const bookId = bookJson.book?.book_id || "book-root";

    nodes.push({
      data: {
        id: bookId,
        label: bookJson.book?.title || "Book",
        type: "book",
      },
    });

    /* ---------- Chapters ---------- */

    (bookJson.chapters || []).forEach((chapter) => {
      nodes.push({
        data: {
          id: chapter.chapter_id,
          label:
            "Chapter " + chapter.chapter_number + "\n" + chapter.chapter_title,
          type: "chapter",
        },
      });

      edges.push({
        data: {
          source: bookId,
          target: chapter.chapter_id,
        },
      });

      /* ---------- Sections ---------- */

      (chapter.sections || []).forEach((section) => {
        nodes.push({
          data: {
            id: section.section_id,
            label: section.section_number + "\n" + section.section_title,
            type: "section",
          },
        });

        edges.push({
          data: {
            source: chapter.chapter_id,
            target: section.section_id,
          },
        });

        /* ---------- Keywords ---------- */

        (section.keywords || []).forEach((keyword) => {
          const keywordId =
            section.section_id +
            "-" +
            keyword.toLowerCase().replace(/\s+/g, "-");

          nodes.push({
            data: {
              id: keywordId,
              label: keyword,
              type: "keyword",
            },
          });

          edges.push({
            data: {
              source: section.section_id,
              target: keywordId,
            },
          });
        });
      });
    });

    return { nodes, edges, rootId: bookId };
  }

  /* ======================================================
       GRAPH RENDERING
    ====================================================== */

  function renderFromBookJson(bookJson) {
    console.log("📊 Rendering knowledge graph...", bookJson.book?.title);
    const graph = buildGraph(bookJson);

    if (cy) {
      cy.destroy();
      cy = null;
    }

    cy = cytoscape({
      container: document.getElementById(CONFIG.containerId),

      elements: [...graph.nodes, ...graph.edges],

      minZoom: CONFIG.minZoom,
      maxZoom: CONFIG.maxZoom,

      layout: {
        name: "breadthfirst",
        directed: true,
        spacingFactor: 1.6,
        padding: 50,
        roots: [graph.rootId],
      },

      style: [
        /* ---------- Grid / Rulers ---------- */
        {
          selector: "core",
          style: {
            "background-color": "#f8fafc",
            "background-image": `
                            linear-gradient(#e5e7eb 1px, transparent 1px),
                            linear-gradient(90deg, #e5e7eb 1px, transparent 1px)
                        `,
            "background-size": "30px 30px",
          },
        },

        /* ---------- Edges ---------- */
        {
          selector: "edge",
          style: {
            width: 2,
            "line-color": "#94a3b8",
            "target-arrow-shape": "triangle",
            "target-arrow-color": "#94a3b8",
            "curve-style": "bezier",
          },
        },

        /* ---------- Nodes ---------- */

        /* ---------- Book ---------- */
        {
          selector: 'node[type="book"]',
          style: {
            "background-color": "#0f172a",
            "font-size": "14px",
            "font-weight": "700",
            "text-max-width": "180px",
            padding: "20px",
            shape: "round-rectangle",
          },
        },

        /* ---------- Chapter ---------- */
        {
          selector: 'node[type="chapter"]',
          style: {
            "background-color": "#2563eb",
            "font-size": "11px",
            "text-max-width": "110px",
            padding: "10px",
            shape: "round-rectangle",
            "line-height": 1.2,
          },
        },

        /* ---------- Section ---------- */
        {
          selector: 'node[type="section"]',
          style: {
            "background-color": "#4f46e5",
            "font-size": "10px",
            "text-max-width": "120px",
            padding: "9px",
            shape: "round-rectangle",
          },
        },

        /* ---------- Keyword ---------- */
        {
          selector: 'node[type="keyword"]',
          style: {
            "background-color": "#818cf8",
            "font-size": "9px",
            "text-max-width": "80px",
            padding: "6px",
            shape: "ellipse",
          },
        },

        /* ---------- Shared ---------- */
        {
          selector: "node",
          style: {
            label: "data(label)",
            color: "#ffffff",
            "text-wrap": "wrap",
            "text-valign": "center",
            "text-halign": "center",
            "font-family": "Inter, Arial, sans-serif",
            "font-weight": "600",
            width: "label",
            height: "label",
            "border-width": 1,
            "border-color": "#e5e7eb",
          },
        },
      ],
    });

    cy.on("zoom pan", updateZoomIndicator);
    updateZoomIndicator();

    bindControls();
  }

  /* ======================================================
       CONTROLS
    ====================================================== */

  function bindControls() {
    $("#" + CONFIG.zoomInBtn)
      .off()
      .on("click", () => {
        zoomTo(cy.zoom() * CONFIG.zoomStep);
      });

    $("#" + CONFIG.zoomOutBtn)
      .off()
      .on("click", () => {
        zoomTo(cy.zoom() / CONFIG.zoomStep);
      });

    $("#" + CONFIG.fitBtn)
      .off()
      .on("click", () => {
        cy.fit(undefined, CONFIG.fitPadding);
      });


  }

  function zoomTo(level) {
    cy.zoom({
      level: level,
      renderedPosition: {
        x: cy.width() / 2,
        y: cy.height() / 2,
      },
    });
  }

  function updateZoomIndicator() {
    $("#" + CONFIG.zoomIndicator).text(Math.round(cy.zoom() * 100) + "%");
  }

  /* ======================================================
       PUBLIC API
    ====================================================== */

  window.LEO_KNOWLEDGE_GRAPH = {
    init,
    reload(endpointUrl) {
      loadBookFromApi(endpointUrl);
    },
    getInstance() {
      return cy;
    },
  };
})(window, jQuery);
