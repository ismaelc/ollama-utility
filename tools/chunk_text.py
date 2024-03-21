from semantic_text_splitter import TextSplitter

def chunk_text(text, max_characters=2000):
    splitter = TextSplitter()
    return splitter.chunks(text, chunk_capacity=(1000, max_characters))
    # return splitter.chunks(text, max_characters=max_characters)