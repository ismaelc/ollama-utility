import subprocess
import re
import json

def search_web(query):
    try:
        command = f"echo 'q\n' | ddgr {query} --json"
        print('[COMMAND]', command)
        process = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE)
        output, error = process.communicate()

        if error:
            print(f"Error: {error}")
            return []
        
        output = output.decode('utf-8')
        json_output = json.loads(output)  # convert string to Python object

        return json_output[:3]  # return only top 3 objects
    except Exception as e:
        print(f"An error occurred: {e}")