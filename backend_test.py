import requests
import sys
import json
from datetime import datetime, timedelta

class ServiceConnectAPITester:
    def __init__(self, base_url="https://taskbidder.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.customer_token = None
        self.provider_token = None
        self.dual_role_token = None
        self.customer_user = None
        self.provider_user = None
        self.dual_role_user = None
        self.tests_run = 0
        self.tests_passed = 0
        self.service_request_id = None
        self.bid_id = None
        self.uploaded_image = None

    def run_test(self, name, method, endpoint, expected_status, data=None, token=None, params=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        if token:
            headers['Authorization'] = f'Bearer {token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, params=params)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2, default=str)[:200]}...")
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root Endpoint", "GET", "", 200)

    def test_categories(self):
        """Test service categories endpoint"""
        return self.run_test("Service Categories", "GET", "categories", 200)

    def test_customer_registration(self):
        """Test customer registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        customer_data = {
            "email": f"customer_{timestamp}@test.com",
            "phone": f"555-{timestamp}",
            "password": "TestPass123!",
            "role": "customer",
            "first_name": "Test",
            "last_name": "Customer"
        }
        
        success, response = self.run_test(
            "Customer Registration",
            "POST",
            "auth/register",
            200,
            data=customer_data
        )
        
        if success and 'access_token' in response:
            self.customer_token = response['access_token']
            self.customer_user = response['user']
            print(f"   Customer ID: {self.customer_user['id']}")
            return True
        return False

    def test_provider_registration(self):
        """Test provider registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        provider_data = {
            "email": f"provider_{timestamp}@test.com",
            "phone": f"555-{timestamp}",
            "password": "TestPass123!",
            "role": "provider",
            "first_name": "Test",
            "last_name": "Provider"
        }
        
        success, response = self.run_test(
            "Provider Registration",
            "POST",
            "auth/register",
            200,
            data=provider_data
        )
        
        if success and 'access_token' in response:
            self.provider_token = response['access_token']
            self.provider_user = response['user']
            print(f"   Provider ID: {self.provider_user['id']}")
            return True
        return False

    def test_customer_login(self):
        """Test customer login with existing credentials"""
        if not self.customer_user:
            print("❌ No customer user to test login")
            return False
            
        login_data = {
            "email": self.customer_user['email'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "Customer Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        return success

    def test_auth_me_customer(self):
        """Test getting current user info for customer"""
        return self.run_test(
            "Get Current User (Customer)",
            "GET",
            "auth/me",
            200,
            token=self.customer_token
        )

    def test_auth_me_provider(self):
        """Test getting current user info for provider"""
        return self.run_test(
            "Get Current User (Provider)",
            "GET",
            "auth/me",
            200,
            token=self.provider_token
        )

    def test_create_service_request(self):
        """Test creating a service request as customer"""
        request_data = {
            "title": "Need Home Cleaning Service",
            "description": "Looking for professional home cleaning service for a 3-bedroom house",
            "category": "Home Services",
            "budget_min": 100.0,
            "budget_max": 200.0,
            "deadline": (datetime.now() + timedelta(days=7)).isoformat(),
            "location": "New York, NY",
            "show_best_bids": True
        }
        
        success, response = self.run_test(
            "Create Service Request",
            "POST",
            "service-requests",
            200,
            data=request_data,
            token=self.customer_token
        )
        
        if success and 'id' in response:
            self.service_request_id = response['id']
            print(f"   Service Request ID: {self.service_request_id}")
            return True
        return False

    def test_get_service_requests(self):
        """Test getting all service requests"""
        return self.run_test(
            "Get All Service Requests",
            "GET",
            "service-requests",
            200
        )

    def test_get_service_requests_by_category(self):
        """Test getting service requests by category"""
        return self.run_test(
            "Get Service Requests by Category",
            "GET",
            "service-requests",
            200,
            params={"category": "Home Services"}
        )

    def test_get_service_request_detail(self):
        """Test getting specific service request"""
        if not self.service_request_id:
            print("❌ No service request ID to test")
            return False
            
        return self.run_test(
            "Get Service Request Detail",
            "GET",
            f"service-requests/{self.service_request_id}",
            200
        )

    def test_get_my_requests(self):
        """Test getting customer's own requests"""
        return self.run_test(
            "Get My Requests",
            "GET",
            "my-requests",
            200,
            token=self.customer_token
        )

    def test_create_provider_profile(self):
        """Test creating provider profile"""
        profile_data = {
            "business_name": "Test Cleaning Services",
            "description": "Professional cleaning services with 5+ years experience",
            "services_offered": ["Home Services", "Construction & Renovation"],
            "website_url": "https://testcleaning.com"
        }
        
        return self.run_test(
            "Create Provider Profile",
            "POST",
            "provider-profile",
            200,
            data=profile_data,
            token=self.provider_token
        )

    def test_get_provider_profile(self):
        """Test getting provider profile"""
        return self.run_test(
            "Get Provider Profile",
            "GET",
            "provider-profile",
            200,
            token=self.provider_token
        )

    def test_update_provider_profile(self):
        """Test updating provider profile"""
        profile_data = {
            "business_name": "Updated Test Cleaning Services",
            "description": "Updated professional cleaning services with 5+ years experience",
            "services_offered": ["Home Services", "Construction & Renovation", "Professional Services"],
            "website_url": "https://updatedtestcleaning.com"
        }
        
        return self.run_test(
            "Update Provider Profile",
            "PUT",
            "provider-profile",
            200,
            data=profile_data,
            token=self.provider_token
        )

    def test_create_bid(self):
        """Test creating a bid as provider"""
        if not self.service_request_id:
            print("❌ No service request ID to bid on")
            return False
            
        bid_data = {
            "service_request_id": self.service_request_id,
            "price": 150.0,
            "proposal": "I can provide excellent cleaning service for your 3-bedroom house. I have 5+ years of experience and use eco-friendly products."
        }
        
        success, response = self.run_test(
            "Create Bid",
            "POST",
            "bids",
            200,
            data=bid_data,
            token=self.provider_token
        )
        
        if success and 'id' in response:
            self.bid_id = response['id']
            print(f"   Bid ID: {self.bid_id}")
            return True
        return False

    def test_get_bids_for_request_as_owner(self):
        """Test getting bids for request as request owner"""
        if not self.service_request_id:
            print("❌ No service request ID to get bids for")
            return False
            
        return self.run_test(
            "Get Bids for Request (as owner)",
            "GET",
            f"service-requests/{self.service_request_id}/bids",
            200,
            token=self.customer_token
        )

    def test_get_bids_for_request_as_bidder(self):
        """Test getting bids for request as bidder"""
        if not self.service_request_id:
            print("❌ No service request ID to get bids for")
            return False
            
        return self.run_test(
            "Get Bids for Request (as bidder)",
            "GET",
            f"service-requests/{self.service_request_id}/bids",
            200,
            token=self.provider_token
        )

    def test_get_my_bids(self):
        """Test getting provider's own bids"""
        return self.run_test(
            "Get My Bids",
            "GET",
            "my-bids",
            200,
            token=self.provider_token
        )

    def test_create_bid_message_from_provider(self):
        """Test creating bid message from provider"""
        if not self.bid_id:
            print("❌ No bid ID to message on")
            return False
            
        message_data = {
            "bid_id": self.bid_id,
            "message": "Hello! I'm available to start this weekend. Would that work for you?"
        }
        
        return self.run_test(
            "Create Bid Message (Provider)",
            "POST",
            "bid-messages",
            200,
            data=message_data,
            token=self.provider_token
        )

    def test_create_bid_message_from_customer(self):
        """Test creating bid message from customer"""
        if not self.bid_id:
            print("❌ No bid ID to message on")
            return False
            
        message_data = {
            "bid_id": self.bid_id,
            "message": "That sounds great! Can you provide references from previous clients?"
        }
        
        return self.run_test(
            "Create Bid Message (Customer)",
            "POST",
            "bid-messages",
            200,
            data=message_data,
            token=self.customer_token
        )

    def test_get_bid_messages_as_provider(self):
        """Test getting bid messages as provider"""
        if not self.bid_id:
            print("❌ No bid ID to get messages for")
            return False
            
        return self.run_test(
            "Get Bid Messages (Provider)",
            "GET",
            f"bid-messages/{self.bid_id}",
            200,
            token=self.provider_token
        )

    def test_get_bid_messages_as_customer(self):
        """Test getting bid messages as customer"""
        if not self.bid_id:
            print("❌ No bid ID to get messages for")
            return False
            
        return self.run_test(
            "Get Bid Messages (Customer)",
            "GET",
            f"bid-messages/{self.bid_id}",
            200,
            token=self.customer_token
        )

    def test_dual_role_registration(self):
        """Test registering a user who will have dual roles"""
        timestamp = datetime.now().strftime('%H%M%S')
        dual_role_data = {
            "email": f"dualrole_{timestamp}@test.com",
            "phone": f"555-{timestamp}",
            "password": "TestPass123!",
            "role": "customer",  # Start as customer
            "first_name": "Dual",
            "last_name": "Role"
        }
        
        success, response = self.run_test(
            "Dual Role User Registration",
            "POST",
            "auth/register",
            200,
            data=dual_role_data
        )
        
        if success and 'access_token' in response:
            self.dual_role_token = response['access_token']
            self.dual_role_user = response['user']
            print(f"   Dual Role User ID: {self.dual_role_user['id']}")
            print(f"   Initial Roles: {self.dual_role_user.get('roles', [])}")
            return True
        return False

    def test_add_provider_role(self):
        """Test adding provider role to existing customer"""
        if not self.dual_role_token:
            print("❌ No dual role user to test with")
            return False
            
        role_data = {"role": "provider"}
        
        success, response = self.run_test(
            "Add Provider Role to Customer",
            "POST",
            "user/add-role",
            200,
            data=role_data,
            token=self.dual_role_token
        )
        
        if success:
            print(f"   Updated Roles: {response.get('roles', [])}")
            # Update our stored user data
            self.dual_role_user = response
            return True
        return False

    def test_add_customer_role_to_provider(self):
        """Test adding customer role to existing provider"""
        if not self.provider_token:
            print("❌ No provider user to test with")
            return False
            
        role_data = {"role": "customer"}
        
        success, response = self.run_test(
            "Add Customer Role to Provider",
            "POST",
            "user/add-role",
            200,
            data=role_data,
            token=self.provider_token
        )
        
        if success:
            print(f"   Updated Roles: {response.get('roles', [])}")
            return True
        return False

    def test_get_user_roles(self):
        """Test getting current user's roles"""
        if not self.dual_role_token:
            print("❌ No dual role user to test with")
            return False
            
        return self.run_test(
            "Get User Roles",
            "GET",
            "user/roles",
            200,
            token=self.dual_role_token
        )

    def test_dual_role_functionality(self):
        """Test that dual role user can perform both customer and provider actions"""
        if not self.dual_role_token or not self.dual_role_user:
            print("❌ No dual role user to test with")
            return False
            
        # Test creating service request as customer
        request_data = {
            "title": "Dual Role Test Service Request",
            "description": "Testing dual role functionality",
            "category": "Professional Services",
            "budget_min": 50.0,
            "budget_max": 100.0,
            "location": "Test City"
        }
        
        success, response = self.run_test(
            "Dual Role User - Create Service Request",
            "POST",
            "service-requests",
            200,
            data=request_data,
            token=self.dual_role_token
        )
        
        dual_role_request_id = None
        if success and 'id' in response:
            dual_role_request_id = response['id']
            print(f"   Dual Role Service Request ID: {dual_role_request_id}")
        
        # Test creating provider profile
        profile_data = {
            "business_name": "Dual Role Services",
            "description": "Testing dual role provider functionality",
            "services_offered": ["Professional Services"],
            "website_url": "https://dualrole.com"
        }
        
        success2, response2 = self.run_test(
            "Dual Role User - Create Provider Profile",
            "POST",
            "provider-profile",
            200,
            data=profile_data,
            token=self.dual_role_token
        )
        
        return success and success2

    def test_image_upload(self):
        """Test image upload functionality"""
        # Create a simple test image (1x1 pixel PNG)
        import base64
        
        # Minimal PNG data (1x1 transparent pixel)
        png_data = base64.b64decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg=='
        )
        
        # Prepare multipart form data
        import requests
        
        url = f"{self.base_url}/upload-image"
        headers = {}
        if self.customer_token:
            headers['Authorization'] = f'Bearer {self.customer_token}'
        
        files = {'file': ('test.png', png_data, 'image/png')}
        
        self.tests_run += 1
        print(f"\n🔍 Testing Image Upload...")
        print(f"   URL: {url}")
        
        try:
            response = requests.post(url, files=files, headers=headers)
            
            success = response.status_code == 200
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
                    if 'image' in response_data:
                        self.uploaded_image = response_data['image']
                        print(f"   Image uploaded successfully")
                    return True
                except:
                    return True
            else:
                print(f"❌ Failed - Expected 200, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Error: {response.text}")
                return False
                
        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False

    def test_service_request_with_images(self):
        """Test creating service request with images"""
        if not self.uploaded_image:
            print("❌ No uploaded image to test with")
            return False
            
        request_data = {
            "title": "Service Request with Images",
            "description": "Testing service request creation with image uploads",
            "category": "Home Services",
            "budget_min": 75.0,
            "budget_max": 150.0,
            "location": "Image Test City",
            "images": [self.uploaded_image],  # Include the uploaded image
            "show_best_bids": True
        }
        
        success, response = self.run_test(
            "Create Service Request with Images",
            "POST",
            "service-requests",
            200,
            data=request_data,
            token=self.customer_token
        )
        
        if success and 'id' in response:
            print(f"   Service Request with Images ID: {response['id']}")
            print(f"   Images included: {len(response.get('images', []))}")
            return True
        return False

    def test_ai_recommendations_basic(self):
        """Test AI recommendations endpoint with basic request"""
        recommendation_data = {
            "service_category": "Home Services",
            "description": "I need professional house cleaning for a 3-bedroom home in Manhattan. Looking for reliable service with good reviews.",
            "location": "New York, NY"
        }
        
        success, response = self.run_test(
            "AI Recommendations - Basic Request",
            "POST",
            "ai-recommendations",
            200,
            data=recommendation_data
        )
        
        if success:
            # Verify response structure
            if 'ai_insights' in response:
                print(f"   ✅ AI insights provided")
                ai_insights = response['ai_insights']
                expected_keys = ['qualifications', 'questions', 'red_flags', 'price_range', 'timeline']
                for key in expected_keys:
                    if key in ai_insights:
                        print(f"   ✅ {key}: {ai_insights[key]}")
                    else:
                        print(f"   ⚠️  Missing {key} in AI insights")
            
            if 'recommended_providers' in response:
                providers = response['recommended_providers']
                print(f"   ✅ Found {len(providers)} recommended providers")
                for i, provider in enumerate(providers[:3]):  # Show first 3
                    print(f"   Provider {i+1}: {provider.get('business_name', 'Unknown')} - Rating: {provider.get('google_rating', 'N/A')}")
            
            if 'total_providers_found' in response:
                print(f"   ✅ Total providers found: {response['total_providers_found']}")
                
        return success

    def test_ai_recommendations_without_location(self):
        """Test AI recommendations endpoint without location"""
        recommendation_data = {
            "service_category": "Technology & IT",
            "description": "Need help setting up a new website for my small business. Looking for web development services."
        }
        
        success, response = self.run_test(
            "AI Recommendations - No Location",
            "POST",
            "ai-recommendations",
            200,
            data=recommendation_data
        )
        
        if success:
            # Should still get AI insights even without location
            if 'ai_insights' in response:
                print(f"   ✅ AI insights provided without location")
            
            # Should have empty or minimal provider recommendations
            providers = response.get('recommended_providers', [])
            print(f"   ✅ Providers without location: {len(providers)}")
                
        return success

    def test_ai_recommendations_different_categories(self):
        """Test AI recommendations for different service categories"""
        test_cases = [
            {
                "service_category": "Construction & Renovation",
                "description": "Need to renovate my kitchen with new cabinets and countertops",
                "location": "Los Angeles, CA"
            },
            {
                "service_category": "Professional Services",
                "description": "Looking for legal advice for starting a new business",
                "location": "Chicago, IL"
            },
            {
                "service_category": "Creative & Design",
                "description": "Need logo design and branding for my startup company",
                "location": "San Francisco, CA"
            }
        ]
        
        all_success = True
        for i, test_case in enumerate(test_cases):
            success, response = self.run_test(
                f"AI Recommendations - {test_case['service_category']}",
                "POST",
                "ai-recommendations",
                200,
                data=test_case
            )
            
            if success:
                ai_insights = response.get('ai_insights', {})
                providers = response.get('recommended_providers', [])
                print(f"   Category: {test_case['service_category']} - Providers: {len(providers)}")
                
                # Check if AI insights are relevant to the category
                if 'qualifications' in ai_insights:
                    print(f"   ✅ Qualifications provided for {test_case['service_category']}")
            else:
                all_success = False
                
        return all_success

    def test_ai_recommendations_with_coordinates(self):
        """Test AI recommendations with latitude/longitude coordinates"""
        recommendation_data = {
            "service_category": "Home Services",
            "description": "Need plumbing repair for a leaky faucet in my apartment",
            "location": "New York, NY",
            "latitude": 40.7128,
            "longitude": -74.0060
        }
        
        success, response = self.run_test(
            "AI Recommendations - With Coordinates",
            "POST",
            "ai-recommendations",
            200,
            data=recommendation_data
        )
        
        if success:
            providers = response.get('recommended_providers', [])
            print(f"   ✅ Providers with coordinates: {len(providers)}")
            
            # Check if providers have location data
            for provider in providers[:2]:  # Check first 2
                if 'latitude' in provider and 'longitude' in provider:
                    print(f"   ✅ Provider has coordinates: {provider.get('business_name')}")
                    
        return success

    def test_service_providers_endpoint(self):
        """Test the service providers endpoint"""
        success, response = self.run_test(
            "Get All Service Providers",
            "GET",
            "service-providers",
            200
        )
        
        if success:
            providers = response if isinstance(response, list) else []
            print(f"   ✅ Total service providers available: {len(providers)}")
            
            # Check provider data structure
            if providers:
                first_provider = providers[0]
                required_fields = ['business_name', 'services', 'location', 'google_rating']
                for field in required_fields:
                    if field in first_provider:
                        print(f"   ✅ Provider has {field}: {first_provider[field]}")
                    else:
                        print(f"   ⚠️  Provider missing {field}")
                        
        return success

    def test_service_providers_with_filters(self):
        """Test service providers endpoint with various filters"""
        test_cases = [
            {"category": "Home Services", "name": "Home Services Filter"},
            {"location": "New York", "name": "Location Filter"},
            {"verified_only": True, "name": "Verified Only Filter"},
            {"min_rating": 4.5, "name": "High Rating Filter"},
            {"category": "Technology & IT", "location": "San Francisco", "name": "Category + Location Filter"}
        ]
        
        all_success = True
        for test_case in test_cases:
            params = {k: v for k, v in test_case.items() if k != 'name'}
            success, response = self.run_test(
                f"Service Providers - {test_case['name']}",
                "GET",
                "service-providers",
                200,
                params=params
            )
            
            if success:
                providers = response if isinstance(response, list) else []
                print(f"   ✅ {test_case['name']}: {len(providers)} providers")
            else:
                all_success = False
                
        return all_success

    def test_ai_recommendations_error_cases(self):
        """Test AI recommendations error handling"""
        print("\n🔍 Testing AI Recommendations Error Cases...")
        
        # Test with missing required fields
        self.run_test(
            "AI Recommendations - Missing Category",
            "POST",
            "ai-recommendations",
            422,  # Validation error
            data={"description": "Test description"}
        )
        
        self.run_test(
            "AI Recommendations - Missing Description",
            "POST",
            "ai-recommendations",
            422,  # Validation error
            data={"service_category": "Home Services"}
        )
        
        # Test with empty data
        self.run_test(
            "AI Recommendations - Empty Request",
            "POST",
            "ai-recommendations",
            422,  # Validation error
            data={}
        )

    def test_error_cases(self):
        """Test various error cases"""
        print("\n🔍 Testing Error Cases...")
        
        # Test unauthorized access
        self.run_test(
            "Unauthorized Access to My Requests",
            "GET",
            "my-requests",
            401
        )
        
        # Test customer trying to create bid
        if self.service_request_id:
            bid_data = {
                "service_request_id": self.service_request_id,
                "price": 100.0,
                "proposal": "Test proposal"
            }
            self.run_test(
                "Customer Trying to Create Bid",
                "POST",
                "bids",
                403,
                data=bid_data,
                token=self.customer_token
            )
        
        # Test provider trying to create service request
        request_data = {
            "title": "Test Request",
            "description": "Test description",
            "category": "Home Services"
        }
        self.run_test(
            "Provider Trying to Create Service Request",
            "POST",
            "service-requests",
            403,
            data=request_data,
            token=self.provider_token
        )

def main():
    print("🚀 Starting ServiceConnect API Tests...")
    print("=" * 60)
    
    tester = ServiceConnectAPITester()
    
    # Basic endpoint tests (PUBLIC ACCESS)
    print("\n📋 Testing Public Endpoints...")
    tester.test_root_endpoint()
    tester.test_categories()
    
    # Test public access to service requests
    tester.test_get_service_requests()
    tester.test_get_service_requests_by_category()
    
    # Authentication tests
    print("\n🔐 Testing Authentication...")
    if not tester.test_customer_registration():
        print("❌ Customer registration failed, stopping tests")
        return 1
    
    if not tester.test_provider_registration():
        print("❌ Provider registration failed, stopping tests")
        return 1
    
    tester.test_customer_login()
    tester.test_auth_me_customer()
    tester.test_auth_me_provider()
    
    # NEW: Dual Role System Tests
    print("\n👥 Testing Dual Role System...")
    if not tester.test_dual_role_registration():
        print("❌ Dual role registration failed")
        return 1
    
    tester.test_add_provider_role()
    tester.test_add_customer_role_to_provider()
    tester.test_get_user_roles()
    tester.test_dual_role_functionality()
    
    # NEW: Image Upload Tests
    print("\n🖼️  Testing Image Upload...")
    tester.test_image_upload()
    
    # Service request tests
    print("\n📝 Testing Service Requests...")
    if not tester.test_create_service_request():
        print("❌ Service request creation failed, stopping related tests")
        return 1
    
    # NEW: Service request with images
    tester.test_service_request_with_images()
    
    tester.test_get_service_request_detail()
    tester.test_get_my_requests()
    
    # Provider profile tests
    print("\n👔 Testing Provider Profiles...")
    tester.test_create_provider_profile()
    tester.test_get_provider_profile()
    tester.test_update_provider_profile()
    
    # Bidding tests
    print("\n💰 Testing Bidding System...")
    if not tester.test_create_bid():
        print("❌ Bid creation failed, stopping bid-related tests")
        return 1
    
    tester.test_get_bids_for_request_as_owner()
    tester.test_get_bids_for_request_as_bidder()
    tester.test_get_my_bids()
    
    # Bid messaging tests
    print("\n💬 Testing Bid Messaging...")
    tester.test_create_bid_message_from_provider()
    tester.test_create_bid_message_from_customer()
    tester.test_get_bid_messages_as_provider()
    tester.test_get_bid_messages_as_customer()
    
    # Error case tests
    print("\n⚠️  Testing Error Cases...")
    tester.test_error_cases()
    
    # Print final results
    print("\n" + "=" * 60)
    print(f"📊 FINAL RESULTS:")
    print(f"   Tests Run: {tester.tests_run}")
    print(f"   Tests Passed: {tester.tests_passed}")
    print(f"   Tests Failed: {tester.tests_run - tester.tests_passed}")
    print(f"   Success Rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed. Check the output above for details.")
        return 1

if __name__ == "__main__":
    sys.exit(main())