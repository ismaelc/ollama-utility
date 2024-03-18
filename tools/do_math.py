import urllib.parse

def do_math(input):
    decoded_input = urllib.parse.unquote(input)
    return eval(decoded_input)