/**
 * Peptide Chat Widget Loader
 * Embeds the chat widget as an iframe on external websites
 */
(function (window, document) {
  "use strict";

  // Prevent multiple initializations
  if (window.PeptideChatLoaded) return;
  window.PeptideChatLoaded = true;

  // Size constants
  var BUBBLE_SIZE = 80;
  var EXPANDED_WIDTH = 420;
  var EXPANDED_HEIGHT = 650;

  // Default configuration
  var config = {
    repId: "default",
    position: "bottom-right",
    zIndex: 9999,
  };

  // Command queue processing
  var commandQueue = window.peptideChat && window.peptideChat.q ? window.peptideChat.q : [];

  // Process commands
  function processCommand(args) {
    var command = args[0];
    var options = args[1] || {};

    switch (command) {
      case "init":
        if (options.repId) config.repId = options.repId;
        if (options.position) config.position = options.position;
        if (options.zIndex) config.zIndex = options.zIndex;
        initWidget();
        break;
      case "open":
        openWidget();
        break;
      case "close":
        closeWidget();
        break;
      case "destroy":
        destroyWidget();
        break;
    }
  }

  // Initialize the widget
  function initWidget() {
    // Create iframe container - starts collapsed (bubble size only)
    var container = document.createElement("div");
    container.id = "peptide-chat-widget";
    container.style.cssText =
      "position:fixed;bottom:16px;" +
      (config.position === "bottom-left" ? "left:16px;" : "right:16px;") +
      "width:" + BUBBLE_SIZE + "px;height:" + BUBBLE_SIZE + "px;" +
      "pointer-events:none;z-index:" + config.zIndex + ";" +
      "transition:width 0.3s ease,height 0.3s ease;";

    // Create iframe - fills the container
    var iframe = document.createElement("iframe");
    iframe.id = "peptide-chat-iframe";
    iframe.src = getWidgetUrl();
    iframe.style.cssText =
      "width:100%;height:100%;border:none;background:transparent;pointer-events:auto;";
    iframe.setAttribute("allow", "microphone");
    iframe.setAttribute("title", "Peptide Chat Widget");

    container.appendChild(iframe);
    document.body.appendChild(container);

    // Listen for messages from iframe
    window.addEventListener("message", handleMessage);
  }

  // Get widget URL based on current script location
  function getWidgetUrl() {
    var scripts = document.getElementsByTagName("script");
    var widgetScript = null;

    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
        widgetScript = scripts[i];
        break;
      }
    }

    var baseUrl = "";
    if (widgetScript) {
      var srcUrl = new URL(widgetScript.src);
      baseUrl = srcUrl.origin;
    } else {
      // Fallback: assume same origin or use window location
      baseUrl = window.location.origin;
    }

    return baseUrl + "/embed/widget?repId=" + encodeURIComponent(config.repId);
  }

  // Handle messages from iframe
  function handleMessage(event) {
    var data = event.data;
    if (!data || typeof data !== "object") return;

    switch (data.type) {
      case "peptide-chat-state":
        // Resize container based on widget state
        var container = document.getElementById("peptide-chat-widget");
        if (container) {
          if (data.isOpen) {
            // Expanded state - full chat size
            var maxWidth = Math.min(EXPANDED_WIDTH, window.innerWidth - 32);
            var maxHeight = Math.min(EXPANDED_HEIGHT, window.innerHeight - 100);
            container.style.width = maxWidth + "px";
            container.style.height = maxHeight + "px";
          } else {
            // Collapsed state - bubble only
            container.style.width = BUBBLE_SIZE + "px";
            container.style.height = BUBBLE_SIZE + "px";
          }
        }
        break;
      case "peptide-chat-resize":
        // Handle resize if needed
        break;
      case "peptide-chat-open":
        // Widget opened
        break;
      case "peptide-chat-close":
        // Widget closed
        break;
    }
  }

  // Open widget
  function openWidget() {
    var iframe = document.getElementById("peptide-chat-iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "peptide-chat-open" }, "*");
    }
  }

  // Close widget
  function closeWidget() {
    var iframe = document.getElementById("peptide-chat-iframe");
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "peptide-chat-close" }, "*");
    }
  }

  // Destroy widget
  function destroyWidget() {
    var container = document.getElementById("peptide-chat-widget");
    if (container) {
      container.remove();
    }
    window.removeEventListener("message", handleMessage);
    window.PeptideChatLoaded = false;
  }

  // Replace queue with actual function
  window.peptideChat = function () {
    processCommand(arguments);
  };

  // Process queued commands
  for (var i = 0; i < commandQueue.length; i++) {
    processCommand(commandQueue[i]);
  }
})(window, document);
