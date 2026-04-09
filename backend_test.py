import requests
import sys
import json
from datetime import datetime

class FlatLedgerAPITester:
    def __init__(self, base_url="https://flat-costs.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.current_user = None

    def run_test(self, name, method, endpoint, expected_status, data=None, cookies=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    print(f"   Response: {json.dumps(response_data, indent=2)[:200]}...")
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

    def test_login(self, email, password):
        """Test login and store session"""
        success, response = self.run_test(
            f"Login ({email})",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success:
            self.current_user = response
            print(f"   Logged in as: {response.get('name', 'Unknown')}")
            return True
        return False

    def test_logout(self):
        """Test logout"""
        success, _ = self.run_test(
            "Logout",
            "POST",
            "auth/logout",
            200
        )
        if success:
            self.current_user = None
        return success

    def test_get_me(self):
        """Test get current user"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success, response

    def test_get_users(self):
        """Test get all users"""
        success, response = self.run_test(
            "Get All Users",
            "GET",
            "users",
            200
        )
        return success, response

    def test_toggle_user_active(self, user_id):
        """Test toggle user active status"""
        success, response = self.run_test(
            f"Toggle User Active ({user_id})",
            "PATCH",
            f"users/{user_id}/toggle-active",
            200
        )
        return success, response

    def test_create_expense(self, title, amount, category, participants):
        """Test create expense"""
        success, response = self.run_test(
            f"Create Expense ({title})",
            "POST",
            "expenses",
            200,
            data={
                "title": title,
                "amount": amount,
                "category": category,
                "participants": participants
            }
        )
        return success, response

    def test_get_expenses(self, month_year=None):
        """Test get expenses"""
        endpoint = "expenses"
        if month_year:
            endpoint += f"?month_year={month_year}"
        
        success, response = self.run_test(
            "Get Expenses",
            "GET",
            endpoint,
            200
        )
        return success, response

    def test_get_expense(self, expense_id):
        """Test get single expense"""
        success, response = self.run_test(
            f"Get Expense ({expense_id})",
            "GET",
            f"expenses/{expense_id}",
            200
        )
        return success, response

    def test_update_expense(self, expense_id, title=None, amount=None, category=None, participants=None):
        """Test update expense"""
        data = {}
        if title: data["title"] = title
        if amount: data["amount"] = amount
        if category: data["category"] = category
        if participants: data["participants"] = participants
        
        success, response = self.run_test(
            f"Update Expense ({expense_id})",
            "PUT",
            f"expenses/{expense_id}",
            200,
            data=data
        )
        return success, response

    def test_delete_expense(self, expense_id):
        """Test delete expense"""
        success, response = self.run_test(
            f"Delete Expense ({expense_id})",
            "DELETE",
            f"expenses/{expense_id}",
            200
        )
        return success, response

    def test_get_expenses_summary(self, month_year=None):
        """Test get expenses summary"""
        endpoint = "expenses/summary/current"
        if month_year:
            endpoint += f"?month_year={month_year}"
        
        success, response = self.run_test(
            "Get Expenses Summary",
            "GET",
            endpoint,
            200
        )
        return success, response

def main():
    print("🚀 Starting Flat Ledger API Tests")
    print("=" * 50)
    
    tester = FlatLedgerAPITester()
    
    # Test credentials from test_credentials.md
    test_users = [
        {"email": "akash@flatledger.com", "password": "akash123", "name": "Akash Pradhan"},
        {"email": "devansh@flatledger.com", "password": "devansh123", "name": "Devansh Pradhan"}
    ]
    
    # Test 1: Login with first user
    if not tester.test_login(test_users[0]["email"], test_users[0]["password"]):
        print("❌ Login failed, stopping tests")
        return 1
    
    # Test 2: Get current user
    success, user_data = tester.test_get_me()
    if not success:
        print("❌ Get current user failed")
        return 1
    
    # Test 3: Get all users
    success, users_data = tester.test_get_users()
    if not success:
        print("❌ Get users failed")
        return 1
    
    # Get user IDs for testing
    user_ids = [user["id"] for user in users_data] if users_data else []
    
    # Test 4: Create expense
    success, expense_data = tester.test_create_expense(
        title="Test Grocery Shopping",
        amount=500.0,
        category="Groceries",
        participants=user_ids[:2] if len(user_ids) >= 2 else user_ids
    )
    if not success:
        print("❌ Create expense failed")
        return 1
    
    expense_id = expense_data.get("id") if expense_data else None
    
    # Test 5: Get expenses
    success, expenses_list = tester.test_get_expenses()
    if not success:
        print("❌ Get expenses failed")
        return 1
    
    # Test 6: Get single expense
    if expense_id:
        success, single_expense = tester.test_get_expense(expense_id)
        if not success:
            print("❌ Get single expense failed")
    
    # Test 7: Update expense
    if expense_id:
        success, updated_expense = tester.test_update_expense(
            expense_id,
            title="Updated Test Grocery Shopping",
            amount=600.0
        )
        if not success:
            print("❌ Update expense failed")
    
    # Test 8: Get expenses summary
    success, summary_data = tester.test_get_expenses_summary()
    if not success:
        print("❌ Get expenses summary failed")
        return 1
    
    # Test 9: Toggle user active status (if we have users)
    if user_ids and len(user_ids) > 1:
        success, toggle_result = tester.test_toggle_user_active(user_ids[1])
        if not success:
            print("❌ Toggle user active failed")
    
    # Test 10: Delete expense
    if expense_id:
        success, delete_result = tester.test_delete_expense(expense_id)
        if not success:
            print("❌ Delete expense failed")
    
    # Test 11: Logout
    success = tester.test_logout()
    if not success:
        print("❌ Logout failed")
    
    # Test 12: Try accessing protected endpoint after logout
    success, _ = tester.test_get_me()
    if success:
        print("❌ Protected endpoint accessible after logout - security issue!")
        return 1
    else:
        print("✅ Protected endpoint properly secured after logout")
        # Don't count this as a test failure since 401 is expected
    
    # Print final results
    print("\n" + "=" * 50)
    print(f"📊 Tests completed: {tester.tests_passed}/{tester.tests_run}")
    print(f"Success rate: {(tester.tests_passed/tester.tests_run)*100:.1f}%")
    
    if tester.tests_passed == tester.tests_run:
        print("🎉 All tests passed!")
        return 0
    else:
        print("⚠️  Some tests failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())