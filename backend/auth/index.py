"""Регистрация, логин, выход, удаление аккаунта"""
import json, os, hashlib, secrets, psycopg2
from datetime import datetime

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id'
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def hash_password(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest()

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    session_id = event.get('headers', {}).get('x-session-id', '')

    conn = get_conn()
    cur = conn.cursor()

    try:
        # REGISTER
        if path.endswith('/register') and method == 'POST':
            username = (body.get('username') or '').strip().lower()
            email = (body.get('email') or '').strip().lower()
            password = body.get('password') or ''
            display_name = (body.get('display_name') or username).strip()

            if not username or not email or not password:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Заполните все поля'})}
            if len(username) < 3:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Логин минимум 3 символа'})}
            if len(password) < 6:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Пароль минимум 6 символов'})}
            if '@' not in email:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Некорректный email'})}

            cur.execute("SELECT id FROM users WHERE username=%s OR email=%s", (username, email))
            existing = cur.fetchone()
            if existing:
                cur.execute("SELECT id FROM users WHERE username=%s", (username,))
                if cur.fetchone():
                    return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Логин уже занят'})}
                return {'statusCode': 409, 'headers': CORS, 'body': json.dumps({'error': 'Email уже используется'})}

            pw_hash = hash_password(password)
            cur.execute(
                "INSERT INTO users (username, email, password_hash, display_name) VALUES (%s,%s,%s,%s) RETURNING id",
                (username, email, pw_hash, display_name)
            )
            user_id = cur.fetchone()[0]
            sid = secrets.token_hex(32)
            cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s,%s)", (sid, user_id))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'session_id': sid, 'user': {'id': user_id, 'username': username, 'display_name': display_name, 'email': email, 'theme': 'dark'}
            })}

        # LOGIN
        if path.endswith('/login') and method == 'POST':
            login = (body.get('login') or '').strip().lower()
            password = body.get('password') or ''
            pw_hash = hash_password(password)
            cur.execute("SELECT id, username, email, display_name, avatar_url, description, donate_qr_url, theme FROM users WHERE (username=%s OR email=%s) AND password_hash=%s", (login, login, pw_hash))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Неверный логин или пароль'})}
            sid = secrets.token_hex(32)
            cur.execute("INSERT INTO sessions (id, user_id) VALUES (%s,%s)", (sid, row[0]))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'session_id': sid,
                'user': {'id': row[0], 'username': row[1], 'email': row[2], 'display_name': row[3], 'avatar_url': row[4], 'description': row[5], 'donate_qr_url': row[6], 'theme': row[7] or 'dark'}
            })}

        # ME (get current user)
        if path.endswith('/me') and method == 'GET':
            if not session_id:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            cur.execute("SELECT u.id, u.username, u.email, u.display_name, u.avatar_url, u.description, u.donate_qr_url, u.theme FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.id=%s AND s.expires_at > NOW()", (session_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Сессия истекла'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'user': {'id': row[0], 'username': row[1], 'email': row[2], 'display_name': row[3], 'avatar_url': row[4], 'description': row[5], 'donate_qr_url': row[6], 'theme': row[7] or 'dark'}
            })}

        # LOGOUT
        if path.endswith('/logout') and method == 'POST':
            if session_id:
                cur.execute("UPDATE sessions SET expires_at=NOW() WHERE id=%s", (session_id,))
                conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # DELETE ACCOUNT
        if path.endswith('/delete') and method == 'POST':
            if not session_id:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            cur.execute("SELECT user_id FROM sessions WHERE id=%s AND expires_at > NOW()", (session_id,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            user_id = row[0]
            cur.execute("UPDATE sessions SET expires_at=NOW() WHERE user_id=%s", (user_id,))
            cur.execute("UPDATE users SET username=username||'_deleted_'||id, email=email||'_deleted', password_hash='' WHERE id=%s", (user_id,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
    finally:
        cur.close()
        conn.close()
