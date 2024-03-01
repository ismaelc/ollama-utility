import urllib.request
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.text = ""
        self.ignore_tags = ['script', 'style', 'meta', 'link', 'head']
        self.skip = False

    def handle_starttag(self, tag, attrs):
        if tag in self.ignore_tags:
            self.skip = True

    def handle_endtag(self, tag):
        if tag in self.ignore_tags:
            self.skip = False

    def handle_data(self, data):
        if not self.skip:
            self.text += data

def scrape_text_from_url(url):
    with urllib.request.urlopen(url) as response:
        html = response.read().decode()
        parser = MyHTMLParser()
        parser.feed(html)
        return parser.text