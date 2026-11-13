"""Shared image content validation and metadata removal."""
from io import BytesIO
from PIL import Image, UnidentifiedImageError


def prepare_photo(file, max_bytes=4 * 1024 * 1024):
    data = file.read(max_bytes + 1)
    if len(data) > max_bytes:
        raise ValueError(f'La fotografía debe pesar como máximo {max_bytes // (1024 * 1024)} MB')
    try:
        with Image.open(BytesIO(data)) as image:
            fmt = image.format
            if fmt not in {'JPEG', 'PNG', 'WEBP'}:
                raise ValueError('La imagen debe ser JPG, PNG o WEBP')
            if image.width * image.height > 25_000_000:
                raise ValueError('La imagen excede 25 megapíxeles')
            image.verify()
        # Re-encode to discard metadata and trailing non-image content.
        with Image.open(BytesIO(data)) as image:
            output = BytesIO()
            image.save(output, format=fmt)
        return output.getvalue(), {'JPEG': '.jpg', 'PNG': '.png', 'WEBP': '.webp'}[fmt]
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as exc:
        raise ValueError('El archivo no es una imagen válida') from exc

