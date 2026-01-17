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
  var BUBBLE_WIDTH = 220; // Width to accommodate label
  var BUBBLE_HEIGHT = 140; // Height for bubble + label above it
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
    // Use !important to override any parent styles that might affect positioning
    // transform:none prevents parent transforms from creating new containing block
    // contain:layout isolates the element from layout effects
    container.style.cssText =
      "position:fixed !important;bottom:16px !important;" +
      (config.position === "bottom-left" ? "left:16px !important;" : "right:16px !important;") +
      "width:" + BUBBLE_WIDTH + "px;height:" + BUBBLE_HEIGHT + "px;" +
      "pointer-events:none;z-index:" + config.zIndex + " !important;" +
      "transition:width 0.3s ease,height 0.3s ease;" +
      "transform:none !important;will-change:auto;contain:layout;";

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
            // Collapsed state - bubble + label
            container.style.width = BUBBLE_WIDTH + "px";
            container.style.height = BUBBLE_HEIGHT + "px";
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
    // Also remove feedback button
    var feedbackBtn = document.getElementById("peptide-feedback-button");
    if (feedbackBtn) {
      feedbackBtn.remove();
    }
    window.removeEventListener("message", handleMessage);
    window.PeptideChatLoaded = false;
  }

  // Get base URL from script location
  function getBaseUrl() {
    var scripts = document.getElementsByTagName("script");
    for (var i = 0; i < scripts.length; i++) {
      if (scripts[i].src && scripts[i].src.indexOf("widget.js") !== -1) {
        return new URL(scripts[i].src).origin;
      }
    }
    return window.location.origin;
  }

  // Initialize feedback button on parent website
  function initFeedbackButton() {
    var baseUrl = getBaseUrl();

    // Fetch feedback settings
    fetch(baseUrl + "/api/feedback/settings")
      .then(function (res) {
        return res.json();
      })
      .then(function (settings) {
        if (!settings.isEnabled) return;

        // Create feedback button on parent website
        var feedbackBtn = document.createElement("button");
        feedbackBtn.id = "peptide-feedback-button";

        // Bug icon SVG
        var bugIcon =
          '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;">' +
          '<path d="m8 2 1.88 1.88"/>' +
          '<path d="M14.12 3.88 16 2"/>' +
          '<path d="M9 7.13v-1a3.003 3.003 0 1 1 6 0v1"/>' +
          '<path d="M12 20c-3.3 0-6-2.7-6-6v-3a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v3c0 3.3-2.7 6-6 6"/>' +
          '<path d="M12 20v-9"/>' +
          '<path d="M6.53 9C4.6 8.8 3 7.1 3 5"/>' +
          '<path d="M6 13H2"/>' +
          '<path d="M3 21c0-2.1 1.7-3.9 3.8-4"/>' +
          '<path d="M20.97 5c0 2.1-1.6 3.8-3.5 4"/>' +
          '<path d="M22 13h-4"/>' +
          '<path d="M17.2 17c2.1.1 3.8 1.9 3.8 4"/>' +
          "</svg>";

        feedbackBtn.innerHTML = bugIcon + '<span style="margin-left:8px;">' + (settings.buttonLabel || "Feedback") + "</span>";

        // Style the button
        feedbackBtn.style.cssText =
          "position:fixed !important;" +
          "left:16px !important;" +
          "bottom:24px !important;" +
          "z-index:9998 !important;" +
          "display:flex !important;" +
          "align-items:center !important;" +
          "padding:12px 16px !important;" +
          "border-radius:9999px !important;" +
          "border:none !important;" +
          "cursor:pointer !important;" +
          "font-weight:500 !important;" +
          "font-size:14px !important;" +
          "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif !important;" +
          "color:white !important;" +
          "box-shadow:0 4px 12px rgba(0,0,0,0.15) !important;" +
          "transition:transform 0.2s ease,box-shadow 0.2s ease !important;" +
          "background-color:" + (settings.buttonColor || "#8B5CF6") + " !important;";

        // Hover effects
        feedbackBtn.addEventListener("mouseenter", function () {
          feedbackBtn.style.transform = "scale(1.05)";
          feedbackBtn.style.boxShadow = "0 6px 16px rgba(0,0,0,0.2)";
        });
        feedbackBtn.addEventListener("mouseleave", function () {
          feedbackBtn.style.transform = "scale(1)";
          feedbackBtn.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
        });

        // Click handler - open feedback form in popup
        feedbackBtn.addEventListener("click", function () {
          openFeedbackPopup(baseUrl);
        });

        document.body.appendChild(feedbackBtn);
      })
      .catch(function (err) {
        console.log("Peptide Chat: Feedback settings not available", err);
      });
  }

  // Open feedback form in popup window
  function openFeedbackPopup(baseUrl) {
    var width = 500;
    var height = 700;
    var left = (window.screen.width - width) / 2;
    var top = (window.screen.height - height) / 2;

    window.open(
      baseUrl + "/embed/feedback",
      "PeptideFeedback",
      "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top + ",scrollbars=yes,resizable=yes"
    );
  }

  // Replace queue with actual function
  window.peptideChat = function () {
    processCommand(arguments);
  };

  // Process queued commands
  for (var i = 0; i < commandQueue.length; i++) {
    processCommand(commandQueue[i]);
  }

  // Initialize feedback button after widget is set up
  // Small delay to ensure DOM is ready
  setTimeout(initFeedbackButton, 500);
})(window, document);
