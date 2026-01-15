from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import time

# --- CONFIGURATION ---
APP_DIR = os.path.dirname(os.path.abspath(__file__))
app = Flask(__name__, static_folder='static', static_url_path="")
CORS(app)

# Local Database File Paths
INVENTORY_DB = os.path.join(APP_DIR, 'inventory.json')
USERS_DB = os.path.join(APP_DIR, 'users.json')

# --- USER DATABASE HELPERS (Fixes Yellow Lines) ---

def load_users():
    """Loads users from the local JSON file."""
    if os.path.exists(USERS_DB) and os.path.getsize(USERS_DB) > 0:
        with open(USERS_DB, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_users(users_list):
    """Saves the user list to the local JSON file."""
    with open(USERS_DB, 'w') as f:
        json.dump(users_list, f, indent=4)

# --- INVENTORY DATABASE HELPERS ---

def load_inventory():
    """Loads inventory from the local JSON file."""
    if os.path.exists(INVENTORY_DB) and os.path.getsize(INVENTORY_DB) > 0:
        with open(INVENTORY_DB, 'r') as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []

def save_inventory(items_list):
    """Saves the inventory list to the local JSON file."""
    with open(INVENTORY_DB, 'w') as f:
        json.dump(items_list, f, indent=4)

# --- FRONTEND ROUTES ---

@app.route('/')
def serve_login():
    """Serves the login page."""
    return send_from_directory('login', 'login.html')

@app.route('/inventory/')
def serve_dashboard():
    """Serves the main dashboard."""
    return send_from_directory('static', 'index1.html')

# --- AUTHENTICATION API ---

@app.route('/api/signup', methods=['POST'])
def signup():
    """Handles signup and forces redirect to Sign In on frontend."""
    data = request.json
    users = load_users()
    
    if any(u['username'] == data['username'] for u in users):
        return jsonify({'success': False, 'error': 'User already exists'}), 400
    
    new_user = {
        'username': data['username'],
        'password': data['password'],
        'role': 'user'
    }
    users.append(new_user)
    save_users(users)
    return jsonify({'success': True}) # Returns success only to trigger frontend redirect

@app.route('/api/signin', methods=['POST'])
def signin():
    """Signs the user in and provides a session role."""
    data = request.json
    # Admin Check
    if data['username'] == "admin" and data['password'] == "admin123":
        return jsonify({'success': True, 'user': {'username': 'admin', 'role': 'admin'}})

    users = load_users()
    user = next((u for u in users if u['username'] == data['username'] and u['password'] == data['password']), None)
    
    if user:
        return jsonify({'success': True, 'user': {'username': user['username'], 'role': 'user'}})
    
    return jsonify({'success': False, 'error': 'Invalid credentials'}), 401

# --- INVENTORY API ---

@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    return jsonify(load_inventory())

@app.route('/api/inventory', methods=['POST'])
def add_item():
    items = load_inventory()
    new_item = request.json
    new_item['id'] = str(int(time.time() * 1000))
    items.append(new_item)
    save_inventory(items)
    return jsonify({'success': True}), 201

@app.route('/api/inventory/<item_id>', methods=['DELETE'])
def delete_item(item_id):
    items = load_inventory()
    items = [i for i in items if str(i.get('id')) != str(item_id)]
    save_inventory(items)
    return jsonify({'success': True})

# Add this route to your app.py to handle edits
@app.route('/api/inventory/<item_id>', methods=['PUT'])
def update_item(item_id):
    items = load_inventory()
    updated_data = request.json
    
    for item in items:
        if str(item.get('id')) == str(item_id):
            item.update(updated_data) # Update existing item
            break
            
    save_inventory(items)
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(debug=True, port=5000)