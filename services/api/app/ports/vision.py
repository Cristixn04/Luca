from typing import Protocol


class BackgroundRemover(Protocol):
    """Puerto para recorte de fondo de fotos de prendas en memoria."""

    @property
    def provider_name(self) -> str: ...

    def remove_background(self, image_bytes: bytes) -> bytes:
        """Recibe bytes de imagen (JPEG/PNG/WEBP) y retorna PNG RGBA recortado en memoria."""
        ...
