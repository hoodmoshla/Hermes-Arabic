#!/usr/bin/env python3
"""Embed the maintained Arabic locale in Hermes' bundled React dashboard."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = ROOT / "android/app/src/main/python/hermes_cli/web_dist/assets/index-DcSRr1FX.js"
CATALOG = ROOT / "android/app/src/main/python/hermes_cli/web_dist/locales/ar.json"
HTML = ROOT / "android/app/src/main/python/hermes_cli/web_dist/index.html"


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} marker, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    if not isinstance(catalog, dict) or not catalog:
        raise SystemExit("Arabic dashboard locale must be a non-empty JSON object")
    bundle = BUNDLE.read_text(encoding="utf-8")
    marker = ",Bd=Object.keys(Rd),Vd="
    if marker in bundle:
        payload = json.dumps(catalog, ensure_ascii=False, separators=(",", ":"))
        bundle = replace_once(
            bundle,
            marker,
            ";Rd.ar=" + payload + ";var Bd=Object.keys(Rd),Vd=",
            "dashboard locale insertion",
        )
    elif ";Rd.ar=" not in bundle:
        raise SystemExit("Could not locate Hermes' locale catalog insertion point")

    default_marker = "return`en`}var Wd=(0,x.createContext)({locale:`en`"
    default_replacement = "return`ar`}var Wd=(0,x.createContext)({locale:`ar`"
    if default_marker in bundle:
        bundle = replace_once(bundle, default_marker, default_replacement, "default-locale")
    elif default_replacement not in bundle:
        raise SystemExit("Could not locate Hermes' first-run locale default")

    html = HTML.read_text(encoding="utf-8")
    if '<html lang="ar" dir="rtl">' not in html:
        raise SystemExit("Dashboard HTML must declare Arabic and RTL")
    BUNDLE.write_text(bundle, encoding="utf-8")
    print(f"Embedded {len(catalog)} top-level locale groups from {CATALOG.name}")
    print(f"Updated first-run locale and RTL declaration in {BUNDLE.name}")


if __name__ == "__main__":
    main()
