const faqString = `
**How can I expose the Ollama server?**

By default, Ollama allows cross origin requests from 127.0.0.1 and 0.0.0.0.

To support more origins, you can use the OLLAMA_ORIGINS environment variable:

\`\`\`
OLLAMA_ORIGINS=${window.location.origin} ollama serve
\`\`\`

Also see: https://github.com/jmorganca/ollama/blob/main/docs/faq.md
`;



const clipboardIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-clipboard" viewBox="0 0 16 16">
<path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
<path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
</svg>`

const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
<path d="M5.5 5.5A.5.5 0 0 1 6 6h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5v-1zm2-3a.5.5 0 0 1 .5.5V5h-1V3a.5.5 0 0 1 .5-.5z"/>
<path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1h1.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.06l-.118-.06H4.118zM2.5 3V2h11v1h-11z"/>
</svg>`

// change settings of marked from default to remove deprecation warnings
// see conversation here: https://github.com/markedjs/marked/issues/2793
marked.use({
  mangle: false,
  headerIds: false
});

function autoFocusInput() {
  const userInput = document.getElementById('user-input');
  userInput.focus();
}

/*
takes in model as a string
updates the query parameters of page url to include model name
*/
function updateModelInQueryString(model) {
  // make sure browser supports features
  if (window.history.replaceState && 'URLSearchParams' in window) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("model", model);
    // replace current url without reload
    const newPathWithQuery = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState(null, '', newPathWithQuery);
  }
}

// Fetch available models and populate the dropdown
async function populateModels() {
  document.getElementById('send-button').addEventListener('click', submitRequest);

  try {
    const data = await getModels();

    const selectElement = document.getElementById('model-select');

    // set up handler for selection
    selectElement.onchange = (() => updateModelInQueryString(selectElement.value));

    data.models.forEach((model) => {
      const option = document.createElement('option');
      option.value = model.name;
      option.innerText = model.name;
      selectElement.appendChild(option);
    });

    // select option present in url parameter if present
    const queryParams = new URLSearchParams(window.location.search);
    const requestedModel = queryParams.get('model');
    // update the selection based on if requestedModel is a value in options
    if ([...selectElement.options].map(o => o.value).includes(requestedModel)) {
      selectElement.value = requestedModel;
    }
    // otherwise set to the first element if exists and update URL accordingly
    else if (selectElement.options.length) {
      selectElement.value = selectElement.options[0].value;
      updateModelInQueryString(selectElement.value);
    }
  }
  catch (error) {
    document.getElementById('errorText').innerHTML =
      DOMPurify.sanitize(marked.parse(
        `Ollama-ui was unable to communitcate with Ollama due to the following error:\n\n`
        + `\`\`\`${error.message}\`\`\`\n\n---------------------\n`
        + faqString));
    let modal = new bootstrap.Modal(document.getElementById('errorModal'));
    modal.show();
  }
}

// adjusts the padding at the bottom of scrollWrapper to be the height of the input box
function adjustPadding() {
  const inputBoxHeight = document.getElementById('input-area').offsetHeight;
  const scrollWrapper = document.getElementById('scroll-wrapper');
  scrollWrapper.style.paddingBottom = `${inputBoxHeight + 15}px`;
}

// sets up padding resize whenever input box has its height changed
const autoResizePadding = new ResizeObserver(() => {
  adjustPadding();
});
autoResizePadding.observe(document.getElementById('input-area'));



// Function to get the selected model
function getSelectedModel() {
  return document.getElementById('model-select').value;
}

// Function to get the system text
function getSystemText() {
  return document.getElementById('system-text').value;
}

// variables to handle auto-scroll
// we only need one ResizeObserver and isAutoScrollOn variable globally
// no need to make a new one for every time submitRequest is called
const scrollWrapper = document.getElementById('scroll-wrapper');
let isAutoScrollOn = true;
// autoscroll when new line is added
const autoScroller = new ResizeObserver(() => {
  if (isAutoScrollOn) {
    scrollWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
  }
});

// event listener for scrolling
let lastKnownScrollPosition = 0;
let ticking = false;
document.addEventListener("scroll", (event) => {
  // if user has scrolled up and autoScroll is on we turn it off
  if (!ticking && isAutoScrollOn && window.scrollY < lastKnownScrollPosition) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = false;
      ticking = false;
    });
    ticking = true;
  }
  // if user has scrolled nearly all the way down and autoScroll is disabled, re-enable
  else if (!ticking && !isAutoScrollOn &&
    window.scrollY > lastKnownScrollPosition && // make sure scroll direction is down
    window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 30 // add 30px of space--no need to scroll all the way down, just most of the way
  ) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = true;
      ticking = false;
    });
    ticking = true;
  }
  lastKnownScrollPosition = window.scrollY;
});


// Function to handle the user input and call the API functions
async function submitRequest() {
  document.getElementById('chat-container').style.display = 'block';

  const input = document.getElementById('user-input').value;
  // Ignore if input is empty or only contains whitespace
  if (!input || !input.trim()) {
    return;
  }

  // Create user message element and append to chat history
  let chatHistory = document.getElementById('chat-history');
  let parsedHistory = parseChatHistory(chatHistory.innerHTML)

  const selectedModel = getSelectedModel();
  // const context = document.getElementById('chat-history').context;
  const data = {
    model: selectedModel,
    system: getSystemText(),
    prompt: `${parsedHistory}\n[USER]: ${input}\n[ASSISTANT]:`,
    // context: context,
    options: {
      stop: ['[USER]:', '[ASSISTANT]:'],
      temperature: 0.1,
    }
  };

  // console.log('[DATA]', data)

  let userMessageDiv = document.createElement('div');
  userMessageDiv.className = 'mb-2 user-message';
  userMessageDiv.innerText = input;
  userMessageDiv.id = 'message-' + Date.now(); // Assign a unique ID to the message
  userMessageDiv.style.paddingLeft = '10px'; // Add left padding to user's message

  // User delete button
  let userDeleteButton = document.createElement('button');
  userDeleteButton.className = 'btn btn-secondary delete-button';
  userDeleteButton.innerHTML = deleteIcon;
  userDeleteButton.style.visibility = 'hidden'; // Hide the button initially
  userDeleteButton.style.marginLeft = '10px'; // Add margin between user's message and the trash button
  userDeleteButton.onclick = function () {
    // Remove the message from the chat history
    let message = document.getElementById(userMessageDiv.id);
    chatHistory.removeChild(message);
  };

  // Show the delete button when user hovers over their message
  userMessageDiv.onmouseover = function () {
    userDeleteButton.style.visibility = 'visible';
  };

  // Hide the delete button when user is not hovering over their message
  userMessageDiv.onmouseout = function () {
    userDeleteButton.style.visibility = 'hidden';
  };

  userMessageDiv.appendChild(userDeleteButton);
  chatHistory.appendChild(userMessageDiv);

  // Create response container
  let responseDiv = document.createElement('div');
  responseDiv.className = 'response-message mb-2 text-start';
  responseDiv.style.minHeight = '3em'; // make sure div does not shrink if we cancel the request when no text has been generated yet

  spinner = document.createElement('div');
  spinner.className = 'spinner-border text-light';
  spinner.setAttribute('role', 'status');
  responseDiv.appendChild(spinner);

  let responseTextDiv = document.createElement('div');
  responseDiv.appendChild(responseTextDiv);
  responseDiv.id = 'response-' + Date.now(); // Assign a unique ID to the response

  // Response delete button
  let responseDeleteButton = document.createElement('button');
  responseDeleteButton.className = 'btn btn-secondary delete-button';
  responseDeleteButton.innerHTML = deleteIcon;
  responseDeleteButton.style.visibility = 'hidden'; // Hide the button initially
  responseDeleteButton.onclick = function () {
    // Remove the response from the chat history
    let response = document.getElementById(responseDiv.id);
    chatHistory.removeChild(response);
    stopButton.click(); // Stop functionality added here
  };

  // Show the delete button when user hovers over the response
  responseDiv.onmouseover = function () {
    responseDeleteButton.style.visibility = 'visible';
  };

  // Hide the delete button when user is not hovering over the response
  responseDiv.onmouseout = function () {
    responseDeleteButton.style.visibility = 'hidden';
  };

  responseDiv.appendChild(responseDeleteButton);
  chatHistory.appendChild(responseDiv);

  // create button to stop text generation
  let interrupt = new AbortController();
  let stopButton = document.createElement('button');
  stopButton.className = 'btn btn-danger';
  stopButton.innerHTML = 'Stop';
  stopButton.onclick = (e) => {
    e.preventDefault();
    interrupt.abort('Stop button pressed');
  }
  // add button after sendButton
  const sendButton = document.getElementById('send-button');
  sendButton.insertAdjacentElement('beforebegin', stopButton);

  // change autoScroller to keep track of our new responseDiv
  autoScroller.observe(responseDiv);

  postRequest(data, interrupt.signal)
    .then(async response => {
      await getResponse(response, parsedResponse => {
        let word = parsedResponse.response;
        if (parsedResponse.done) {
          // parsedContext.context is an encoding of the conversation
          // prior to the latest message. It can be used to continue the conversation
          // example value is [1, 2, 3]
          // TODO: Do we need this?
          chatHistory.context = parsedResponse.context;
          // Copy button
          let copyButton = document.createElement('button');
          copyButton.className = 'btn btn-secondary copy-button';
          copyButton.innerHTML = clipboardIcon;
          copyButton.onclick = () => {
            navigator.clipboard.writeText(responseDiv.hidden_text).then(() => {
              console.log('Text copied to clipboard');
            }).catch(err => {
              console.error('Failed to copy text:', err);
            });
          };
          responseDiv.appendChild(copyButton);
          // Update the chat history with the assistant response
        }
        // add word to response
        if (word != undefined) {
          if (responseDiv.hidden_text == undefined) {
            responseDiv.hidden_text = "";
          }
          responseDiv.hidden_text += word;
          responseTextDiv.innerHTML = DOMPurify.sanitize(marked.parse(responseDiv.hidden_text)); // Append word to response container
        }
      });
    })
    .then(() => {
      stopButton.remove(); // Remove stop button from DOM now that all text has been generated
      spinner.remove();
    })
    .catch(error => {
      if (error !== 'Stop button pressed') {
        console.error(error);
      }
      stopButton.remove();
      spinner.remove();
    });

  // Clear user input
  document.getElementById('user-input').value = '';
}

function parseChatHistory(htmlString) {

  // Create a new DOMParser
  var parser = new DOMParser();
  // Use the DOMParser to turn the string into an HTMLDocument
  var doc = parser.parseFromString(htmlString, 'text/html');

  // Initialize an empty string to hold the output
  var output = '';

  // Get all the user messages
  var userMessages = doc.querySelectorAll('div[id^="message-"]');
  // Get all the assistant responses
  var assistantResponses = doc.querySelectorAll('div[id^="response-"]');

  // Loop through all the user messages
  for (var i = 0; i < userMessages.length; i++) {
    try {
      // Add the user message to the output string
      output += '[USER]: ' + userMessages[i].firstChild.textContent.trim() + '\n';
    } catch (error) {
      console.info('Error while processing user message: ', error);
    }

    try {
      // Add the assistant response to the output string
      output += '[ASSISTANT]: ' + assistantResponses[i].firstChild.textContent.trim() + '\n';
    } catch (error) {
      console.info('Error while processing assistant response: ', error);
    }
  }

  // Return the output string
  return output;
}

document.getElementById('user-input').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    e.preventDefault(); // Prevents the default action to be triggered
    if (e.shiftKey) {
      // If Shift is also pressed, insert a newline character
      let start = this.selectionStart;
      let end = this.selectionEnd;
      this.value = this.value.substring(0, start) + "\n" + this.value.substring(end);
      // Put cursor at right position again (add two for newline)
      this.selectionStart = this.selectionEnd = start + 1;
    } else {
      // If Shift is not pressed, submit the request
      submitRequest();
    }
  }
});

window.onload = () => {
  updateChatList();
  populateModels();
  adjustPadding();
  autoFocusInput();
  loadSystemText(); // Load system text from local storage

  document.getElementById("delete-chat").addEventListener("click", deleteChat);
  document.getElementById("saveName").addEventListener("click", saveChat);
  document.getElementById("chat-select").addEventListener("change", loadSelectedChat);
  document.getElementById("host-address").addEventListener("change", setHostAddress);
  document.getElementById("export-button").addEventListener("click", exportChat);
  document.getElementById("import-button").addEventListener("click", importChat);
  // Event listener for changes to the system text field
  document.getElementById('system-text').addEventListener('input', saveSystemText);
  document.getElementById('file-input').addEventListener('change', function(e) {
    const files = e.target.files;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      reader.onload = function(e) {
        const contents = e.target.result;
        const chatName = file.name.replace('.txt', '');
        localStorage.setItem(chatName, contents);
        updateChatList();
      };
      reader.readAsText(file);
    }
  });
  const chatHistory = document.getElementById('chat-history');
  const observer = new MutationObserver(updateTokenCounter);
  observer.observe(chatHistory, { childList: true, subtree: true });
}

function deleteChat() {
  const selectedChat = document.getElementById("chat-select").value;
  localStorage.removeItem(selectedChat);
  document.getElementById("chat-history").innerHTML = '';
  document.getElementById("chat-history").context = '';
  updateChatList();
}

// Function to save chat with a unique name
function saveChat() {
  const chatName = document.getElementById('userName').value;

  // Close the modal
  const bootstrapModal = bootstrap.Modal.getInstance(document.getElementById('nameModal'));
  bootstrapModal.hide();

  if (chatName === null || chatName.trim() === "") return;
  const history = document.getElementById("chat-history").innerHTML;
  const context = document.getElementById('chat-history').context;
  const model = getSelectedModel();
  localStorage.setItem(chatName, JSON.stringify({ "history": history, "context": context, "model": model }));
  updateChatList();
}

// Function to load selected chat from dropdown
function loadSelectedChat() {
  const selectedChat = document.getElementById("chat-select").value;
  const obj = JSON.parse(localStorage.getItem(selectedChat));
  document.getElementById("chat-history").innerHTML = obj.history;
  // document.getElementById("chat-history").context = obj.context;
  updateModelInQueryString(obj.model)
  document.getElementById('chat-container').style.display = 'block';
}

// Function to update chat list dropdown
function updateChatList() {
  const chatList = document.getElementById("chat-select");
  chatList.innerHTML = '<option value="" disabled selected>Select a chat</option>';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === "host-address") continue;
    if (key === 'system-text') continue;
    const option = document.createElement("option");
    option.value = key;
    option.text = key;
    chatList.add(option);
  }
}

// Save system-text to localStorage
function saveSystemText() {
  const systemText = getSystemText();
  localStorage.setItem('system-text', systemText);
}

// Load system-text from localStorage
function loadSystemText() {
  const systemText = localStorage.getItem('system-text');
  if (systemText) {
    document.getElementById('system-text').value = systemText;
  }
}

// Function to export chat to a local file
function exportChat() {
  console.log('exporting chat')
  const selectedChat = document.getElementById("chat-select").value;
  const data = localStorage.getItem(selectedChat);
  const blob = new Blob([data], {type: "text/plain;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = selectedChat + '.txt';
  link.href = url;
  link.click();
}

// Function to import chat from a local file
function importChat() {
  document.getElementById('file-input').click();
}

function getTokens(text) {
  // Encode text into tokens
  return encode(text)
}

function updateTokenCounter() {
  const chatHistory = document.getElementById('chat-history').innerText;
  const tokens = getTokens(chatHistory);
  document.getElementById('token-counter').innerText = `Tokens: ${tokens.length}`;
}