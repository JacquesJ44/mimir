from flask import Flask
from flask_mail import Mail, Message
from db import DbUtil  # Your existing DB handler
from dotenv import load_dotenv
import os

# Load variables from .env
load_dotenv()

# Set up a minimal Flask app context for Flask-Mail to work
app = Flask(__name__)

# Email Config
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_USERNAME')
recipient_email = os.getenv('RECIPIENT_EMAIL')

mail = Mail(app)

def format_circuit_email(expiring_circuits, expired_circuits):
    expiring_lines = [
        f"ID: {c['id']}, Number: {c['circuitNumber']}, Owner: {c['circuitOwner']}, Site B: {c['siteB_name']}, End Date: {c['endDate']}"
        for c in expiring_circuits
    ]
    expired_lines = [
        f"ID: {c['id']}, Number: {c['circuitNumber']}, Owner: {c['circuitOwner']}, Site B: {c['siteB_name']}, End Date: {c['endDate']}"
        for c in expired_circuits
    ]

    message = "Circuits expiring within 5 months:\n\n"
    message += "\n".join(expiring_lines) if expiring_lines else "None\n"

    message += "\n\nCircuits out of contract:\n\n"
    message += "\n".join(expired_lines) if expired_lines else "None\n"

    return message

def main():
    db = DbUtil({
        'host': os.getenv('DB_HOST'),
        'user': os.getenv('DB_USER'),
        'password': os.getenv('DB_PASSWORD'),
        'db': os.getenv('DB_NAME')
    })

    expiring = db.fetch_expiring_circuits()
    expired = db.fetch_expired_circuits()

    # Just log if empty, but don't stop
    if not expiring:
        print("No expiring circuits found.")
    if not expired:
        print("No expired circuits found.")

    with app.app_context():
        body = format_circuit_email(expiring, expired)
        msg = Message(
            subject="Mimir: Circuits Expiring Soon",
            recipients=[recipient_email],
            body=body
        )
        mail.send(msg)
        print(f"Sent notification to {recipient_email}.")

if __name__ == "__main__":
    main()
