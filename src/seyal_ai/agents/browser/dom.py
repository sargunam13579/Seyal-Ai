"""
Compact Semantic DOM Extractor for Autonomous Browser Agent.

Condenses raw HTML documents into concise, structured semantic summaries
suitable for LLM consumption, stripping scripts, styles, SVGs, and inline bloat.
"""

from __future__ import annotations

import re
from html.parser import HTMLParser
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.browser.dom")

DEFAULT_MAX_DOM_BYTES = 16384  # 16 KB


class _SemanticHTMLParser(HTMLParser):
    """Fast, standard-library HTML parser that extracts essential interactive and textual nodes."""

    def __init__(self) -> None:
        super().__init__()
        self._lines: list[str] = []
        self._ignore_stack: list[str] = []
        self._cur_tag: str = ""
        self._cur_attrs: dict[str, str] = {}
        self._in_title = False
        self.page_title: str = ""

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag_lower = tag.lower()
        if tag_lower in ("script", "style", "svg", "noscript", "iframe"):
            self._ignore_stack.append(tag_lower)
            return

        if self._ignore_stack:
            return

        attr_dict = {k.lower(): (v or "") for k, v in attrs}

        if tag_lower == "title":
            self._in_title = True
        elif tag_lower in ("h1", "h2", "h3", "h4", "h5", "h6"):
            self._lines.append(f"\n[Heading {tag_lower.upper()}]")
        elif tag_lower == "a" and "href" in attr_dict:
            href = attr_dict["href"]
            self._lines.append(f"[Link: {href}]")
        elif tag_lower == "button":
            btn_id = attr_dict.get("id", "")
            self._lines.append(f"[Button id='{btn_id}']")
        elif tag_lower == "input":
            itype = attr_dict.get("type", "text")
            iname = attr_dict.get("name", "")
            iid = attr_dict.get("id", "")
            ival = attr_dict.get("value", "")
            self._lines.append(f"[Input type='{itype}' id='{iid}' name='{iname}' value='{ival}']")
        elif tag_lower == "textarea":
            tname = attr_dict.get("name", "")
            tid = attr_dict.get("id", "")
            self._lines.append(f"[Textarea id='{tid}' name='{tname}']")
        elif tag_lower == "form":
            action = attr_dict.get("action", "")
            self._lines.append(f"\n[Form action='{action}']")

    def handle_endtag(self, tag: str) -> None:
        tag_lower = tag.lower()
        if self._ignore_stack and self._ignore_stack[-1] == tag_lower:
            self._ignore_stack.pop()
            return

        if tag_lower == "title":
            self._in_title = False

    def handle_data(self, data: str) -> None:
        if self._ignore_stack:
            return

        clean = " ".join(data.split())
        if not clean:
            return

        if self._in_title:
            self.page_title = clean
        else:
            self._lines.append(clean)

    def get_semantic_representation(self) -> str:
        text = " ".join(self._lines)
        # Normalize multiple spaces and newlines
        return re.sub(r"\s+", " ", text).strip()


class SemanticDOMExtractor:
    """
    Transforms raw HTML into concise LLM-friendly semantic text.
    """

    def __init__(self, max_bytes: int = DEFAULT_MAX_DOM_BYTES) -> None:
        self._max_bytes = max_bytes

    def extract(self, html_content: str) -> tuple[str, str]:
        """
        Parse raw HTML and extract (page_title, semantic_dom_summary).
        Truncates if resulting representation exceeds max_bytes.
        """
        if not html_content:
            return "", ""

        parser = _SemanticHTMLParser()
        try:
            parser.feed(html_content)
        except Exception as e:
            log.warning("HTML parsing encountered an issue: %s", e)

        title = parser.page_title
        dom_repr = parser.get_semantic_representation()

        if len(dom_repr.encode("utf-8", errors="replace")) > self._max_bytes:
            truncated = dom_repr[: self._max_bytes]
            dom_repr = f"{truncated}\n... [DOM TRUNCATED at {self._max_bytes // 1024} KB]"

        return title, dom_repr
