<file>
      <absolute_file_name>/app/backend/sample_data.py</absolute_file_name>
      <content>import uuid
from datetime import datetime, timedelta

def get_comprehensive_sample_data():
    # 50+ Service Providers
    sample_providers = [
        # Home Services - New York Area
        {
            "business_name": "Premier NYC Plumbing",
            "description": "24/7 emergency plumbing services in Manhattan and Brooklyn. Specializing in residential and commercial repairs, installations, and pipe replacements.",
            "services": ["Home Services"],
            "location": "Manhattan, NY",
            "latitude": 40.7589,
            "longitude": -73.9851,
            "phone": "(212) 555-0123",
            "email": "service@premierplumbing.nyc",
            "website": "https://premierplumbing.nyc",
            "google_rating": 4.9,
            "google_reviews_count": 467,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Brooklyn Home Cleaners Pro",
            "description": "Professional residential and commercial cleaning services. Deep cleaning, regular maintenance, post-construction cleanup.",
            "services": ["Home Services"],
            "location": "Brooklyn, NY",
            "latitude": 40.6782,
            "longitude": -73.9442,
            "phone": "(718) 555-0456",
            "email": "book@brooklyncleaners.com",
            "website": "https://brooklyncleaners.com",
            "google_rating": 4.7,
            "google_reviews_count": 328,
            "website_rating": 4.6,
            "verified": True
        },
        {
            "business_name": "Elite Electrical Services NYC",
            "description": "Master electricians serving all of NYC. Panel upgrades, wiring repairs, smart home installations.",
            "services": ["Home Services"],
            "location": "Queens, NY",
            "latitude": 40.7282,
            "longitude": -73.7949,
            "phone": "(718) 555-0789",
            "email": "info@eliteelectricalnyc.com",
            "website": "https://eliteelectricalnyc.com",
            "google_rating": 4.8,
            "google_reviews_count": 291,
            "website_rating": 4.7,
            "verified": True
        },
        {
            "business_name": "Bronx HVAC Masters",
            "description": "Complete heating, ventilation, and air conditioning services. Installation, repair, and maintenance.",
            "services": ["Home Services"],
            "location": "Bronx, NY",
            "latitude": 40.8448,
            "longitude": -73.8648,
            "phone": "(718) 555-1100",
            "email": "contact@bronxhvac.com",
            "website": "https://bronxhvac.com",
            "google_rating": 4.6,
            "google_reviews_count": 203,
            "website_rating": 4.5,
            "verified": True
        },
        {
            "business_name": "Manhattan Handyman Services",
            "description": "Expert handyman services for all your home repair needs. Furniture assembly, wall mounting, and general repairs.",
            "services": ["Home Services"],
            "location": "Manhattan, NY",
            "latitude": 40.7831,
            "longitude": -73.9712,
            "phone": "(212) 555-2200",
            "email": "help@manhattanhandyman.com",
            "website": "https://manhattanhandyman.com",
            "google_rating": 4.4,
            "google_reviews_count": 156,
            "website_rating": 4.3,
            "verified": True
        },
        # Construction & Renovation - Los Angeles Area
        {
            "business_name": "Golden State Construction Co.",
            "description": "Award-winning general contractors specializing in kitchen and bathroom renovations, room additions, and complete home remodels.",
            "services": ["Construction & Renovation"],
            "location": "Los Angeles, CA",
            "latitude": 34.0522,
            "longitude": -118.2437,
            "phone": "(323) 555-1234",
            "email": "projects@goldenstateconst.com",
            "website": "https://goldenstateconst.com",
            "google_rating": 4.9,
            "google_reviews_count": 203,
            "website_rating": 4.9,
            "verified": True
        },
        {
            "business_name": "Pacific Roofing Specialists",
            "description": "Complete roofing solutions for residential and commercial properties. Tile, shingle, and flat roof installations.",
            "services": ["Construction & Renovation"],
            "location": "Santa Monica, CA",
            "latitude": 34.0195,
            "longitude": -118.4912,
            "phone": "(310) 555-0567",
            "email": "estimates@pacificroofing.com",
            "website": "https://pacificroofing.com",
            "google_rating": 4.8,
            "google_reviews_count": 445,
            "website_rating": 4.7,
            "verified": True
        },
        {
            "business_name": "Artisan Flooring & Design",
            "description": "Custom flooring installation and refinishing. Hardwood, laminate, tile, and luxury vinyl.",
            "services": ["Construction & Renovation"],
            "location": "Beverly Hills, CA",
            "latitude": 34.0736,
            "longitude": -118.4004,
            "phone": "(310) 555-0890",
            "email": "design@artisanflooring.com",
            "website": "https://artisanflooring.com",
            "google_rating": 4.6,
            "google_reviews_count": 167,
            "website_rating": 4.5,
            "verified": True
        },
        {
            "business_name": "Hollywood Kitchen Remodeling",
            "description": "Luxury kitchen renovations with modern designs. Custom cabinets, granite countertops, and premium appliances.",
            "services": ["Construction & Renovation"],
            "location": "Hollywood, CA",
            "latitude": 34.0928,
            "longitude": -118.3287,
            "phone": "(323) 555-3300",
            "email": "info@hollywoodkitchens.com",
            "website": "https://hollywoodkitchens.com",
            "google_rating": 4.7,
            "google_reviews_count": 234,
            "website_rating": 4.6,
            "verified": True
        },
        {
            "business_name": "Venice Beach Contractors",
            "description": "Coastal property specialists. Beach house renovations, deck construction, and weather-resistant materials.",
            "services": ["Construction & Renovation"],
            "location": "Venice, CA",
            "latitude": 34.0118,
            "longitude": -118.4951,
            "phone": "(310) 555-4400",
            "email": "coastal@venicecontractors.com",
            "website": "https://venicecontractors.com",
            "google_rating": 4.5,
            "google_reviews_count": 178,
            "website_rating": 4.4,
            "verified": True
        },
        # Professional Services - Chicago Area
        {
            "business_name": "Chicago Business Law Group",
            "description": "Full-service business law firm serving entrepreneurs and established companies.",
            "services": ["Professional Services"],
            "location": "Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-2345",
            "email": "contact@chicagobusinesslaw.com",
            "website": "https://chicagobusinesslaw.com",
            "google_rating": 4.9,
            "google_reviews_count": 124,
            "website_rating": 4.8,
            "verified": True
        },
        {
            "business_name": "Windy City Accounting Services",
            "description": "Certified public accountants providing comprehensive tax services, bookkeeping, payroll, and business consulting.",
            "services": ["Professional Services"],
            "location": "Chicago, IL",
            "latitude": 41.8781,
            "longitude": -87.6298,
            "phone": "(312) 555-3456",
            "email": "info@windycityaccounting.com",
            "website": "https://windycityaccounting.com",
            "google_rating": 4.8,
            "google_reviews_count": 298,
            "website_rating": 4.7,
            "verified": True
        },
        # Technology & IT - San Francisco Bay Area
        {
            "business_name": "Bay Area Web Development",
            "description": "Full-stack web development and e-commerce solutions. Custom websites, mobile apps, and digital marketing services.",
            "services": ["Technology & IT"],
            "location": "San Francisco, CA",
            "latitude": 37.7749,
            "longitude": -122.4194,
            "phone": "(415) 555-4567",
            "email": "hello@bayareawebdev.com",
            "website": "https://bayareawebdev.com",
            "google_rating": 4.7,
            "google_reviews_count": 186,
            "website_rating": 4.6,
            "verified": True
        },
        {
            "business_name": "Silicon Valley IT Support",
            "description": "Comprehensive IT support and managed services. Network setup, cybersecurity, cloud migration.",
            "services": ["Technology & IT"],
            "location": "San Jose, CA",
            "latitude": 37.3382,
            "longitude": -121.8863,
            "phone": "(408) 555-5678",
            "email": "support@svitsupport.com",
            "website": "https://svitsupport.com",
            "google_rating": 4.8,
            "google_reviews_count": 234,
            "website_rating": 4.7,
            "verified": True
        },
        {
            "business_name": "Oakland App Developers",
            "description": "Mobile app development specialists. iOS, Android, and cross-platform solutions for businesses.",
            "services": ["Technology & IT"],
            "location": "Oakland, CA",
            "latitude": 37.8044,
            "longitude": -122.2711,
            "phone": "(510) 555-9900",
            "email": "apps@oaklanddevs.com",
            "website": "https://oaklanddevs.com",
            "google_rating": 4.6,
            "google_reviews_count": 145,
            "website_rating": 4.5,
            "verified": True
        }
    ]
    
    # Continue with more providers to reach 50+...
    # Adding more cities and services
    for i in range(35):  # Adding 35 more to reach 50+
        provider = {
            "business_name": f"Professional Service Provider {i+16}",
            "description": f"Expert service provider offering quality solutions in various categories. Professional, reliable, and customer-focused.",
            "services": ["Home Services", "Professional Services", "Technology & IT", "Creative & Design"][i % 4],
            "location": ["Miami, FL", "Seattle, WA", "Denver, CO", "Boston, MA", "Austin, TX", "Phoenix, AZ", "Portland, OR", "Nashville, TN"][i % 8],
            "latitude": [25.7617, 47.6062, 39.7392, 42.3601, 30.2672, 33.4484, 45.5152, 36.1627][i % 8],
            "longitude": [-80.1918, -122.3321, -104.9903, -71.0589, -97.7431, -112.0740, -122.6784, -86.7816][i % 8],
            "phone": f"({200 + i}) 555-{1000 + i:04d}",
            "email": f"contact@provider{i+16}.com",
            "website": f"https://provider{i+16}.com",
            "google_rating": round(4.2 + (i % 8) * 0.1, 1),
            "google_reviews_count": 50 + i * 10,
            "website_rating": round(4.1 + (i % 7) * 0.1, 1),
            "verified": i % 3 == 0
        }
        sample_providers.append(provider)
    
    # 30+ Service Requests
    sample_requests = [
        {
            "title": "Emergency Plumbing - Kitchen Sink Leak",
            "description": "URGENT: My kitchen sink is leaking badly and flooding the floor. Need immediate plumbing repair. Water is everywhere and I need this fixed ASAP!",
            "category": "Home Services",
            "budget_min": 150.0,
            "budget_max": 400.0,
            "deadline": datetime.utcnow() + timedelta(days=1),
            "location": "Manhattan, NY",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Website Development for New Restaurant",
            "description": "Need a professional website for my new restaurant opening next month. Must include online ordering, menu display, location info, and mobile-friendly design.",
            "category": "Technology & IT",
            "budget_min": 2000.0,
            "budget_max": 5000.0,
            "deadline": datetime.utcnow() + timedelta(days=21),
            "location": "San Francisco, CA",
            "status": "open",
            "show_best_bids": False,
            "images": []
        },
        {
            "title": "Logo Design and Branding Package",
            "description": "Startup tech company needs complete brand identity package including logo, business cards, letterhead, and brand guidelines.",
            "category": "Creative & Design",
            "budget_min": 800.0,
            "budget_max": 1500.0,
            "deadline": datetime.utcnow() + timedelta(days=14),
            "location": "Austin, TX",
            "status": "in_progress",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Kitchen Renovation - Full Remodel",
            "description": "Complete kitchen remodel including cabinets, countertops, appliances, flooring, and electrical work. Kitchen is 200 sq ft.",
            "category": "Construction & Renovation",
            "budget_min": 15000.0,
            "budget_max": 25000.0,
            "deadline": datetime.utcnow() + timedelta(days=45),
            "location": "Los Angeles, CA",
            "status": "open",
            "show_best_bids": True,
            "images": []
        },
        {
            "title": "Personal Training - Weight Loss Program",
            "description": "Looking for certified personal trainer to help with weight loss goals. Need 3 sessions per week for 3 months.",
            "category": "Health & Wellness",
            "budget_min": 1200.0,
            "budget_max": 2000.0,
            "deadline": datetime.utcnow() + timedelta(days=7),
            "location": "Denver, CO",
            "status": "completed",
            "show_best_bids": False,
            "images": []
        }
    ]
    
    # Add 25 more requests to reach 30+
    for i in range(25):
        categories = ["Home Services", "Construction & Renovation", "Professional Services", "Technology & IT", "Creative & Design", "Health & Wellness"]
        locations = ["Chicago, IL", "Miami, FL", "Seattle, WA", "Boston, MA", "Phoenix, AZ", "Portland, OR"]
        statuses = ["open", "open", "open", "in_progress", "completed"]  # More open requests
        
        request = {
            "title": f"Professional Service Request {i+6}",
            "description": f"Detailed description for service request number {i+6}. This is a professional request requiring quality service providers.",
            "category": categories[i % len(categories)],
            "budget_min": float(100 + i * 50),
            "budget_max": float(200 + i * 100),
            "deadline": datetime.utcnow() + timedelta(days=3 + i),
            "location": locations[i % len(locations)],
            "status": statuses[i % len(statuses)],
            "show_best_bids": i % 2 == 0,
            "images": []
        }
        sample_requests.append(request)
    
    # Sample Bids Data
    sample_bids = [
        # Bids for Emergency Plumbing request
        {
            "service_request_title": "Emergency Plumbing - Kitchen Sink Leak",
            "provider_name": "Premier NYC Plumbing",
            "price": 250.0,
            "proposal": "I can be there within 2 hours. Emergency plumbing is our specialty. Will diagnose the issue and provide immediate repair.",
            "start_date": datetime.utcnow() + timedelta(hours=2),
            "duration_days": 1,
            "duration_description": "Same day repair",
            "status": "pending"
        },
        {
            "service_request_title": "Emergency Plumbing - Kitchen Sink Leak", 
            "provider_name": "Manhattan Handyman Services",
            "price": 180.0,
            "proposal": "Available immediately. I have all the tools needed and can fix this quickly. 15 years of plumbing experience.",
            "start_date": datetime.utcnow() + timedelta(hours=1),
            "duration_days": 1,
            "duration_description": "1-2 hours",
            "status": "pending"
        },
        # Bids for Website Development request
        {
            "service_request_title": "Website Development for New Restaurant",
            "provider_name": "Bay Area Web Development",
            "price": 3500.0,
            "proposal": "Complete restaurant website with online ordering system, menu management, and mobile optimization. Includes hosting for 1 year.",
            "start_date": datetime.utcnow() + timedelta(days=3),
            "duration_days": 14,
            "duration_description": "2-3 weeks",
            "status": "pending"
        },
        {
            "service_request_title": "Website Development for New Restaurant",
            "provider_name": "Oakland App Developers",
            "price": 4200.0,
            "proposal": "Premium restaurant website with advanced features. Custom design, SEO optimization, analytics setup, and training included.",
            "start_date": datetime.utcnow() + timedelta(days=5),
            "duration_days": 18,
            "duration_description": "3-4 weeks",
            "status": "pending"
        },
        # Bids for Logo Design request  
        {
            "service_request_title": "Logo Design and Branding Package",
            "provider_name": "Creative Studio Miami",
            "price": 1200.0,
            "proposal": "Complete branding package with 3 logo concepts, business card design, letterhead, and brand guidelines document.",
            "start_date": datetime.utcnow() + timedelta(days=2),
            "duration_days": 10,
            "duration_description": "1.5-2 weeks",
            "status": "accepted"
        },
        # Bids for Kitchen Renovation
        {
            "service_request_title": "Kitchen Renovation - Full Remodel",
            "provider_name": "Golden State Construction Co.",
            "price": 22000.0,
            "proposal": "Complete kitchen remodel with premium materials. Includes design consultation, permits, and 2-year warranty on all work.",
            "start_date": datetime.utcnow() + timedelta(days=14),
            "duration_days": 21,
            "duration_description": "3-4 weeks",
            "status": "pending"
        },
        {
            "service_request_title": "Kitchen Renovation - Full Remodel",
            "provider_name": "Hollywood Kitchen Remodeling", 
            "price": 19500.0,
            "proposal": "Luxury kitchen renovation with custom cabinets and granite countertops. Experienced team with excellent references.",
            "start_date": datetime.utcnow() + timedelta(days=10),
            "duration_days": 25,
            "duration_description": "4-5 weeks",
            "status": "pending"
        },
        {
            "service_request_title": "Kitchen Renovation - Full Remodel",
            "provider_name": "Venice Beach Contractors",
            "price": 24000.0,
            "proposal": "High-end kitchen remodel with eco-friendly materials. Full project management and daily cleanup included.",
            "start_date": datetime.utcnow() + timedelta(days=7),
            "duration_days": 28,
            "duration_description": "4-5 weeks", 
            "status": "pending"
        }
    ]
    
    return sample_providers, sample_requests, sample_bids
</content>
    </file>