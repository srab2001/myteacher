"""
Endpoints package for the Worker service.
"""

from . import documents, ocr, embeddings, health

__all__ = ["documents", "ocr", "embeddings", "health"]
