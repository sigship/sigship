@app.after_request
def cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    return response
