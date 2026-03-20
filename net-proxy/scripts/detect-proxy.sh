#!/usr/bin/env bash
# detect-proxy.sh — Detect system proxy settings
# Output: proxy URL (e.g. http://127.0.0.1:7890) or empty string if none found
set -euo pipefail

# --- 1. Environment variables ---
for var in HTTPS_PROXY HTTP_PROXY ALL_PROXY https_proxy http_proxy all_proxy; do
  val="${!var:-}"
  if [ -n "$val" ]; then
    # Normalize: ensure scheme prefix
    case "$val" in
      http://*|https://*|socks5://*|socks5h://*|socks4://*) echo "$val"; exit 0 ;;
      *) echo "http://$val"; exit 0 ;;
    esac
  fi
done

# --- 2. macOS system proxy via networksetup ---
if command -v networksetup &>/dev/null; then
  # Get all network services
  while IFS= read -r service; do
    [ -z "$service" ] && continue

    # Try HTTPS proxy first (more relevant for npm)
    https_output=$(networksetup -getsecurewebproxy "$service" 2>/dev/null || true)
    https_enabled=$(echo "$https_output" | head -1 | awk '{print $2}')
    if [ "$https_enabled" = "Yes" ]; then
      https_host=$(echo "$https_output" | sed -n '2p' | awk -F': ' '{print $2}')
      https_port=$(echo "$https_output" | sed -n '3p' | awk -F': ' '{print $2}')
      if [ -n "$https_host" ] && [ -n "$https_port" ]; then
        echo "http://${https_host}:${https_port}"
        exit 0
      fi
    fi

    # Try HTTP proxy
    http_output=$(networksetup -getwebproxy "$service" 2>/dev/null || true)
    http_enabled=$(echo "$http_output" | head -1 | awk '{print $2}')
    if [ "$http_enabled" = "Yes" ]; then
      http_host=$(echo "$http_output" | sed -n '2p' | awk -F': ' '{print $2}')
      http_port=$(echo "$http_output" | sed -n '3p' | awk -F': ' '{print $2}')
      if [ -n "$http_host" ] && [ -n "$http_port" ]; then
        echo "http://${http_host}:${http_port}"
        exit 0
      fi
    fi
  done < <(networksetup -listallnetworkservices 2>/dev/null | tail -n +2)
fi

# --- 3. No proxy found ---
exit 0
