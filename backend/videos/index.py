"""Загрузка, список, получение, удаление видео"""
import json, os, base64, uuid, psycopg2, boto3

CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id'
}

def get_conn():
    return psycopg2.connect(os.environ['DATABASE_URL'])

def get_user_from_session(cur, session_id):
    if not session_id:
        return None
    cur.execute("SELECT u.id, u.username, u.display_name, u.avatar_url FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.id=%s AND s.expires_at > NOW()", (session_id,))
    return cur.fetchone()

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
        # LIST videos
        if path.endswith('/list') and method == 'GET':
            user_id_filter = params.get('user_id')
            if user_id_filter:
                cur.execute("""
                    SELECT v.id, v.title, v.description, v.video_url, v.thumbnail_url, v.duration, v.views_count, v.created_at,
                           u.id, u.username, u.display_name, u.avatar_url,
                           (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id AND is_like=true),
                           (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id AND is_like=false)
                    FROM videos v JOIN users u ON v.user_id=u.id
                    WHERE v.user_id=%s AND v.status='active'
                    ORDER BY v.created_at DESC
                """, (user_id_filter,))
            else:
                cur.execute("""
                    SELECT v.id, v.title, v.description, v.video_url, v.thumbnail_url, v.duration, v.views_count, v.created_at,
                           u.id, u.username, u.display_name, u.avatar_url,
                           (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id AND is_like=true),
                           (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id AND is_like=false)
                    FROM videos v JOIN users u ON v.user_id=u.id
                    WHERE v.status='active'
                    ORDER BY v.created_at DESC
                """)
            rows = cur.fetchall()
            videos = []
            for r in rows:
                videos.append({
                    'id': r[0], 'title': r[1], 'description': r[2],
                    'video_url': r[3], 'thumbnail_url': r[4],
                    'duration': r[5], 'views_count': r[6],
                    'created_at': r[7].isoformat() if r[7] else None,
                    'author': {'id': r[8], 'username': r[9], 'display_name': r[10], 'avatar_url': r[11]},
                    'likes': r[12], 'dislikes': r[13]
                })
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'videos': videos})}

        # GET single video
        if path.endswith('/get') and method == 'GET':
            vid = params.get('id')
            if not vid:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'id required'})}
            cur.execute("""
                SELECT v.id, v.title, v.description, v.video_url, v.thumbnail_url, v.duration, v.views_count, v.created_at,
                       u.id, u.username, u.display_name, u.avatar_url, u.description, u.donate_qr_url,
                       (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id AND is_like=true),
                       (SELECT COUNT(*) FROM video_likes WHERE video_id=v.id AND is_like=false)
                FROM videos v JOIN users u ON v.user_id=u.id
                WHERE v.id=%s AND v.status='active'
            """, (vid,))
            r = cur.fetchone()
            if not r:
                return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Видео не найдено'})}
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'video': {
                'id': r[0], 'title': r[1], 'description': r[2],
                'video_url': r[3], 'thumbnail_url': r[4],
                'duration': r[5], 'views_count': r[6],
                'created_at': r[7].isoformat() if r[7] else None,
                'author': {'id': r[8], 'username': r[9], 'display_name': r[10], 'avatar_url': r[11], 'description': r[12], 'donate_qr_url': r[13]},
                'likes': r[14], 'dislikes': r[15]
            }})}

        # UPLOAD video
        if path.endswith('/upload') and method == 'POST':
            user = get_user_from_session(cur, session_id)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}

            title = (body.get('title') or '').strip()
            description = body.get('description') or ''
            video_b64 = body.get('video_data')
            thumb_b64 = body.get('thumbnail_data')
            duration = body.get('duration') or 0

            if not title or not video_b64:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Название и видео обязательны'})}

            s3 = get_s3()
            key_id = os.environ['AWS_ACCESS_KEY_ID']

            vid_key = f"videos/{uuid.uuid4()}.mp4"
            video_bytes = base64.b64decode(video_b64)
            s3.put_object(Bucket='files', Key=vid_key, Body=video_bytes, ContentType='video/mp4')
            video_url = f"https://cdn.poehali.dev/projects/{key_id}/files/{vid_key}"

            thumbnail_url = None
            if thumb_b64:
                thumb_key = f"thumbnails/{uuid.uuid4()}.jpg"
                thumb_bytes = base64.b64decode(thumb_b64)
                s3.put_object(Bucket='files', Key=thumb_key, Body=thumb_bytes, ContentType='image/jpeg')
                thumbnail_url = f"https://cdn.poehali.dev/projects/{key_id}/files/{thumb_key}"

            cur.execute(
                "INSERT INTO videos (user_id, title, description, video_url, thumbnail_url, duration) VALUES (%s,%s,%s,%s,%s,%s) RETURNING id",
                (user[0], title, description, video_url, thumbnail_url, duration)
            )
            video_id = cur.fetchone()[0]
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'id': video_id, 'video_url': video_url, 'thumbnail_url': thumbnail_url})}

        # VIEW (count unique views)
        if path.endswith('/view') and method == 'POST':
            vid = body.get('video_id')
            user = get_user_from_session(cur, session_id)
            if not vid or not user:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'ok': False})}
            cur.execute("INSERT INTO video_views (video_id, user_id) VALUES (%s,%s) ON CONFLICT DO NOTHING", (vid, user[0]))
            if cur.rowcount > 0:
                cur.execute("UPDATE videos SET views_count=views_count+1 WHERE id=%s", (vid,))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        # LIKE / DISLIKE
        if path.endswith('/like') and method == 'POST':
            user = get_user_from_session(cur, session_id)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            vid = body.get('video_id')
            is_like = body.get('is_like')
            cur.execute("SELECT id, is_like FROM video_likes WHERE video_id=%s AND user_id=%s", (vid, user[0]))
            existing = cur.fetchone()
            if existing:
                if existing[1] == is_like:
                    cur.execute("UPDATE video_likes SET is_like=NULL WHERE id=%s", (existing[0],))
                    cur.execute("UPDATE video_likes SET is_like=%s WHERE video_id=%s AND user_id=%s", (None, vid, user[0]))
                    conn.commit()
                    action = 'removed'
                else:
                    cur.execute("UPDATE video_likes SET is_like=%s WHERE id=%s", (is_like, existing[0]))
                    conn.commit()
                    action = 'updated'
            else:
                cur.execute("INSERT INTO video_likes (video_id, user_id, is_like) VALUES (%s,%s,%s)", (vid, user[0], is_like))
                conn.commit()
                action = 'added'
            cur.execute("SELECT COUNT(*) FROM video_likes WHERE video_id=%s AND is_like=true", (vid,))
            likes = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM video_likes WHERE video_id=%s AND is_like=false", (vid,))
            dislikes = cur.fetchone()[0]
            cur.execute("SELECT is_like FROM video_likes WHERE video_id=%s AND user_id=%s", (vid, user[0]))
            my_row = cur.fetchone()
            my_reaction = my_row[0] if my_row else None
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'action': action, 'likes': likes, 'dislikes': dislikes, 'my_reaction': my_reaction})}

        # GET LIKES for video
        if path.endswith('/likes') and method == 'GET':
            vid = params.get('video_id')
            cur.execute("SELECT COUNT(*) FROM video_likes WHERE video_id=%s AND is_like=true", (vid,))
            likes = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM video_likes WHERE video_id=%s AND is_like=false", (vid,))
            dislikes = cur.fetchone()[0]
            my_reaction = None
            user = get_user_from_session(cur, session_id)
            if user:
                cur.execute("SELECT is_like FROM video_likes WHERE video_id=%s AND user_id=%s", (vid, user[0]))
                row = cur.fetchone()
                if row:
                    my_reaction = row[0]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'likes': likes, 'dislikes': dislikes, 'my_reaction': my_reaction})}

        # COMMENTS list
        if path.endswith('/comments') and method == 'GET':
            vid = params.get('video_id')
            cur.execute("""
                SELECT c.id, c.text, c.created_at, u.id, u.username, u.display_name, u.avatar_url
                FROM comments c JOIN users u ON c.user_id=u.id
                WHERE c.video_id=%s ORDER BY c.created_at ASC
            """, (vid,))
            rows = cur.fetchall()
            comments = [{'id': r[0], 'text': r[1], 'created_at': r[2].isoformat(), 'author': {'id': r[3], 'username': r[4], 'display_name': r[5], 'avatar_url': r[6]}} for r in rows]
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'comments': comments})}

        # ADD COMMENT
        if path.endswith('/comment') and method == 'POST':
            user = get_user_from_session(cur, session_id)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            vid = body.get('video_id')
            text = (body.get('text') or '').strip()
            if not text:
                return {'statusCode': 400, 'headers': CORS, 'body': json.dumps({'error': 'Пустой комментарий'})}
            cur.execute("INSERT INTO comments (video_id, user_id, text) VALUES (%s,%s,%s) RETURNING id, created_at", (vid, user[0], text))
            row = cur.fetchone()
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({
                'comment': {'id': row[0], 'text': text, 'created_at': row[1].isoformat(),
                            'author': {'id': user[0], 'username': user[1], 'display_name': user[2], 'avatar_url': user[3]}}
            })}

        # DELETE video
        if path.endswith('/delete') and method == 'POST':
            user = get_user_from_session(cur, session_id)
            if not user:
                return {'statusCode': 401, 'headers': CORS, 'body': json.dumps({'error': 'Не авторизован'})}
            vid = body.get('video_id')
            cur.execute("UPDATE videos SET status='deleted' WHERE id=%s AND user_id=%s", (vid, user[0]))
            conn.commit()
            return {'statusCode': 200, 'headers': CORS, 'body': json.dumps({'ok': True})}

        return {'statusCode': 404, 'headers': CORS, 'body': json.dumps({'error': 'Not found'})}
    finally:
        cur.close()
        conn.close()
