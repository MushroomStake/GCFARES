#!/bin/bash

# Firestore Security Rules Deployment Script
# This script deploys the security rules to your Firebase project

echo "🔄 Deploying Firestore Security Rules..."

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI is not installed!"
    echo "Install it with: npm install -g firebase-tools"
    exit 1
fi

# Check if firebase.json exists
if [ ! -f "firebase.json" ]; then
    echo "🔄 Creating firebase.json configuration..."
    cat > firebase.json << EOF
{
  "firestore": {
    "rules": "firestore.rules"
  }
}
EOF
    echo "✅ Created firebase.json"
fi

# Check if user is logged in
echo "🔄 Checking Firebase login status..."
firebase login:ci

# Deploy the rules
echo "🔄 Deploying security rules to Firebase project..."
firebase deploy --only firestore:rules --project sia-hr-admin

echo "✅ Firestore security rules deployed successfully!"
echo ""
echo "📋 Rules Summary:"
echo "  - ranking_cycles: Public read, Auth write"
echo "  - users: Public read, Auth write" 
echo "  - applications: Public read, Auth write"
echo "  - area_submissions: Auth read/write"
echo "  - activity_logs: Auth read/write"
echo "  - faculty: Public read, Auth write"
echo "  - areas: Public read, Auth write"
echo "  - departments: Public read, Auth write"
echo "  - positions: Public read, Auth write"
echo "  - All other collections: Denied"
