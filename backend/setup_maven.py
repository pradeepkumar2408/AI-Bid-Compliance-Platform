import os
import requests
import zipfile

backend_dir = os.path.dirname(os.path.abspath(__file__))
tools_dir = os.path.join(backend_dir, ".tools")
os.makedirs(tools_dir, exist_ok=True)

mvn_bin = os.path.join(tools_dir, "apache-maven-3.9.6", "bin", "mvn.cmd")

if not os.path.exists(mvn_bin):
    zip_path = os.path.join(tools_dir, "maven.zip")
    url = "https://repo.maven.apache.org/maven2/org/apache/maven/apache-maven/3.9.6/apache-maven-3.9.6-bin.zip"
    print(f"Downloading Apache Maven 3.9.6 from {url}...")
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    r = requests.get(url, headers=headers, stream=True, timeout=60)
    if r.status_code == 200:
        with open(zip_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
        print("Extracting Apache Maven...")
        with zipfile.ZipFile(zip_path, 'r') as zip_ref:
            zip_ref.extractall(tools_dir)
        if os.path.exists(zip_path):
            os.remove(zip_path)
        print("Maven setup completed successfully.")
    else:
        print(f"Failed to download: Status {r.status_code}")
else:
    print("Maven already installed.")
