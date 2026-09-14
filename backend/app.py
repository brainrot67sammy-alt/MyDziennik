import random
import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_FILE = 'dziennik.db'


def init_db():
  with sqlite3.connect(DB_FILE) as conn:
    cursor = conn.cursor()
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE,
                password TEXT,
                secretWord TEXT,
                role TEXT,
                firstName TEXT,
                lastName TEXT
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS verification_codes (
                id TEXT PRIMARY KEY,
                code TEXT,
                used BOOLEAN,
                usedBy TEXT
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS grades (
                id TEXT PRIMARY KEY,
                studentId TEXT,
                value TEXT,
                subject TEXT
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id TEXT PRIMARY KEY,
                studentId TEXT,
                status TEXT,
                date TEXT
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS tests (
                id TEXT PRIMARY KEY,
                title TEXT,
                timeSec INTEGER,
                q TEXT,
                ans TEXT
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS submissions (
                id TEXT PRIMARY KEY,
                testId TEXT,
                studentId TEXT,
                ok BOOLEAN,
                auto BOOLEAN
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                sender TEXT,
                text TEXT,
                time TEXT
            )
        ''')
    cursor.execute('''
            CREATE TABLE IF NOT EXISTS timetable (
                id TEXT PRIMARY KEY,
                day TEXT,
                hour TEXT,
                subject TEXT,
                className TEXT
            )
        ''')

    cursor.execute('SELECT COUNT(*) FROM users WHERE role = "teacher"')
    if cursor.fetchone()[0] == 0:
      cursor.execute(
          'INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)',
          ('t1', 'nauczyciel', 'domotokoks', 'admin', 'teacher', 'Jan', 'Kowalski'),
      )

    cursor.execute('SELECT COUNT(*) FROM timetable')
    if cursor.fetchone()[0] == 0:
      cursor.execute(
          'INSERT INTO timetable VALUES (?, ?, ?, ?, ?)',
          ('tt1', 'Poniedziałek', '8:00', 'Matematyka', '1A'),
      )
    conn.commit()


init_db()


def query_db(query, args=(), one=False):
  with sqlite3.connect(DB_FILE) as conn:
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute(query, args)
    rv = cur.fetchall()
    return (rv[0] if rv else None) if one else rv


def execute_db(query, args=()):
  with sqlite3.connect(DB_FILE) as conn:
    cur = conn.cursor()
    cur.execute(query, args)
    conn.commit()


@app.route('/api/login', methods=['POST'])
def login():
  data = request.json
  user = query_db(
      'SELECT * FROM users WHERE LOWER(username) = LOWER(?) AND password = ?',
      (data.get('username'), data.get('password')),
      one=True,
  )
  if user:
    return jsonify({'status': 'ok', 'user': dict(user)})
  return jsonify({'status': 'error', 'message': 'Błędny login lub hasło'}), 401


@app.route('/api/register', methods=['POST'])
def register():
  data = request.json
  vc = query_db(
      'SELECT * FROM verification_codes WHERE code = ? AND used = 0',
      (data.get('code'),),
      one=True,
  )
  if not vc:
    return (
        jsonify({
            'status': 'error',
            'message': 'Nieprawidłowy lub zużyty kod weryfikacyjny',
        }),
        400,
    )

  user_id = f"u-{int(random.random()*1000000)}"
  execute_db(
      'INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?)',
      (
          user_id,
          data.get('username'),
          data.get('password'),
          data.get('secretWord'),
          'student',
          data.get('firstName'),
          data.get('lastName'),
      ),
  )
  execute_db(
      'UPDATE verification_codes SET used = 1, usedBy = ? WHERE id = ?',
      (f"{data.get('firstName')} {data.get('lastName')}", vc['id']),
  )
  user = query_db('SELECT * FROM users WHERE id = ?', (user_id,), one=True)
  return jsonify({'status': 'ok', 'user': dict(user)})


@app.route('/api/codes', methods=['GET', 'POST'])
def manage_codes():
  if request.method == 'POST':
    code = f'{random.randint(100000, 999999)}'
    c_id = f"vc-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO verification_codes VALUES (?, ?, 0, NULL)', (c_id, code)
    )
    return jsonify({'id': c_id, 'code': code, 'used': 0})
  codes = query_db('SELECT * FROM verification_codes')
  return jsonify([dict(row) for row in codes])


@app.route('/api/grades', methods=['GET', 'POST'])
def manage_grades():
  if request.method == 'POST':
    data = request.json
    g_id = f"g-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO grades VALUES (?, ?, ?, ?)',
        (g_id, data['studentId'], data['value'], data.get('subject', '')),
    )
    return jsonify({'status': 'ok', 'id': g_id})
  grades = query_db('SELECT * FROM grades')
  return jsonify([dict(row) for row in grades])


@app.route('/api/attendance', methods=['GET', 'POST'])
def manage_attendance():
  if request.method == 'POST':
    data = request.json
    a_id = f"a-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO attendance VALUES (?, ?, ?, ?)',
        (a_id, data['studentId'], data['status'], data['date']),
    )
    return jsonify({'status': 'ok', 'id': a_id})
  att = query_db('SELECT * FROM attendance')
  return jsonify([dict(row) for row in att])


@app.route('/api/timetable', methods=['GET', 'POST'])
def manage_timetable():
  if request.method == 'POST':
    data = request.json
    tt_id = f"tt-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO timetable VALUES (?, ?, ?, ?, ?)',
        (
            tt_id,
            data['day'],
            data['hour'],
            data['subject'],
            data.get('className', '1A'),
        ),
    )
    return jsonify({'status': 'ok', 'id': tt_id})
  tt = query_db('SELECT * FROM timetable')
  return jsonify([dict(row) for row in tt])


@app.route('/api/tests', methods=['GET', 'POST'])
def manage_tests():
  if request.method == 'POST':
    data = request.json
    t_id = f"t-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO tests VALUES (?, ?, ?, ?, ?)',
        (t_id, data['title'], data['timeSec'], data['q'], data['ans']),
    )
    return jsonify({'status': 'ok', 'id': t_id})
  tests = query_db('SELECT * FROM tests')
  return jsonify([dict(row) for row in tests])


@app.route('/api/submissions', methods=['GET', 'POST'])
def manage_submissions():
  if request.method == 'POST':
    data = request.json
    s_id = f"subm-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO submissions VALUES (?, ?, ?, ?, ?)',
        (
            s_id,
            data['testId'],
            data['studentId'],
            1 if data['ok'] else 0,
            1 if data.get('auto') else 0,
        ),
    )
    return jsonify({'status': 'ok', 'id': s_id})
  subs = query_db('SELECT * FROM submissions')
  return jsonify([dict(row) for row in subs])


@app.route('/api/messages', methods=['GET', 'POST'])
def manage_messages():
  if request.method == 'POST':
    data = request.json
    m_id = f"m-{int(random.random()*1000000)}"
    execute_db(
        'INSERT INTO messages VALUES (?, ?, ?, ?)',
        (m_id, data['sender'], data['text'], data['time']),
    )
    return jsonify({'status': 'ok', 'id': m_id})
  msgs = query_db('SELECT * FROM messages')
  return jsonify([dict(row) for row in msgs])


@app.route('/api/users', methods=['GET'])
def get_users():
  users = query_db('SELECT id, username, role, firstName, lastName FROM users')
  return jsonify([dict(row) for row in users])


if __name__ == '__main__':
  app.run(port=5000, debug=True)
  
