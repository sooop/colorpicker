#!/bin/bash

# OKLCH Color Palette - Standalone HTML Builder
# This script builds the project and creates a standalone HTML file

echo "Building project..."
npm run build

if [ $? -ne 0 ]; then
  echo "Build failed!"
  exit 1
fi

echo "Creating standalone HTML file..."

# Find CSS and JS files
CSS_FILE=$(ls dist/assets/*.css | head -1)
JS_FILE=$(ls dist/assets/*.js | head -1)

if [ -z "$CSS_FILE" ] || [ -z "$JS_FILE" ]; then
  echo "Error: Could not find CSS or JS files in dist/assets/"
  exit 1
fi

echo "Found CSS: $CSS_FILE"
echo "Found JS: $JS_FILE"

# Create standalone HTML
cat > dist/standalone.html << 'HTMLEOF'
<!DOCTYPE html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>OKLCH Color Palette</title>
    <style>
HTMLEOF

cat "$CSS_FILE" >> dist/standalone.html

cat >> dist/standalone.html << 'HTMLEOF'
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script type="module">
HTMLEOF

cat "$JS_FILE" >> dist/standalone.html

cat >> dist/standalone.html << 'HTMLEOF'
    </script>
  </body>
</html>
HTMLEOF

FILE_SIZE=$(du -h dist/standalone.html | cut -f1)
echo "✓ Standalone HTML created successfully: dist/standalone.html ($FILE_SIZE)"
