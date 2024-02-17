// Constants

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
</svg>`;

const deleteIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
<path d="M5.5 5.5A.5.5 0 0 1 6 6h4a.5.5 0 0 1 0 1H6a.5.5 0 0 1-.5-.5v-1zm2-3a.5.5 0 0 1 .5.5V5h-1V3a.5.5 0 0 1 .5-.5z"/>
<path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1h1.5a1 1 0 0 1 1 1v1zM4.118 4L4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.06l-.118-.06H4.118zM2.5 3V2h11v1h-11z"/>
</svg>`;

// -------- CONSTANTS --------

// change settings of marked from default to remove deprecation warnings
// see conversation here: https://github.com/markedjs/marked/issues/2793
marked.use({
  mangle: false,
  headerIds: false,
});

let interrupt = new AbortController();
// variables to handle auto-scroll
// we only need one ResizeObserver and isAutoScrollOn variable globally
// no need to make a new one for every time submitRequest is called
let isAutoScrollOn = true;
let lastKnownScrollPosition = 0;
let ticking = false;
const scrollWrapper = document.getElementById("scroll-wrapper");
// autoscroll when new line is added
const autoScroller = new ResizeObserver(() => {
  if (isAutoScrollOn) {
    scrollWrapper.scrollIntoView({ behavior: "smooth", block: "end" });
  }
});

// -------- EVENT LISTENERS --------

document.getElementById("user-input").addEventListener("keydown", function (e) {
  if (e.key === "Enter") {
    e.preventDefault(); // Prevents the default action to be triggered
    if (e.shiftKey) {
      // If Shift is also pressed, insert a newline character
      let start = this.selectionStart;
      let end = this.selectionEnd;
      this.value =
        this.value.substring(0, start) + "\n" + this.value.substring(end);
      // Put cursor at right position again (add two for newline)
      this.selectionStart = this.selectionEnd = start + 1;
    } else {
      // If Shift is not pressed, submit the request
      submitRequest();
    }
  }
});

document.getElementById("delete-chat").addEventListener("click", deleteChat);
document.getElementById("saveName").addEventListener("click", function() {
  const selectedOption = document.querySelector('input[name="utilityOption"]:checked').value;
  if (selectedOption === "chat") {
      saveChat();
  } else if (selectedOption === "notepad") {
      saveNotepad();
  }
});
document
  .getElementById("chat-select")
  .addEventListener("change", loadSelectedSession);
document
  .getElementById("host-address")
  .addEventListener("change", setHostAddress);
document.getElementById("export-button").addEventListener("click", exportChat);
document.getElementById("import-button").addEventListener("click", importChat);
document
  .getElementById("system-text")
  .addEventListener("input", saveSystemText);
document
  .getElementById("file-input")
  .addEventListener("change", fileInputChange);
document
  .getElementById("generate-button")
  .addEventListener("click", generateText);
document.getElementById("save-notepad").addEventListener("click", saveNotepad);
document
  .getElementById("delete-notepad")
  .addEventListener("click", deleteNotepad);
document
  .getElementById("notepad1")
  .addEventListener("input", updateNotebookTokenCounter);

// event listener for scrolling
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
  else if (
    !ticking &&
    !isAutoScrollOn &&
    window.scrollY > lastKnownScrollPosition && // make sure scroll direction is down
    window.scrollY >=
      document.documentElement.scrollHeight - window.innerHeight - 30 // add 30px of space--no need to scroll all the way down, just most of the way
  ) {
    window.requestAnimationFrame(() => {
      isAutoScrollOn = true;
      ticking = false;
    });
    ticking = true;
  }
  lastKnownScrollPosition = window.scrollY;
});

const chatHistory = document.getElementById("chat-history");
const observer = new MutationObserver(updateTokenCounter);
observer.observe(chatHistory, { childList: true, subtree: true });

var radios = document.getElementsByName("utilityOption");
for (var i = 0; i < radios.length; i++) {
  radios[i].addEventListener("change", function () {
    // If a text generation is in progress, interrupt it
    interrupt.abort();
    // Create a new AbortController for the next text generation
    interrupt = new AbortController();
    document.getElementById("chat-container").style.display =
      this.value === "chat" ? "block" : "none";
    document.getElementById("chat-input-area").style.display =
      this.value === "chat" ? "block" : "none";
    document.getElementById("notepad-container").style.display =
      this.value === "notepad" ? "block" : "none";

    // Update the dropdown selection
    updateDropdownSelection(this.value);
  });
}

// -------- HELPER FUNCTIONS --------

/*
takes in model as a string
updates the query parameters of page url to include model name
*/
function updateModelInQueryString(model) {
  // make sure browser supports features
  if (window.history.replaceState && "URLSearchParams" in window) {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set("model", model);
    // replace current url without reload
    const newPathWithQuery = `${
      window.location.pathname
    }?${searchParams.toString()}`;
    window.history.replaceState(null, "", newPathWithQuery);
  }
}

// adjusts the padding at the bottom of scrollWrapper to be the height of the input box
function adjustPadding() {
  const inputBoxHeight =
    document.getElementById("chat-input-area").offsetHeight;
  const scrollWrapper = document.getElementById("scroll-wrapper");
  scrollWrapper.style.paddingBottom = `${inputBoxHeight + 15}px`;
}

// Function to get the selected model
function getSelectedModel() {
  return document.getElementById("model-select").value;
}

// Function to get the system text
function getSystemText() {
  return document.getElementById("system-text").value;
}

function displayChatContainer() {
  document.getElementById("chat-container").style.display = "block";
}

function getUserInput() {
  return document.getElementById("user-input").value;
}

function isValidInput(input) {
  return input && input.trim();
}

function prepareData(input, parsedHistory) {
  const selectedModel = getSelectedModel();
  return {
    model: selectedModel,
    system: getSystemText(),
    prompt: `${parsedHistory}\n[USER]: ${input}\n[ASSISTANT]:`,
    options: {
      stop: ["[USER]", "[ASSISTANT]"],
      temperature: 0.1,
    },
  };
}

function createUserMessageDiv(input) {
  let userMessageDiv = document.createElement("div");
  userMessageDiv.className = "mb-2 user-message";
  userMessageDiv.innerText = input;
  userMessageDiv.id = "message-" + Date.now();
  userMessageDiv.style.paddingLeft = "10px";
  let userDeleteButton = createUserDeleteButton(userMessageDiv.id);
  userMessageDiv.addEventListener("mouseover", function () {
    userDeleteButton.style.visibility = "visible";
  });
  userMessageDiv.addEventListener("mouseout", function () {
    userDeleteButton.style.visibility = "hidden";
  });
  userMessageDiv.appendChild(userDeleteButton);
  return userMessageDiv;
}

function createUserDeleteButton(messageId) {
  let userDeleteButton = document.createElement("button");
  userDeleteButton.className = "btn btn-secondary delete-button delete-icon";
  userDeleteButton.innerHTML = deleteIcon;
  userDeleteButton.style.visibility = "hidden";
  userDeleteButton.style.marginLeft = "10px";
  userDeleteButton.onclick = function () {
    let message = document.getElementById(messageId);
    chatHistory.removeChild(message);
  };
  return userDeleteButton;
}

function createResponseDiv() {
  let responseDiv = document.createElement("div");
  responseDiv.className = "response-message mb-2 text-start";
  responseDiv.style.minHeight = "3em";
  spinner = document.createElement("div");
  spinner.className = "spinner-border text-light";
  spinner.setAttribute("role", "status");
  responseDiv.appendChild(spinner);
  let responseTextDiv = document.createElement("div");
  responseDiv.appendChild(responseTextDiv);
  responseDiv.id = "response-" + Date.now();
  let responseDeleteButton = createResponseDeleteButton(responseDiv.id);
  responseDiv.addEventListener("mouseover", function () {
    responseDeleteButton.style.visibility = "visible";
  });
  responseDiv.addEventListener("mouseout", function () {
    responseDeleteButton.style.visibility = "hidden";
  });
  responseDiv.appendChild(responseDeleteButton);
  return { responseDiv, responseTextDiv };
}

function createResponseDeleteButton(responseId) {
  let responseDeleteButton = document.createElement("button");
  responseDeleteButton.className =
    "btn btn-secondary delete-button delete-icon";
  responseDeleteButton.innerHTML = deleteIcon;
  responseDeleteButton.style.visibility = "hidden";
  responseDeleteButton.onclick = function () {
    let response = document.getElementById(responseId);
    chatHistory.removeChild(response);
    stopButton.click();
  };
  return responseDeleteButton;
}

function createStopButton() {
  interrupt = new AbortController();
  let stopButton = document.createElement("button");
  stopButton.className = "btn btn-danger";
  stopButton.innerHTML = "Stop";
  stopButton.onclick = (e) => {
    e.preventDefault();
    interrupt.abort("Stop button pressed");
  };
  return stopButton;
}

function handlePostRequest(data, stopButton, responseDiv, responseTextDiv) {
  postRequest(data, interrupt.signal)
    .then(async (response) => {
      await getResponse(response, (parsedResponse) => {
        handleResponse(parsedResponse, responseDiv, responseTextDiv);
      });
    })
    .then(() => {
      stopButton.remove();
      spinner.remove();
    })
    .catch((error) => {
      if (error !== "Stop button pressed") {
        console.error(error);
      }
      stopButton.remove();
      spinner.remove();
    });
}

function handleResponse(parsedResponse, responseDiv, responseTextDiv) {
  let word = parsedResponse.response;
  if (parsedResponse.done) {
    chatHistory.context = parsedResponse.context;
    let copyButton = createCopyButton(responseDiv.hidden_text);
    responseDiv.appendChild(copyButton);
  }
  if (word != undefined) {
    if (responseDiv.hidden_text == undefined) {
      responseDiv.hidden_text = "";
    }
    responseDiv.hidden_text += word;
    responseTextDiv.innerHTML = DOMPurify.sanitize(
      marked.parse(responseDiv.hidden_text)
    );
  }
}

function createCopyButton(hidden_text) {
  let copyButton = document.createElement("button");
  copyButton.className = "btn btn-secondary copy-button";
  copyButton.innerHTML = clipboardIcon;
  copyButton.onclick = () => {
    navigator.clipboard
      .writeText(hidden_text)
      .then(() => {
        console.log("Text copied to clipboard");
      })
      .catch((err) => {
        console.error("Failed to copy text:", err);
      });
  };
  return copyButton;
}

function clearUserInput() {
  document.getElementById("user-input").value = "";
}

function parseChatHistory(htmlString) {
  // Create a new DOMParser
  var parser = new DOMParser();
  // Use the DOMParser to turn the string into an HTMLDocument
  var doc = parser.parseFromString(htmlString, "text/html");

  // Initialize an empty string to hold the output
  var output = "";

  // Get all the user messages
  var userMessages = doc.querySelectorAll('div[id^="message-"]');
  // Get all the assistant responses
  var assistantResponses = doc.querySelectorAll('div[id^="response-"]');

  // Loop through all the user messages
  for (var i = 0; i < userMessages.length; i++) {
    try {
      // Add the user message to the output string
      output +=
        "[USER]: " + userMessages[i].firstChild.textContent.trim() + "\n";
    } catch (error) {
      console.info("Error while processing user message: ", error);
    }

    try {
      // Add the assistant response to the output string
      output +=
        "[ASSISTANT]: " +
        assistantResponses[i].firstChild.textContent.trim() +
        "\n";
    } catch (error) {
      console.info("Error while processing assistant response: ", error);
    }
  }

  // Return the output string
  return output;
}

function updateDropdownSelection() {
  var dropdown = document.getElementById("chat-select");
  for (var i = 0; i < dropdown.options.length; i++) {
    if (dropdown.options[i].disabled) {
      dropdown.selectedIndex = i;
      break;
    }
  }
}

// Save system-text to localStorage
function saveSystemText() {
  const systemText = getSystemText();
  localStorage.setItem("system-text", systemText);
}

// Load system-text from localStorage
function loadSystemText() {
  const systemText = localStorage.getItem("system-text");
  if (systemText) {
    document.getElementById("system-text").value = systemText;
  }
}

// Function to export chat to a local file
// TODO: Include other attributes like .model
function exportChat() {
  console.log("exporting chat");
  const selectedChat = document.getElementById("chat-select").value;
  const data = localStorage.getItem(selectedChat);
  const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = selectedChat + ".txt";
  link.href = url;
  link.click();
}

// Function to import chat from a local file
function importChat() {
  document.getElementById("file-input").click();
}

function fileInputChange(e) {
  const files = e.target.files;
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const reader = new FileReader();
    reader.onload = function (e) {
      const contents = e.target.result;
      const chatName = file.name.replace(".txt", "");
      localStorage.setItem(chatName, contents);
      updateChatList();
    };
    reader.readAsText(file);
  }
}

function getTokens(text) {
  // Encode text into tokens
  return encode(text);
}

function updateTokenCounter() {
  const chatHistory = document.getElementById("chat-history").innerText;
  const tokens = getTokens(chatHistory);
  document.getElementById(
    "token-counter"
  ).innerText = `Tokens: ${tokens.length}`;

  // Check the token count after updating it
  checkTokenCount();
}

function updateNotebookTokenCounter() {
  const textarea = document.getElementById("notepad1");
  const tokens = getTokens(textarea.value);
  document.getElementById(
    "notepad-token-counter"
  ).innerText = `Tokens: ${tokens.length}`;

  // Check the token count after updating it
  checkNotebookTokenCount();
}

function checkTokenCount() {
  const tokenCounter = document.getElementById("token-counter").innerText;
  const tokenCount = parseInt(tokenCounter.split(":")[1].trim());
  const deleteChatButton = document.getElementById("delete-chat");
  const saveChatButton = document.getElementById("save-chat");

  if (tokenCount === 0) {
    deleteChatButton.disabled = true;
    saveChatButton.disabled = true;
  } else {
    deleteChatButton.disabled = false;
    saveChatButton.disabled = false;
  }
}

function checkNotebookTokenCount() {
  const tokenCounter = document.getElementById(
    "notepad-token-counter"
  ).innerText;
  const tokenCount = parseInt(tokenCounter.split(":")[1].trim());
  const generateButton = document.getElementById("generate-button");

  if (tokenCount === 0) {
    generateButton.disabled = true;
  } else {
    generateButton.disabled = false;
  }
}

// -------- MAIN FUNCTIONS --------

function autoFocusInput() {
  const userInput = document.getElementById("user-input");
  userInput.focus();
}

// sets up padding resize whenever input box has its height changed
const autoResizePadding = new ResizeObserver(() => {
  adjustPadding();
});
autoResizePadding.observe(document.getElementById("chat-input-area"));

// Fetch available models and populate the dropdown
async function populateModels() {
  document
    .getElementById("send-button")
    .addEventListener("click", submitRequest);

  try {
    const data = await getModels();

    const selectElement = document.getElementById("model-select");

    // set up handler for selection
    selectElement.onchange = () =>
      updateModelInQueryString(selectElement.value);

    data.models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.name;
      option.innerText = model.name;
      selectElement.appendChild(option);
    });

    // select option present in url parameter if present
    const queryParams = new URLSearchParams(window.location.search);
    const requestedModel = queryParams.get("model");
    // update the selection based on if requestedModel is a value in options
    if (
      [...selectElement.options].map((o) => o.value).includes(requestedModel)
    ) {
      selectElement.value = requestedModel;
    }
    // otherwise set to the first element if exists and update URL accordingly
    else if (selectElement.options.length) {
      selectElement.value = selectElement.options[0].value;
      updateModelInQueryString(selectElement.value);
    }
  } catch (error) {
    document.getElementById("errorText").innerHTML = DOMPurify.sanitize(
      marked.parse(
        `Ollama-ui was unable to communitcate with Ollama due to the following error:\n\n` +
          `\`\`\`${error.message}\`\`\`\n\n---------------------\n` +
          faqString
      )
    );
    let modal = new bootstrap.Modal(document.getElementById("errorModal"));
    modal.show();
  }
}

async function submitRequest() {
  displayChatContainer();
  const input = getUserInput();
  if (!isValidInput(input)) {
    return;
  }
  let chatHistory = document.getElementById("chat-history");
  let parsedHistory = parseChatHistory(chatHistory.innerHTML);
  const data = prepareData(input, parsedHistory);
  let userMessageDiv = createUserMessageDiv(input);
  chatHistory.appendChild(userMessageDiv);
  let { responseDiv, responseTextDiv } = createResponseDiv();
  chatHistory.appendChild(responseDiv);
  let stopButton = createStopButton();
  const sendButton = document.getElementById("send-button");
  sendButton.insertAdjacentElement("beforebegin", stopButton);
  autoScroller.observe(responseDiv);
  handlePostRequest(data, stopButton, responseDiv, responseTextDiv);
  clearUserInput();
}

async function generateText() {
  const input = document.getElementById("notepad1").value;
  if (!input || !input.trim()) {
    return;
  }

  // Clear the 2nd text area
  document.getElementById("notepad2").value = "";

  const selectedModel = getSelectedModel();
  const data = {
    model: selectedModel,
    system: getSystemText(),
    prompt: input,
    options: {
      temperature: 0.1,
    },
  };

  interrupt = new AbortController();
  let stopButton = document.getElementById("stop-generate-button");
  stopButton.onclick = (e) => {
    e.preventDefault();
    interrupt.abort("Stop button pressed");
  };

  // Create spinner and add it next to the Generate button
  let generateButton = document.getElementById("generate-button");
  let spinner = document.createElement("span");
  spinner.className = "spinner-border spinner-border-sm";
  spinner.setAttribute("role", "status");
  spinner.setAttribute("aria-hidden", "true");
  generateButton.disabled = true;
  generateButton.innerHTML = spinner.outerHTML + " Generating...";

  postRequest(data, interrupt.signal)
    .then(async (response) => {
      await getResponse(response, (parsedResponse) => {
        let word = parsedResponse.response;
        if (parsedResponse.done) {
          //stopButton.remove();
        }
        if (word != undefined) {
          document.getElementById("notepad2").value += decodeURIComponent(word);
        }
      });
    })
    .catch((error) => {
      if (error !== "Stop button pressed") {
        console.error(error);
      }
      //stopButton.remove();
    })
    .finally(() => {
      // Remove spinner and enable the Generate button
      generateButton.innerHTML = "Generate";
      generateButton.disabled = false;
    });
}

function deleteChat() {
  const selectedChat = document.getElementById("chat-select").value;
  localStorage.removeItem(selectedChat);
  document.getElementById("chat-history").innerHTML = "";
  updateChatList();
}

// Function to save chat with a unique name
function saveChat() {
  const chatName = document.getElementById("userName").value;

  // Close the modal
  const bootstrapModal = bootstrap.Modal.getInstance(
    document.getElementById("nameModal")
  );
  bootstrapModal.hide();

  if (chatName === null || chatName.trim() === "") return;
  const history = document.getElementById("chat-history").innerHTML;
  const model = getSelectedModel();
  const selectedOption = document.querySelector(
    'input[name="utilityOption"]:checked'
  ).value;
  localStorage.setItem(
    chatName,
    JSON.stringify({
      history: history,
      model: model,
      selectedOption: selectedOption,
    })
  );
  updateChatList();
}

function saveNotepad() {
  const notepad1 = encodeURIComponent(document.getElementById("notepad1").value);
  const notepad2 = encodeURIComponent(document.getElementById("notepad2").value);
  if (notepad1.trim() === "" && notepad2.trim() === "") return;

  const chatName = document.getElementById("userName").value;
  if (chatName === null || chatName.trim() === "") return;

  // Close the modal
  const bootstrapModal = bootstrap.Modal.getInstance(document.getElementById("nameModal"));
  bootstrapModal.hide();

  const history = notepad1 + "\n" + notepad2;
  const model = getSelectedModel();
  const selectedOption = document.querySelector(
    'input[name="utilityOption"]:checked'
  ).value;
  localStorage.setItem(
    chatName,
    JSON.stringify({
      history: history,
      model: model,
      selectedOption: selectedOption,
    })
  );
  updateChatList();
}

// Function to load selected chat from dropdown
function loadSelectedSession() {
  const selectedChat = document.getElementById("chat-select").value;
  const obj = JSON.parse(localStorage.getItem(selectedChat));

  if (obj.selectedOption === "chat") {
    document.getElementById("chat-history").innerHTML = obj.history;
    document.getElementById("chat-container").style.display = "block";
    document.getElementById("notepad-container").style.display = "none";
  } else if (obj.selectedOption === "notepad") {
    document.getElementById("notepad1").value = decodeURIComponent(obj.history.split("\n")[0]);
    document.getElementById("notepad2").value = decodeURIComponent(obj.history.split("\n")[1]);
    document.getElementById("chat-container").style.display = "none";
    document.getElementById("notepad-container").style.display = "block";
    updateNotebookTokenCounter(); // Update the token counter
  }

  updateModelInQueryString(obj.model);

  try {
    document.querySelector(
      `input[name="utilityOption"][value="${obj.selectedOption}"]`
    ).checked = true;
  } catch (error) {
    document.getElementById("errorText").innerHTML = DOMPurify.sanitize(error);
    let modal = new bootstrap.Modal(document.getElementById("errorModal"));
    modal.show();
  }
}

// Function to update chat list dropdown
function updateChatList() {
  const chatList = document.getElementById("chat-select");
  chatList.innerHTML =
    '<option value="" disabled selected>Select a session</option>';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key === "host-address") continue;
    if (key === "system-text") continue;
    const option = document.createElement("option");
    option.value = key;
    option.text = key;
    chatList.add(option);
  }
}

function deleteNotepad() {
  const selectedChat = document.getElementById("chat-select").value;
  localStorage.removeItem(selectedChat);
  document.getElementById("notepad1").value = "";
  document.getElementById("notepad2").value = "";
  updateChatList();
}

// -------- ONLOAD --------
window.onload = () => {
  updateChatList();
  populateModels();
  adjustPadding();
  autoFocusInput();
  loadSystemText(); // Load system text from local storage
  checkTokenCount();
};
