#!/usr/bin/env bash
set -euo pipefail

TEMPLATE="${1:?Usage: scaffold.sh <template> <project-name>}"
PROJECT="${2:?Usage: scaffold.sh <template> <project-name>}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATE_DIR="$SCRIPT_DIR/../$TEMPLATE"

if [ ! -d "$TEMPLATE_DIR" ]; then
  echo "Error: Template '$TEMPLATE' not found"
  echo "Available templates: rust, astro-solidjs, starlight, ts-package"
  exit 1
fi

echo "Scaffolding '$PROJECT' from template '$TEMPLATE'..."
cp -r "$TEMPLATE_DIR" "$PROJECT"

# Replace template variables
find "$PROJECT" -type f -name "*.template" | while read -r file; do
  target="${file%.template}"
  mv "$file" "$target"
  sed -i "s/{{project_name}}/$PROJECT/g" "$target"
  sed -i "s/{{ProjectName}}/$(echo "$PROJECT" | sed 's/\b./\U&/g')/g" "$target"
done

echo "Done! Project '$PROJECT' created."
echo "  cd $PROJECT"
echo "  git init"
echo "  git add -A"
echo "  git commit -m 'feat: initial scaffold'"
