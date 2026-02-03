window.MathJax = {
  tex: {
    inlineMath: [
      ["$", "$"],
      ["\\(", "\\)"],
    ],
    displayMath: [
      ["$$", "$$"],
      ["\\[", "\\]"],
    ],
  },
  svg: { fontCache: "global" },
};

function renderMath(container) {
  if (window.MathJax) {
    MathJax.typesetPromise([container]).catch((err) =>
      console.error("MathJax render error:", err),
    );
  }
}

function convertMdToHTML(markdownText) {
  if (!markdownText) return "";

  return marked.parse(markdownText, {
    breaks: true, // line breaks → <br>
    gfm: true, // GitHub-flavored markdown
  });
}

function initApp(dataPath) {
  // Initialize Book Engine
  LEO_BOOK.init(dataPath);

  // Initialize Knowledge Graph
  LEO_KNOWLEDGE_GRAPH.init(dataPath);

  initSearchService(dataPath);
}

$(document).ready(() => {
  BookDataService.setAuth({
    headerKey: "X-API-KEY",
    token: "leo-demo-key-123",
  });

  var dataPath = "./data/leo-cdp-doc.json";
  //var dataPath = "./data/sample-book.json";
  if (location.search) {
    const params = new URLSearchParams(location.search);
    if (params.has("book-metadata")) {
      dataPath = params.get("book-metadata");
    }
  }
  initApp(dataPath);
});
