"""Редактирование профиля: имя, описание, аватар, QR донат, смена темы"""
import json, os, base64, uuid, psycopg2, boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id'
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_id(cur, session_id):
    if not session_id:
        return None
    cur.execute("SELECT user_id FROM sessions WHERE id=%s AND expires_at > NOW()", (session_id,))
    row = cur.fetchone()
    return row[0] if row else None

def get_s3():
    return boto3.client('s3',
        endpoint_url='https://bucket.poehali.dev',
        aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
        aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
    )

def handler(event: dict, context) -> dict:
    if event.get('httpMethod') == 'OPTIONS':
        return {'statusCode': 200, 'headers': CORS, 'body': ''}

    path = event.get('path', '/')
    method = event.get('httpMethod', 'GET')
    body = json.loads(event.get('body') or '{}')
    session_id = event.get('headers', {}).get('x-session-id', '')
    params = event.get('queryStringParameters') or {}

    conn = get_conn()
    cur = conn.cursor()

    try:
        # GET public profile by username
        if path.endswith('/user') and method == 'GET':
            username = params.get('username')
            cur.execute("SELECT id, username, display_name, avatar_url, description, created_at FROM users WHERE username=%s", (username,))
            row = cur.fetchone()
            if not row:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Пользователь не найден'})}
            cur.execute("SELECT COUNT(*) FROM videos WHERE user_id=%s AND status='active'", (row[0],))
            video_count = cur.fetchone()[0]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'profile': {
                'id': row[0], 'username': row[1], 'display_name': row[2],
                'avatar_url': row[3], 'description': row[4],
                'created_at': row[5].isoformat() if row[5] else None,
                'video_count': video_count
            }})}

        # UPDATE profile
        if path.endswith('/update') and method == 'POST':
            user_id = get_user_id(cur, session_id)
            if not user_id:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

            updates = []
            values = []

            if 'display_name' in body:
                updates.append("display_name=%s")
                values.append(body['display_name'].strip())

            if 'description' in body:
                updates.append("description=%s")
                values.append(body['description'])

            if 'donate_qr_url' in body:
                updates.append("donate_qr_url=%s")
                values.append(body['donate_qr_url'])

            if 'theme' in body:
                updates.append("theme=%s")
                values.append(body['theme'])

            if 'avatar_data' in body and body['avatar_data']:
                s3 = get_s3()
                key_id = os.environ['AWS_ACCESS_KEY_ID']
                avatar_key = f"avatars/{uuid.uuid4()}.jpg"
                avatar_bytes = base64.b64decode(body['avatar_data'])
                s3.put_object(Bucket='files', Key=avatar_key, Body=avatar_bytes, ContentType='image/jpeg')
                avatar_url = f"https://cdn.poehali.dev/projects/{key_id}/files/{avatar_key}"
                updates.append("avatar_url=%s")
                values.append(avatar_url)

            if not updates:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Нет данных для обновления'})}

            values.append(user_id)
            cur.execute(f"UPDATE users SET {', '.join(updates)} WHERE id=%s RETURNING id, username, email, display_name, avatar_url, description, donate_qr_url, theme", values)
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'user': {
                'id': row[0], 'username': row[1], 'email': row[2], 'display_name': row[3],
                'avatar_url': row[4], 'description': row[5], 'donate_qr_url': row[6], 'theme': row[7]
            }})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
    finally:
        cur.close()
        conn.close()
