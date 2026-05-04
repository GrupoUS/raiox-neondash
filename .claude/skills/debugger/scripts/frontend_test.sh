#!/bin/bash
# Debug Skill - Frontend Testing with agent-browser
# Semantic browser automation for E2E testing

set -e

URL="${1:-http://localhost:3000}"
SCREENSHOT_PATH="${2:-./debug-screenshot.png}"

echo "🌐 Frontend Testing with agent-browser"
echo "======================================="
echo ""

# Check if agent-browser is installed
if ! command -v agent-browser &> /dev/null; then
    echo "⚠️  agent-browser not installed"
    echo ""
    echo "Install with:"
    echo "  npm install -g agent-browser"
    echo "  agent-browser install"
    exit 1
fi

echo "1️⃣  Opening: $URL"
agent-browser open "$URL"

echo ""
echo "2️⃣  Taking snapshot (accessibility tree)..."
agent-browser snapshot

echo ""
echo "3️⃣  Taking screenshot..."
agent-browser screenshot "$SCREENSHOT_PATH"
echo "   Saved to: $SCREENSHOT_PATH"

echo ""
echo "4️⃣  Closing browser..."
agent-browser close

echo ""
echo "✅ Frontend test complete!"
echo ""
echo "📝 Next steps:"
echo "   - Review screenshot: $SCREENSHOT_PATH"
echo "   - Use refs from snapshot for interactions:"
echo "     agent-browser click @e2"
echo "     agent-browser fill @e3 \"text\""
