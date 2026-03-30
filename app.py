from flask import Flask
from flask import jsonify, request, make_response, send_file, send_from_directory, render_template, current_app
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, unset_jwt_cookies, jwt_required, JWTManager, verify_jwt_in_request, set_access_cookies
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_mail import Mail, Message
from flask_talisman import Talisman
from dotenv import load_dotenv
from werkzeug.utils import secure_filename
from itsdangerous import URLSafeTimedSerializer
from datetime import timedelta, datetime, timezone, date
from dateutil.relativedelta import relativedelta
from threading import Thread
from email.mime.text import MIMEText
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation
from functools import wraps
from zoneinfo import ZoneInfo

import bcrypt
import hashlib
import hmac
import logging
import random
import secrets
import binascii
import json
import os
import re

from db import DbUtil
from utils import describe_changes_log, CycleManager, get_commission_dashboard, get_commission_monthly_summary, get_commission_outstanding, get_commission_pipeline, get_salesperson_commission_totals, parse_date, parse_decimal

# Load variables from .env
load_dotenv()

# Validate required environment variables at startup

# Required env vars, but DB_PASSWORD may be intentionally blank
_REQUIRED_ENV = [
    'DB_HOST', 'DB_USER', 'DB_NAME',
    'SECRET_KEY', 'JWT_SECRET_KEY',
    'MAIL_SERVER', 'MAIL_PORT', 'MAIL_USERNAME', 'MAIL_PASSWORD',
    'RECIPIENT_EMAIL', 'APP_BASE_URL',
]
_missing = [v for v in _REQUIRED_ENV if not os.getenv(v)]
# DB_PASSWORD must be present (could be empty string), not None
if 'DB_PASSWORD' not in os.environ:
    _missing.append('DB_PASSWORD')
if _missing:
    raise RuntimeError(f"Missing required environment variables: {', '.join(_missing)}")

db = DbUtil({
    'host': os.getenv('DB_HOST'),
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'db': os.getenv('DB_NAME')
})


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
REACT_BUILD_DIR = os.path.join(BASE_DIR, "mimir-fe-vite", "dist")
UPLOAD_FOLDER = './docs'
ALLOWED_EXTENSIONS = set(['pdf'])
DECIMAL_PATTERN = re.compile(r'^\d+(\.\d{1,2})?$')
TZ = ZoneInfo("Africa/Johannesburg")  # SAST timezone
UTC = ZoneInfo("UTC")  # UTC timezone for consistent storage and calculations
REJECTION_REASONS = {
    "not_eligible": "Circuit not eligible for commission",
    "duplicate": "Commission already in progress for this circuit",
    "too_high": "Commission exceeds allowed limits or margin",
    "pricing": "Pricing does not comply with policy",
    "contract": "Contract terms do not allow commission",
    "other": "Other"
}

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s: %(message)s',
)
logger = logging.getLogger(__name__)

app = Flask(
    __name__,
    static_folder=REACT_BUILD_DIR,
    static_url_path=""
)

# 10 MB upload limit
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024

cm = CycleManager(TZ)

# Rate limiting
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per minute"], storage_uri="memory://")

# Apply CORS — restrict origins to configured domains (comma-separated in env)
CORS_ORIGINS = [o.strip() for o in os.getenv('CORS_ORIGINS', '').split(',') if o.strip()]
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": CORS_ORIGINS}}, allow_headers=["Content-Type", "Authorization"])

# Security headers (CSP disabled since Flask serves React SPA; other headers still apply)
Talisman(app, content_security_policy=None, force_https=False)

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
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExOHdtb20zd2Fwazl0bm5pZnhjeDM1MDd3ZHE1emRnd2xiemVtZDQ5bCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/QLNdAWrPIqkeNZfgcU/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExbms4dTFndzV3b2diamY0MnBlcTkzcnliczRycGdlNjRydWFxYnIzaSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3rgXBxX4myufzT6N2w/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExYnF6dGprOGwzazN2ZzZsaXk2cnBwbzVxZTEwMG9tNG5lOW4zYTdkbSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/gk3R16JhLP8RUka2nD/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2x2ZmRneDJzeW1nMnVoZjUzbzhrNXFrM2pnb3hsbG84MWY2NWJzayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Eyk50nAfYxeH6/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYWJwb3ZhMTVucGhiZzY5aWpsYngzencyODB0bXd0ZDk4enAzMW95NiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BPJmthQ3YRwD6QqcVD/giphy.gif"
]

NEGATIVE_GIFS = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExc3ZwNWFhcTh4azBnOWc4ejBrM2Q1M25oODNlNHhzaWNvNHIyY2lmNSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/a2fVCj2CudIiY/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExMWx6ZjYyMmVid3FuOWYyZTFpM2t3dmg0MzgxaHJubGdlcHc4ZDl1eiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/EtB1yylKGGAUg/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbmgzMWd5Y3N2bGhnNjQyMjBjOHF5ZTN5M2xpMzZ6NWN4ZW5kMnZhdSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/CJxXHfRAYvtqU/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExaGZ4d2J1ZnJlY2d3dDNvd2hldm5lN3VxaDV5cjZ6OTVxZmphMTJhcSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/aKAyzum9Xe0mGFjc9m/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZTJsOTRpcXU2YmpvZjZqMGR4cmFnbnVnazU2bDF0aHozenVmNHFoMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/STfLOU6iRBRunMciZv/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExeWQ0NnlmMWthNGl0amhydnFiejlmd2Rxa282ZTR6emR2a3BnM2syYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/GjR6RPcURgiL6/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExYmNzZmF2ejRubmQ0Z2F0ZDM5bjdhamRqeHFneXAyeGd1d2diMWV1ayZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/8II6AI4wn5bFEqhgXM/giphy.gif",
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNTJybzBqaml2eGNwaWFhczJkanRxejBnbDN2eDZ4cHNjcTl0MnB1eCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/uQHtUvva9Qljy/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbTllMWs3MzRrODVxb3g5ZzhtbWhhZ29jczgxbnM5NjZvZDMzZDBjMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/OhQBBFi64Z81a/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExYXh4YTNnMG1kZmdhNDlydXhrMHQ2dThjOThrY3o2YzAxdXNkZjhubiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/BIN2S0sgQwdeE/giphy.gif"
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

# Hash the password using bcrypt
def hash_password(password):
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('ascii')

# Verify the password — supports both bcrypt and legacy PBKDF2 hashes
def verify_password(stored_password, provided_password):
    # bcrypt hashes always start with '$2b$' (or '$2a$'/'$2y$')
    if stored_password.startswith(('$2b$', '$2a$', '$2y$')):
        return bcrypt.checkpw(
            provided_password.encode('utf-8'),
            stored_password.encode('ascii')
        )

    # Legacy PBKDF2 path — kept for existing users until they reset/change password
    salt = stored_password[:64].encode('ascii')
    stored_pwdhash = stored_password[64:]
    pwdhash = hashlib.pbkdf2_hmac('sha512', provided_password.encode('utf-8'), salt, 100000)
    pwdhash = binascii.hexlify(pwdhash).decode('ascii')
    return hmac.compare_digest(pwdhash, stored_pwdhash)

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
            logger.info("Password reset email sent to %s", email)
        except Exception as e:
            logger.error("Failed to send email: %s", e)

def validate_decimal_field(value, field_name):
    if value in (None, ''):
        return None  # allow NULLs
    try:
        return Decimal(value)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field_name} is not a valid decimal")

def parse_bool(value):
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        v = value.strip().lower()
        if v in ("true", "on", "1", "yes"):  # treat as True
            return True
        if v in ("false", "off", "0", "no"):  # treat as False
            return False
    raise ValueError(f"Invalid boolean value: {value!r}")

def has_significant_price_change(old_price, new_price, threshold=10.00):
    """Returns True if the price changed more than threshold %."""
    try:
        old_price = float(old_price)
        new_price = float(new_price)
    except (TypeError, ValueError):
        return False
    if old_price == 0:
        return new_price != 0
    return abs(new_price - old_price) / old_price > threshold

def send_async_email_to_salesperson(app, msg):
    with app.app_context():
        mail.send(msg)


#========================================================================================================================
    # ROUTES
#========================================================================================================================
#Login Route
@app.route('/api/login', methods=['POST'])
@limiter.limit("10 per minute")
def login():
    if not request.is_json:
        return jsonify({"msg": "Invalid request: JSON required"}), 400
    
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    row = db.get_user_by_email(email)

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
        logger.warning("Logging error: %s", e)

    return jsonify({"access_token": access_token}), 200

# Route for forgotten password
@app.route('/api/forgot-password', methods=['POST'])
@limiter.limit("5 per minute")
def forgot_password():
    data = request.get_json()
    email = data.get('email')

    user = db.get_user_by_email(email)

    if user:
        token = serializer.dumps(email, salt='password-reset')
        # reset_url = url_for('reset_password', token=token, _external=True)
        base_url = os.getenv('APP_BASE_URL', '').rstrip('/')
        reset_url = f"{base_url}/reset-password/{token}"

        # Launch email sending in a background thread
        Thread(target=send_reset_email, args=(app, email, reset_url)).start()

    return jsonify({'message': 'If the email exists, a reset link will be sent.'}), 200


# Route for password reset
@app.route('/api/reset-password/<token>', methods=['POST'])
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
@app.route("/api/logout", methods=["POST"])
def logout():
    response = jsonify({"msg": "logout successful"})
    unset_jwt_cookies(response)
    return response

@app.route('/api/register', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def register():
    data = request.get_json()

    row = db.get_user_by_email(data['email'])
    if row is not None:
        return jsonify({"msg": "User with this email already exists"}), 400

    if data['password'] != data['confirmPassword']:
        return jsonify({"msg": "Passwords do not match"}), 400
    
    secured_password = hash_password(data['password'])
    db.save_user(data['name'], data['surname'], data['email'], secured_password)

    return jsonify({"msg": "Registration successful"})

#Navbar route - where authentication takes place
@app.route("/api/navbar")
@jwt_required()
def navbar():
    current_user_id = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        "user_id": current_user_id,
        "email": claims.get("email"),
        "role": claims.get("role")
    })

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
@role_required(['admin', 'sales', 'finance'])
def circuits_grouped_by_vendor_and_type():
    try:
        result = db.get_all_circuits_grouped_by_vendor_and_type()
        return jsonify(result)
    except Exception as e:
        logger.exception("Dashboard error")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/api/dashboard/vendor/<vendor_name>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'finance'])
def get_vendor_circuits(vendor_name):
    circuits = db.get_circuits_by_vendor(vendor_name)  # write this function
    return jsonify(circuits)

# Allowed search keys for circuit/site queries
CIRCUIT_SEARCH_KEYS = frozenset({
    'vendor', 'circuitType', 'speed', 'circuitNumber', 'circuitOwner',
    'usageFlag', 'enni', 'vlan', 'startDate', 'contractTerm',
    'endDate', 'mrc', 'sellingPrice', 'status', 'comments', 'site',
})

@app.route('/api/circuits', methods=['GET', 'POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def circuits():
    obj = request.get_json()

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
            if key not in CIRCUIT_SEARCH_KEYS:
                continue
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

SITE_SEARCH_KEYS = frozenset({
    'site', 'reference', 'building', 'street', 'number',
    'suburb', 'city', 'postcode', 'province',
})

@app.route('/api/sites', methods=['GET', 'POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def sites():
    obj = request.get_json()

    if not any(obj.values()):
        return jsonify({"error": "Please enter at least one search parameter"}), 404
    
    query = 'SELECT * FROM sites WHERE '
    filtered_values = []
    for key, value in obj.items():
        if value:
            if key not in SITE_SEARCH_KEYS:
                continue
            query += f'{key} LIKE %s AND '
            filtered_values.append(f'%{value}%')
    query = query.rstrip(' AND ')
    rows = db.search_similar_site(query, tuple(filtered_values))
    if rows:
        return jsonify(rows), 200
    return jsonify({"error": "No entries found"}), 404
        
@app.route('/api/circuits/addcircuit', methods=['GET','POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def addcircuit():
    if request.method == 'GET':
        data = db.get_salesperson()
        return jsonify(data)

    if request.method == 'POST':

        data = request.get_json()

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
            logger.exception("Error saving circuit")
            return make_response({"error": "Unable to save circuit"}, 500)

@app.route('/api/upload', methods=['POST'])
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
        logger.exception("File upload error")
        return make_response(jsonify({"error": "Failed to save file"}), 500)
    
@app.route('/api/sites/addsite', methods=['GET', 'POST'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def addsite():
    obj = request.get_json()

    exists = db.search_site(obj['site'])

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
        
@app.route('/api/circuits/viewcircuit/<int:id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def view_circuit(id):
    data = db.search_circuit_to_view(id)

    if data:
        return jsonify(data)
    return jsonify({'error': 'Circuit not found'}), 404

@app.route('/api/sites/viewsite/<site>', methods=['GET', 'DELETE'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def view_site(site):
    if request.method == 'GET':
        data = db.search_site_to_view(site)
        if data:
            return jsonify(data)
        return jsonify({'error': 'Site not found'}), 404

    if request.method == 'DELETE':
        result = db.delete_site(site)
        if result:
            return jsonify({"msg": "Deleted!"})
        return jsonify({"error": "No site found"}), 404


@app.route('/api/circuits/updatecircuit/<id>', methods=['GET', 'PUT'])
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
            logger.exception("Error fetching circuit")
            return jsonify({'error': 'Internal server error'}), 500

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

            # -----------------------------
            # Flag only meaningful circuit changes
            # -----------------------------
            circuit_changed = (
                old_data.get('contractTerm') != data.get('contractTerm') or
                parse_date(old_data.get('startDate')) != parse_date(data.get('startDate')) or
                has_significant_price_change(parse_decimal(old_data.get('mrc')), parse_decimal(data.get('mrc'))) or
                has_significant_price_change(parse_decimal(old_data.get('sellingPrice')), parse_decimal(data.get('sellingPrice')))
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
            logger.exception("Database error updating circuit")
            return make_response(
                {"error": "Unable to update circuit"},
                500
            )

@app.route('/api/download/<id>', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'technician'])
def download(id):
    row = db.search_circuit_to_view(id)
    
    if not row or 'doc' not in row or not row['doc']:
        return jsonify({"error": "No document associated with this record"}), 404

    file = row['doc']
    target = os.path.join(UPLOAD_FOLDER, file)

    if os.path.exists(target):
        response = make_response(send_file(target, mimetype='application/pdf', as_attachment=False))
        response.headers['Content-Disposition'] = f'inline; filename="{file}"'
        return response
    else:
        return jsonify({"error": "File not found"}), 404
    
@app.route('/api/getsite', methods=['POST'])
@jwt_required()
def get_site():
    data = request.get_json()
    search_term = data.get("site", "")
    results = db.search_sitename(search_term)
    return jsonify(results)

@app.route('/api/logs', methods=['GET'])
@jwt_required()
@role_required(['admin'])
def view_logs():
    try:
        rows = db.view_logs()
        return jsonify(rows)
    except Exception as e:
        logger.exception("Error fetching logs")
        return jsonify({"error": "Internal server error"}), 500
    
@app.route('/api/commissions', methods=['GET'])
@jwt_required()
@role_required(['admin', 'sales', 'finance', 'technician'])
def get_commissions():
    try:
        claims = get_jwt()
        user_id = claims.get("sub")
        role = claims.get("role")


        if role in ('admin', 'finance'):
            rows = db.get_all_commissions()
        elif role in ('sales', 'technician'):
            rows = db.get_commissions_for_salesperson(user_id)
        else:
            # technicians or others see nothing by default
            rows = []

        return jsonify(rows), 200

    except Exception as e:
        logger.exception("Error fetching commissions")
        return jsonify({"error": "Internal server error"}), 500

#==============================================================================    
# COMMISSION AUTO-PAYOUT TIMER & KILL SWITCH ROUTES
#==============================================================================

# GET: Return the kill-switch state as a proper boolean
@app.route("/api/commissions/kill-switch", methods=["GET"])
@jwt_required()
def get_kill_switch():
    raw = db.get_system_setting("commission_auto_pay")  # "on" | "off" (legacy)
    # "on" -> auto payout enabled
    auto_payout_enabled = False
    if isinstance(raw, str):
        auto_payout_enabled = raw.strip().lower() in ("on", "true", "1", "yes")
    elif isinstance(raw, (int, float, bool)):
        auto_payout_enabled = bool(raw)
    return jsonify({"autoPayoutEnabled": bool(auto_payout_enabled)}), 200

# POST: Set the kill-switch state, store consistently, and return boolean
@app.route("/api/commissions/kill-switch", methods=["POST"])
@jwt_required()
def set_kill_switch():
    payload = request.get_json(silent=True) or {}
    if "autoPayoutEnabled" not in payload:
        return jsonify({"error": "'autoPayoutEnabled' is required"}), 400
    try:
        auto_payout_enabled = parse_bool(payload["autoPayoutEnabled"])
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Persist using your existing convention
    db.set_system_setting("commission_auto_pay", "on" if auto_payout_enabled else "off")

    return jsonify({"status": "ok", "autoPayoutEnabled": auto_payout_enabled}), 200

@app.route("/api/commissions/cycle-status")
@jwt_required()
def commissions_status():
    # Get cycle status dict from CycleManager
    cycle = cm.commission_status()

    # Kill switch from your system settings
    kill_switch_enabled = db.get_system_setting("commission_auto_pay") == "on"

    return jsonify({
        "now": cycle["now"].isoformat(),
        "current_accrual": cycle["current_accrual"].isoformat(),
        "current_payout": cycle["current_payout"].isoformat(),
        "next_accrual": cycle["next_accrual"].isoformat(),
        "next_payout": cycle["next_payout"].isoformat(),
        "phase": cycle["status"],
        "auto_payout_enabled": kill_switch_enabled
    })


#=======================================================================================================================================
# COMMISSION AGREEMENT APPROVAL WORKFLOW - WITH PAUSE AND CANCEL BUTTONS
#=======================================================================================================================================
@app.route("/api/commissions/apply", methods=["POST"])
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

        # Current UTC time
        now_utc = datetime.now(UTC)

        # Token valid for 7 days
        expires_at_utc = now_utc + timedelta(days=7)

        db.create_commission_approval_token(
            commission_id=commission_id,
            token=token,
            expires_at=expires_at_utc
        )

        # 3️⃣ Indicative values for email only
        gp = Decimal(commission["sellingPrice"]) - Decimal(commission["mrc"])
        indicative_value = (
            gp * (new_percentage / Decimal(100))
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        review_url = f"{os.getenv('APP_BASE_URL')}/api/commissions/review?token={token}"
        
        # 4️⃣ Send email to manager
        msg = Message(
            subject=f"Commission Approval Request - ID {commission_id}",
            sender=os.getenv("MAIL_DEFAULT_SENDER"),
            recipients=[email.strip() for email in os.getenv("RECIPIENT_EMAIL").split(",")],
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
                review_url=review_url,
            )
        )

        mail.send(msg)

        return jsonify({"message": "Commission submitted for approval"}), 200

    except Exception as e:
        logger.exception("Error submitting commission")
        return jsonify({"error": "Failed to submit commission"}), 500

@app.route("/api/commissions/review", methods=["GET"])
def review_commission():
    """GET — renders a confirmation page; no state is changed."""
    token = request.args.get("token")
    if not token:
        return "Missing approval token", 400

    token_row = db.get_valid_approval_token(token)
    if not token_row:
        return "Invalid or expired approval link", 400

    if token_row["used_at"] is not None:
        return "This approval link has already been used.", 409

    commission = db.get_commission_by_id(token_row["commission_id"])
    if not commission:
        return "Commission not found", 404

    if commission["status"] != "pending":
        return "This request can no longer be processed.", 400

    # Expiry check
    expires_at = commission.get("expires_at")
    if expires_at:
        expires_at_utc = expires_at.replace(tzinfo=UTC)
        if expires_at_utc < datetime.now(UTC):
            db.reset_commission(commission["id"])
            return "Approval link expired. Commission reset.", 410

    return render_template(
        "commission_review.html",
        token=token,
        commission=commission,
        rejection_reasons=REJECTION_REASONS,
    )


@app.route("/api/commissions/approve", methods=["POST"])
@limiter.limit("10 per minute")
def approve_commission():
    """POST — performs the actual approve/reject action."""
    token = request.form.get("token")
    approve = request.form.get("approve") == "true"
    reason_key = request.form.get("reason")

    if not token:
        return "Missing approval token", 400

    token_row = db.get_valid_approval_token(token)
    if not token_row:
        return "Invalid or expired approval link", 400

    if token_row["used_at"] is not None:
        return "This approval link has already been used.", 409

    commission = db.get_commission_by_id(token_row["commission_id"])
    if not commission:
        return "Commission not found", 404

    if commission["status"] != "pending":
        return "This request can no longer be processed.", 400

    # Expiry check
    expires_at = commission.get("expires_at")
    if expires_at:
        expires_at_utc = expires_at.replace(tzinfo=UTC)
        if expires_at_utc < datetime.now(UTC):
            db.reset_commission(commission["id"])
            return "Approval link expired. Commission reset.", 410

    # Determine rejection reason if needed
    reason_text = None
    if not approve:
        reason_text = REJECTION_REASONS.get(reason_key, "No reason provided")

    # Update commission and mark token used
    if approve:
        db.update_commission_status(commission["id"], "active", payout_hold=0)
        db.mark_approval_token_used(token)
        gif_url = random.choice(POSITIVE_GIFS)
        title = "Commission Approved"
        message = "The commission has been successfully approved."
    else:
        db.update_commission_status(commission["id"], "new", payout_hold=0)
        db.mark_approval_token_used(token)
        gif_url = random.choice(NEGATIVE_GIFS)
        title = "Commission Rejected"
        message = f"The commission was rejected. Reason: {reason_text}"

    # Send email to salesperson
    salesperson_email = commission["salesperson_email"]
    if salesperson_email:  # safeguard
        notification = Message(
            subject=f"Commission Application Result - ID {commission['id']}",
            sender=os.getenv("MAIL_DEFAULT_SENDER"),
            recipients=[salesperson_email],
            html=render_template(
                "commission_result_email.html",
                approved=approve,
                gif_url=gif_url,
                salesperson_name=commission["salesperson_name"],
                circuit_number=commission["circuitNumber"],
                client_name=commission["siteB_name"],
                commission_percentage=commission["commission_percentage"],
                rejection_reason=reason_text if not approve else None
            )
        )
        
        # 🔥 Start background thread
        Thread(
            target=send_async_email_to_salesperson,
            args=(current_app._get_current_object(), notification)
        ).start()

    # Render confirmation page for manager
    return render_template(
        "commission_result.html",
        title=title,
        message=message,
        gif_url=gif_url
    )

#Pause a commission
@app.route("/api/commissions/pause", methods=["POST"])
@jwt_required()
@role_required(['admin', 'finance'])
def pause_commission():
    data = request.get_json()
    commission_id = data.get("commission_id")

    if commission_id is None:
        return jsonify({"error": "commission_id is required"}), 400

    commission = db.get_commission_by_id(commission_id)

    if not commission:
        return jsonify({"error": "Commission not found"}), 404

    # SAFEGUARD
    if commission["status"] != "active":
        return jsonify({
            "error": f"Commission cannot be paused in '{commission['status']}' state"
        }), 400

    try:
        db.update_commission_status(
            commission_id=commission_id,
            status="paused",
            payout_hold=1
        )

        return jsonify({"message": "Commission paused successfully"}), 200

    except Exception as e:
        logger.exception("Error pausing commission")
        return jsonify({"error": "Failed to pause commission"}), 500

@app.route("/api/commissions/resume", methods=["POST"])
@jwt_required()
@role_required(['admin', 'finance'])
def resume_commission():
    data = request.get_json()
    commission_id = data.get("commission_id")

    if commission_id is None:
        return jsonify({"error": "commission_id is required"}), 400

    commission = db.get_commission_by_id(commission_id)

    if not commission:
        return jsonify({"error": "Commission not found"}), 404

    # SAFEGUARD
    if commission["status"] != "paused":
        return jsonify({
            "error": f"Commission cannot be resumed in '{commission['status']}' state"
        }), 400

    try:
        db.update_commission_status(
            commission_id=commission_id,
            status="active",
            payout_hold=0
        )

        return jsonify({"message": "Commission resumed successfully"}), 200

    except Exception as e:
        logger.exception("Error resuming commission")
        return jsonify({"error": "Failed to resume commission"}), 500
    
@app.route("/api/commissions/cancel", methods=["POST"])
@jwt_required()
@role_required(['admin', 'finance'])
def cancel_commission():
    data = request.get_json()
    commission_id = data.get("commission_id")

    if commission_id is None:
        return jsonify({"error": "commission_id is required"}), 400

    commission = db.get_commission_by_id(commission_id)

    if not commission:
        return jsonify({"error": "Commission not found"}), 404

    # SAFEGUARD
    if commission["status"] in ("completed", "expired"):
        return jsonify({
            "error": f"Commission cannot be cancelled in '{commission['status']}' state"
        }), 400

    try:
        db.update_commission_status(
            commission_id=commission_id,
            status="expired",
            payout_hold=1
        )

        return jsonify({"message": "Commission cancelled successfully"}), 200

    except Exception as e:
        logger.exception("Error cancelling commission")
        return jsonify({"error": "Failed to cancel commission"}), 500


#====================================================================================================================================================
# On the Commissions.jsx component there are 4 views. These are the endpoints for these views.
#====================================================================================================================================================

# 1. Earnings Summary View
# Called when the Earned tab is clicked. Each row is a commission earned for the month, with an 'Action' button where certain actions can be performed.
# Pay, Pause, Reverse, Cancel.

@app.route("/api/commissions/earnings_summary", methods=["GET"])
@jwt_required()
@role_required(['admin', 'sales', 'finance', 'technician'])
def commissions_earnings_summary():
    try:
        claims = get_jwt()
        user_id = claims.get("sub")
        role = claims.get("role")

        if role in ('admin', 'finance'):
            summary = db.get_commissions_earnings_summary()
        elif role in ('sales', 'technician'):
            summary = db.get_commissions_earnings_summary(user_id=user_id)
        else:
            summary = []


        return jsonify(summary), 200

    except Exception as e:
        logger.exception("Error fetching earnings summary")
        return jsonify({"error": "Internal server error"}), 500
    
    
# Called to pay a commission ledger entry, changing the status of the earned entries to 'paid'
@app.route("/api/commissions/earnings_summary/pay", methods=["POST"])
@jwt_required()
@role_required(["admin", "finance"])
def pay_commissions():
    data = request.get_json()

    user_id = data.get("user_id")
    earned_ids = data.get("earned_ledger_ids", [])
    payment_date = date.fromisoformat(
        data.get("payment_date", date.today().isoformat())
    )
    notes = data.get("notes")

    if not user_id or not earned_ids:
        return jsonify({
            "status": "error",
            "message": "user_id and earned_ledger_ids are required"
        }), 400

    paid_count = 0
    failed = []

    try:
        for ledger_id in earned_ids:
            success = db.create_commission_payment_entry(
                earned_ledger_id=ledger_id,
                payment_date=payment_date,
                notes=notes
            )

            if success:
                paid_count += 1
            else:
                failed.append(ledger_id)

        if not failed:
            return jsonify({
                "status": "success",
                "paid_entries": paid_count,
                "failed_entries": failed,
                "message": f"Paid {paid_count} commission(s) successfully."
            }), 200

        return jsonify({
            "status": "partial",
            "paid_entries": paid_count,
            "failed_entries": failed,
            "message": f"Paid {paid_count} commission(s). Failed: {failed}"
        }), 207

    except Exception as e:
        # Log server error
        logger.exception("Payment error")

        return jsonify({
            "status": "error",
            "paid_entries": paid_count,
            "failed_entries": failed,
            "message": "Payment processing failed"
        }), 400
    
# Called to reverse selected commission ledger entries, changing their status to 'reversed'
@app.route("/api/commissions/earnings_summary/reverse", methods=["POST"])
@jwt_required()
@role_required(["admin", "finance"])
def reverse_commissions():
    data = request.get_json()

    user_id = data.get("user_id")
    ledger_ids = data.get("ledger_ids", [])
    reversal_date = date.fromisoformat(
        data.get("reversal_date", date.today().isoformat())
    )
    notes = data.get("notes")

    if not user_id or not ledger_ids:
        return jsonify({
            "status": "error",
            "message": "user_id and ledger_ids are required"
        }), 400

    reversed_count = 0
    failed = []

    try:
        for ledger_id in ledger_ids:
            success = db.create_commission_reversal_entry(
                earned_ledger_id=ledger_id,
                reversal_date=reversal_date,
                notes=notes
            )

            if success:
                reversed_count += 1
            else:
                failed.append(ledger_id)

        if not failed:
            return jsonify({
                "status": "success",
                "reversed_entries": reversed_count,
                "failed_entries": failed,
                "message": f"Reversed {reversed_count} commission(s) successfully."
            }), 200

        return jsonify({
            "status": "partial",
            "reversed_entries": reversed_count,
            "failed_entries": failed,
            "message": f"Reversed {reversed_count} commission(s). Failed: {failed}"
        }), 207

    except Exception as e:
        logger.exception("Reversal error")
        return jsonify({
            "status": "error",
            "reversed_entries": reversed_count,
            "failed_entries": failed,
            "message": "Reversal processing failed"
        }), 400
    
# 2. Payout Summary View
@app.route("/api/commissions/payout_summary", methods=["GET"])
@jwt_required()
@role_required(['admin', 'sales', 'finance', 'technician'])
def commissions_paid_summary():
    try:
        claims = get_jwt()
        user_id = claims.get("sub")
        role = claims.get("role")

        if role in ('admin', 'finance'):
            summary = db.get_commissions_paid_summary()
        elif role in ('sales', 'technician'):
            summary = db.get_commissions_paid_summary(user_id=user_id)
        else:
            summary = []


        return jsonify(summary), 200

    except Exception as e:
        logger.exception("Error fetching payout summary")
        return jsonify({"error": "Internal server error"}), 500
    
#3. PROJECTION VIEW 
@app.route("/api/commissions/projections/<int:commission_id>", methods=["GET"])
@jwt_required()
@role_required(['admin', 'sales', 'finance', 'technician'])
def commission_projection(commission_id):
    try:
        claims = get_jwt()
        user_id = claims.get("sub")
        role = claims.get("role")

        logger.info("Projection request for commission %d by user %s (%s)", commission_id, user_id, role)


        # --------------------------------------------------------------
        # Get projection data (access control is handled in the query)
        # --------------------------------------------------------------
        data = db.get_commission_projection(commission_id, user_id, role)
        if not data:
            # If no data is returned, treat as unauthorized for non-admin/finance
            if role not in ("admin", "finance"):
                return jsonify({"error": "Unauthorized"}), 403
        return jsonify(data), 200

    except Exception as e:
        logger.exception("Error fetching projection")
        return jsonify({"error": "Internal server error"}), 500

# 4. Analytics View - this is the data for the charts in the Analytics tab. It includes monthly summaries, outstanding commissions, pipeline, and salesperson performance.
# TO DO: Build Frontend for this and add more analytics endpoints as needed.
@app.route("/api/health")
def health_check():
    return jsonify({"status": "ok"}), 200

@app.route("/api/commissions/analytics/monthly", methods=["GET"])
@jwt_required()
@role_required(['admin', 'finance'])
def commission_monthly_summary():
    conn = db.get_connection()
    try:
        data = get_commission_monthly_summary(conn)
        return jsonify(data)
    finally:
        conn.close()

@app.route("/api/commissions/analytics/outstanding", methods=["GET"])
@jwt_required()
@role_required(['admin', 'finance'])
def commission_outstanding():
    conn = db.get_connection()
    try:
        data = get_commission_outstanding(conn)
        return jsonify(data)
    finally:
        conn.close()

@app.route("/api/commissions/analytics/pipeline", methods=["GET"])
@jwt_required()
@role_required(['admin', 'finance'])
def commission_pipeline():
    conn = db.get_connection()
    try:
        data = get_commission_pipeline(conn)
        return jsonify(data)
    finally:
        conn.close()

@app.route("/api/commissions/analytics/sales", methods=["GET"])
@jwt_required()
@role_required(['admin', 'finance'])
def commission_sales():
    conn = db.get_connection()
    try:
        data = get_salesperson_commission_totals(conn)
        return jsonify(data)
    finally:
        conn.close()

@app.route("/api/commissions/analytics/dashboard", methods=["GET"])
@jwt_required()
@role_required(['admin', 'finance'])
def commission_dashboard():
    conn = db.get_connection()
    try:
        data = get_commission_dashboard(conn)
        return jsonify(data)
    finally:
        conn.close()

# Preview Commission Approval View - this is the page that the manager sees when they click the link in the email to approve or reject a commission agreement. This is a GET route that renders an HTML page with the details of the commission and approve/reject buttons.
@app.route("/preview/commission-approval")
def preview_commission_approval():

    
    rejection_reasons = {
        "margin": "Insufficient margin",
        "pricing": "Pricing does not align with policy",
        "contract": "Contract terms not acceptable",
        "duplicate": "Duplicate commission request",
        "other": "Other"
    }

    reject_links = {
        key: f"/fake/reject/{key}" for key in rejection_reasons
    }

    return render_template(
        "commission_approval.html",
        salesperson_name="Jacques du Toit",
        circuit_number="CIR-001245",
        client_name="ACME Corp",
        gp=350,
        commission_percentage=12,
        indicative_value=42,
        months=24,
        notes="Customer negotiated long-term deal.",
        approve_url="/fake/approve",
        reject_links=reject_links,
        rejection_reasons=rejection_reasons
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
