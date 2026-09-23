import re
import logging
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional

logger = logging.getLogger("ai_service.nlp")

WORD_TO_NUM = {
    "zero": 0.0, "one": 1.0, "two": 2.0, "three": 3.0, "four": 4.0,
    "five": 5.0, "six": 6.0, "seven": 7.0, "eight": 8.0, "nine": 9.0,
    "ten": 10.0, "eleven": 11.0, "twelve": 12.0, "fifteen": 15.0,
    "twenty": 20.0, "thirty": 30.0, "forty": 40.0, "fifty": 50.0,
    "eighty": 80.0, "hundred": 100.0
}


class NLPEntityExtractor:
    def __init__(self):
        # Strict patterns for validated tokens
        self.pan_strict_regex = re.compile(r'^[A-Z]{3}[CPFAHTGELJ][A-Z][0-9]{4}[A-Z]$')
        self.gstin_strict_regex = re.compile(r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$')
        self.cin_regex = re.compile(r'\b([UL][0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6})\b')
        self.udyam_regex = re.compile(r'\b(UDYAM[\s\-]?[A-Z]{2}[\s\-]?[0-9]{2}[\s\-]?[0-9]{7})\b', re.IGNORECASE)
        self.udin_regex = re.compile(r'\b([0-9]{2}[0-9]{6}[A-Z0-9]{10})\b')

        # Candidate search patterns in text
        self.pan_candidate_regex = re.compile(r'(?:PAN|Permanent\s+Account\s+Number|PAN\s*No\.?|PAN\s*Card)?[\s\:\-\#]*([A-Za-z0-9\s\-]{10,14})', re.IGNORECASE)
        self.gstin_candidate_regex = re.compile(r'(?:GSTIN|GST\s*No\.?|GST\s*Reg|Goods\s*&\s*Services\s*Tax)?[\s\:\-\#]*([A-Za-z0-9\s\-]{15,18})', re.IGNORECASE)

        # Turnover patterns (multi-line tolerant)
        words_pat = r'(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|eighty|hundred|[0-9]+(?:\.[0-9]+)?)'
        self.turnover_cr_regex = re.compile(rf'(?:turnover|revenue|annual\s+turnover|sales|gross\s+receipts)[\s\:\-\=\n\(\)]*(?:inr|rs\.?|₹|rupees)?\s*({words_pat})\s*(?:crore|cr|crores)', re.IGNORECASE)
        self.turnover_lakh_regex = re.compile(rf'(?:turnover|revenue|annual\s+turnover|sales|gross\s+receipts)[\s\:\-\=\n\(\)]*(?:inr|rs\.?|₹|rupees)?\s*({words_pat})\s*(?:lakh|lakhs|lac|lacs)', re.IGNORECASE)
        self.turnover_raw_regex = re.compile(r'(?:turnover|revenue|annual\s+turnover|sales)[\s\:\-\=\n]*(?:inr|rs\.?|₹)?\s*([0-9,]{5,15})', re.IGNORECASE)
        self.rupees_words_cr_regex = re.compile(rf'Rupees\s+({words_pat})\s+Crore', re.IGNORECASE)

        # Experience patterns
        self.exp_years_regex = re.compile(rf'({words_pat})\+?\s*(?:years?|yrs?)(?:[\s\n]+of)?[\s\n]+(?:experience|standing|business|operation|engagement|duration|supply|service)', re.IGNORECASE)
        self.exp_total_duration_regex = re.compile(rf'(?:Total\s+Duration|Duration|Experience|Past\s+Experience|Standing)[\s\:\-\=\n]*({words_pat})\s*(?:years?|yrs?)', re.IGNORECASE)
        self.exp_period_regex = re.compile(r'(?:Period\s+of\s+Engagement|Engagement\s+Period|Duration)[\s\:\-\n]*[0-9]{1,2}\s+[A-Za-z]+\s+([12][90][0-9]{2})\s+to\s+[0-9]{1,2}\s+[A-Za-z]+\s+([12][90][0-9]{2})', re.IGNORECASE)
        self.exp_established_regex = re.compile(r'(?:established|incorporated|founded|inception|since)[\s\:\-\=\n]*([12][90][0-9]{2})', re.IGNORECASE)

        # Certifications
        self.cert_patterns = [
            (r'\b(ISO[\s\-]?9001(?:\:2015)?)\b', "ISO 9001 (Quality Management)"),
            (r'\b(ISO[\s\-]?27001(?:\:2013|\:2022)?)\b', "ISO 27001 (Information Security)"),
            (r'\b(ISO[\s\-]?14001(?:\:2015)?)\b', "ISO 14001 (Environmental)"),
            (r'\b(ISO[\s\-]?45001(?:\:2018)?)\b', "ISO 45001 (Occupational Health)"),
            (r'\b(ISO[\s\-]?20000(?:\-1)?)\b', "ISO 20000 (IT Service Management)"),
            (r'\b(CMMI[\s\-]?(?:Level|Dev)?[\s\-]?[345])\b', "CMMI Level 3/5"),
            (r'\b(BIS[\s\-]?Certification|ISI[\s\-]?Mark)\b', "BIS / ISI Quality Standard"),
            (r'\b(MSME|UDYAM[\s\-]?[A-Z0-9\-]+)\b', "MSME Udyam Enterprise"),
            (r'\b(Start[\s\-]?up\s+India)\b', "DPIIT Startup India")
        ]

        # Date patterns
        self.date_regex = re.compile(r'\b([0-3]?[0-9][/\-\.][0-1]?[0-9][/\-\.](?:19|20)[0-9]{2}|(?:19|20)[0-9]{2}[/\-\.][0-1]?[0-9][/\-\.][0-3]?[0-9])\b')

    def parse_numeric_or_word(self, val_str: str) -> Optional[float]:
        if not val_str:
            return None
        cleaned = val_str.strip().lower()
        if cleaned in WORD_TO_NUM:
            return WORD_TO_NUM[cleaned]
        try:
            return float(cleaned.replace(",", ""))
        except ValueError:
            return None

    def normalize_text(self, raw_text: str) -> str:
        if not raw_text:
            return ""
        text = raw_text.replace('\r\n', '\n').replace('\r', '\n')
        text = re.sub(r'(\w+)-\n\s*(\w+)', r'\1\2', text)
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    def normalize_pan_candidate(self, candidate: str) -> Optional[str]:
        if not candidate:
            return None
        cleaned = re.sub(r'[^A-Za-z0-9]', '', candidate).upper()
        if len(cleaned) != 10:
            return None

        if self.pan_strict_regex.match(cleaned):
            return cleaned

        chars = list(cleaned)
        digit_to_alpha = {'0': 'O', '1': 'I', '8': 'B', '5': 'S', '2': 'Z'}
        for i in [0, 1, 2, 3, 4, 9]:
            if chars[i].isdigit() and chars[i] in digit_to_alpha:
                chars[i] = digit_to_alpha[chars[i]]

        alpha_to_digit = {'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8'}
        for i in [5, 6, 7, 8]:
            if not chars[i].isdigit() and chars[i] in alpha_to_digit:
                chars[i] = alpha_to_digit[chars[i]]

        repaired = "".join(chars)
        if self.pan_strict_regex.match(repaired):
            logger.debug(f"[NLP Normalization] Repaired OCR PAN token from '{cleaned}' to '{repaired}'")
            return repaired
        return None

    def normalize_gstin_candidate(self, candidate: str) -> Optional[str]:
        if not candidate:
            return None
        cleaned = re.sub(r'[^A-Za-z0-9]', '', candidate).upper()
        if len(cleaned) != 15:
            return None

        if self.gstin_strict_regex.match(cleaned):
            return cleaned

        chars = list(cleaned)
        alpha_to_digit = {'O': '0', 'Q': '0', 'D': '0', 'I': '1', 'L': '1', 'Z': '2', 'S': '5', 'B': '8'}
        digit_to_alpha = {'0': 'O', '1': 'I', '8': 'B', '5': 'S', '2': 'Z'}

        for i in [0, 1]:
            if not chars[i].isdigit() and chars[i] in alpha_to_digit:
                chars[i] = alpha_to_digit[chars[i]]

        if not (chars[0].isdigit() and chars[1].isdigit()):
            return None
        state_num = int(chars[0] + chars[1])
        if not (1 <= state_num <= 38 or state_num in [97, 99]):
            return None

        for i in range(2, 7):
            if chars[i].isdigit() and chars[i] in digit_to_alpha:
                chars[i] = digit_to_alpha[chars[i]]

        for i in range(7, 11):
            if not chars[i].isdigit() and chars[i] in alpha_to_digit:
                chars[i] = alpha_to_digit[chars[i]]

        if chars[11].isdigit() and chars[11] in digit_to_alpha:
            chars[11] = digit_to_alpha[chars[11]]

        if chars[12] in ['I', 'l', '|', 'i']:
            chars[12] = '1'
        elif chars[12] in ['O', 'o']:
            chars[12] = '0'

        chars[13] = 'Z'

        repaired = "".join(chars)
        if self.gstin_strict_regex.match(repaired):
            logger.debug(f"[NLP Normalization] Repaired OCR GSTIN token from '{cleaned}' to '{repaired}'")
            return repaired
        return None

    def extract_entities(self, raw_text: str) -> Dict[str, Any]:
        if not raw_text or not raw_text.strip():
            return {
                "turnover_inr": None,
                "experience_years": None,
                "certifications": [],
                "pan": None,
                "gstin": None,
                "cin": None,
                "udyam": None,
                "udin": None,
                "dates": [],
                "vendor_name": None,
                "certificate_numbers": []
            }

        try:
            text = self.normalize_text(raw_text)

            # 1. Extract PAN
            extracted_pan = None
            for match in self.pan_candidate_regex.finditer(text):
                cand = match.group(1).strip()
                normalized = self.normalize_pan_candidate(cand)
                if normalized:
                    extracted_pan = normalized
                    break

            if not extracted_pan:
                for word in re.findall(r'\b[A-Za-z0-9]{10}\b', text):
                    normalized = self.normalize_pan_candidate(word)
                    if normalized:
                        extracted_pan = normalized
                        break

            # 2. Extract GSTIN
            extracted_gstin = None
            candidate_gstins = []
            for match in self.gstin_candidate_regex.finditer(text):
                cand = match.group(1).strip()
                normalized = self.normalize_gstin_candidate(cand)
                if normalized:
                    candidate_gstins.append(normalized)

            if not candidate_gstins:
                for word in re.findall(r'\b[A-Za-z0-9]{15}\b', text):
                    normalized = self.normalize_gstin_candidate(word)
                    if normalized:
                        candidate_gstins.append(normalized)

            if candidate_gstins:
                if extracted_pan:
                    for g in candidate_gstins:
                        if extracted_pan in g:
                            extracted_gstin = g
                            break
                if not extracted_gstin:
                    extracted_gstin = candidate_gstins[0]

            # 3. Extract CIN & Udyam
            cin_match = self.cin_regex.search(text)
            extracted_cin = cin_match.group(1) if cin_match else None

            udyam_match = self.udyam_regex.search(text)
            extracted_udyam = udyam_match.group(1).upper() if udyam_match else None

            # 4. Extract UDIN (18 digits)
            udin_match = self.udin_regex.search(text)
            extracted_udin = udin_match.group(1) if udin_match else None

            # 5. Turnover calculation
            turnover_inr = None
            cr_match = self.turnover_cr_regex.search(text)
            if cr_match:
                val = self.parse_numeric_or_word(cr_match.group(1))
                if val is not None:
                    turnover_inr = val * 10000000.0

            if turnover_inr is None:
                rw_match = self.rupees_words_cr_regex.search(text)
                if rw_match:
                    val = self.parse_numeric_or_word(rw_match.group(1))
                    if val is not None:
                        turnover_inr = val * 10000000.0

            if turnover_inr is None:
                lakh_match = self.turnover_lakh_regex.search(text)
                if lakh_match:
                    val = self.parse_numeric_or_word(lakh_match.group(1))
                    if val is not None:
                        turnover_inr = val * 100000.0

            if turnover_inr is None:
                raw_match = self.turnover_raw_regex.search(text)
                if raw_match:
                    try:
                        cleaned_val = raw_match.group(1).replace(",", "").strip()
                        turnover_inr = float(cleaned_val)
                    except ValueError:
                        pass

            # 6. Experience calculation
            experience_years = None
            dur_match = self.exp_total_duration_regex.search(text)
            if dur_match:
                val = self.parse_numeric_or_word(dur_match.group(1))
                if val is not None:
                    experience_years = val

            if experience_years is None:
                exp_match = self.exp_years_regex.search(text)
                if exp_match:
                    val = self.parse_numeric_or_word(exp_match.group(1))
                    if val is not None:
                        experience_years = val

            if experience_years is None:
                period_match = self.exp_period_regex.search(text)
                if period_match:
                    try:
                        y1 = int(period_match.group(1))
                        y2 = int(period_match.group(2))
                        if y2 >= y1:
                            experience_years = float(y2 - y1)
                    except ValueError:
                        pass

            if experience_years is None:
                est_match = self.exp_established_regex.search(text)
                if est_match:
                    try:
                        est_year = int(est_match.group(1))
                        curr_year = datetime.now().year
                        if 1950 <= est_year <= curr_year:
                            experience_years = float(curr_year - est_year)
                    except ValueError:
                        pass

            # 7. Certifications
            found_certs = []
            for pat, standard_name in self.cert_patterns:
                if re.search(pat, text, re.IGNORECASE):
                    found_certs.append(standard_name)
            found_certs = sorted(list(set(found_certs)))

            # 8. Dates
            dates = self.date_regex.findall(text)

            # 9. Vendor / Entity Name extraction
            vendor_name = None
            name_match = re.search(r'(?:M/s\.?|Company\s+Name|Bidder\s+Name|Enterprise\s+Name|Legal\s+Name|Name\s+of\s+Taxpayer)[\s\:\-\n]+([A-Za-z0-9\s\,\.\&\-]{3,60})', text, re.IGNORECASE)
            if name_match:
                vendor_name = re.sub(r'\s+', ' ', name_match.group(1)).strip()

            # 10. List of all certificate / identifier numbers
            cert_nums = []
            if extracted_pan: cert_nums.append(f"PAN: {extracted_pan}")
            if extracted_gstin: cert_nums.append(f"GSTIN: {extracted_gstin}")
            if extracted_cin: cert_nums.append(f"CIN: {extracted_cin}")
            if extracted_udyam: cert_nums.append(f"UDYAM: {extracted_udyam}")
            if extracted_udin: cert_nums.append(f"UDIN: {extracted_udin}")

            return {
                "turnover_inr": turnover_inr,
                "experience_years": experience_years,
                "certifications": found_certs,
                "pan": extracted_pan,
                "gstin": extracted_gstin,
                "cin": extracted_cin,
                "udyam": extracted_udyam,
                "udin": extracted_udin,
                "dates": dates[:8],
                "vendor_name": vendor_name,
                "certificate_numbers": cert_nums
            }

        except Exception as e:
            logger.error(f"[NLP Extractor] Entity extraction error: {e}\n{traceback.format_exc()}")
            return {
                "turnover_inr": None,
                "experience_years": None,
                "certifications": [],
                "pan": None,
                "gstin": None,
                "cin": None,
                "udyam": None,
                "udin": None,
                "dates": [],
                "vendor_name": None,
                "certificate_numbers": [],
                "error": str(e)
            }


nlp_extractor = NLPEntityExtractor()
