# app.py (V3 - "User Directory" Model with Registration)
# This server manages user identities (chosen by users) and relays signals.

from flask import Flask, render_template, request
from flask_socketio import SocketIO, emit, join_room, leave_room, close_room

app = Flask(__name__)
# Remember to change this key!
app.config['SECRET_KEY'] = 'your-super-secret-key-for-hackathon' 
# Tell SocketIO to use gevent for its async mode
socketio = SocketIO(app, async_mode='gevent', cors_allowed_origins="*")

# --- V3: User Directory ---
# This dictionary maps a user's chosen, unique username to their current session ID.
# e.g., USERS = { "alice": "sid_abc123", "bob": "sid_xyz789" }
USERS = {}

def get_user_id_from_sid(sid):
    """Helper to find a user_id based on their current session ID."""
    for user_id, session_id in USERS.items():
        if session_id == sid:
            return user_id
    return None

def broadcast_user_list():
    """Sends the updated list of online users to everyone."""
    # We send the entire USERS dict
    emit('user_list_update', {'users': USERS}, broadcast=True)

@app.route('/')
def index():
    """Serves the main HTML file."""
    # This route now just serves as a fallback, 
    # but the HTML file is what you'll open directly
    # or serve from your main web server.
    # For this to work with `flask run`, you need a `templates` folder
    # with `index.html` in it.
    try:
        return render_template('index.html')
    except Exception as e:
        print(f"Warning: Could not render template. {e}")
        return "Python server is running. Please open your index.html file in a browser."


# --- V3: Connection and Identity Management ---

@socketio.on('connect')
def on_connect():
    """A new client has connected. Wait for them to register."""
    print(f"Client connected: {request.sid}. Waiting for registration.")

@socketio.on('register_user')
def on_register_user(data):
    """Client is attempting to register with a username."""
    sid = request.sid
    username = data.get('username')

    if not username:
        emit('registration_failed', {'error': 'Username is required.'})
        return

    # Check if username is already in use
    if username in USERS:
        emit('registration_failed', {'error': 'Username is already taken.'})
        return

    # All good, register the user
    USERS[username] = sid
    
    # Tell the new client who they are
    emit('your_identity', {'id': username, 'sid': sid})
    print(f"User registered: {username} ({sid}). Total users: {len(USERS)}")

    # Tell everyone about the new user list
    broadcast_user_list()

@socketio.on('disconnect')
def on_disconnect():
    """A client has disconnected. Remove them and broadcast the new list."""
    sid = request.sid
    user_id = get_user_id_from_sid(sid)
    
    if user_id in USERS:
        del USERS[user_id]
        print(f"User disconnected: {user_id} ({sid}). Total users: {len(USERS)}")
        # Tell everyone about the new user list
        broadcast_user_list()
        
        # Also notify anyone who might have been in a "call" with them
        emit('peer_hung_up', {'peer_id': user_id}, broadcast=True)

# --- V2: Targeted WebRTC Signaling Relay (No changes) ---

@socketio.on('relay_signal')
def on_relay_signal(data):
    """
    Relays any WebRTC signal (offer, answer, candidate) to a specific target peer.
    'data' contains:
    - 'target_sid': The session ID of the user to send the signal to.
    - 'payload': The actual WebRTC signal data.
    """
    target_sid = data.get('target_sid')
    if not target_sid:
        print("Error: 'relay_signal' called without 'target_sid'")
        return

    # Add the sender's info to the payload so the receiver knows who it's from
    payload = data.get('payload', {})
    payload['from_id'] = get_user_id_from_sid(request.sid)
    payload['from_sid'] = request.sid
    
    # Emit the signal *only* to the target client
    print(f"Relaying '{payload.get('type')}' from {payload['from_id']} to {target_sid}")
    emit('signal_from_peer', payload, room=target_sid)

@socketio.on('hang_up')
def on_hang_up(data):
    """Relays a hang-up signal to a specific peer."""
    target_sid = data.get('target_sid')
    if target_sid:
        user_id = get_user_id_from_sid(request.sid)
        emit('peer_hung_up', {'peer_id': user_id}, room=target_sid)


if __name__ == '__main__':
    print("Starting Flask-SocketIO server on http://0.0.0.0:5000")
    # Make sure to run this with `python app.py`
    # You will need to have Flask and Flask-SocketIO installed:
    # pip install Flask Flask-SocketIO
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)

