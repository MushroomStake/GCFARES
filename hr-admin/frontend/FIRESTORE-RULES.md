# Firestore Security Rules Documentation

## Overview
These security rules are designed for the Gordon College HR Admin system, providing appropriate access control for the faculty evaluation and ranking system.

## Rule Breakdown

### 1. Ranking Cycles (`/ranking_cycles/{cycleId}`)
- **Read**: Public access (allows dashboard to display current cycle info)
- **Write**: Authenticated users only (admin can create/update cycles)
- **Use Case**: Dashboard needs to show active cycles to all users

### 2. Users Collection (`/users/{userId}`)
- **Read**: Public access (allows user management to display faculty lists)
- **Write**: Authenticated users only (admin can manage user accounts)
- **Use Case**: User management page, faculty selection dropdowns

### 3. Applications (`/applications/{applicationId}`)
- **Read**: Public access (allows viewing application status)
- **Write**: Authenticated users only (admin can update application status)
- **Subcollection**: `area_submissions` requires authentication for read/write

### 4. Activity Logs (`/activity_logs/{logId}`)
- **Read/Write**: Authenticated users only
- **Use Case**: Audit trail for system actions

### 5. Faculty Collection (`/faculty/{facultyId}`)
- **Read**: Public access (faculty directory, dropdowns)
- **Write**: Authenticated users only (admin management)

### 6. Areas Collection (`/areas/{areaId}`)
- **Read**: Public access (evaluation criteria display)
- **Write**: Authenticated users only (admin can modify criteria)

### 7. Departments Collection (`/departments/{departmentId}`)
- **Read**: Public access (department listings)
- **Write**: Authenticated users only (admin management)

### 8. Positions Collection (`/positions/{positionId}`)
- **Read**: Public access (target position listings)
- **Write**: Authenticated users only (admin management)

### 9. Default Deny Rule (`/{document=**}`)
- **Read/Write**: Denied for all other collections
- **Security**: Ensures new collections are locked down by default

## Security Considerations

### ✅ Benefits
1. **Granular Control**: Each collection has appropriate access levels
2. **Public Read Access**: Allows dashboard and forms to function without authentication
3. **Protected Writes**: Only authenticated admin can modify data
4. **Default Deny**: Unknown collections are automatically secured

### 🔒 Authentication Requirements
- **Admin Login**: Required for any write operations
- **Public Dashboard**: Can display read-only information
- **Audit Trail**: All modifications are logged with authentication

### 🛡️ Best Practices Implemented
1. **Least Privilege**: Only necessary permissions granted
2. **Defense in Depth**: Multiple layers of validation (rules + app logic)
3. **Explicit Denials**: Default deny rule catches edge cases
4. **Authenticated Writes**: All data modifications require login

## Deployment Instructions

### Option 1: Windows Batch File
```cmd
cd c:\Users\Shane\Downloads\SIA\hradmin
deploy-rules.bat
```

### Option 2: Firebase CLI Manual
```cmd
firebase deploy --only firestore:rules --project sia-hr-admin
```

### Option 3: Firebase Console
1. Go to Firebase Console → Firestore Database → Rules
2. Copy the contents of `firestore.rules`
3. Click "Publish"

## Testing the Rules

### Test Public Read Access
```javascript
// This should work without authentication
const cycles = await getDocs(collection(db, 'ranking_cycles'));
```

### Test Protected Write Access
```javascript
// This should require authentication
await addDoc(collection(db, 'ranking_cycles'), newCycle);
```

### Test Default Deny
```javascript
// This should be blocked
const blocked = await getDocs(collection(db, 'unknown_collection'));
```

## Troubleshooting

### Common Issues
1. **Permission Denied Errors**: Check authentication status
2. **Rules Not Applied**: Ensure deployment was successful
3. **Unexpected Access**: Verify rule order (more specific rules first)

### Debug Commands
```bash
# Test rules locally
firebase emulators:start --only firestore

# Check current rules
firebase firestore:rules:get --project sia-hr-admin
```
