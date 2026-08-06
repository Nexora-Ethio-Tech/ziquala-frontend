#!/bin/bash

# Ziquala Abo School frontend deployment.
# The backend is intentionally not handled here until its own repository and
# deployment target have been created.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PUBLIC_HTML="${ZIQUALA_PUBLIC_HTML:-$HOME/public_html}"

cd "$PROJECT_DIR"
npm install
npm run build

echo "Frontend built in $PROJECT_DIR/dist"
echo "Deployment target: $PUBLIC_HTML"
echo "Copy the dist contents only after confirming the Ziquala hosting account."
