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
    # Define a header row
    header = f"{'ID':<5} {'Circuit Number':<30} {'Owner':<15} {'Site B':<40} {'End Date':<15} {'Status':<10}"

    def format_rows(circuits):
        return [
            f"{c['id']:<5} {c['circuitNumber']:<30} {c['circuitOwner']:<15} {c['siteB_name']:<40} {c['endDate'].strftime('%Y-%m-%d'):<15} {c['status']:<10}"
            for c in circuits
        ]

    message = "Circuits expiring within 5 months:\n\n"
    if expiring_circuits:
        message += header + "\n" + "-" * len(header) + "\n"
        message += "\n".join(format_rows(expiring_circuits))
    else:
        message += "None"

    message += "\n\n\nCircuits out of contract:\n\n"
    if expired_circuits:
        message += header + "\n" + "-" * len(header) + "\n"
        message += "\n".join(format_rows(expired_circuits))
    else:
        message += "None"

    return message

# def format_circuit_email(expiring_circuits, expired_circuits):

#     # Define a header row
#     header = f"{'ID':<5} {'Circuit Number':<18} {'Owner':<15} {'Site B':<20} {'End Date':<12} {'Status':<10}"
    
#     expiring_lines = [

#         f"ID: {c['id']} \n Circuit Number: {c['circuitNumber']} \n Owner: {c['circuitOwner']} \n Site B: {c['siteB_name']} \n End Date: {c['endDate']} \n Status: {c['status']} \n"
#         for c in expiring_circuits
#     ]
#     expired_lines = [
#         f"ID: {c['id']} \n Circuit Number: {c['circuitNumber']} \n Owner: {c['circuitOwner']} \n Site B: {c['siteB_name']} \n End Date: {c['endDate']} \n Status: {c['status']} \n"
#         for c in expired_circuits
#     ]

#     message = "Circuits expiring within 5 months:\n\n"
#     message += "\n".join(expiring_lines) if expiring_lines else "None\n"

#     message += "\n\nCircuits out of contract:\n\n"
#     message += "\n".join(expired_lines) if expired_lines else "None\n"

#     return message

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
