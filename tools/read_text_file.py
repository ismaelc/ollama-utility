def read_text_file(file_path):
    try:
        with open(file_path, 'r') as file:
            return file.read()
    except FileNotFoundError:
        return "The file does not exist"
    except Exception as e:
        return f"\n[FILE CONTENT]\n{str(e)}"