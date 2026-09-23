import os
from PIL import Image, ImageDraw, ImageFont

DATA_DIR = os.path.dirname(os.path.abspath(__file__))
DOCS_DIR = os.path.join(DATA_DIR, "documents")
os.makedirs(DOCS_DIR, exist_ok=True)

def create_sample_certificate(filename, title, vendor, details, tamper=False):
    img = Image.new("RGB", (900, 600), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Border
    draw.rectangle([(20, 20), (880, 580)], outline=(11, 59, 96), width=5)
    draw.rectangle([(30, 30), (870, 570)], outline=(230, 126, 34), width=2)

    # Header
    draw.text((300, 50), "GOVERNMENT OF INDIA", fill=(11, 59, 96))
    draw.text((260, 80), "OFFICIAL PROCUREMENT CERTIFICATE", fill=(7, 42, 68))
    draw.line([(50, 115), (850, 115)], fill=(200, 200, 200), width=2)

    # Title & Vendor
    draw.text((60, 140), f"Subject: {title}", fill=(0, 0, 0))
    draw.text((60, 180), f"Issued To: {vendor}", fill=(0, 0, 0))

    # Details
    y = 230
    for key, val in details.items():
        draw.text((60, y), f"{key}: {val}", fill=(50, 50, 50))
        y += 35

    # Seal / Verification Mark
    draw.ellipse([(680, 420), (820, 540)], outline=(16, 185, 129), width=3)
    draw.text((705, 470), "VERIFIED", fill=(16, 185, 129))

    # Artificial Tampering (Digital font modification over existing pixels)
    if tamper:
        # Overlay altered digits with different compression artifact block
        draw.rectangle([(280, 225), (480, 260)], fill=(255, 255, 255))
        draw.text((285, 230), "₹ 95.0 Crores [ALTERED]", fill=(220, 38, 38))

    filepath = os.path.join(DOCS_DIR, filename)
    img.save(filepath, "JPEG", quality=95)
    print(f"Generated sample certificate: {filepath}")

if __name__ == "__main__":
    # 1. Compliant Vendor Certificate
    create_sample_certificate(
        "1_compliant_ca_turnover.jpg",
        "CA Certified Annual Turnover Statement",
        "Bharat Tech Solutions Pvt Ltd",
        {
            "Annual Turnover": "INR 28.5 Crores (Turnover: 28.5 Cr)",
            "Financial Year": "2024-2025",
            "PAN": "AAACB1234F",
            "GSTIN": "07AAACB1234F1Z5",
            "Certifications": "ISO-9001:2015, ISO-27001, CMMI-Level-3/5",
            "Experience Standing": "9.0 years of experience in enterprise HPC"
        }
    )

    # 2. Tampered Turnover Certificate (Altered digits flagged by ELA)
    create_sample_certificate(
        "2_tampered_turnover_ela.jpg",
        "Turnover & Solvency Certificate",
        "Suspect Infra Ltd",
        {
            "Annual Turnover": "INR 12.0 Crores",
            "PAN": "BBBCB5678G",
            "GSTIN": "27BBBCB5678G1Z8",
            "Experience": "4.0 years"
        },
        tamper=True
    )

    # 3. Debarred / Blacklisted Vendor Proof
    create_sample_certificate(
        "3_debarred_vendor_doc.jpg",
        "Registration Certificate",
        "Debarred Associates LLP",
        {
            "PAN": "FRAUD1111A",
            "GSTIN": "07ABCDE1234F1Z5",
            "Annual Turnover": "INR 18.0 Crores"
        }
    )

    print("Sample test certificates generated successfully in sample-data/documents/")
