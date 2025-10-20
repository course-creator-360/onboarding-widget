#!/bin/bash

# GHL API Sample Requests
# Copy and paste these commands to test the GHL API directly

# Your Access Token
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdXRoQ2xhc3MiOiJDb21wYW55IiwiYXV0aENsYXNzSWQiOiJDMTFRUkJ1YzZpSnl3VjJ6WlVFdCIsInNvdXJjZSI6IklOVEVHUkFUSU9OIiwic291cmNlSWQiOiI2OGVlNzcwYWI4MmFjZWI2N2JmYWFlNjAtbWdzOGk1ZzIiLCJjaGFubmVsIjoiT0FVVEgiLCJwcmltYXJ5QXV0aENsYXNzSWQiOiJDMTFRUkJ1YzZpSnl3VjJ6WlVFdCIsIm9hdXRoTWV0YSI6eyJzY29wZXMiOlsibG9jYXRpb25zLnJlYWRvbmx5IiwiY291cnNlcy5yZWFkb25seSIsImZ1bm5lbHMvZnVubmVsLnJlYWRvbmx5IiwiZnVubmVscy9wYWdlLnJlYWRvbmx5IiwicHJvZHVjdHMucmVhZG9ubHkiLCJwcm9kdWN0cy9wcmljZXMucmVhZG9ubHkiLCJwYXltZW50cy9vcmRlcnMucmVhZG9ubHkiLCJwYXltZW50cy90cmFuc2FjdGlvbnMucmVhZG9ubHkiLCJwYXltZW50cy9jdXN0b20tcHJvdmlkZXIucmVhZG9ubHkiLCJvYXV0aC53cml0ZSIsIm9hdXRoLnJlYWRvbmx5Il0sImNsaWVudCI6IjY4ZWU3NzBhYjgyYWNlYjY3YmZhYWU2MCIsInZlcnNpb25JZCI6IjY4ZWU3NzBhYjgyYWNlYjY3YmZhYWU2MCIsImNsaWVudEtleSI6IjY4ZWU3NzBhYjgyYWNlYjY3YmZhYWU2MC1tZ3M4aTVnMiIsImFnZW5jeVBsYW4iOiJhZ2VuY3lfbW9udGhseV80OTcifSwiaWF0IjoxNzYwOTM5Mjc5Ljg5MywiZXhwIjoxNzYxMDI1Njc5Ljg5M30.lk7tcQSJxrTFuCjMQO4eeDrBRVv1awNvbBzHwoySYcYQd_a6GhVM7qp6CH1VUpEc-e-nrBo3_Oi4_yrXtd8FfmxX6jpkk2ycclUsnIVLcBmHeVxvEX0KXv4LCMgPN49f4sfAjSB4Mf1Wu06-XzKaOKzSQrAV6F_LYWA-hDDae0pjV5bRZ6C3uriVTdr-HlubskG2Pd-KKThkXGuqUSjp0RF168n24qGCqv_1AJarH-2dtnoTXhI4JGhXAd5WBhQC6MrJptEWZrWtjRRyHlfOxwFdp-mr3eKF5OVUWNy5RAo9-BR311i3RpR6jfc6GWMqGdFaTg0uwIDVCN15uZ5VptY0yQjx0xf5eeP7A_8cKR07K4ktLLFOOY4oxnDvABubX1SrAnpRjq-TZKhRdgdhuP5t-ioBa88gTcS7VyObwLycccsdNQcnehkN8NmN8jI4QzaziDKMSk92NQZasRCCJxqUSvnPw1WHYekfvIiynI25tkVI9TelRHum3cVbaUbMKLN2056eWg1hgSE_bsuZ58AXVkJRuuUQyGjK06d5uEsIMdJNxzem6dIyjibTJ6sbUuspzErs_GAuoYgTF6YO36vLQ1iOiW-2H_IKh-pQw9IWJHe-XBD9qurh_ByqvWIJPr8J6tdhY3CzZLkdupgh1GN0hBK-AtsJyqSHJmjbAAU"

# Your Location ID
LOCATION_ID="L851uHvru1ipOe8DIwNS"

# GHL API Base URL
API_BASE="https://services.leadconnectorhq.com"

echo "🔑 GHL API Sample Requests"
echo "============================"
echo ""
echo "Token expires: $(sqlite3 data/app.db "SELECT datetime(expires_at/1000, 'unixepoch') FROM installations WHERE token_type = 'agency';")"
echo ""

# ==========================================
# 1. Get Location Details
# ==========================================
echo "📍 1. Get Location Details"
echo "-------------------------"
echo "curl -X GET \"$API_BASE/locations/$LOCATION_ID\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Version: 2021-07-28\" | jq"
echo ""
curl -X GET "$API_BASE/locations/$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Version: 2021-07-28" | jq '.location | {id, name, customDomain, domain}'
echo ""
echo ""

# ==========================================
# 2. Get Products (Courses)
# ==========================================
echo "📦 2. Get Products/Courses"
echo "-------------------------"
echo "curl -X GET \"$API_BASE/products/?locationId=$LOCATION_ID\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Version: 2021-07-28\" | jq"
echo ""
curl -X GET "$API_BASE/products/?locationId=$LOCATION_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Version: 2021-07-28" | jq '{total, products: .products | length, items: .products | map({id, name, price: .prices[0]?.amount})}'
echo ""
echo ""

# ==========================================
# 3. Get Orders
# ==========================================
echo "🛒 3. Get Orders"
echo "---------------"
echo "curl -X GET \"$API_BASE/payments/orders?locationId=$LOCATION_ID&limit=5\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Version: 2021-07-28\" | jq"
echo ""
curl -X GET "$API_BASE/payments/orders?locationId=$LOCATION_ID&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Version: 2021-07-28" | jq 2>/dev/null || echo "No orders endpoint or no data"
echo ""
echo ""

# ==========================================
# 4. Get Courses
# ==========================================
echo "🎓 4. Get Courses"
echo "----------------"
echo "curl -X GET \"$API_BASE/courses/?locationId=$LOCATION_ID&limit=5\" \\"
echo "  -H \"Authorization: Bearer \$TOKEN\" \\"
echo "  -H \"Version: 2021-07-28\" | jq"
echo ""
curl -X GET "$API_BASE/courses/?locationId=$LOCATION_ID&limit=5" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Version: 2021-07-28" | jq 2>/dev/null || echo "No courses endpoint or no data"
echo ""
echo ""

# ==========================================
# Summary
# ==========================================
echo "📊 Summary"
echo "=========="
echo ""
echo "Your access token info:"
echo "  • Type: Agency-level (works for all locations)"
echo "  • Scopes: locations.readonly, products.readonly, courses.readonly, etc."
echo "  • Expires: $(sqlite3 data/app.db "SELECT datetime(expires_at/1000, 'unixepoch') FROM installations WHERE token_type = 'agency';")"
echo ""
echo "Available endpoints you can test:"
echo "  ✓ GET /locations/{locationId}                    - Location details & domain"
echo "  ✓ GET /products/?locationId={id}                 - Products/Courses"
echo "  ✓ GET /courses/?locationId={id}                  - Courses"
echo "  ✓ GET /payments/orders?locationId={id}           - Orders"
echo "  ✓ GET /payments/transactions?locationId={id}     - Transactions"
echo ""
echo "Need to test other endpoints? Copy the curl pattern above!"
echo ""



