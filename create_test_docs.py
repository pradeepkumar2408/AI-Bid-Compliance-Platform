import os
from PIL import Image, ImageDraw, ImageFont

out_dir = r"D:\SIH26100\test_documents"
os.makedirs(out_dir, exist_ok=True)

documents = [
    {
        "name": "01_PAN_Card_Amazon",
        "title": "INCOME TAX DEPARTMENT - GOVT. OF INDIA",
        "subtitle": "Permanent Account Number Card",
        "color": (10, 61, 98),
        "lines": [
            "TAX IDENTIFICATION NUMBER (PAN): AAICA3918J",
            "Entity Legal Name: AMAZON SELLER SERVICES PRIVATE LIMITED",
            "Category: Company (Corporate Taxpayer)",
            "Date of Incorporation: 15/05/2012",
            "Jurisdiction: Ward 12(1), Bangalore",
            "Status: REAL AND ACTIVE"
        ]
    },
    {
        "name": "02_GST_Certificate_Amazon",
        "title": "GOVERNMENT OF INDIA - GOODS & SERVICES TAX",
        "subtitle": "Form GST REG-06 - Registration Certificate",
        "color": (5, 150, 105),
        "lines": [
            "Registration Number (GSTIN): 33AAICA3918J1C0",
            "Legal Name: Amazon Seller Services Private Limited",
            "Trade Name: Amazon",
            "Embedded PAN: AAICA3918J (Matched & Verified)",
            "Principal Place of Business: Chennai, Tamil Nadu - 600001",
            "Date of Validity: 01/07/2017 to Continuing",
            "Taxpayer Type: Regular Taxpayer"
        ]
    },
    {
        "name": "03_Company_Registration_CIN",
        "title": "MINISTRY OF CORPORATE AFFAIRS - ROC",
        "subtitle": "Certificate of Incorporation (Section 7, Companies Act)",
        "color": (124, 58, 237),
        "lines": [
            "Corporate Identity Number (CIN): U74900KA2012PTC063789",
            "Company Name: Amazon Seller Services Private Limited",
            "Date of Incorporation: 15/05/2012",
            "Enterprise Type: Private Limited Company",
            "Udyam MSME Registration: UDYAM-KA-02-0012345",
            "Registered Office: Bangalore, Karnataka, India"
        ]
    },
    {
        "name": "04_Experience_Certificate",
        "title": "CLIENT PERFORMANCE & SATISFACTORY COMPLETION CERTIFICATE",
        "subtitle": "Government / Enterprise Work Order Completion Proof",
        "color": (217, 119, 6),
        "lines": [
            "Client / Department: Ministry of Electronics & IT (MeitY)",
            "Contract / Work Order No: GOV-IT-2023-8821",
            "Awarded Vendor: Amazon Seller Services Private Limited",
            "Total Duration: 5.5 Years of standing and operation",
            "Scope of Work: Cloud Computing & High-Performance GPU Cluster Deployment",
            "Executed Project Value: INR 45,00,00,000 (Rupees 45 Crore)",
            "Performance Status: Successfully Completed within stipulated SLA terms"
        ]
    },
    {
        "name": "05_Financial_Turnover_UDIN",
        "title": "CHARTERED ACCOUNTANTS AUDITOR CERTIFICATE",
        "subtitle": "Annual Turnover & Audited Net Worth Statement",
        "color": (8, 145, 178),
        "lines": [
            "Audited Entity: Amazon Seller Services Private Limited",
            "Annual Turnover FY 2024-25: INR 250,00,00,000 (Rupees 250 Crore)",
            "Audited Net Worth: INR 85,00,00,000 (Rupees 85 Crore)",
            "ICAI 18-digit UDIN: 24123456AAAA123456",
            "Chartered Accountant Membership No: 123456",
            "Auditor Firm: ABC & Associates Chartered Accountants",
            "Audit Opinion: Unqualified Clean Report"
        ]
    },
    {
        "name": "06_ISO_9001_Compliance_Certificate",
        "title": "CERTIFICATE OF REGISTRATION & STATUTORY COMPLIANCE",
        "subtitle": "Quality Management System & Information Security",
        "color": (79, 70, 229),
        "lines": [
            "Certified Entity: Amazon Seller Services Private Limited",
            "Standards Certified: ISO 9001:2015 (Quality Management System)",
            "Additional Standards: ISO 27001 (Information Security Management)",
            "Accreditation Body: NABCB / IAF Global Accreditation",
            "Certificate Number: ISO-IND-2023-99881",
            "Issued Date: 10/01/2023 | Expiry Date: 09/01/2026",
            "Compliance Status: Fully Compliant & Active"
        ]
    },
    {
        "name": "07_Technical_Proposal",
        "title": "TECHNICAL BID PROPOSAL & SPECIFICATION COMPLIANCE MATRIX",
        "subtitle": "Procurement of High-Performance GPU AI Clusters",
        "color": (99, 102, 241),
        "lines": [
            "Tender ID: GEM/2026/B/888001",
            "Bidder Entity: Amazon Seller Services Private Limited",
            "Bill of Materials (BOM): NVIDIA H100 GPU Clusters, InfiniBand 400Gbps",
            "Clause-by-Clause Compliance Matrix: 100% Full Compliance",
            "Implementation Schedule: 4 Weeks Deployment with 24x7 Tier-3 SLA",
            "Security Architecture: Zero Trust, CVC & GeM Procurement Policy Aligned"
        ]
    },
    {
        "name": "08_INVALID_Sample_Resume",
        "title": "CURRICULUM VITAE / PERSONAL RESUME",
        "subtitle": "Individual Profile (Invalid for Tender Submission)",
        "color": (220, 38, 38),
        "lines": [
            "Candidate Name: John Doe",
            "Career Objective: Seeking Junior Software Engineer position",
            "Technical Skills: React, Python, JavaScript, HTML, CSS",
            "Education: Bachelor of Technology (B.Tech Computer Science)",
            "Academic CGPA: 8.5 / 10.0",
            "Personal Details: Date of Birth: 01/01/2000 | Marital Status: Single",
            "Note: This file is intentionally irrelevant to test AI rejection."
        ]
    }
]

for doc in documents:
    img = Image.new("RGB", (1100, 780), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    
    # Draw header banner
    draw.rectangle([(0, 0), (1100, 110)], fill=doc["color"])
    
    # Text in banner
    draw.text((40, 25), doc["title"], fill=(255, 255, 255))
    draw.text((40, 65), doc["subtitle"], fill=(220, 230, 242))
    
    # Draw border
    draw.rectangle([(15, 15), (1085, 765)], outline=doc["color"], width=3)
    
    # Draw content lines
    y = 150
    for line in doc["lines"]:
        if ":" in line:
            parts = line.split(":", 1)
            draw.text((60, y), parts[0] + ":", fill=(15, 23, 42))
            draw.text((420, y), parts[1].strip(), fill=(30, 41, 59))
        else:
            draw.text((60, y), line, fill=(15, 23, 42))
        
        draw.line([(60, y + 38), (1040, y + 38)], fill=(226, 232, 240), width=1)
        y += 60
        
    # Footer watermark
    draw.text((60, 720), "OFFICIAL STATUTORY RECORD - GeM BID COMPLIANCE PLATFORM VERIFIED", fill=(148, 163, 184))
    
    # Save PNG and PDF
    png_path = os.path.join(out_dir, f"{doc['name']}.png")
    pdf_path = os.path.join(out_dir, f"{doc['name']}.pdf")
    
    img.save(png_path)
    img.save(pdf_path, "PDF", resolution=100.0)
    print(f"Generated: {png_path} and {pdf_path}")

print("\nAll 8 sample test certificates generated successfully in D:\\SIH26100\\test_documents!")
