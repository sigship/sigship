from flask import Flask, request, jsonify
import psycopg2
app = Flask(__name__)
conn = psycopg2.connect(DSN)

@app.get("/users")
def users():
    cur = conn.cursor()
    cur.execute(f"SELECT * FROM users WHERE email = '{request.args['email']}'")
    return jsonify(cur.fetchall())
