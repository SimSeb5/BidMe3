#!/bin/bash

# Fix API URL construction in all frontend components
components=(
    "PublicHome.js"
    "Dashboard.js" 
    "ProviderProfile.js"
    "ServiceRequestDetail.js"
    "MyRequests.js"
    "ServiceRequestForm.js"
    "ServiceRequestList.js"
    "MyBids.js"
)

for component in "${components[@]}"; do
    file="/app/frontend/src/components/$component"
    if [ -f "$file" ]; then
        sed -i 's|const API = `${BACKEND_URL}/api`;|const API = `${BACKEND_URL}`;|g' "$file"
        echo "Fixed $file"
    fi
done

echo "All API URLs fixed!"