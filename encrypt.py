import os
import json
import base64
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import glob
import random

def encrypt_payload(data_dict, password):
    # Convert data dict to JSON string, then to bytes
    plaintext = json.dumps(data_dict).encode('utf-8')
    password_bytes = password.encode('utf-8')

    # Generate 16 bytes salt, 12 bytes IV
    salt = os.urandom(16)
    iv = os.urandom(12)

    # Derive key (PBKDF2 with SHA256, 600,000 iterations, 32 bytes/256 bits output)
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=600000,
    )
    key = kdf.derive(password_bytes)

    # Encrypt using AES-GCM
    aesgcm = AESGCM(key)
    ciphertext_with_tag = aesgcm.encrypt(iv, plaintext, None)

    # Construct the final buffer: salt (16) + iv (12) + ciphertext_with_tag
    final_buffer = salt + iv + ciphertext_with_tag
    
    # Base64 encode
    return base64.b64encode(final_buffer).decode('utf-8')

def main():
    content_dir = 'content'
    if not os.path.exists(content_dir):
        print(f"Error: {content_dir} directory not found.")
        return

    output = {
        "aegis": None,
        "anima": None,
        "people": []
    }

    # Process Aegis
    try:
        with open(os.path.join(content_dir, 'aegis.json'), 'r', encoding='utf-8') as f:
            s_data = json.load(f)
            output['aegis'] = encrypt_payload(s_data['data'], s_data['password'])
            print("Encrypted Aegis's profile.")
    except Exception as e:
        print(f"Failed to process aegis.json: {e}")

    # Process Anima
    try:
        with open(os.path.join(content_dir, 'anima.json'), 'r', encoding='utf-8') as f:
            v_data = json.load(f)
            output['anima'] = encrypt_payload(v_data['data'], v_data['password'])
            print("Encrypted Anima's profile.")
    except Exception as e:
        print(f"Failed to process anima.json: {e}")

    # Process People
    people_files = glob.glob(os.path.join(content_dir, 'person_*.json'))
    for pf in people_files:
        try:
            with open(pf, 'r', encoding='utf-8') as f:
                p_data = json.load(f)
                
                # Combine name and key for the encryption password
                combined_password = p_data['name'] + p_data['key']
                
                # Inject name back into the encrypted payload so the UI can display it
                # along with the other data (emoji, color, thoughts)
                payload_data = p_data['data']
                payload_data['name'] = p_data['name']
                
                encrypted = encrypt_payload(payload_data, combined_password)
                output['people'].append(encrypted)
                print(f"Encrypted {os.path.basename(pf)}.")
        except Exception as e:
            print(f"Failed to process {pf}: {e}")

    # Shuffle the people array so order doesn't leak who is who
    random.shuffle(output['people'])

    # Write data.js
    js_content = f"window.SITE_DATA = {json.dumps(output, indent=2)};\n"
    with open('data.js', 'w') as f:
        f.write(js_content)
    print("Successfully generated data.js")

if __name__ == '__main__':
    main()
