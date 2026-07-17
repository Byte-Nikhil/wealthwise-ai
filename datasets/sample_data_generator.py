import csv
import random
from datetime import datetime, timedelta

# List of predefined descriptions and categories to create realistic data
TRANSACTION_TEMPLATES = [
    # Food
    ("Whole Foods Grocery Delivery", "Food", 40.0, 150.0, "expense"),
    ("Starbucks Coffee Shop", "Food", 4.0, 15.0, "expense"),
    ("McDonald's Fast Food", "Food", 8.0, 25.0, "expense"),
    ("Subway Sandwiches Store", "Food", 7.0, 18.0, "expense"),
    ("UberEats Restaurant Delivery", "Food", 25.0, 75.0, "expense"),
    ("Dominos Pizza delivery", "Food", 15.0, 45.0, "expense"),
    ("Walmart Grocery Store", "Food", 30.0, 120.0, "expense"),
    
    # Travel
    ("Uber Ride Share", "Travel", 10.0, 45.0, "expense"),
    ("Shell Gasoline Fill-up", "Travel", 25.0, 60.0, "expense"),
    ("Delta Airlines Ticket flight", "Travel", 150.0, 500.0, "expense"),
    ("Chevron Gas Station", "Travel", 20.0, 55.0, "expense"),
    ("Hilton Hotels Reservation", "Travel", 120.0, 400.0, "expense"),
    ("Amtrak Train Transit", "Travel", 30.0, 90.0, "expense"),
    
    # Shopping
    ("Amazon Online Shopping", "Shopping", 10.0, 200.0, "expense"),
    ("Zara Clothing Apparel", "Shopping", 30.0, 150.0, "expense"),
    ("Target Retail Store", "Shopping", 15.0, 120.0, "expense"),
    ("Nike Sneakers Purchase", "Shopping", 50.0, 180.0, "expense"),
    ("H&M Summer Collection Apparels", "Shopping", 20.0, 90.0, "expense"),
    ("Best Buy Electronics Store", "Shopping", 50.0, 400.0, "expense"),
    
    # Bills
    ("Verizon Monthly Wireless Bill", "Bills", 50.0, 110.0, "expense"),
    ("Netflix Streaming Subscription", "Bills", 10.0, 23.0, "expense"),
    ("Spotify Music Premium", "Bills", 10.0, 15.0, "expense"),
    ("Comcast Xfinity Internet Bill", "Bills", 60.0, 120.0, "expense"),
    ("City Water & Sewerage Bill", "Bills", 30.0, 70.0, "expense"),
    ("Metropolitan Power Grid Electric Bill", "Bills", 70.0, 180.0, "expense"),
    ("Rent Payment Apartment", "Bills", 1000.0, 1500.0, "expense"),
    
    # Medical
    ("CVS Pharmacy prescription", "Medical", 10.0, 60.0, "expense"),
    ("Walgreens Drugstore medicine", "Medical", 15.0, 80.0, "expense"),
    ("General Hospital Doctor Consultation", "Medical", 50.0, 200.0, "expense"),
    ("Dental Care Clinic Orthodontics", "Medical", 80.0, 300.0, "expense"),
    ("Blue Shield Health Insurance Co-pay", "Medical", 20.0, 60.0, "expense"),
    
    # Entertainment
    ("AMC Movie Theatre Tickets", "Entertainment", 12.0, 40.0, "expense"),
    ("Disneyland Theme Park Ticket", "Entertainment", 100.0, 250.0, "expense"),
    ("Ticketmaster Concert Live Music", "Entertainment", 50.0, 180.0, "expense"),
    ("Bowlero Bowling Center Lanes", "Entertainment", 15.0, 50.0, "expense"),
    ("Xbox Live Game Store Purchase", "Entertainment", 10.0, 70.0, "expense"),
    
    # Education
    ("Udemy Python Programming Course", "Education", 10.0, 30.0, "expense"),
    ("Coursera Data Science Certification", "Education", 39.0, 49.0, "expense"),
    ("College Bookstore Textbooks", "Education", 40.0, 250.0, "expense"),
    ("Duolingo Language App Premium", "Education", 7.0, 14.0, "expense"),
    
    # Others
    ("Local Charity Donation", "Others", 10.0, 100.0, "expense"),
    ("State DMV Vehicle Registration", "Others", 45.0, 120.0, "expense"),
    ("Post Office Mail Shipping", "Others", 5.0, 30.0, "expense"),
]

INCOME_TEMPLATES = [
    ("Corporate Monthly Salary Paycheck", "Salary", 2500.0, 4500.0, "income"),
    ("Freelance Software Project Invoice", "Freelance", 300.0, 1200.0, "income"),
    ("Investment Dividend Payment Deposit", "Dividend", 50.0, 250.0, "income"),
]

def generate_sample_dataset(filepath: str, num_records: int = 1000):
    """
    Generates a CSV of synthetic transaction history.
    """
    # Start dates from ~18 months ago
    start_date = datetime.now() - timedelta(days=540)
    
    with open(filepath, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.writer(file)
        # Header row
        writer.writerow(["Date", "Description", "Amount", "Transaction Type", "Category"])
        
        # We want to create regular patterns
        current_date = start_date
        records = []
        
        # Monthly income payments tracker
        income_dates = [start_date + timedelta(days=30 * i) for i in range(19)]
        
        for i in range(num_records):
            # Advance dates gradually
            day_step = random.choices([0, 1, 2], weights=[0.2, 0.6, 0.2])[0]
            current_date += timedelta(days=day_step)
            
            # Ensure we don't go past today
            if current_date > datetime.now():
                current_date = datetime.now()
            
            # Determine if this is income or expense
            # Salary happens regularly, freelance and dividends occasionally
            is_income = False
            
            # Check if it's salary day (approx. every 30 days)
            if i % 50 == 0:
                is_income = True
                desc, category, min_val, max_val, t_type = INCOME_TEMPLATES[0]  # Salary
                amount = round(random.uniform(min_val, max_val), 2)
            elif random.random() < 0.05:  # 5% chance of freelance / dividends
                is_income = True
                desc, category, min_val, max_val, t_type = random.choice(INCOME_TEMPLATES[1:])
                amount = round(random.uniform(min_val, max_val), 2)
            else:
                desc, category, min_val, max_val, t_type = random.choice(TRANSACTION_TEMPLATES)
                # Generate random amount in range
                amount = round(random.uniform(min_val, max_val), 2)
                
                # Monthly Rent is fixed per "user" - let's make it fixed based on template
                if "Rent Payment" in desc:
                    amount = 1200.00
                
                # Introduce a few anomalies (0.5% chance)
                if random.random() < 0.005:
                    amount = round(amount * random.uniform(5.0, 12.0), 2)
                    desc = f"UNUSUAL {desc} (Anomaly)"
            
            records.append([
                current_date.strftime("%Y-%m-%d"),
                desc,
                amount,
                t_type,
                category
            ])
            
        # Sort by date
        records.sort(key=lambda x: x[0])
        writer.writerows(records)

    print(f"Generated {num_records} records in {filepath}")

if __name__ == "__main__":
    generate_sample_dataset("datasets/sample_transactions.csv")
