import os
import io
import re
import shutil
import logging
import traceback
from typing import Dict, Any, Tuple, List, Optional
from PIL import Image, ImageOps, ImageEnhance

# Set up logger
logger = logging.getLogger("ai_service.ocr")

try:
    import pytesseract
except ImportError:
    pytesseract = None
    logger.warning("pytesseract package is not installed.")

try:
    import winocr
    winocr_available = True
except ImportError:
    winocr = None
    winocr_available = False
    logger.warning("winocr package is not installed.")

try:
    import pypdf
except ImportError:
    pypdf = None
    logger.warning("pypdf package is not installed.")

try:
    from pdf2image import convert_from_bytes
    pdf2image_available = True
except ImportError:
    convert_from_bytes = None
    pdf2image_available = False
    logger.warning("pdf2image package is not installed. Scanned PDF OCR fallback will use pypdf image extraction.")

try:
    import cv2
    import numpy as np
    cv2_available = True
except ImportError:
    cv2 = None
    np = None
    cv2_available = False
    logger.warning("opencv-python / numpy not installed. Using PIL for image preprocessing.")


class OCREngine:
    def __init__(self):
        self.tesseract_available = False
        self.tesseract_version = None
        self.tesseract_path = None
        self.winocr_available = winocr_available
        self.poppler_available = False
        self.poppler_path = None

        self._detect_tesseract()
        self._detect_poppler()
        if self.winocr_available:
            logger.info("[OCR Engine] [FOUND] Windows Media Native OCR (winocr) is ACTIVE and READY.")

    def _detect_tesseract(self):
        """Locates and validates the Tesseract OCR binary."""
        if not pytesseract:
            logger.error("[OCR Engine] pytesseract module not installed.")
            return

        env_cmd = os.getenv("TESSERACT_CMD") or os.getenv("TESSERACT_PATH")
        candidates = []
        if env_cmd:
            candidates.append(env_cmd)

        path_binary = shutil.which("tesseract")
        if path_binary:
            candidates.append(path_binary)

        candidates.extend([
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            os.path.expanduser(r"~\AppData\Local\Programs\Tesseract-OCR\tesseract.exe"),
            r"C:\tools\tesseract\tesseract.exe"
        ])

        for path in candidates:
            if path and os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                try:
                    version = str(pytesseract.get_tesseract_version()).strip()
                    self.tesseract_available = True
                    self.tesseract_version = version
                    self.tesseract_path = path
                    logger.info(f"[OCR Engine] [FOUND] Tesseract OCR detected: version {version} at '{path}'")
                    return
                except Exception as e:
                    logger.debug(f"Candidate tesseract path {path} failed: {e}")

        try:
            version = str(pytesseract.get_tesseract_version()).strip()
            self.tesseract_available = True
            self.tesseract_version = version
            self.tesseract_path = getattr(pytesseract.pytesseract, 'tesseract_cmd', 'tesseract')
            logger.info(f"[OCR Engine] [FOUND] Tesseract OCR detected via default PATH: version {version}")
        except Exception as e:
            self.tesseract_available = False
            self.tesseract_version = None
            self.tesseract_path = None
            logger.info(f"[OCR Engine] Tesseract binary not found in standard PATH. Windows Native OCR / PDF text extraction will be used.")

    def _detect_poppler(self):
        """Checks if poppler (pdftoppm) is available for pdf2image."""
        env_poppler = os.getenv("POPPLER_PATH")
        if env_poppler and os.path.exists(env_poppler):
            self.poppler_available = True
            self.poppler_path = env_poppler
            return

        poppler_binary = shutil.which("pdftoppm")
        if poppler_binary:
            self.poppler_available = True
            self.poppler_path = os.path.dirname(poppler_binary)
            return

        win_candidates = [
            r"C:\Program Files\poppler\Library\bin",
            r"C:\Program Files\poppler\bin",
            r"C:\poppler\bin",
            r"C:\tools\poppler\bin",
            os.path.expanduser(r"~\AppData\Local\Programs\poppler\bin")
        ]
        for candidate in win_candidates:
            if os.path.exists(os.path.join(candidate, "pdftoppm.exe")):
                self.poppler_available = True
                self.poppler_path = candidate
                return

        self.poppler_available = False
        self.poppler_path = None

    def get_diagnostic_info(self) -> Dict[str, Any]:
        """Returns diagnostic state for /api/ai/health."""
        return {
            "tesseract_available": self.tesseract_available,
            "tesseract_version": self.tesseract_version,
            "tesseract_path": self.tesseract_path,
            "winocr_available": self.winocr_available,
            "pdf2image_available": pdf2image_available,
            "poppler_available": self.poppler_available,
            "poppler_path": self.poppler_path,
            "opencv_available": cv2_available,
            "pypdf_available": pypdf is not None
        }

    def preprocess_image(self, pil_image: Image.Image) -> Image.Image:
        """
        Applies grayscale conversion, contrast enhancement / binarization,
        and upscaling for low-resolution scanned certificates to maximize OCR accuracy.
        """
        try:
            gray = pil_image.convert('L')
            w, h = gray.size
            if min(w, h) < 1200:
                scale_factor = min(3.0, 1500.0 / max(min(w, h), 1))
                new_w = int(w * scale_factor)
                new_h = int(h * scale_factor)
                gray = gray.resize((new_w, new_h), Image.Resampling.LANCZOS)

            if cv2_available and np is not None:
                img_np = np.array(gray)
                blurred = cv2.GaussianBlur(img_np, (3, 3), 0)
                _, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
                return Image.fromarray(thresh)
            else:
                enhancer = ImageEnhance.Contrast(gray)
                enhanced = enhancer.enhance(2.0)
                return ImageOps.autocontrast(enhanced)
        except Exception as e:
            logger.warning(f"[OCR Engine] Image preprocessing warning: {e}. Using original image.")
            return pil_image

    def extract_text_from_file(self, file_bytes: bytes, filename: str) -> str:
        """
        Backwards-compatible interface returning plain text string.
        """
        result = self.extract_text_and_meta(file_bytes, filename)
        return result.get("text", "")

    def extract_text_and_meta(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """
        Extracts text from PDF or images with detailed metadata, warnings, and engine status.
        """
        ext = os.path.splitext(filename)[1].lower()
        warnings: List[str] = []
        engine_used = "none"
        extracted_text = ""
        error_detail = None

        if not file_bytes:
            warnings.append("Uploaded file is empty (0 bytes).")
            return {
                "text": "",
                "ocr_engine_used": "none",
                "status": "FAILED",
                "warnings": warnings,
                "error": "Empty file"
            }

        if ext == ".pdf":
            extracted_text, engine_used, warnings, error_detail = self._extract_from_pdf_with_meta(file_bytes, filename)
        elif ext in [".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp", ".webp"]:
            extracted_text, engine_used, warnings, error_detail = self._extract_from_image_with_meta(file_bytes, filename)
        else:
            try:
                extracted_text = file_bytes.decode('utf-8', errors='ignore').strip()
                engine_used = "utf8_decode" if extracted_text else "none"
            except Exception as e:
                logger.error(f"[OCR Engine] UTF-8 text decode error on {filename}: {e}\n{traceback.format_exc()}")
                warnings.append(f"Failed to decode text file: {str(e)}")
                error_detail = str(e)

        status = "SUCCESS" if extracted_text else ("FAILED" if error_detail else "EMPTY")

        return {
            "text": extracted_text,
            "ocr_engine_used": engine_used,
            "status": status,
            "warnings": warnings,
            "error": error_detail
        }

    def _extract_from_pdf_with_meta(self, file_bytes: bytes, filename: str) -> Tuple[str, str, List[str], Optional[str]]:
        warnings: List[str] = []
        pdf_text_list = []
        error_detail = None

        # Step 1: Digital text extraction via pypdf
        if pypdf:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        pdf_text_list.append(page_text.strip())
            except Exception as e:
                logger.warning(f"[OCR Engine] pypdf digital text extraction failed on '{filename}': {e}")
                warnings.append(f"pypdf digital extraction error: {str(e)}")

        combined_text = "\n\n".join(pdf_text_list).strip()

        if len(combined_text) >= 30:
            return combined_text, "pypdf_digital", warnings, None

        # Step 2: Scanned PDF fallback - try pypdf embedded images or pdf2image + winocr/tesseract
        logger.info(f"[OCR Engine] Digital PDF text was minimal ({len(combined_text)} chars). Attempting scanned page OCR on '{filename}'")

        scanned_texts = []

        # Option A: Extract images from PDF pages using pypdf
        if pypdf:
            try:
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                for page in reader.pages:
                    for img_obj in page.images:
                        img_bytes = img_obj.data
                        pil_img = Image.open(io.BytesIO(img_bytes))
                        page_text, _, _, _ = self._extract_from_image_with_meta(img_bytes, f"{filename}_page.png")
                        if page_text:
                            scanned_texts.append(page_text)
            except Exception as e:
                logger.debug(f"[OCR Engine] pypdf image extraction: {e}")

        if scanned_texts:
            full_scanned = "\n\n".join(scanned_texts).strip()
            if full_scanned:
                return full_scanned, "pdf_embedded_image_ocr", warnings, None

        # Option B: pdf2image with poppler + Tesseract if available
        if pdf2image_available and (self.tesseract_available or self.winocr_available):
            try:
                kwargs = {"dpi": 300}
                if self.poppler_path:
                    kwargs["poppler_path"] = self.poppler_path

                images = convert_from_bytes(file_bytes, **kwargs)
                ocr_pages = []
                for page_img in images:
                    buf = io.BytesIO()
                    page_img.save(buf, format="PNG")
                    ptext, _, _, _ = self._extract_from_image_with_meta(buf.getvalue(), "page.png")
                    if ptext:
                        ocr_pages.append(ptext)

                scanned_ocr_text = "\n\n".join(ocr_pages).strip()
                if scanned_ocr_text:
                    return scanned_ocr_text, "scanned_pdf_poppler_ocr", warnings, None
            except Exception as e:
                logger.warning(f"[OCR Engine] pdf2image conversion: {e}")

        return combined_text, ("pypdf_digital" if combined_text else "none"), warnings, None

    def _extract_from_image_with_meta(self, file_bytes: bytes, filename: str) -> Tuple[str, str, List[str], Optional[str]]:
        warnings: List[str] = []
        extracted_text = ""
        engine_used = "none"

        try:
            raw_image = Image.open(io.BytesIO(file_bytes))
        except Exception as e:
            return "", "none", [f"Invalid image file: {e}"], str(e)

        # Tier 1: Windows Native OCR (winocr) executed in clean threadpool
        if self.winocr_available:
            try:
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
                    res = executor.submit(winocr.recognize_pil_sync, raw_image, 'en').result(timeout=20)
                if res and res.get('text') and res.get('text').strip():
                    extracted_text = res['text'].strip()
                    engine_used = "windows_media_ocr"
                    logger.info(f"[OCR Engine] [SUCCESS] winocr recognized {len(extracted_text)} characters for '{filename}'")
                    return extracted_text, engine_used, warnings, None
            except Exception as e:
                logger.warning(f"[OCR Engine] winocr execution failed: {e}")
                warnings.append(f"winocr warning: {str(e)}")

        # Tier 2: Tesseract OCR (if available)
        if self.tesseract_available:
            try:
                processed_image = self.preprocess_image(raw_image)
                text = pytesseract.image_to_string(processed_image, config='--oem 3 --psm 6')
                if not text or not text.strip():
                    text = pytesseract.image_to_string(processed_image, config='--oem 3 --psm 3')

                if text and text.strip():
                    extracted_text = text.strip()
                    engine_used = "tesseract_image_ocr"
                    logger.info(f"[OCR Engine] [SUCCESS] Tesseract recognized {len(extracted_text)} characters for '{filename}'")
                    return extracted_text, engine_used, warnings, None
            except Exception as e:
                logger.warning(f"[OCR Engine] Tesseract execution failed: {e}")
                warnings.append(f"tesseract warning: {str(e)}")

        if not self.winocr_available and not self.tesseract_available:
            warning_msg = "No OCR engine available (neither Windows Media OCR nor Tesseract installed)."
            warnings.append(warning_msg)
            return "", "none", warnings, "No OCR engine available"

        return extracted_text, engine_used, warnings, None


ocr_engine = OCREngine()
