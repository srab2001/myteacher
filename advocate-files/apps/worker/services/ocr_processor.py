"""
OCR processing service using pytesseract.
"""

import io
from typing import Dict, Any, List
from PIL import Image
import httpx


async def process_image_ocr(content: bytes, language: str = "eng") -> Dict[str, Any]:
    """
    Process an image using OCR to extract text.

    Args:
        content: Image file content as bytes
        language: Tesseract language code (default: 'eng')

    Returns:
        Dictionary with extracted text and confidence score
    """
    import pytesseract

    image = Image.open(io.BytesIO(content))

    # Get text with confidence data
    data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)

    # Extract text
    text = pytesseract.image_to_string(image, lang=language)

    # Calculate average confidence (excluding -1 values which indicate no text)
    confidences = [c for c in data["conf"] if c != -1]
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

    return {
        "text": text.strip(),
        "confidence": avg_confidence / 100.0,  # Normalize to 0-1
    }


async def process_scanned_pdf(content: bytes, language: str = "eng") -> Dict[str, Any]:
    """
    Process a scanned PDF using OCR.

    Converts PDF pages to images and extracts text using Tesseract.

    Args:
        content: PDF file content as bytes
        language: Tesseract language code

    Returns:
        Dictionary with extracted text, page count, and confidence
    """
    import pytesseract
    from pdf2image import convert_from_bytes

    # Convert PDF to images
    images = convert_from_bytes(content)

    text_content = []
    total_confidence = 0.0

    for image in images:
        # Process each page
        text = pytesseract.image_to_string(image, lang=language)
        data = pytesseract.image_to_data(image, lang=language, output_type=pytesseract.Output.DICT)

        confidences = [c for c in data["conf"] if c != -1]
        page_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        text_content.append(text.strip())
        total_confidence += page_confidence

    avg_confidence = total_confidence / len(images) if images else 0.0

    return {
        "text": "\n\n".join(text_content),
        "page_count": len(images),
        "confidence": avg_confidence / 100.0,
        "language": language,
    }


async def batch_process_images(
    image_urls: List[str], language: str = "eng"
) -> List[Dict[str, Any]]:
    """
    Process multiple images using OCR in batch.

    Args:
        image_urls: List of image URLs to process
        language: Tesseract language code

    Returns:
        List of OCR results for each image
    """
    results = []

    async with httpx.AsyncClient() as client:
        for url in image_urls:
            try:
                response = await client.get(url)
                response.raise_for_status()
                content = response.content

                result = await process_image_ocr(content, language)
                result["url"] = url
                result["status"] = "success"
            except Exception as e:
                result = {
                    "url": url,
                    "status": "error",
                    "error": str(e),
                    "text": "",
                    "confidence": 0.0,
                }

            results.append(result)

    return results
