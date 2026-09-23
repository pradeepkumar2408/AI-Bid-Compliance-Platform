import hashlib
import io
import os
from typing import Dict, Any, List, Optional
from PIL import Image

class DuplicateDetector:
    def __init__(self):
        # In-memory document registry: {hash: {"bidder_id": "...", "tender_id": "...", "filename": "..."}}
        self.doc_registry: Dict[str, Dict[str, Any]] = {}

    def compute_sha256(self, file_bytes: bytes) -> str:
        return hashlib.sha256(file_bytes).hexdigest()

    def compute_dhash(self, file_bytes: bytes, filename: str) -> Optional[str]:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]:
            return None
        try:
            image = Image.open(io.BytesIO(file_bytes)).convert('L').resize((9, 8), Image.Resampling.LANCZOS)
            pixels = list(image.getdata())
            # Compare adjacent pixels
            diff = []
            for row in range(8):
                for col in range(8):
                    pixel_left = pixels[row * 9 + col]
                    pixel_right = pixels[row * 9 + col + 1]
                    diff.append(pixel_left > pixel_right)
            # Convert binary list to hex string
            decimal_value = 0
            hex_string = []
            for index, value in enumerate(diff):
                if value:
                    decimal_value += 2**(index % 8)
                if (index % 8) == 7:
                    hex_string.append(hex(decimal_value)[2:].rjust(2, '0'))
                    decimal_value = 0
            return ''.join(hex_string)
        except Exception:
            return None

    def check_duplicate(self, file_bytes: bytes, filename: str, bidder_id: str, tender_id: str) -> Dict[str, Any]:
        sha256_hash = self.compute_sha256(file_bytes)
        dhash = self.compute_dhash(file_bytes, filename)
        
        is_duplicate = False
        matched_record = None

        if sha256_hash in self.doc_registry:
            existing = self.doc_registry[sha256_hash]
            if existing["bidder_id"] != bidder_id:
                is_duplicate = True
                matched_record = existing

        # Register document
        if not is_duplicate:
            self.doc_registry[sha256_hash] = {
                "bidder_id": bidder_id,
                "tender_id": tender_id,
                "filename": filename,
                "sha256": sha256_hash,
                "dhash": dhash
            }

        return {
            "is_duplicate": is_duplicate,
            "sha256": sha256_hash,
            "dhash": dhash,
            "duplicate_match": matched_record,
            "message": f"Cross-bidder duplicate detected! Identical file submitted by bidder {matched_record['bidder_id']}" if is_duplicate else "Unique document hash verified."
        }

duplicate_detector = DuplicateDetector()
