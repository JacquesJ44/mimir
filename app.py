from flask import Flask
from flask import jsonify, request, make_response, send_file, send_from_directory
from flask_jwt_extended import create_access_token,get_jwt,get_jwt_identity, unset_jwt_cookies, jwt_required, JWTManager
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer
from datetime import timedelta, datetime, timezone
from threading import Thread
from email.mime.text import MIMEText
import hashlib
import binascii
import json
import os

from pprint import pprint

from db import DbUtil

# Load variables from .env
load_dotenv()

db = DbUtil({
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    # 'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME')
})

UPLOAD_FOLDER = './docs'
ALLOWED_EXTENSIONS = set(['pdf'])

app = Flask(__name__, static_folder='/home/pi/Documents/mimir/mimir-fe/build', static_url_path="/mimir/static") 

# Secret Keys
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY')
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)

# Email
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS') == 'True'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
app.config['RECIPIENT_EMAIL'] = os.getenv('RECIPIENT_EMAIL')

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER


serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

jwt = JWTManager(app)
mail = Mail(app)

con = db.get_connection()

cur = con.cursor()
cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INT(5) PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(50),
        surname VARCHAR(50),
        email VARCHAR(50) UNIQUE,
        password VARCHAR(200)
    )
 """)
cur.execute("""   
    CREATE TABLE IF NOT EXISTS sites (
        id INT(5) PRIMARY KEY AUTO_INCREMENT,
        site VARCHAR(50) UNIQUE,
        reference VARCHAR(50),
        latitude VARCHAR(30),
        longitude VARCHAR(30),
        building VARCHAR(100),
        street VARCHAR(50),
        number VARCHAR(5),
        suburb VARCHAR(30),
        city VARCHAR(30),
        postcode VARCHAR(10),
        province VARCHAR(30)
    )
""")
cur.execute("""
    CREATE TABLE IF NOT EXISTS circuits (
        id INT(5) PRIMARY KEY AUTO_INCREMENT,
        vendor VARCHAR(30),
        circuitType VARCHAR(50),
        speed VARCHAR(20),
        circuitNumber VARCHAR(50),
        circuitOwner VARCHAR(30),
        enni VARCHAR(15),
        vlan VARCHAR(15),
        startDate DATE,
        contractTerm VARCHAR(15),
        endDate DATE,
        mrc DECIMAL(10,2),
        siteA INT,
        siteB INT,
        comments VARCHAR(1000),
        status VARCHAR(20),
        doc VARCHAR(200),
        FOREIGN KEY (siteA) REFERENCES sites(id) ON DELETE RESTRICT ON UPDATE CASCADE,
        FOREIGN KEY (siteB) REFERENCES sites(id) ON DELETE RESTRICT ON UPDATE CASCADE
    )
""")
con.close()

# Hash the password
def hash_password(password):
    salt = hashlib.sha256(os.urandom(60)).hexdigest().encode('ascii')
    pwdhash = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, 100000)
    pwdhash = binascii.hexlify(pwdhash)
    return (salt + pwdhash).decode('ascii')

# Verify the password
def verify_password(stored_password, provided_password):
    # Extract the salt from the stored password (first 64 characters = 32 bytes = 64 hex chars)
    salt = stored_password[:64].encode('ascii')
    
    # Extract the actual hash from the stored password
    stored_pwdhash = stored_password[64:]
    
    # Recompute the hash using the provided password and the same salt
    pwdhash = hashlib.pbkdf2_hmac('sha512', provided_password.encode('utf-8'), salt, 100000)
    pwdhash = binascii.hexlify(pwdhash).decode('ascii')
    
    # Compare the hashes
    return pwdhash == stored_pwdhash

# Function to refresh JWT
@app.after_request
def refresh_expiring_jwts(response):
    try:
        exp_timestamp = get_jwt()["exp"]
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=2))
        if target_timestamp > exp_timestamp:
            access_token = create_access_token(identity=get_jwt_identity())
            data = response.get_json()
            if type(data) is dict:
                data["access_token"] = access_token 
                response.data = json.dumps(data)
        return response
    except (RuntimeError, KeyError):
        # Case where there is not a valid JWT. Just return the original respone
        return response
    
# Function to send password reset email
def send_reset_email(app, email, reset_url):
    with app.app_context():
        
        msg = Message("Password Reset Request", recipients=[email])
        msg.body = f"Click the link to reset your password: {reset_url}"
        msg.html = f"""\
                        <p>Hello,</p>
                        <p>Click below to reset your password:</p>
                        <a href="{reset_url}">{reset_url}</a>
                    """
        try:
            mail.send(msg)
            print("Email sent!")
        except Exception as e:
            print("Failed to send email:", e)

    # ROUTES

#Login Route
@app.route('/mimir/api/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({"msg": "Invalid request: JSON required"}), 400
    
    data = request.get_json()
    # pprint(data)
    
    row = db.get_user_by_email(data['email'])
    # pprint(row)

    if not row:
       return jsonify({"msg": "User with this email does not exist"}), 400

    if not verify_password(row[4], data['password']):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    access_token = create_access_token(identity=data['email'])
    
    return jsonify(access_token=access_token)

# Route for forgotten password
@app.route('/mimir/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    user = db.get_user_by_email(email)

    if user:
        token = serializer.dumps(email, salt='password-reset')
        # reset_url = url_for('reset_password', token=token, _external=True)
        reset_url = f"http://192.168.99.218/mimir/reset-password/{token}"

        # Launch email sending in a background thread
        Thread(target=send_reset_email, args=(app, email, reset_url)).start()

    return jsonify({'message': 'If the email exists, a reset link will be sent.'}), 200


# Route for password reset
@app.route('/mimir/api/reset-password/<token>', methods=['POST'])
def reset_password(token):
    data = request.get_json()
    new_password = data.get('new_password')  # Make sure to hash this in production

    new_password_hashed = hash_password(new_password)

    try:
        email = serializer.loads(token, salt='password-reset', max_age=3600)  # 1-hour expiry
    except Exception:
        return jsonify({'message': 'Invalid or expired token'}), 400

    db.update_forgotten_pw(email, new_password_hashed)

    return jsonify({'message': 'Password reset successfully'}), 200

# Logout route
@app.route("/mimir/api/logout", methods=["POST"])
def logout():
    response = jsonify({"msg": "logout successful"})
    unset_jwt_cookies(response)
    return response

@app.route('/mimir/api/register', methods=['POST'])
def register():
    data = request.get_json()
    # pprint(data)

    row = db.get_user_by_email(data['email'])
    if row is not None:
        return jsonify({"msg": "User with this email already exists"}), 400

    if data['password'] != data['confirmPassword']:
        return jsonify({"msg": "Passwords do not match"}), 400
    
    secured_password = hash_password(data['password'])
    db.save_user(data['name'], data['surname'], data['email'], secured_password)

    return jsonify({"msg": "Registration successful"})

#Navbar route - where authentication takes place
@app.route("/mimir/api/navbar")
@jwt_required()
def navbar():
    current_user = get_jwt_identity()

    # print('current_user: ', current_user)
    return jsonify(logged_in_as=current_user)

@app.route('/mimir/api/circuits', methods=['GET', 'POST'])
@jwt_required()
def circuits():
    obj = request.get_json()
    # pprint(obj)

    if not any(obj.values()):
        return jsonify({"error": "Please enter at least one search parameter"}), 404
    
    query = '''
        SELECT 
            circuits.*, 
            sa.site AS siteA_name, 
            sb.site AS siteB_name 
        FROM circuits
        JOIN sites sa ON circuits.siteA = sa.id
        JOIN sites sb ON circuits.siteB = sb.id
        WHERE 
    '''
    filters = []
    values = []

    for key, value in obj.items():
        if value:
            if key == "endDate":
                filters.append("endDate <= %s")
                values.append(value)
            elif key == "site":
                filters.append("(sa.site LIKE %s OR sb.site LIKE %s)")
                values.extend([f"%{value}%", f"%{value}%"])
            else:
                filters.append(f"{key} LIKE %s")
                values.append(f"%{value}%")

    query += " AND ".join(filters)

    rows = db.search_similar_circuit(query, tuple(values))
    if rows:
        return jsonify(rows), 200
    return jsonify({"error": "No entries found"}), 404

@app.route('/mimir/api/sites', methods=['GET', 'POST'])
@jwt_required()
def sites():
    obj = request.get_json()
    # pprint(obj)

    if not any(obj.values()):
        return jsonify({"error": "Please enter at least one search parameter"}), 404
    
    query = 'SELECT * FROM sites WHERE '
    for key, value in obj.items():
        if value:
            query += f'{key} LIKE %s AND '
    query = query.rstrip(' AND ')
    rows = db.search_similar_site(query, tuple('%' + value + '%' for value in obj.values() if value))
    if rows:
        return jsonify(rows), 200
    return jsonify({"error": "No entries found"}), 404
        
@app.route('/mimir/api/circuits/addcircuit', methods=['POST'])
@jwt_required()
def addcircuit():
    data = request.get_json()
    # pprint(data)

    # Sanitize and format MRC
    try:
        mrc = float(data.get('mrc', 0))
        data['mrc'] = f"{mrc:.2f}"
    except (ValueError, TypeError):
        return make_response({"error": "Invalid MRC value"}, 400)

    # Set status
    status = 'Active'

    # Handle uploaded document name
    doc_path = data.get('doc')
    if doc_path:
        # Expecting only filename, not full path
        filename = secure_filename(doc_path)
    else:
        filename = 'None'

    # ✅ Get site IDs from request data
    siteA_id = request.json.get("siteA_id")
    siteB_id = request.json.get("siteB_id")

    # Validate site IDs
    if not siteA_id or not siteB_id:
        return make_response({"error": "Both siteA_id and siteB_id are required"}, 400)
    
    # ✅ Ensure these are integers
    siteA_id = int(siteA_id)
    siteB_id = int(siteB_id)
    
    # Use try-except block for DB operation
    try:
        db.save_circuit(
            data.get('vendor'),
            data.get('circuittype'),
            data.get('speed'),
            data.get('circuitNumber'),
            data.get('circuitOwner'),
            data.get('enni'),
            data.get('vlan'),
            data.get('startDate'),
            data.get('contractTerm'),
            data.get('endDate'),
            data['mrc'],
            siteA_id,
            siteB_id,
            data.get('comments'),
            status,
            filename
        )
        return make_response({"msg": "Circuit successfully added"}, 200)
    
    except Exception as e:
        print(f"Database error: {e}")
        return make_response({"error": "Unable to save circuit"}, 500)

@app.route('/mimir/api/upload', methods=['POST'])
@jwt_required()
def upload():
    # Ensure upload folder exists
    if not os.path.isdir(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)

    # Check if 'doc' is in the files or if it's an empty upload
    if 'doc' not in request.files:
        return make_response(jsonify({"doc": ""}), 200)  # No file key, treat as empty

    file = request.files['doc']

    # If the file was submitted but has no filename (empty selection)
    if file.filename.strip() == '':
        return make_response(jsonify({"doc": ""}), 200)  # Explicitly no file selected

    # Process valid file
    filename = secure_filename(file.filename)
    destination = os.path.join(UPLOAD_FOLDER, filename)

    if os.path.exists(destination):
        return make_response(jsonify({"error": "File already exists"}), 403)

    try:
        file.save(destination)
        return make_response(jsonify({"msg": "Document uploaded successfully!"}), 200)
    except Exception as e:
        return make_response(jsonify({"error": f"Failed to save file: {str(e)}"}), 500)
    
@app.route('/mimir/api/sites/addsite', methods=['GET', 'POST'])
@jwt_required()
def addsite():
    obj = request.get_json()
    # pprint(obj)

    exists = db.search_site(obj['site'])
    # pprint(exists)

    if exists:
        return jsonify({"msg": "Site already exists"}), 406
    else:
        db.save_site(
            obj['site'],
            obj['reference'],
            obj['latitude'], 
            obj['longitude'], 
            obj['building'], 
            obj['street'], 
            obj['number'], 
            obj['suburb'], 
            obj['city'], 
            obj['post'], 
            obj['province']
        )
        return jsonify({"msg": "Site successfully added"}), 200    
        
@app.route('/mimir/api/circuits/viewcircuit/<id>', methods=['GET'])
@jwt_required()
def view_circuit(id):
    data = db.search_circuit_to_view(id)
    # pprint(data)
    if data:
        return jsonify(data)
    return jsonify({'error': 'Circuit not found'}), 404

@app.route('/mimir/api/sites/viewsite/<site>', methods=['GET', 'DELETE'])
@jwt_required()
def view_site(site):
    if request.method == 'GET':
        data = db.search_site_to_view(site)
        # pprint(data)
        if data:
            return jsonify(data)
        return jsonify({'error': 'Site not found'}), 404

    if request.method == 'DELETE':
        result = db.delete_site(site)
        if result:
            return jsonify({"msg": "Deleted!"})
        return jsonify({"error": "No site found"}), 404

@app.route('/mimir/api/circuits/updatecircuit/<id>', methods=['GET', 'PUT'])
@jwt_required()
def update_circuit(id):
    if request.method == 'GET':
        data = db.search_circuit_to_view(id)
        if data:
            return jsonify(data)
        return jsonify({'error': 'Circuit not found'}), 404

    if request.method == 'PUT':
        data = request.get_json()
        # pprint(data)

        # Sanitize and format MRC
        try:
            mrc = float(data.get('mrc', 0))
            data['mrc'] = f"{mrc:.2f}"
        except (ValueError, TypeError):
            return make_response({"error": "Invalid MRC value"}, 400)

        # Handle uploaded document name
        doc_path = data.get('doc')
        if doc_path:
            try:
                filename = secure_filename(doc_path.split('\\')[-1])  # Handles Windows paths
                data['doc'] = filename
            except Exception:
                data['doc'] = 'None'
        else:
            data['doc'] = 'None'

        # Attempt to update circuit fields
        try:
            success = db.update_circuit(id, **data)
            if success > 0:
                return jsonify({'message': 'Circuit updated successfully'}), 200
            else:
                return jsonify({'error': 'No changes made'}), 404
        except Exception as e:
            print(f"Database error: {e}")
            return make_response({"error": "Unable to update circuit"}, 500)

@app.route('/mimir/api/download/<id>', methods=['GET'])
@jwt_required()
def download(id):
    row = db.search_circuit_to_view(id)
    # pprint(row)
    
    if not row or 'doc' not in row or not row['doc']:
        return jsonify({"error": "No document associated with this record"}), 404

    file = row['doc']
    target = os.path.join(UPLOAD_FOLDER, file)

    if os.path.exists(target):
        return send_file(target, as_attachment=True, mimetype='application/pdf')
    else:
        return jsonify({"error": "File not found"}), 404
    
@app.route('/mimir/api/getsite', methods=['POST'])
@jwt_required()
def get_site():
    data = request.get_json()
    search_term = data.get("site", "")
    results = db.search_sitename(search_term)
    return jsonify(results)

# This route will serve the React app - this helps for routing in the Production environment
@app.route("/mimir", defaults={"path": ""})
@app.route("/mimir/<path:path>")
def serve(path):
    # Exclude API routes from being caught here
    if path.startswith("api") or path.startswith("static") or path.endswith(('.js', '.css', '.json', '.ico', '.png')):
        return send_from_directory(app.static_folder, path)

    # Serve actual files if they exist
    full_path = os.path.join(app.static_folder, path)
    if os.path.exists(full_path):
        return send_from_directory(app.static_folder, path)

    # Serve React index.html for everything else
    return send_from_directory(app.static_folder, "index.html")


if __name__ == '__main__':
    CORS(app, supports_credentials=True, resource={r"/*": {"origins": "*"}})
    app.run()