// -------- CONSTANTS --------

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

const TEMPERATURE = 0.1;
const NUM_CONTEXT = 0;
const NUM_PREDICT = 32000;

// -------- GLOBALS --------
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

let lastSelectedChat = "";
let lastSelectedNotebook = "";

// -------- EVENT LISTENERS --------

document.getElementById("send-button").addEventListener("click", submitRequest);

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

document.getElementById("delete-chat").addEventListener("click", function () {
  const selectedSession = document.getElementById("chat-select").value;
  if (selectedSession) {
    if (
      confirm("Are you sure you want to delete this chat with a saved session?")
    ) {
      deleteSession("chat-select");
      document.getElementById("chat-history").innerHTML = "";
    }
  } else {
    deleteSession("chat-select");
    document.getElementById("chat-history").innerHTML = "";
  }
});
document
  .getElementById("delete-notepad")
  .addEventListener("click", function () {
    const selectedSession = document.getElementById("chat-select").value;
    if (selectedSession) {
      if (
        confirm(
          "Are you sure you want to delete this notepad with a saved session?"
        )
      ) {
        deleteSession("chat-select");
        document.getElementById("notepad1").value = "";
        document.getElementById("notepad2").value = "";
      }
    } else {
      deleteSession("chat-select");
      document.getElementById("notepad1").value = "";
      document.getElementById("notepad2").value = "";
    }
  });
document.getElementById("saveName").addEventListener("click", function () {
  const selectedOption = document.querySelector(
    'input[name="utilityOption"]:checked'
  ).value;
  if (selectedOption === "chat" || selectedOption === "function") {
    saveChat(selectedOption);
  } else if (selectedOption === "notepad") {
    saveNotepad();
  }
});
document
  .getElementById("chat-select")
  .addEventListener("change", loadSelectedSession);
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
document.getElementById("notepad1").addEventListener("input", function () {
  updateTokenCounter("notepad1", "notepad-token-counter");
});

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
const observer = new MutationObserver(function () {
  updateTokenCounter("chat-history", "token-counter");
});
observer.observe(chatHistory, { childList: true, subtree: true });

const notepadPanels = document.getElementById("chat-history");
const observerPad = new MutationObserver(function () {
  updateTokenCounter("notepad1", "notepad-token-counter");
});
observerPad.observe(notepadPanels, { childList: true, subtree: true });

var radios = document.getElementsByName("utilityOption");
for (var i = 0; i < radios.length; i++) {
  radios[i].addEventListener("change", function () {
    // If a text generation is in progress, interrupt it
    interrupt.abort();
    // Create a new AbortController for the next text generation
    interrupt = new AbortController();
    document.getElementById("chat-container").style.display =
      this.value === "chat" || this.value === "function" ? "block" : "none";
    document.getElementById("notepad-container").style.display =
      this.value === "notepad" ? "block" : "none";
    const selection =
      this.value === "chat" ? lastSelectedChat : lastSelectedNotebook;
    updateChatListAndSelection(selection);
  });
}

document.querySelector(".gear-icon").addEventListener("click", function () {
  let modal = new bootstrap.Modal(document.getElementById("settingsModal"));
  modal.show();
});

document.querySelector(".pencil-icon").addEventListener("click", function () {
  // Get the system text
  const systemText = getSystemText().replace(/\\n/g, "\n");

  // Set the value of the textarea in the modal
  document.getElementById("system-text-modal").value = systemText;

  // Show the modal
  let modal = new bootstrap.Modal(
    document.getElementById("editSystemTextModal")
  );
  modal.show();
});

document.getElementById("saveSettings").addEventListener("click", function () {
  const temperature = document.getElementById("temperature").value;
  const num_ctx = document.getElementById("num-ct").value;
  const num_predict = document.getElementById("num-predict").value;
  localStorage.setItem(generateKey("temperature"), temperature);
  localStorage.setItem(generateKey("num_ctx"), num_ctx);
  localStorage.setItem(generateKey("num_predict"), num_predict);

  // Get the modal instance and close it
  let settingsModal = bootstrap.Modal.getInstance(
    document.getElementById("settingsModal")
  );
  settingsModal.hide();
});

document
  .getElementById("settingsModal")
  .addEventListener("show.bs.modal", function () {
    // Load num_ctx and num_predict from local storage
    let temperature = localStorage.getItem(generateKey("temperature"));
    let num_ctx = localStorage.getItem(generateKey("num_ctx"));
    let num_predict = localStorage.getItem(generateKey("num_predict"));

    // If num_ctx or num_predict is not in local storage, assign default values
    temperature = temperature || TEMPERATURE;
    num_ctx = num_ctx || NUM_CONTEXT;
    num_predict = num_predict || NUM_PREDICT;

    // Set the values in the input fields
    if (temperature) {
      document.getElementById("temperature").value = temperature;
    }
    if (num_ctx) {
      document.getElementById("num-ct").value = num_ctx;
    }
    if (num_predict) {
      document.getElementById("num-predict").value = num_predict;
    }
  });

document
  .getElementById("saveSystemTextModal")
  .addEventListener("click", function () {
    // Get the value of the textarea in the modal
    const systemTextModal = document.getElementById("system-text-modal").value;

    // Set the value of the system text field
    document.getElementById("system-text").value = systemTextModal.replace(
      /\n/g,
      "\\n"
    );

    // Close the modal
    let modal = bootstrap.Modal.getInstance(
      document.getElementById("editSystemTextModal")
    );
    modal.hide();

    // Save the system text
    saveSystemText();
  });

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

function getModelOptions() {
  let temperature = localStorage.getItem(generateKey("temperature"));
  let num_ctx = localStorage.getItem(generateKey("num_ctx"));
  let num_predict = localStorage.getItem(generateKey("num_predict"));

  // Convert to integer if they are string
  if (typeof temperature === "string") {
    temperature = parseFloat(temperature);
    if (isNaN(temperature)) {
      console.error("temperature is not a valid float");
      temperature = TEMPERATURE;
    }
  }

  // Convert to integer if they are string
  if (typeof num_ctx === "string") {
    num_ctx = parseInt(num_ctx);
    if (isNaN(num_ctx)) {
      console.error("num_ctx is not a valid integer");
      num_ctx = NUM_CONTEXT;
    }
  }

  if (typeof num_predict === "string") {
    num_predict = parseInt(num_predict);
    if (isNaN(num_predict)) {
      console.error("num_predict is not a valid integer");
      num_predict = NUM_PREDICT;
    }
  }

  // Create the options object
  let options = {
    temperature: temperature,
    num_predict: num_predict,
  };

  // Add num_ctx to the options object only if it's not zero
  if (num_ctx !== 0) {
    options.num_ctx = num_ctx;
  }

  return options;
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
  const modelOptions = getModelOptions();

  const system = {
    role: "system",
    content: decodeURIComponent(getSystemText()).replace(/\\n/g, "\n"),
  };
  let prompt = [];
  if (isValidInput(input)) {
    prompt = parsedHistory.push({
      role: "user",
      content: input,
    });
  }
  prompt = [system].concat(parsedHistory);
  return {
    model: selectedModel,
    messages: prompt,
    options: modelOptions,
  };
}

function createUserMessageDiv(input) {
  let userMessageDiv = document.createElement("div");
  userMessageDiv.className = "mb-2 user-message";
  userMessageDiv.innerText = input;
  userMessageDiv.id = "message-" + Date.now();
  userMessageDiv.style.paddingLeft = "10px";
  let userDeleteButton = createDeleteButton(userMessageDiv.id, (message) => {
    chatHistory.removeChild(message);
  });
  userMessageDiv.addEventListener("mouseover", function () {
    userDeleteButton.style.visibility = "visible";
  });
  userMessageDiv.addEventListener("mouseout", function () {
    userDeleteButton.style.visibility = "hidden";
  });
  userMessageDiv.appendChild(userDeleteButton);
  return userMessageDiv;
}

function createResponseDiv(showSpinner = true) {
  let responseDiv = document.createElement("div");
  responseDiv.className = "response-message mb-2 text-start";
  responseDiv.style.minHeight = "3em";
  if (showSpinner) {
    spinner = document.createElement("div");
    spinner.className = "spinner-border text-light";
    spinner.setAttribute("role", "status");
    responseDiv.appendChild(spinner);
  }
  let responseTextDiv = document.createElement("div");
  responseDiv.appendChild(responseTextDiv);
  responseDiv.id = "response-" + Date.now();
  let responseDeleteButton = createDeleteButton(responseDiv.id, (response) => {
    const stopButton = document.getElementById("stop-chat-button");
    if (stopButton !== null) {
      stopButton.click();
    }
    chatHistory.removeChild(response);
  });
  responseDiv.addEventListener("mouseover", function () {
    responseDeleteButton.style.visibility = "visible";
  });
  responseDiv.addEventListener("mouseout", function () {
    responseDeleteButton.style.visibility = "hidden";
  });
  responseDiv.appendChild(responseDeleteButton);
  return { responseDiv, responseTextDiv };
}

function createResponseWithText(text) {
  let { responseDiv, responseTextDiv } = createResponseDiv(false);

  if (text != undefined) {
    if (responseDiv.hidden_text == undefined) {
      responseDiv.hidden_text = "";
    }
    responseDiv.hidden_text = text;
    responseTextDiv.innerHTML = DOMPurify.sanitize(
      marked.parse(responseDiv.hidden_text)
    );
  }

  return { responseDiv, responseTextDiv };
}

function createDeleteButton(elementId, action) {
  let deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-secondary delete-button delete-icon";
  deleteButton.innerHTML = deleteIcon;
  deleteButton.style.visibility = "hidden";
  deleteButton.onclick = function () {
    let element = document.getElementById(elementId);
    action(element);
  };
  return deleteButton;
}

function createStopButton() {
  interrupt = new AbortController();
  let stopButton = document.createElement("button");
  stopButton.id = "stop-chat-button";
  stopButton.className = "btn btn-danger";
  stopButton.innerHTML = "Stop";
  stopButton.onclick = async (e) => {
    e.preventDefault();
    interrupt.abort("Stop button pressed");
    try {
      // Call killOllama to terminate the Ollama process
      await killOllama();
      // Then call startOllama to restart the Ollama process
      await startOllama();

      console.log("Ollama process restarted successfully.");
    } catch (err) {
      console.error(err);
    }
  };
  return stopButton;
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

  // Initialize an empty array to hold the output
  var output = [];

  // Get all the messages
  var messages = doc.querySelectorAll(
    'div[id^="message-"], div[id^="response-"]:not([data-function-call])'
  );

  // Loop through all the messages
  for (var i = 0; i < messages.length; i++) {
    try {
      // Determine the role based on the id of the message
      var role = messages[i].id.startsWith("message-") ? "user" : "assistant";
      // Add the message to the output array
      output.push({
        role: role,
        // content: messages[i].firstChild.textContent.trim(),
        content: messages[i].innerText.trim(),
      });
    } catch (error) {
      console.info("Error while processing message: ", error);
    }
  }

  // Return the output array
  return output;
}

// Function to get the system text
function getSystemText() {
  return decodeURIComponent(document.getElementById("system-text").value);
}

// Save system-text to localStorage
function saveSystemText() {
  const systemText = getSystemText();
  // Replace newline characters with <br> tags
  // const formattedSystemText = systemText.replace(/\n/g, "<br>");
  localStorage.setItem(generateKey("system-text"), systemText);
}

// Load system-text from localStorage
function loadSystemText() {
  let systemText = localStorage.getItem(generateKey("system-text"));
  if (systemText) {
    document.getElementById("system-text").value = decodeURIComponent(
      systemText
    ).replace(/\n/g, "\\n");
  }
}

// Function to export chat to a local file
// TODO: Include other attributes like .model
function exportChat() {
  console.log("exporting chat");
  const selectedChat = document.getElementById("chat-select");
  const option = selectedChat.querySelector(
    `option[value="${selectedChat.value}"]`
  );
  const data = localStorage.getItem(selectedChat.value);
  const blob = new Blob([data], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = option.innerText + ".txt";
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
      localStorage.setItem(generateKey(`session.${chatName}`), contents);
      updateChatListAndSelection(chatName);
      loadSelectedSession();
    };
    reader.readAsText(file);
  }
}

function getTokens(text) {
  // Encode text into tokens
  return encode(text);
}

function updateTokenCounter(element, counterId) {
  const elementAreaToCount = document.getElementById(element);
  let textToCount;

  if (elementAreaToCount.tagName.toLowerCase() === "textarea") {
    textToCount = elementAreaToCount.value;
  } else if (elementAreaToCount.tagName.toLowerCase() === "div") {
    textToCount = elementAreaToCount.innerText;
  }

  // Add the system text to the text to count
  const systemText = decodeURIComponent(getSystemText()).replace(/\\n/g, "\n");
  textToCount += systemText;

  const tokens = getTokens(textToCount);
  document.getElementById(counterId).innerText = `Tokens: ${tokens.length}`;

  // Check the token count after updating it
  checkTokenCount();
}

// TODO: Remove?
function checkTokenCount() {
  const tokenCounter = document.getElementById("token-counter").innerText;
  const tokenCount = parseInt(tokenCounter.split(":")[1].trim());
  const deleteChatButton = document.getElementById("delete-chat");
  const saveChatButton = document.getElementById("save-chat");

  // if (tokenCount === 0) {
  //   deleteChatButton.disabled = true;
  //   saveChatButton.disabled = true;
  // } else {
  //   deleteChatButton.disabled = false;
  //   saveChatButton.disabled = false;
  // }
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

function removePrefix(prefix, str) {
  if (str.startsWith(prefix)) {
    return str.substring(prefix.length);
  }

  // If the string does not start with the prefix, return the original string
  return str;
}

function parseTextToDict(text) {
  text = text.trim();
  let lines = text.split("\n");
  let result = [];
  let current = {};
  let prefixes = ["Thought", "Tool", "ToolInput", "Observation", "Answer"];

  lines.forEach((line) => {
    let splitLine = line.split(": ");
    let key = splitLine[0];
    let value = splitLine[1];

    if (prefixes.includes(key)) {
      if (key === "Thought" && Object.keys(current).length !== 0) {
        result.push(current);
        current = {};
      }

      current[key] = value || null;
    }
  });

  if (Object.keys(current).length !== 0) {
    result.push(current);
  }

  return result;
}

function hasEncodedCharacters(str) {
  try {
    return decodeURIComponent(str) !== str;
  } catch (e) {
    // If decodeURIComponent throws an error, it means str was not a valid encoded URI
    return false;
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
        `ollama-utility was unable to communitcate with Ollama due to the following error:\n\n` +
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
  let chatHistory = document.getElementById("chat-history");
  let parsedHistory = parseChatHistory(chatHistory.innerHTML);
  let data = prepareData(input, parsedHistory);

  if (isValidInput(input)) {
    let userMessageDiv = createUserMessageDiv(input);
    chatHistory.appendChild(userMessageDiv);
  }

  let { responseDiv, responseTextDiv } = createResponseDiv();

  // Check if the Function Calling radio button is selected
  if (
    document.querySelector('input[name="utilityOption"]:checked').value ===
    "function"
  ) {
    // Change the message bubble color to purple
    responseDiv.style.backgroundColor = "purple";
    responseDiv.setAttribute("data-function-call", "true");
  }

  chatHistory.appendChild(responseDiv);

  let stopButton = createStopButton();
  let sendButton = document.getElementById("send-button");
  sendButton.insertAdjacentElement("beforebegin", stopButton);
  autoScroller.observe(responseDiv);

  // Start the timer
  let time = 0;
  let timerLabel = document.getElementById("timer-label-chat");
  let timer = setInterval(() => {
    time++;
    timerLabel.innerText = `Time: ${time}s`;
  }, 1000);

  if (
    document.querySelector('input[name="utilityOption"]:checked').value ===
    "function"
  ) {
    // Call handlePostRequest repeatedly until the conditions are met
    let maxIterations = 5;
    let ctr = 0;
    while (true) {
      ctr += 1;
      if (ctr > maxIterations) {
        console.log("Exceeded max iterations");
        break;
      }
      await handlePostRequest(
        data,
        stopButton,
        responseDiv,
        responseTextDiv,
        timer
      );
      // TODO: There might still be the issue of nested uls
      let responseText = responseTextDiv.innerText;
      const parsedDict = parseTextToDict(responseText);
      if (parsedDict.length > 0) {
        // Get only the first dict in case ReAct tries to generate
        // multiple tool actions
        let firstDict = parsedDict[0];
        let updatedDict = firstDict;
        if (
          "Tool" in firstDict &&
          firstDict["Tool"] !== null &&
          firstDict["Tool"] !== "undefined"
        ) {
          let observation = null;
          try {
            observation = await callTool(
              firstDict["Tool"],
              firstDict["ToolInput"]
            );
          } catch (error) {
            observation = `${error.message}.`;
          }
          updatedDict["Observation"] = observation;
        }
        let assistantResponse = "";
        // No Tool, but Answer available, meaning we need to answer the user now
        if (!("Tool" in updatedDict) && "Answer" in updatedDict) {
          assistantResponse = updatedDict["Answer"];
        } else {
          // There's Tool, meaning we need to call the tool
          delete updatedDict.Answer;
          assistantResponse =
            `Thought: ${updatedDict["Thought"]}\n` +
            `Tool: ${updatedDict["Tool"]}\n` +
            `ToolInput: ${updatedDict["ToolInput"]}\n` +
            `Observation: ${updatedDict["Observation"]}\n` +
            `Answer: Based on above...`;
        }

        // Create updated assistant responseDiv
        let result = createResponseWithText(assistantResponse);
        responseDiv = result.responseDiv;
        responseTextDiv = result.responseTextDiv;
        document.getElementById("chat-history").appendChild(responseDiv);

        // After answering the user above, break the loop
        if (!("Tool" in updatedDict) && "Answer" in updatedDict) {
          break;
        }

        // ...else, continue function calling by creating function bot empty responseDiv
        result = createResponseDiv();
        responseDiv = result.responseDiv;
        responseTextDiv = result.responseTextDiv;
        // Check if the Function Calling radio button is selected
        if (
          document.querySelector('input[name="utilityOption"]:checked')
            .value === "function"
        ) {
          // Change the message bubble color to purple
          responseDiv.style.backgroundColor = "purple";
          responseDiv.setAttribute("data-function-call", "true");
        }

        document.getElementById("chat-history").appendChild(responseDiv);

        stopButton = createStopButton();
        sendButton = document.getElementById("send-button");
        sendButton.insertAdjacentElement("beforebegin", stopButton);
        autoScroller.observe(responseDiv);

        // Start the timer
        time = 0;
        timerLabel = document.getElementById("timer-label-chat");
        timer = setInterval(() => {
          time++;
          timerLabel.innerText = `Time: ${time}s`;
        }, 1000);
      } else {
        console.log("No more functions to call");
        // Create updated assistant responseDiv
        let result = createResponseWithText(responseText);
        responseDiv = result.responseDiv;
        responseTextDiv = result.responseTextDiv;
        document.getElementById("chat-history").appendChild(responseDiv);
        break;
      }

      // Gather new `data` for the next loop
      chatHistory = document.getElementById("chat-history");
      parsedHistory = parseChatHistory(chatHistory.innerHTML);
      data = prepareData(input, parsedHistory);
    }
  } else {
    handlePostRequest(data, stopButton, responseDiv, responseTextDiv, timer);
  }
}

function handlePostRequest(
  data,
  stopButton,
  responseDiv,
  responseTextDiv,
  timer
) {
  return new Promise((resolve, reject) => {
    clearUserInput();
    postRequest(data, interrupt.signal, "chat")
      .then(async (response) => {
        await getResponse(response, (parsedResponse) => {
          handleResponse(parsedResponse, responseDiv, responseTextDiv);
        });
      })
      .catch((error) => {
        console.error(error);
        reject(error);
      })
      .finally(() => {
        stopButton.remove();
        spinner.remove();
        clearInterval(timer);
        resolve();
      });
  });
}

function handleResponse(parsedResponse, responseDiv, responseTextDiv) {
  let word = parsedResponse.message.content;
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

async function generateText() {
  const input = document.getElementById("notepad1").value;
  if (!input || !input.trim()) {
    return;
  }

  // Clear the 2nd text area
  document.getElementById("notepad2").value = "";

  const selectedModel = getSelectedModel();
  const modelOptions = getModelOptions();

  const data = {
    model: selectedModel,
    system: getSystemText(),
    prompt: input,
    options: modelOptions,
  };

  interrupt = new AbortController();
  let stopButton = document.getElementById("stop-generate-button");
  stopButton.onclick = async (e) => {
    e.preventDefault();
    interrupt.abort("Stop button pressed");
    // Call killOllama to terminate the Ollama process
    await killOllama();
    // Then call startOllama to restart the Ollama process
    await startOllama();

    console.log("Ollama process restarted successfully.");
  };

  // Create spinner and add it next to the Generate button
  let generateButton = document.getElementById("generate-button");
  let spinner = document.createElement("span");
  spinner.className = "spinner-border spinner-border-sm";
  spinner.setAttribute("role", "status");
  spinner.setAttribute("aria-hidden", "true");
  generateButton.disabled = true;
  generateButton.innerHTML = spinner.outerHTML + " Generating...";

  // Start the timer
  let time = 0;
  const timerLabel = document.getElementById("timer-label-notepad");
  const timer = setInterval(() => {
    time++;
    timerLabel.innerText = `Time: ${time}s`;
  }, 1000);

  postRequest(data, interrupt.signal)
    .then(async (response) => {
      await getResponse(response, (parsedResponse) => {
        let word = parsedResponse.response;
        if (parsedResponse.done) {
          //stopButton.remove();
        }
        if (word != undefined) {
          document.getElementById("notepad2").value += word;
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

      // Stop the timer
      clearInterval(timer);
    });
}

function deleteSession(elementId) {
  const selectedSession = document.getElementById(elementId).value;
  localStorage.removeItem(selectedSession);
  updateChatListAndSelection();
}

function saveSession(sessionName, history, selectedOption) {
  if (sessionName === null || sessionName.trim() === "") return;

  // Close the modal
  const bootstrapModal = bootstrap.Modal.getInstance(
    document.getElementById("nameModal")
  );
  bootstrapModal.hide();

  const model = getSelectedModel();
  const systemText = getSystemText(); // Get the system text
  localStorage.setItem(
    generateKey(`session.${sessionName}`),
    JSON.stringify({
      history: history,
      model: model,
      systemText: systemText, // Save the system text
      selectedOption: selectedOption,
    })
  );
  updateChatListAndSelection(sessionName);
}

// Function to save chat with a unique name
function saveChat(mode = "chat") {
  const session = document.getElementById("userName").value;
  if (session === null || session.trim() === "") return;
  const history = document.getElementById("chat-history").innerHTML;
  saveSession(session, encodeURIComponent(history), mode);
  lastSelectedChat = session;
}

function saveNotepad() {
  const notepad1 = encodeURIComponent(
    document.getElementById("notepad1").value
  );
  const notepad2 = encodeURIComponent(
    document.getElementById("notepad2").value
  );
  if (notepad1.trim() === "" && notepad2.trim() === "") return;
  const history = notepad1 + "\n" + notepad2;
  const session = document.getElementById("userName").value;
  saveSession(session, history, "notepad");
  lastSelectedNotebook = session;
}

// Function to load selected chat from dropdown
function loadSelectedSession() {
  const selectedChat = document.getElementById("chat-select").value;
  const obj = JSON.parse(localStorage.getItem(selectedChat));
  if (obj.selectedOption === "chat" || obj.selectedOption === "function") {
    const chatHistory = document.getElementById("chat-history");
    chatHistory.innerHTML = decodeURIComponent(obj.history); // Load the chat history from the local storage

    // Iterate over each message in the chat history
    chatHistory.childNodes.forEach((messageDiv) => {
      // Check if the message is a user message or a response message
      const isUserMessage = messageDiv.classList.contains("user-message");
      const isResponseMessage =
        messageDiv.classList.contains("response-message");

      if (isUserMessage || isResponseMessage) {
        // Create a delete button for the message
        if (messageDiv.querySelector(".delete-button")) {
          // remove existing delete button
          messageDiv.removeChild(messageDiv.querySelector(".delete-button"));
          const deleteButton = createDeleteButton(messageDiv.id, (message) => {
            chatHistory.removeChild(message);
          });

          // Add event listeners to show/hide the delete button on mouseover/mouseout
          messageDiv.addEventListener("mouseover", function () {
            deleteButton.style.visibility = "visible";
          });
          messageDiv.addEventListener("mouseout", function () {
            deleteButton.style.visibility = "hidden";
          });

          // Append the delete button to the message div
          messageDiv.appendChild(deleteButton);
        }
      }
    });

    document.getElementById("chat-container").style.display = "block";
    document.getElementById("notepad-container").style.display = "none";
    lastSelectedChat = selectedChat;
  } else if (obj.selectedOption === "notepad") {
    document.getElementById("notepad1").value = decodeURIComponent(
      obj.history.split("\n")[0]
    );
    document.getElementById("notepad2").value = decodeURIComponent(
      obj.history.split("\n")[1]
    );
    document.getElementById("chat-container").style.display = "none";
    document.getElementById("notepad-container").style.display = "block";
    updateTokenCounter("notepad1", "notepad-token-counter");
    lastSelectedNotebook = selectedChat;
  }

  let systemText = decodeURIComponent(obj.systemText).replace(/\n/g, "\\n");
  document.getElementById("system-text").value = systemText; // Set the system text

  updateModelInQueryString(obj.model);
  updateModelSelection(obj.model);
  const sessionInputElement = document.getElementById("userName");
  if (sessionInputElement) {
    sessionInputElement.value = removePrefix(
      `${NAMESPACE}.session.`,
      selectedChat
    );
  }

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

// Function to update chat list dropdown and select the appropriate option
function updateChatListAndSelection(text = "") {
  const chatList = document.getElementById("chat-select");
  chatList.innerHTML =
    '<option value="" disabled selected>Select a session</option>';
  let selectedIndex = 0;

  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key.startsWith(generateKey("session"))) {
      // let value = localStorage.getItem(key);
      const option = document.createElement("option");
      option.value = key;
      option.text = removePrefix(`${NAMESPACE}.session.`, key);
      chatList.add(option);
      if (removePrefix(`${NAMESPACE}.session.`, key) === text) {
        selectedIndex = i;
      }
    }
  }

  for (var i = 0; i < chatList.options.length; i++) {
    if (chatList.options[i].text === text) {
      chatList.selectedIndex = i;
      break;
    }
  }
}

function updateModelSelection(model) {
  const selectElement = document.getElementById("model-select");
  selectElement.value = model;
}

// -------- ONLOAD --------
window.onload = () => {
  updateChatListAndSelection();
  populateModels();
  adjustPadding();
  autoFocusInput();
  loadSystemText(); // Load system text from local storage
  checkTokenCount();

  // Ensure the UI reflects the current Ollama base URL
  if (document.querySelector("#settingsModal #host-address")) {
    document.querySelector("#settingsModal #host-address").value =
      ollamaBaseUrl;
  }

  document
    .getElementById("host-address")
    .addEventListener("change", setHostAddress);

  // Check if chat option is selected
  const selectedOption = document.querySelector(
    'input[name="utilityOption"]:checked'
  ).value;
  if (selectedOption === "chat" || selectedOption === "function") {
    // Display chat input area
    document.getElementById("chat-container").style.display = "block";
  }
};
