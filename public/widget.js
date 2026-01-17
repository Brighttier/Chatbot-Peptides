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

  // Load html2canvas dynamically for screenshot capture
  function loadHtml2Canvas(callback) {
    if (window.html2canvas) {
      callback();
      return;
    }
    var script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    script.onload = callback;
    script.onerror = function () {
      console.log("Peptide Chat: Failed to load html2canvas");
      callback();
    };
    document.head.appendChild(script);
  }

  // Capture parent website screenshot
  function captureParentScreenshot(callback) {
    loadHtml2Canvas(function () {
      if (!window.html2canvas) {
        callback(null);
        return;
      }

      // Hide feedback button and widget during capture
      var feedbackBtn = document.getElementById("peptide-feedback-button");
      var widgetContainer = document.getElementById("peptide-chat-widget");
      if (feedbackBtn) feedbackBtn.style.display = "none";
      if (widgetContainer) widgetContainer.style.display = "none";

      window.html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        ignoreElements: function (element) {
          // Ignore our widget elements
          return element.id === "peptide-feedback-button" || element.id === "peptide-chat-widget";
        }
      }).then(function (canvas) {
        // Restore elements
        if (feedbackBtn) feedbackBtn.style.display = "flex";
        if (widgetContainer) widgetContainer.style.display = "";
        // Convert to base64
        var dataUrl = canvas.toDataURL("image/png", 0.8);
        callback(dataUrl);
      }).catch(function (err) {
        console.log("Peptide Chat: Screenshot capture failed", err);
        if (feedbackBtn) feedbackBtn.style.display = "flex";
        if (widgetContainer) widgetContainer.style.display = "";
        callback(null);
      });
    });
  }

  // Capture a specific area of the parent website
  function captureAreaScreenshot(rect, callback) {
    loadHtml2Canvas(function () {
      if (!window.html2canvas) {
        callback(null);
        return;
      }

      // Hide feedback button and widget during capture
      var feedbackBtn = document.getElementById("peptide-feedback-button");
      var widgetContainer = document.getElementById("peptide-chat-widget");
      if (feedbackBtn) feedbackBtn.style.display = "none";
      if (widgetContainer) widgetContainer.style.display = "none";

      window.html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        logging: false,
        x: rect.x + window.scrollX,
        y: rect.y + window.scrollY,
        width: rect.width,
        height: rect.height,
        ignoreElements: function (element) {
          return element.id === "peptide-feedback-button" ||
                 element.id === "peptide-chat-widget" ||
                 element.id === "peptide-area-selector";
        }
      }).then(function (canvas) {
        if (feedbackBtn) feedbackBtn.style.display = "flex";
        if (widgetContainer) widgetContainer.style.display = "";
        var dataUrl = canvas.toDataURL("image/png", 0.8);
        callback(dataUrl);
      }).catch(function (err) {
        console.log("Peptide Chat: Area capture failed", err);
        if (feedbackBtn) feedbackBtn.style.display = "flex";
        if (widgetContainer) widgetContainer.style.display = "";
        callback(null);
      });
    });
  }

  // Show area selector overlay on parent website
  function showAreaSelector(popupSource) {
    // Hide feedback button and widget during selection
    var feedbackBtn = document.getElementById("peptide-feedback-button");
    var widgetContainer = document.getElementById("peptide-chat-widget");
    if (feedbackBtn) feedbackBtn.style.display = "none";
    if (widgetContainer) widgetContainer.style.display = "none";

    // Create overlay
    var overlay = document.createElement("div");
    overlay.id = "peptide-area-selector";
    overlay.style.cssText = "position:fixed;inset:0;z-index:99999;cursor:crosshair;background:rgba(0,0,0,0.3);";

    // Instructions
    var instructions = document.createElement("div");
    instructions.style.cssText = "position:absolute;top:16px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.8);color:white;padding:8px 16px;border-radius:8px;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;";
    instructions.textContent = "Click and drag to select an area. Press ESC to cancel.";
    overlay.appendChild(instructions);

    // Selection box (hidden initially)
    var selectionBox = document.createElement("div");
    selectionBox.style.cssText = "position:absolute;border:2px solid #3B82F6;background:rgba(59,130,246,0.1);pointer-events:none;display:none;";
    overlay.appendChild(selectionBox);

    // Size indicator
    var sizeIndicator = document.createElement("div");
    sizeIndicator.style.cssText = "position:absolute;background:rgba(0,0,0,0.8);color:white;padding:4px 8px;border-radius:4px;font-size:12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;pointer-events:none;display:none;";
    overlay.appendChild(sizeIndicator);

    var startX = 0, startY = 0, isSelecting = false;

    function cleanup() {
      if (document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }
      if (feedbackBtn) feedbackBtn.style.display = "flex";
      if (widgetContainer) widgetContainer.style.display = "";
      document.removeEventListener("keydown", handleKeyDown);
    }

    overlay.addEventListener("mousedown", function (e) {
      isSelecting = true;
      startX = e.clientX;
      startY = e.clientY;
      selectionBox.style.left = startX + "px";
      selectionBox.style.top = startY + "px";
      selectionBox.style.width = "0px";
      selectionBox.style.height = "0px";
      selectionBox.style.display = "block";
      sizeIndicator.style.display = "block";
    });

    overlay.addEventListener("mousemove", function (e) {
      if (!isSelecting) return;
      var x = Math.min(startX, e.clientX);
      var y = Math.min(startY, e.clientY);
      var w = Math.abs(e.clientX - startX);
      var h = Math.abs(e.clientY - startY);
      selectionBox.style.left = x + "px";
      selectionBox.style.top = y + "px";
      selectionBox.style.width = w + "px";
      selectionBox.style.height = h + "px";
      // Update size indicator
      sizeIndicator.textContent = Math.round(w) + " x " + Math.round(h);
      sizeIndicator.style.left = (x + w / 2 - 30) + "px";
      sizeIndicator.style.top = (y + h + 8) + "px";
    });

    overlay.addEventListener("mouseup", function (e) {
      if (!isSelecting) return;
      isSelecting = false;

      var rect = {
        x: Math.min(startX, e.clientX),
        y: Math.min(startY, e.clientY),
        width: Math.abs(e.clientX - startX),
        height: Math.abs(e.clientY - startY)
      };

      cleanup();

      // Minimum size check
      if (rect.width < 10 || rect.height < 10) {
        if (popupSource) {
          popupSource.postMessage({ type: "PEPTIDE_AREA_CAPTURED", data: null }, "*");
        }
        return;
      }

      // Capture the area
      captureAreaScreenshot(rect, function (screenshot) {
        if (popupSource) {
          popupSource.postMessage({ type: "PEPTIDE_AREA_CAPTURED", data: screenshot }, "*");
        }
      });
    });

    // ESC to cancel
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        cleanup();
        if (popupSource) {
          popupSource.postMessage({ type: "PEPTIDE_AREA_CAPTURED", data: null }, "*");
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);

    document.body.appendChild(overlay);
  }

  // Global message listener for screenshot requests from popup (registered early, outside async callbacks)
  window.addEventListener("message", function (event) {
    if (!event.data || typeof event.data !== "object") return;

    if (event.data.type === "PEPTIDE_CAPTURE_SCREENSHOT") {
      captureParentScreenshot(function (screenshot) {
        if (event.source) {
          event.source.postMessage({
            type: "PEPTIDE_SCREENSHOT_CAPTURED",
            data: screenshot
          }, "*");
        }
      });
    }

    if (event.data.type === "PEPTIDE_SELECT_AREA") {
      showAreaSelector(event.source);
    }
  });

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

        // Click handler - capture screenshot then open feedback form in popup
        feedbackBtn.addEventListener("click", function () {
          // Show loading state
          var originalContent = feedbackBtn.innerHTML;
          feedbackBtn.innerHTML = '<span style="margin-left:8px;">Capturing...</span>';
          feedbackBtn.disabled = true;

          captureParentScreenshot(function (screenshot) {
            // Restore button
            feedbackBtn.innerHTML = originalContent;
            feedbackBtn.disabled = false;

            // Open popup with screenshot
            openFeedbackPopup(baseUrl, screenshot);
          });
        });

        document.body.appendChild(feedbackBtn);
      })
      .catch(function (err) {
        console.log("Peptide Chat: Feedback settings not available", err);
      });
  }

  // Open feedback form in popup window
  function openFeedbackPopup(baseUrl, screenshot) {
    // Store screenshot in sessionStorage (same-origin fallback)
    if (screenshot) {
      try {
        sessionStorage.setItem("peptide-feedback-screenshot", screenshot);
      } catch (e) {
        console.log("Peptide Chat: Could not store screenshot in sessionStorage", e);
      }
    }

    var width = 500;
    var height = 700;
    var left = (window.screen.width - width) / 2;
    var top = (window.screen.height - height) / 2;

    var popup = window.open(
      baseUrl + "/embed/feedback",
      "PeptideFeedback",
      "width=" + width + ",height=" + height + ",left=" + left + ",top=" + top + ",scrollbars=yes,resizable=yes"
    );

    // Send screenshot via postMessage when popup is ready (cross-origin support)
    if (popup && screenshot) {
      // Listen for ready signal from popup
      var sendScreenshot = function(event) {
        if (event.data && event.data.type === "PEPTIDE_FEEDBACK_READY") {
          popup.postMessage({
            type: "PEPTIDE_INITIAL_SCREENSHOT",
            data: screenshot
          }, "*");
          window.removeEventListener("message", sendScreenshot);
        }
      };
      window.addEventListener("message", sendScreenshot);

      // Also try sending after a delay as backup
      setTimeout(function() {
        if (popup && !popup.closed) {
          popup.postMessage({
            type: "PEPTIDE_INITIAL_SCREENSHOT",
            data: screenshot
          }, "*");
        }
      }, 1000);
    }
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
