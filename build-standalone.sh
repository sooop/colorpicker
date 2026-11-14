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
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <title>OKLCH 팔레트</title>
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23C96B3E'/%3E%3Cg transform='translate(5 5) scale(.917)' fill='none' stroke='%23fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='8.5'/%3E%3Ccircle cx='12' cy='12' r='3.2'/%3E%3Cpath d='M12 3.5v5.3M20.5 12h-5.3'/%3E%3C/g%3E%3C/svg%3E">
    <script>
      // 첫 페인트 전에 테마를 정해 깜빡임을 막는다 (index.html 과 같은 코드)
      (function () {
        var t = null;
        try { t = localStorage.getItem('colorpicker.theme'); } catch (e) {}
        if (t !== 'light' && t !== 'dark') {
          t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        document.documentElement.setAttribute('data-theme', t);
      })();
    </script>
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
