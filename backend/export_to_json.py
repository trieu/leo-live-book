import json
import re
from pathlib import Path
from typing import Dict, List, Any, Tuple

import yaml
from markdown_it import MarkdownIt
from mdit_py_plugins.front_matter import front_matter_plugin


# ==========================================================
# MARKDOWN PARSER
# ==========================================================

md = MarkdownIt("commonmark").use(front_matter_plugin)


# ==========================================================
# HELPERS
# ==========================================================

def slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def ensure_path(path: Path, desc: str):
    if not path.exists():
        raise FileNotFoundError(f"❌ {desc} not found: {path}")


# ==========================================================
# PARSE MARKDOWN FILE
# ==========================================================

def parse_markdown_file(md_path: Path) -> Dict[str, Any]:
    raw = md_path.read_text(encoding="utf-8")
    tokens = md.parse(raw)

    frontmatter = {}
    content: List[str] = []

    for i, token in enumerate(tokens):
        if token.type == "front_matter":
            frontmatter = yaml.safe_load(token.content) or {}

        elif token.type == "paragraph_open":
            paragraph = tokens[i + 1].content.strip()
            if paragraph:
                content.append(paragraph)

    return {
        "frontmatter": frontmatter,
        "content": content
    }


# ==========================================================
# LOAD + VALIDATE mkdocs.yml
# ==========================================================

def load_and_validate_mkdocs(project_root: Path) -> Tuple[List[Any], str]:
    mkdocs_path = project_root / "mkdocs.yml"
    ensure_path(mkdocs_path, "mkdocs.yml")

    mkdocs = yaml.safe_load(mkdocs_path.read_text(encoding="utf-8"))

    nav = mkdocs.get("nav")
    site_name = mkdocs.get("site_name")
    image_cover_url = mkdocs.get("image_cover_url")

    if not isinstance(nav, list):
        raise ValueError("❌ mkdocs.yml `nav` must be a list")

    if not site_name:
        raise ValueError("❌ mkdocs.yml must define `site_name`")

    return nav, site_name, image_cover_url
# ==========================================================
# CONVERT MKDOCS → JSON
# ==========================================================

def convert_mkdocs_to_json(project_root: Path) -> Dict[str, Any]:

    project_root = Path(project_root).resolve()
    ensure_path(project_root, "Project root")

    docs_dir = project_root / "docs"
    ensure_path(docs_dir, "docs directory")

    nav, site_name, image_cover_url = load_and_validate_mkdocs(project_root)

    book_json = {
        "book": {
            "book_id": slugify(site_name),
            "title": site_name,
            "image_cover_url": image_cover_url,
            "author": "Parsed by LEO AI",
            "description": "Generated from MkDocs markdown project",
            "version": "1.1.0"
        },
        "chapters": []
    }

    chapter_counter = 1

    for nav_item in nav:

        if not isinstance(nav_item, dict):
            continue

        for chapter_title, sections in nav_item.items():

            # Skip single-page entries like "Introduction: index.md"
            if isinstance(sections, str):
                continue

            if not isinstance(sections, list):
                raise ValueError(
                    f"❌ Invalid section format under chapter '{chapter_title}'"
                )

            chapter = {
                "chapter_id": f"ch{chapter_counter:02}",
                "chapter_number": chapter_counter,
                "chapter_title": chapter_title,
                "sections": []
            }

            section_counter = 1

            for section_item in sections:

                if not isinstance(section_item, dict):
                    raise ValueError(
                        f"❌ Invalid section entry in chapter '{chapter_title}'"
                    )

                section_title, relative_md_path = next(iter(section_item.items()))

                md_path = docs_dir / relative_md_path
                ensure_path(md_path, f"Markdown file for {section_title}")

                parsed = parse_markdown_file(md_path)

                section = {
                    "section_id": f"ch{chapter_counter:02}-sec{section_counter:02}",
                    "section_number": f"{chapter_counter}.{section_counter}",
                    "section_title": section_title,
                    "summary_video": parsed["frontmatter"].get("video"),
                    "keywords": parsed["frontmatter"].get("keywords", []),
                    "summary": parsed["content"][0] if parsed["content"] else "",
                    "content": parsed["content"]
                }

                chapter["sections"].append(section)
                section_counter += 1

            book_json["chapters"].append(chapter)
            chapter_counter += 1

    return book_json


# ==========================================================
# MAIN
# ==========================================================

if __name__ == "__main__":

    # 👇 SET YOUR PROJECT PATH HERE
    PROJECT_ROOT = Path("../sample-data/sample-book").resolve()

    print("📘 MkDocs → JSON Exporter")
    print(f"📂 Project root: {PROJECT_ROOT}")

    book_json = convert_mkdocs_to_json(PROJECT_ROOT)

    output_path = PROJECT_ROOT / "book-demo.json"

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(book_json, f, indent=2, ensure_ascii=False)

    print("✅ Export completed successfully")
    print(f"📄 Output file: {output_path}")
