from __future__ import print_function
import base64
import settings
import json
from httplib2 import Http
from oauth2client import file, client, tools
from flask import Flask, render_template, request
from googleapiclient.discovery import build
from urllib.error import HTTPError
from email.mime.text import MIMEText

app = Flask(__name__)

# because in javascript, months are zero-indexed
settings.start_date[1] -= 1
settings.end_date[1] -= 1

# If modifying these scopes, delete the file token.json.
SCOPES = 'https://www.googleapis.com/auth/gmail.modify'

@app.route('/')
def index():
    content = {
        'start_date': settings.start_date,
        'end_date': settings.end_date,
        'khateeb_request_email': settings.khateeb_request_email,
        'khateeb_reminder_email': settings.khateeb_reminder_email
    }
    return render_template('index.html', **content)

@app.route('/email-templates')
def email_templates():
    content = {
        'khateeb_request_email': settings.khateeb_request_email,
        'khateeb_reminder_email': settings.khateeb_reminder_email
    }
    return render_template('email_templates.html', **content)

@app.route('/faq')
def faq():
    return render_template('faq.html')

@app.route('/send-email', methods=['POST'])
def send_email():
    request_data = request.get_json()
    to_email =  request_data['email'];
    body = request_data['body'];
    subject = request_data['subject'];

    service = gmail_login()
    msg = create_message(to_email, subject, body)
    send_message(service, 'me', msg)

    return json.dumps({'success':True}), 200, {'ContentType':'application/json'}

def gmail_login():
    store = file.Storage('token.json')
    creds = store.get()
    if not creds or creds.invalid:
        flow = client.flow_from_clientsecrets('credentials.json', SCOPES)
        creds = tools.run_flow(flow, store)
    service = build('gmail', 'v1', http=creds.authorize(Http()))
    return service


def create_message(to, subject, message_text):
    """Create a message for an email.

    Args:
        sender: Email address of the sender.
        to: Email address of the receiver.
        subject: The subject of the email message.
        message_text: The text of the email message.

    Returns:
        An object containing a base64url encoded email object.
    """
    message = MIMEText(message_text, 'html')
    message['to'] = to
    message['subject'] = subject
    raw = base64.urlsafe_b64encode(message.as_bytes())
    return {'raw': raw.decode()}

def send_message(service, user_id, message):
    """Send an email message.

    Args:
        service: Authorized Gmail API service instance.
        user_id: User's email address. The special value "me"
        can be used to indicate the authenticated user.
        message: Message to be sent.

    Returns:
        Sent Message.
    """
    try:
        message = (service.users().messages().send(userId=user_id, body=message)
                   .execute())
        print('Message Id: %s' % message['id'])
        return message
    except HTTPError as error:
        print('An error occurred: %s' % error)
