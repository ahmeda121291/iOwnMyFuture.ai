#!/bin/bash

# Script to help identify and fix console statements
echo "Searching for remaining console statements in app directory..."

echo -e "\n=== Files with console.error ==="
grep -r "console\.error" app --include="*.ts" --include="*.tsx" -l | grep -v "errorTracking.ts" | head -20

echo -e "\n=== Files with console.warn ==="
grep -r "console\.warn" app --include="*.ts" --include="*.tsx" -l | head -20

echo -e "\n=== Files with console.log ==="
grep -r "console\.log" app --include="*.ts" --include="*.tsx" -l | grep -v "errorTracking.ts" | head -20

echo -e "\n=== Total counts ==="
echo "console.error: $(grep -r "console\.error" app --include="*.ts" --include="*.tsx" | grep -v "errorTracking.ts" | wc -l)"
echo "console.warn: $(grep -r "console\.warn" app --include="*.ts" --include="*.tsx" | wc -l)"
echo "console.log: $(grep -r "console\.log" app --include="*.ts" --include="*.tsx" | grep -v "errorTracking.ts" | wc -l)"