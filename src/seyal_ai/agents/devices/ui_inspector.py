"""
Android UI Automator XML Hierarchy Inspector.

Parses Android XML UI dumps, extracts structured element trees,
computes click/tap center coordinates from element bounds, and produces
concise representations for AI decision-making.
"""

from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from typing import Any

from seyal_ai.utils.logging import get_logger

log = get_logger("agents.devices.ui_inspector")

BOUNDS_REGEX = re.compile(r"\[(\d+),(\d+)\]\[(\d+),(\d+)\]")


@dataclass
class UIElementNode:
    """Structured representation of an Android UI Automator node."""

    text: str = ""
    resource_id: str = ""
    class_name: str = ""
    package: str = ""
    content_desc: str = ""
    bounds: tuple[int, int, int, int] = (0, 0, 0, 0)
    center: tuple[int, int] = (0, 0)
    is_clickable: bool = False
    is_editable: bool = False
    children: list[UIElementNode] = field(default_factory=list)

    @classmethod
    def from_xml_element(cls, elem: ET.Element) -> UIElementNode:
        attrs = elem.attrib
        text = attrs.get("text", "")
        res_id = attrs.get("resource-id", "")
        cls_name = attrs.get("class", "")
        package = attrs.get("package", "")
        content_desc = attrs.get("content-desc", "")
        clickable = attrs.get("clickable", "false").lower() == "true"
        editable = attrs.get("focusable", "false").lower() == "true" or "EditText" in cls_name

        bounds_str = attrs.get("bounds", "[0,0][0,0]")
        x1, y1, x2, y2 = 0, 0, 0, 0
        m = BOUNDS_REGEX.match(bounds_str)
        if m:
            x1, y1, x2, y2 = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4))

        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2

        node = cls(
            text=text,
            resource_id=res_id,
            class_name=cls_name,
            package=package,
            content_desc=content_desc,
            bounds=(x1, y1, x2, y2),
            center=(center_x, center_y),
            is_clickable=clickable,
            is_editable=editable,
        )

        for child in elem:
            if child.tag == "node":
                node.children.append(cls.from_xml_element(child))

        return node


class UIHierarchyInspector:
    """
    Parses and queries UI Automator hierarchies.
    """

    @classmethod
    def parse(cls, xml_content: str) -> list[UIElementNode]:
        """Parse raw XML into a list of root UIElementNodes."""
        if not xml_content or not xml_content.strip():
            return []

        try:
            root = ET.fromstring(xml_content.strip())
        except ET.ParseError as e:
            log.warning("Failed to parse UI Automator XML: %s", e)
            return []

        nodes: list[UIElementNode] = []
        for child in root:
            if child.tag == "node":
                nodes.append(UIElementNode.from_xml_element(child))
            else:
                for subchild in child:
                    if subchild.tag == "node":
                        nodes.append(UIElementNode.from_xml_element(subchild))

        return nodes

    @classmethod
    def flatten(cls, nodes: list[UIElementNode]) -> list[UIElementNode]:
        """Flatten nested UI node tree into a single sequential list."""
        flat: list[UIElementNode] = []
        stack = list(nodes)
        while stack:
            cur = stack.pop(0)
            flat.append(cur)
            stack.extend(cur.children)
        return flat

    @classmethod
    def find_by_text(cls, nodes: list[UIElementNode], text_query: str) -> list[UIElementNode]:
        """Find elements containing text or content-description matching query."""
        flat = cls.flatten(nodes)
        query = text_query.strip().lower()
        return [
            n for n in flat
            if query in n.text.lower() or query in n.content_desc.lower()
        ]

    @classmethod
    def find_by_id(cls, nodes: list[UIElementNode], resource_id: str) -> list[UIElementNode]:
        """Find elements matching resource ID."""
        flat = cls.flatten(nodes)
        rid = resource_id.strip()
        return [n for n in flat if rid in n.resource_id]

    @classmethod
    def to_compact_summary(cls, nodes: list[UIElementNode]) -> str:
        """
        Produce a concise, LLM-friendly summary of all interactable or textual elements.
        """
        flat = cls.flatten(nodes)
        lines: list[str] = []
        for n in flat:
            label = n.text
            desc = n.content_desc
            if not label and not desc and not n.resource_id and not n.is_clickable:
                continue

            elem_type = n.class_name.split(".")[-1] if n.class_name else "View"
            coords = f"center=({n.center[0]},{n.center[1]}) bounds=[{n.bounds[0]},{n.bounds[1]}][{n.bounds[2]},{n.bounds[3]}]"
            extra = []
            if label:
                extra.append(f'label="{label}"')
            if desc and desc != label:
                extra.append(f'desc="{desc}"')
            if n.resource_id:
                extra.append(f'id="{n.resource_id}"')
            if n.is_clickable:
                extra.append("clickable=True")
            if n.is_editable:
                extra.append("editable=True")

            details = " ".join(extra)
            lines.append(f"[{elem_type}] {details} {coords}")

        return "\n".join(lines)
