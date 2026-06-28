import os

replacements = [
    ("venky-gate", "anima-gate"),
    ("venky-password", "anima-password"),
    ("venky-submit", "anima-submit"),
    ("venky-skip", "anima-skip"),
    ("venky-prompt", "anima-prompt"),
    ("venky-input-row", "anima-input-row"),
    ("venky-shield-icon", "anima-shield-icon"),
    ("venky-panel", "anima-panel"),
    ("return-sravan-btn", "return-aegis-btn"),
    ("sravanAuth", "aegisAuth"),
    ("venkyAuth", "animaAuth"),
    ("sravanPath", "aegisPath"),
    ("venkyPath", "animaPath"),
    ("sData", "aegisData"),
    ("vData", "animaData"),
    ("vUnlocked", "animaUnlocked"),
    ("sravan.json", "aegis.json"),
    ("venky.json", "anima.json"),
    ("output['sravan']", "output['aegis']"),
    ("output['venky']", "output['anima']"),
    ("window.SITE_DATA.sravan", "window.SITE_DATA.aegis"),
    ("window.SITE_DATA.venky", "window.SITE_DATA.anima"),
    ("SRAVAN:", "AEGIS:"),
    ("Sravan's", "Aegis's"),
    ("Venky's", "Anima's"),
    ("Sravan", "Aegis"),
    ("Venky", "Anima"),
    ("sravan", "aegis"),
    ("venky", "anima")
]

files_to_update = ["index.html", "style.css", "app.js", "encrypt.py"]

for filename in files_to_update:
    filepath = os.path.join(r"c:\Users\gvsra\OneDrive\Documents\GitHub\ME", filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Rename files in content/
content_dir = r"c:\Users\gvsra\OneDrive\Documents\GitHub\ME\content"
if os.path.exists(os.path.join(content_dir, 'sravan.json')):
    os.rename(os.path.join(content_dir, 'sravan.json'), os.path.join(content_dir, 'aegis.json'))
if os.path.exists(os.path.join(content_dir, 'venky.json')):
    os.rename(os.path.join(content_dir, 'venky.json'), os.path.join(content_dir, 'anima.json'))

print("Refactor complete.")
