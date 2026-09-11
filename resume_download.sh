#!/bin/bash

URL="https://vikingfile.com/d/JR6MHgrZ7M/%5BSuperPSX.com%5D-WWE.2K25_CUSA48576_v1.00_%5B12.00%5D_OPOISSO893.pkg"
DEST_DIR="/run/media/masteralex/New Volume"
OUTPUT_FILE="shit.pkg"
MAX_RETRIES=50
RETRY_DELAY=60  # seconds

# Ensure destination directory exists
mkdir -p "$DEST_DIR"

attempt=1
while [ $attempt -le $MAX_RETRIES ]; do
    echo "============================================"
    echo "[$(date)] Download attempt $attempt of $MAX_RETRIES"
    echo "============================================"

    # Use wget with resume support (-c), browser-like headers
    wget -c \
        --no-check-certificate \
        --timeout=120 \
        --waitretry=10 \
        --tries=3 \
        --retry-connrefused \
        --progress=bar:force \
        --user-agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36" \
        --referer="https://akirabox.com/" \
        -O "$DEST_DIR/$OUTPUT_FILE" \
        "$URL"

    EXIT_CODE=$?

    if [ $EXIT_CODE -eq 0 ]; then
        echo ""
        echo "============================================"
        echo "[$(date)] Download completed successfully!"
        echo "File saved to: $DEST_DIR/$OUTPUT_FILE"
        echo "============================================"
        exit 0
    fi

    echo ""
    echo "[$(date)] Download failed with exit code $EXIT_CODE"

    if [ $attempt -lt $MAX_RETRIES ]; then
        echo "[$(date)] Waiting ${RETRY_DELAY}s before retry..."
        sleep $RETRY_DELAY
    fi

    attempt=$((attempt + 1))
done

echo "[$(date)] All $MAX_RETRIES attempts exhausted. Download failed."
exit 1
