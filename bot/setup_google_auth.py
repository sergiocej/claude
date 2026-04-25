#!/usr/bin/env python3
"""
Run this ONCE to obtain your Google Calendar OAuth tokens.

Steps:
  1. Go to console.cloud.google.com
  2. Create a project → enable "Google Calendar API"
  3. Credentials → Create → OAuth client ID → Desktop app
  4. Download the JSON → save as  bot/client_secrets.json
  5. Run:  python setup_google_auth.py
  6. Copy the printed values into your .env file
"""
from google_auth_oauthlib.flow import InstalledAppFlow
import sys
import os

SCOPES = ["https://www.googleapis.com/auth/calendar"]
SECRETS_FILE = os.path.join(os.path.dirname(__file__), "client_secrets.json")


def main():
    if not os.path.exists(SECRETS_FILE):
        print(f"Error: no se encontró {SECRETS_FILE}")
        print("Descargá el JSON desde Google Cloud Console y guardalo como client_secrets.json")
        sys.exit(1)

    print("Abriendo el navegador para autenticar con Google…")
    flow = InstalledAppFlow.from_client_secrets_file(SECRETS_FILE, SCOPES)
    creds = flow.run_local_server(port=0)

    print("\n✅ Autenticación exitosa!\n")
    print("Agregá estas líneas a tu archivo .env:\n")
    print(f"GOOGLE_REFRESH_TOKEN={creds.refresh_token}")
    print(f"GOOGLE_CLIENT_ID={creds.client_id}")
    print(f"GOOGLE_CLIENT_SECRET={creds.client_secret}")


if __name__ == "__main__":
    main()
