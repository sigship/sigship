@app.get("/users")
def users():
    cur.execute("SELECT * FROM users WHERE email = %s", (request.args["email"],))
    return jsonify(cur.fetchall())
