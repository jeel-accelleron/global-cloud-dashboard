"""
Simple test script to verify Azure DevOps Work Items API is working
Run this after starting the Django server: python manage.py runserver
"""
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api/workitems"


def print_response(title, response):
    """Pretty print API response"""
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")
    print(f"Status Code: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Success!")
        print(f"Response: {json.dumps(data, indent=2)}")
    else:
        print(f"❌ Error!")
        print(f"Response: {response.text}")


def test_health_check():
    """Test 1: Health Check"""
    response = requests.get(f"{BASE_URL}/health/")
    print_response("Health Check", response)
    return response.status_code == 200


def test_get_all_work_items():
    """Test 2: Get All Work Items (with limit)"""
    response = requests.get(
        f"{BASE_URL}/",
        params={'top': 5}
    )
    print_response("Get All Work Items (Top 5)", response)
    return response.status_code == 200


def test_get_bugs():
    """Test 3: Get All Bugs"""
    response = requests.get(
        f"{BASE_URL}/",
        params={
            'work_item_type': 'Bug',
            'top': 10
        }
    )
    print_response("Get Bugs", response)
    return response.status_code == 200


def test_search():
    """Test 4: Search Work Items"""
    response = requests.get(
        f"{BASE_URL}/search/",
        params={
            'search_text': 'test',
            'top': 5
        }
    )
    print_response("Search for 'test'", response)
    return response.status_code == 200


def test_updated_since():
    """Test 5: Get Recently Updated Items"""
    since_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
    response = requests.get(
        f"{BASE_URL}/updated-since/",
        params={
            'since_date': since_date,
            'top': 10
        }
    )
    print_response(f"Updated Since {since_date}", response)
    return response.status_code == 200


def test_custom_query():
    """Test 6: Custom WIQL Query"""
    query = """
    SELECT [System.Id], [System.Title], [System.State], [System.WorkItemType]
    FROM WorkItems
    WHERE [System.TeamProject] = 'Global IS Infrastructure'
    ORDER BY [System.ChangedDate] DESC
    """
    
    response = requests.post(
        f"{BASE_URL}/query/",
        json={
            'query': query,
            'top': 5
        }
    )
    print_response("Custom WIQL Query", response)
    return response.status_code == 200


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🚀 Testing Azure DevOps Work Items API")
    print("="*60)
    print("\nMake sure the server is running:")
    print("  python manage.py runserver")
    print("\n" + "="*60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Get All Work Items", test_get_all_work_items),
        ("Get Bugs", test_get_bugs),
        ("Search Work Items", test_search),
        ("Recently Updated", test_updated_since),
        ("Custom WIQL Query", test_custom_query),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            success = test_func()
            results.append((test_name, success))
        except requests.exceptions.ConnectionError:
            print(f"\n❌ Connection Error: Is the server running?")
            print("Start the server with: python manage.py runserver")
            return
        except Exception as e:
            print(f"\n❌ Error in {test_name}: {str(e)}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "="*60)
    print("📊 Test Summary")
    print("="*60)
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
    
    print(f"\n{'='*60}")
    print(f"Results: {passed}/{total} tests passed")
    print("="*60)
    
    if passed == total:
        print("🎉 All tests passed! Your API is working correctly!")
    else:
        print("⚠️  Some tests failed. Check the output above for details.")


if __name__ == "__main__":
    main()
