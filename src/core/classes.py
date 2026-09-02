"""
src/core/classes.py
Single source of truth for hazard classes, read from configs/config.yaml.

To add or change a class, edit configs/config.yaml. Do not write class names
as string literals anywhere in src/ - look them up through this module.
"""

from src.core.config import APP_CONFIG

_raw = (APP_CONFIG or {}).get("classes") or {}
if not _raw:
    raise RuntimeError("No `classes:` block in configs/config.yaml")

CLASSES = {}
for _key, _spec in _raw.items():
    _id = int(_key)
    CLASSES[_id] = {
        "id": _id,
        "name": str(_spec["name"]).strip().lower(),
        "conf": float(_spec["conf"]),
        "color": tuple(_spec["color"]),
        "min_hits": int(_spec.get("min_hits", 2)),
        "needs_depth": bool(_spec.get("needs_depth", False)),
        "requires_smooth_surface": bool(_spec.get("requires_smooth_surface", False)),
        "severity_multiplier": float(_spec.get("severity_multiplier", 1.0)),
    }

# Ids must line up with the model's output indices, or every lookup is wrong.
if sorted(CLASSES) != list(range(len(CLASSES))):
    raise RuntimeError(f"Class ids must be 0,1,2,... - got {sorted(CLASSES)}")

BY_NAME = {c["name"]: c for c in CLASSES.values()}


def get(key):
    """Look up a class by id or name. Returns None if unknown."""
    if key is None:
        return None
    if isinstance(key, str):
        return BY_NAME.get(key.strip().lower())
    return CLASSES.get(key)


def names():
    """{id: name} - matches the model's output indices."""
    return {c["id"]: c["name"] for c in CLASSES.values()}


def name_list():
    """Class names in order - the `names:` list for a YOLO data.yaml."""
    return [CLASSES[i]["name"] for i in sorted(CLASSES)]


def conf_thresholds():
    """{name: confidence floor}"""
    return {c["name"]: c["conf"] for c in CLASSES.values()}


def colors():
    """{name: BGR colour}"""
    return {c["name"]: c["color"] for c in CLASSES.values()}


def count():
    """Number of classes - the `nc` for a YOLO data.yaml."""
    return len(CLASSES)