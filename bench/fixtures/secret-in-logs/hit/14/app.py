@app.post("/login")
def login():
    password = request.form["password"]
    print("login", request.form["email"], password)
    return auth(request.form["email"], password)
