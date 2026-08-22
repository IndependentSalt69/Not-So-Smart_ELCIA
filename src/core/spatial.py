"""
src/core/spatial.py
Reusable GeoJSON spatial models, validation rules, and PostGIS/GeoAlchemy2 conversion helpers.
"""

from typing import Literal, Tuple, List, Optional, Union, Any
from pydantic import BaseModel, field_validator
import shapely
from shapely.geometry import Point, Polygon, shape, mapping
from shapely.wkt import loads as wkt_loads
from shapely.wkb import loads as wkb_loads
from geoalchemy2.shape import from_shape, to_shape
from geoalchemy2.elements import WKBElement, WKTElement


class GeoJSONPoint(BaseModel):
    """
    GeoJSON Point model conforming to RFC 7946.
    Coordinates representation: [longitude, latitude]
    """
    type: Literal["Point"] = "Point"
    coordinates: Tuple[float, float]

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_coordinates(cls, coords: Any) -> Any:
        if isinstance(coords, (list, tuple)):
            if len(coords) != 2:
                raise ValueError("Point coordinates must be a tuple/list of [longitude, latitude]")
            lng = float(coords[0])
            lat = float(coords[1])
            if not (-180.0 <= lng <= 180.0):
                raise ValueError(f"Longitude {lng} out of bounds [-180, 180]")
            if not (-90.0 <= lat <= 90.0):
                raise ValueError(f"Latitude {lat} out of bounds [-90, 90]")
            return (lng, lat)
        return coords


class GeoJSONPolygon(BaseModel):
    """
    GeoJSON Polygon model conforming to RFC 7946.
    Coordinates representation: [ [ [lng, lat], [lng, lat], ... ] ]
    """
    type: Literal["Polygon"] = "Polygon"
    coordinates: List[List[Tuple[float, float]]]

    @field_validator("coordinates", mode="before")
    @classmethod
    def validate_polygon_coordinates(cls, rings: Any) -> Any:
        if not isinstance(rings, (list, tuple)) or len(rings) == 0:
            raise ValueError("Polygon coordinates must contain at least one exterior ring")

        validated_rings = []
        for i, ring in enumerate(rings):
            if not isinstance(ring, (list, tuple)) or len(ring) < 4:
                raise ValueError(f"Linear ring {i} must contain at least 4 coordinate positions")

            parsed_ring = []
            for pt in ring:
                if not isinstance(pt, (list, tuple)) or len(pt) != 2:
                    raise ValueError("Coordinate position must be [longitude, latitude]")
                lng = float(pt[0])
                lat = float(pt[1])
                if not (-180.0 <= lng <= 180.0):
                    raise ValueError(f"Longitude {lng} out of bounds [-180, 180]")
                if not (-90.0 <= lat <= 90.0):
                    raise ValueError(f"Latitude {lat} out of bounds [-90, 90]")
                parsed_ring.append((lng, lat))

            # Verify ring is closed: first point must equal last point
            if parsed_ring[0] != parsed_ring[-1]:
                raise ValueError(
                    f"Linear ring {i} is not closed: first point {parsed_ring[0]} != last point {parsed_ring[-1]}"
                )

            validated_rings.append(parsed_ring)

        # Validate topological validity using Shapely
        try:
            poly = Polygon(shell=validated_rings[0], holes=validated_rings[1:])
            if not poly.is_valid:
                raise ValueError("Malformed polygon geometry (self-intersecting or invalid topology)")
        except Exception as e:
            if isinstance(e, ValueError):
                raise
            raise ValueError(f"Invalid polygon geometry: {e}")

        return validated_rings


def geojson_to_geoalchemy(
    val: Union[GeoJSONPoint, GeoJSONPolygon, dict, str, Any, None],
    srid: int = 4326,
) -> Optional[WKBElement]:
    """
    Convert GeoJSON model, GeoJSON dictionary, or WKT string into a GeoAlchemy2 WKBElement with SRID=4326.
    """
    if val is None:
        return None

    if isinstance(val, (WKBElement, WKTElement)):
        return val

    if hasattr(val, "model_dump"):
        val = val.model_dump()

    if isinstance(val, dict):
        try:
            s_geom = shape(val)
            return from_shape(s_geom, srid=srid)
        except Exception as e:
            raise ValueError(f"Failed to parse GeoJSON dictionary into spatial geometry: {e}")

    if isinstance(val, str):
        s = val.strip()
        if s.startswith("SRID="):
            s = s.split(";", 1)[1]
        if s.startswith(("POINT", "POLYGON", "GEOMETRYCOLLECTION", "LINESTRING", "MULTIPOLYGON")):
            try:
                s_geom = wkt_loads(s)
                return from_shape(s_geom, srid=srid)
            except Exception as e:
                raise ValueError(f"Failed to parse WKT geometry string: {e}")

    return None


def geoalchemy_to_geojson(val: Any) -> Optional[dict]:
    """
    Convert a PostGIS/GeoAlchemy2 geometry element, WKB bytes, or WKT string into a GeoJSON-compatible dictionary.
    """
    if val is None:
        return None

    if isinstance(val, dict):
        return val

    if hasattr(val, "model_dump"):
        return val.model_dump()

    if isinstance(val, (WKBElement, WKTElement)):
        try:
            s_geom = to_shape(val)
            return mapping(s_geom)
        except Exception:
            pass

    if isinstance(val, (shapely.Geometry, Point, Polygon)):
        return mapping(val)

    if isinstance(val, str):
        s = val.strip()
        if s.startswith("SRID="):
            s = s.split(";", 1)[1]
        if s.startswith(("POINT", "POLYGON", "GEOMETRYCOLLECTION", "LINESTRING", "MULTIPOLYGON")):
            try:
                return mapping(wkt_loads(s))
            except Exception:
                pass
        try:
            return mapping(wkb_loads(bytes.fromhex(s)))
        except Exception:
            pass

    if isinstance(val, (bytes, bytearray)):
        try:
            return mapping(wkb_loads(bytes(val)))
        except Exception:
            pass

    return None
