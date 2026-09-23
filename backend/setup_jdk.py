import os
import urllib.request
import zipfile
import shutil

backend_dir = os.path.dirname(os.path.abspath(__file__))
tools_dir = os.path.join(backend_dir, ".tools")
os.makedirs(tools_dir, exist_ok=True)
target_dir = os.path.join(tools_dir, "jdk-21")

if os.path.exists(os.path.join(target_dir, "bin", "java.exe")):
    print("JDK 21 is already present.")
else:
    zip_path = os.path.join(tools_dir, "jdk21.zip")
    url = "https://aka.ms/download-jdk/microsoft-jdk-21.0.6-windows-x64.zip"
    print(f"Downloading Microsoft OpenJDK 21 from {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as response, open(zip_path, "wb") as out_file:
        shutil.copyfileobj(response, out_file)
    print("Download complete. Extracting...")
    extract_temp = os.path.join(tools_dir, "jdk_temp")
    if os.path.exists(extract_temp):
        shutil.rmtree(extract_temp)
    with zipfile.ZipFile(zip_path, "r") as zip_ref:
        zip_ref.extractall(extract_temp)
    # The zip contains a root folder like jdk-21.0.6+7
    entries = os.listdir(extract_temp)
    root_extracted = os.path.join(extract_temp, entries[0]) if len(entries) == 1 and os.path.isdir(os.path.join(extract_temp, entries[0])) else extract_temp
    if os.path.exists(target_dir):
        shutil.rmtree(target_dir)
    shutil.move(root_extracted, target_dir)
    if os.path.exists(extract_temp):
        shutil.rmtree(extract_temp)
    if os.path.exists(zip_path):
        os.remove(zip_path)
    print(f"JDK 21 successfully installed to {target_dir}")
