from flask import Flask
from flask import jsonify, request, make_response, send_file, send_from_directory, render_template
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, unset_jwt_cookies, jwt_required, JWTManager, verify_jwt_in_request, set_access_cookies
from flask_cors import CORS
from flask_mail import Mail, Message
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer
from datetime import timedelta, datetime, timezone, date
from threading import Thread
from email.mime.text import MIMEText
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from functools import wraps

import hashlib
import random
import secrets
import binascii
import json
import os
import re

from pprint import pprint

from db import DbUtil
from utils import describe_changes_log

# Load variables from .env
load_dotenv()

db = DbUtil({
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    #'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME')
})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_BUILD_DIR = os.path.join(BASE_DIR, "mimir-fe-vite", "dist")
UPLOAD_FOLDER = './docs'
ALLOWED_EXTENSIONS = set(['pdf'])
DECIMAL_PATTERN = re.compile(r'^\d+(\.\d{1,2})?$')

app = Flask(
    __name__,
    static_folder=REACT_BUILD_DIR,
    static_url_path=""
)

# Apply CORS immediately after app creation
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "*"}}, allow_headers=["Content-Type", "Authorization"])

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
# app.config["MAIL_SUPPRESS_SEND"] = True

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER

serializer = URLSafeTimedSerializer(app.config['SECRET_KEY'])

jwt = JWTManager(app)
mail = Mail(app)

POSITIVE_GIFS = [
    "https://media.giphy.com/media/111ebonMs90YLu/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdHN3dzgxY29iZnF1bzE0dXo0dGpjMGh6eTB1Z3czYmw4bDJmdzl1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/NEvPzZ8bd1V4Y/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmFxbmU4eG1uNHM3MGVycXl5bjZwMDc5NW90bGY3dmhpbTBndDl1ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a0h7sAqON67nO/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExdDhpcHNnbjRveHI3b25vamtzaTJkNGcyNjNuOWRkdm1ubjNzNGFxeiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/pa37AAGzKXoek/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExM2kya2lsMmVrN3BmcGdibXA4cGNkNmczN3htMmJzeTZzOTdzbGhmaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Z2VgDwy1IjJUQ/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHdtb20zd2Fwazl0bm5pZnhjeDM1MDd3ZHE1emRnd2xiemVtZDQ5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QLNdAWrPIqkeNZfgcU/giphy.gif"
]

NEGATIVE_GIFS = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3ZwNWFhcTh4azBnOWc4ejBrM2Q1M25oODNlNHhzaWNvNHIyY2lmNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a2fVCj2CudIiY/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWx6ZjYyMmVid3FuOWYyZTFpM2t3dmg0MzgxaHJubGdlcHc4ZDl1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EtB1yylKGGAUg/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmgzMWd5Y3N2bGhnNjQyMjBjOHF5ZTN5M2xpMzZ6NWN4ZW5kMnZhdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CJxXHfRAYvtqU/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGZ4d2J1ZnJlY2d3dDNvd2hldm5lN3VxaDV5cjZ6OTVxZmphMTJhcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aKAyzum9Xe0mGFjc9m/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTJsOTRpcXU2YmpvZjZqMGR4cmFnbnVnazU2bDF0aHozenVmNHFoMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/STfLOU6iRBRunMciZv/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWQ0NnlmMWthNGl0amhydnFiejlmd2Rxa282ZTR6emR2a3BnM2syYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/GjR6RPcURgiL6/giphy.gif",
]

# USER BASED ROLES ARE DEFINED AS FOLLOWS:
# admin - full access
# technician - add/edit circuits and sites
# sales - add/edit circuits and sites, view dashboard,
# finance - view dashboard, commissions

# Role-based access control decorator
def role_required(required_roles):
    def wrapper(fn):
        @wraps(fn)
        def decorator(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            user_role = claims.get("role")

            if user_role not in required_roles:
                return jsonify(msg="Insufficient permissions"), 403

            return fn(*args, **kwargs)
        return decorator
    return wrapper

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

def validate_decimal_field(value, field_name):
    if value in (None, ''):
        return None  # allow NULLs
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field_name} is not a valid decimal")

    # ROUTES

#Login Route
@app.route('/mimir/api/login', methods=['POST'])
def login():
    if not request.is_json:
        return jsonify({"msg": "Invalid request: JSON required"}), 400
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    # pprint(data)
    
    row = db.get_user_by_email(email)
    # pprint(row)

    if not row:
       return jsonify({"msg": "User with this email does not exist"}), 400

    if not verify_password(row['password'], password):
        return jsonify({"msg": "Invalid credentials"}), 401
    
    # ✅ Include role + email in JWT claims
    access_token = create_access_token(
                                        identity=str(row['id']),
                                        additional_claims={
                                            "email": row['email'],
                                            "role": row['role']
                                        },
                                        expires_delta=timedelta(hours=8),
                                        fresh=True
                                    )

    # Optional: log login event
    try:
        db.log_action(
            user_id=row['email'],
            action="login",
            target_table="users",
            target_id=row['id'],
            details=f"{row['name']} {row['surname']} logged in to Mimir."
        )
    except Exception as e:
        print(f"⚠️ Logging error: {e}")

    return jsonify({"access_token": access_token}), 200

# Route for forgotten password
@app.route('/mimir/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    user = db.get_user_by_email(email)

    if user:
        token = serializer.dumps(email, salt='password-reset')
        # reset_url = url_for('reset_password', token=token, _external=True)
        reset_url = f"{os.getenv('APP_BASE_URL')}/reset-password/{token}"

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
@jwt_required()
@role_required(['admin'])
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
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "user_id": current_user_id,
        "email": claims.get("email"),
        "role": claims.get("role")
    })

@app.route("/mimir/api/dashboard", methods=["GET"])
@jwt_required()
@role_required(['admin', 'sales', 'finance'])
def circuits_grouped_by_vendor_and_type():
    # print("🚀 API HIT: /api/dashboard")
    try:
        result = db.get_all_circuits_grouped_by_vendor_and_type()
        # pprint(result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
@app.route('/mimir/api/dashboard/vendor/<vendor_name>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'finance'])
def get_vendor_circuits(vendor_name):
    circuits = db.get_circuits_by_vendor(vendor_name)  # write this function
    return jsonify(circuits)

@app.route('/mimir/api/circuits', methods=['GET', 'POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
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

    # Add WHERE clause only if filters exist
    if filters:
        query += " WHERE " + " AND ".join(filters)

    # Always add ORDER BY
    query += " ORDER BY CAST(SUBSTRING(vlan, 2) AS UNSIGNED) DESC"

    rows = db.search_similar_circuit(query, tuple(values))
    if rows:
        return jsonify(rows), 200
    return jsonify({"error": "No entries found"}), 404

@app.route('/mimir/api/sites', methods=['GET', 'POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
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
        
@app.route('/mimir/api/circuits/addcircuit', methods=['GET','POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def addcircuit():
    if request.method == 'GET':
        data = db.get_salesperson()
        # pprint(data)
        return jsonify(data)

    if request.method == 'POST':

        data = request.get_json()
        # print("Received data for new circuit:")
        # pprint(data)

        # Handle nullable dates safely
        start_date = data.get('startDate') or None
        end_date = data.get('endDate') or None
        
        # Sanitize and format decimal values
        try:
            mrc = validate_decimal_field(data.get('mrc'), 'mrc')
            selling_price = validate_decimal_field(data.get('sellingPrice'), 'sellingPrice')
        except (ValueError, TypeError) as e:
            return make_response({"error": f"Decimal validation error: {e}"}, 400)

        # ✅ Get site IDs from request data
        siteA_id = request.json.get("siteA_id")
        siteB_id = request.json.get("siteB_id")
        # Validate site IDs
        if not siteA_id or not siteB_id:
            return make_response({"error": "Both siteA_id and siteB_id are required"}, 400)
        # ✅ Ensure these are integers
        siteA_id = int(siteA_id)
        siteB_id = int(siteB_id)
        
        # Handle uploaded document name
        filename = secure_filename(data['doc']) if data.get('doc') else None
        
        # Use try-except block for DB operation
        try:
            circuit_id = db.save_circuit(
                vendor=data.get('vendor'),
                circuit_type=data.get('circuitType'),
                speed=data.get('speed'),
                circuit_number=data.get('circuitNumber'),
                circuit_owner=data.get('circuitOwner'),
                usage_flag=data.get('usageFlag'),
                enni=data.get('enni'),
                vlan=data.get('vlan'),
                start_date=start_date,
                contract_term=data.get('contractTerm'),
                end_date=end_date,
                mrc=mrc,
                selling_price=selling_price,
                siteA_id=siteA_id,
                siteB_id=siteB_id,
                comments=data.get('comments'),
                status='active',
                doc=filename,
                salesperson_id=data.get('salesPerson')
            )

            if not circuit_id:
                return jsonify({"msg": "Failed to save circuit"}), 500
        
            # Update commissions table only if there is a salesperson assigned
            salesperson_id = data.get('salesPerson')

            if salesperson_id:
                db.create_commission(
                    circuit_id=circuit_id,
                    salesperson_id=salesperson_id,
                    commission_percentage=10.00,
                    start_date=start_date,
                    end_date=end_date,
                    status='new',
                    notes='Initial commission on circuit creation'
                )

            # ✅ Get user performing the update for logging
            claims = get_jwt()
            # role = claims.get("role")
            user_id = claims.get("email")

            # You can define your own fields list for logging
            details = describe_changes_log({}, data, fields=[
                'vendor', 'circuitType', 'speed', 'circuitNumber', 'circuitOwner', 'usageFlag',
                'enni', 'vlan', 'startDate', 'contractTerm', 'endDate',
                'mrc', 'sellingPrice', 'siteA_id', 'siteB_id', 'status', 'comments', 'doc', 'salesPerson'
            ])

            # Log action
            db.log_action(
                user_id=user_id,
                action="add",
                target_table="circuits",
                target_id=None,  # If you have a way to get the new circuit ID, insert it here
                details=details
            )
            return make_response({"msg": "Circuit successfully added"}, 200)
        
        except Exception as e:
            print(f"Database error: {e}")
            return make_response({"error": "Unable to save circuit: Database error: " + str(e)}, 500)

@app.route('/mimir/api/upload', methods=['POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
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
@role_required(['admin', 'sales', 'technician'])
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
        
@app.route('/mimir/api/circuits/viewcircuit/<int:id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def view_circuit(id):
    data = db.search_circuit_to_view(id)

    # print("DATA:")
    # pprint(data)
    if data:
        return jsonify(data)
    return jsonify({'error': 'Circuit not found'}), 404

@app.route('/mimir/api/sites/viewsite/<site>', methods=['GET', 'DELETE'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
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
@role_required(['admin', 'sales', 'technician'])
def update_circuit(id):
    if request.method == 'GET':
        try:
            # Fetch circuit details
            circuit = db.search_circuit_to_view(id)

            if not circuit:
                return jsonify({'error': 'Circuit not found'}), 404

            # Fetch additional data for dropdowns/selections
            salespersons = db.get_salesperson()

            # Return combined response
            return jsonify({
                'circuit': circuit,
                'salespersons': salespersons
            })

        except Exception as e:
            return jsonify({'error': str(e)}), 5004

    if request.method == 'PUT':
        data = request.get_json()

        # ───────────────────────────────
        # Decimal sanitisation
        # ───────────────────────────────
        try:
            data['mrc'] = validate_decimal_field(data.get('mrc', ''), 'mrc')
            data['sellingPrice'] = validate_decimal_field(
                data.get('sellingPrice', ''), 'sellingPrice'
            )
        except (ValueError, TypeError) as e:
            return make_response({"error": f"Decimal validation error: {e}"}, 400)

        # ───────────────────────────────
        # Document handling
        # ───────────────────────────────
        doc_path = data.get('doc')
        if doc_path:
            try:
                data['doc'] = secure_filename(doc_path.split('\\')[-1])
            except Exception:
                data['doc'] = 'None'
        else:
            data['doc'] = 'None'

        try:
            # ───────────────────────────────
            # Fetch existing circuit
            # ───────────────────────────────
            old_data = db.search_circuit_to_view(id)
            if not old_data:
                return jsonify({'error': 'Circuit not found'}), 404

            # Update circuit first
            success = db.update_circuit(id, **data)
            if success <= 0:
                return jsonify({'error': 'No changes made'}), 204

            # User context
            claims = get_jwt()
            user_id = claims.get("email")

            # ───────────────────────────────
            # Commission handling
            # ───────────────────────────────
            old_salesperson = old_data.get("salesPerson")
            new_salesperson = data.get("salesPerson")
            today = date.today()

            # Flag if key circuit data changed
            circuit_changed = (
                old_data.get('mrc') != data.get('mrc') or
                old_data.get('sellingPrice') != data.get('sellingPrice') or
                old_data.get('contractTerm') != data.get('contractTerm')
            )

            # -----------------------------
            # CASE 1: First salesperson ever assigned
            # -----------------------------
            if not old_salesperson and new_salesperson:
                db.create_commission(
                    circuit_id=id,
                    salesperson_id=new_salesperson,
                    start_date=old_data.get("startDate"),
                    end_date=old_data.get("endDate"),
                    commission_percentage=10,  # default
                    status='new',          # requires approval
                    notes="Initial commission on circuit update"
    )

            # ----------------------------------------------------------
            # CASE 2: Salesperson changed OR key circuit fields changed
            # ----------------------------------------------------------
            elif old_salesperson and (new_salesperson != old_salesperson or circuit_changed):
                # Expire old active/pending commission
                existing_commission = db.get_current_commission(circuit_id=id)
                # print("Current commission to expire:", existing_commission)
                if existing_commission:
                    db.expire_active_commission(
                        circuit_id=id,
                        end_date=today,
                        notes=f"Upgrade, renewal, or salesperson changed (previous commission id {existing_commission['id']})"
                    )

                # Create new commission for new salesperson or updated circuit
                if new_salesperson:
                    db.create_commission(
                        circuit_id=id,
                        salesperson_id=new_salesperson,
                        start_date=today,                  # remainder period
                        end_date=old_data.get("endDate"),
                        commission_percentage=10,          # default
                        status='new',                  # approval required
                        notes=f"Commission created for new salesperson / upgrade (replacing commission id {existing_commission['id'] if existing_commission else 'N/A'})"
                    )

            # -----------------------------
            # CASE 3: Salesperson removed
            # -----------------------------
            elif old_salesperson and not new_salesperson:
                db.expire_active_commission(
                    circuit_id=id,
                    end_date=today,
                    notes="Salesperson removed"
                )

            # CASE 4: No change → do nothing


            # ───────────────────────────────
            # Audit logging
            # ───────────────────────────────
            details = describe_changes_log(
                old_data,
                data,
                fields=[
                    'vendor', 'circuitType', 'speed', 'circuitNumber',
                    'circuitOwner', 'enni', 'vlan', 'startDate',
                    'contractTerm', 'endDate', 'mrc', 'sellingPrice',
                    'siteA_id', 'siteB_id', 'status',
                    'comments', 'doc', 'salesPerson'
                ]
            )

            db.log_action(
                user_id=user_id,
                action="update",
                target_table="circuits",
                target_id=id,
                details=details
            )

            return jsonify({'message': 'Circuit updated successfully'}), 200

        except Exception as e:
            print(f"Database error: {e}")
            return make_response(
                {"error": f"Unable to update circuit: {e}"},
                500
            )

@app.route('/mimir/api/download/<id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def download(id):
    row = db.search_circuit_to_view(id)
    # pprint(row)
    
    if not row or 'doc' not in row or not row['doc']:
        return jsonify({"error": "No document associated with this record"}), 404

    file = row['doc']
    target = os.path.join(UPLOAD_FOLDER, file)

    if os.path.exists(target):
        # print("Serving file:", target)
        # print("File size:", os.path.getsize(target))
        response = make_response(send_file(target, mimetype='application/pdf', as_attachment=False))
        response.headers['Content-Disposition'] = f'inline; filename="{file}"'
        return response
    else:
        return jsonify({"error": "File not found"}), 404
    
@app.route('/mimir/api/getsite', methods=['POST'])
@jwt_required()
def get_site():
    data = request.get_json()
    search_term = data.get("site", "")
    results = db.search_sitename(search_term)
    return jsonify(results)

@app.route('/mimir/api/logs', methods=['GET'])
@jwt_required()
@role_required(['admin'])
def view_logs():
    try:
        # print("VIEW_LOGS ROUTE HIT ✅")
        rows = db.view_logs()
        # pprint(rows)
        return jsonify(rows)
    except Exception as e:
        print("ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
    
@app.route('/mimir/api/commissions', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'finance', 'technician'])
def get_commissions():
    try:
        claims = get_jwt()
        user_id = claims.get("sub")
        role = claims.get("role")

        # print("GET_COMMISSIONS ROUTE HIT ✅")
        # print("User claims:")
        # pprint(claims)
        # print(f"User ID: {user_id}, Role: {role}")

        if role in ('admin', 'finance'):
            rows = db.get_all_commissions()
        elif role in ('sales', 'technician'):
            rows = db.get_commissions_for_salesperson(user_id)
            # pprint(rows)
        else:
            # technicians or others see nothing by default
            rows = []

        return jsonify(rows), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/mimir/api/commissions/apply", methods=["POST"])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def apply_commission():
    data = request.get_json()

    commission_id = data.get("commission_id")
    new_percentage = data.get("commission_percentage")

    if commission_id is None or new_percentage is None:
        return jsonify({"error": "commission_id and commission_percentage are required"}), 400

    try:
        new_percentage = Decimal(new_percentage)
    except Exception:
        return jsonify({"error": "Invalid commission percentage"}), 400

    if new_percentage < 0 or new_percentage > 100:
        return jsonify({"error": "Commission percentage must be between 0 and 100"}), 400

    # 1️⃣ Fetch commission
    commission = db.get_commission_by_id(commission_id)
    # print("Fetched commission:")
    # pprint(commission)

    if not commission:
        return jsonify({"error": "Commission not found"}), 404

    # 🚫 SAFEGUARD
    if commission["status"] not in ("new", "paused"):
        return jsonify({
            "error": f"Commission cannot be applied in '{commission['status']}' state"
        }), 400

    try:
        #  Update agreement only
        db.update_commission_on_apply(
            commission_id=commission_id,
            percentage=new_percentage,
            status="pending"
        )

        # Create approval token
        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(minutes=122)

        db.create_commission_approval_token(
            commission_id=commission_id,
            token=token,
            expires_at=expires_at
        )

        # 3️⃣ Indicative values for email only
        gp = commission["sellingPrice"] - commission["mrc"]
        indicative_value = (
            gp * (new_percentage / Decimal(100))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        approve_url = (
        f"{os.getenv('APP_BASE_URL')}"
        f"/mimir/api/commissions/approve?token={token}&approve=true"
        )
        reject_url = (
            f"{os.getenv('APP_BASE_URL')}"
            f"/mimir/api/commissions/approve?token={token}&approve=false"
        )

        msg = Message(
            subject=f"Commission Approval Request - ID {commission_id}",
            sender=os.getenv("MAIL_DEFAULT_SENDER"),
            recipients=[os.getenv("RECIPIENT_EMAIL")],
            html=render_template(
                "commission_approval.html",
                salesperson_name=commission["salesperson_name"],
                circuit_number=commission["circuitNumber"],
                client_name=commission["siteB_name"],
                gp=gp,
                commission_percentage=new_percentage,
                indicative_value=indicative_value,
                months=commission["contractTerm"],
                notes=commission["notes"],
                approve_url=approve_url,
                reject_url=reject_url
            )
        )

        mail.send(msg)

        return jsonify({"message": "Commission submitted for approval"}), 200

    except Exception as e:
        print("Error submitting commission:", e)
        return jsonify({"error": "Failed to submit commission"}), 500

@app.route("/mimir/api/commissions/approve", methods=["GET"])
def approve_commission():
    token = request.args.get("token")
    approve = request.args.get("approve") == "true"

    if not token:
        return "Missing approval token", 400

    token_row = db.get_valid_approval_token(token)
    if not token_row:
        return "Invalid or expired approval link", 400

    commission = db.get_commission_by_id(token_row["commission_id"])
    if not commission:
        return "Commission not found", 404
    
    pprint(commission)

    if commission["status"] != "pending":
        return (
            f"Invalid commission state '{commission['status']}'. "
            "This request can no longer be processed."
        ), 400
    
    # This is a second safety check for expiry - redundant but important
    if commission["expires_at"] < datetime.utcnow():
        db.reset_commission(commission["id"])
        return "Approval link expired. Commission reset.", 410

    if approve:
        db.update_commission_status(commission["id"], "active")
        gif_url = random.choice(POSITIVE_GIFS)
        title = "Commission Approved"
        message = "The commission has been successfully approved."
    else:
        db.update_commission_status(commission["id"], "new")
        gif_url = random.choice(NEGATIVE_GIFS)
        title = "Commission Rejected"
        message = "The commission has been rejected and reset."

    db.mark_approval_token_used(token)
    
    return render_template(
        "commission_result.html",
        title=title,
        message=message,
        gif_url=gif_url
    )

# Serve React frontend
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    # If the path starts with 'api', let Flask handle it
    if path.startswith("api"):
        return "Not Found", 404  # This forces Flask to look for actual API routes
    
    # Serve actual static files if they exist
    full_path = os.path.join(REACT_BUILD_DIR, path)
    if path and os.path.exists(full_path):
        return send_from_directory(REACT_BUILD_DIR, path)

    # Fallback to React index.html
    return send_from_directory(REACT_BUILD_DIR, "index.html")


if __name__ == '__main__':
    app.run()
