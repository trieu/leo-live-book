

var parseDataUTM =
  window.parseDataUTM ||
  function () {
    if (location.search.indexOf("utm_") > 0) {
      var search = location.search.substring(1);
      var json = decodeURI(search)
        .replace(/"/g, '\\"')
        .replace(/&/g, '","')
        .replace(/=/g, '":"');
      return JSON.parse('{"' + json + '"}');
    }
  };

// (2) CDP EVENT OBSERVER: set-up all event tracking functions
var LeoObserver = {};

// (2.1) function to track View Event "PageView"
LeoObserver.recordEventPageView = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordViewEvent("page-view", eventData);
};

// (2.2) function to track View Event "ContentView"
LeoObserver.recordEventContentView = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordViewEvent("content-view", eventData);
};

// (2.3) function to track Action Event "Logout"
LeoObserver.recordEventLogout = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("logout", eventData);
};

// (2.4) function to track Action Event "Search"
LeoObserver.recordEventSearch = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("search", eventData);
};

// (2.5) function to track View Event "ItemView"
LeoObserver.recordEventItemView = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordViewEvent("item-view", eventData);
};

// (2.6) function to track Action Event "ClickDetails"
LeoObserver.recordEventClickDetails = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("click-details", eventData);
};

// (2.7) function to track Action Event "SubmitContact"
LeoObserver.recordEventSubmitContact = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("submit-contact", eventData);
};

// (2.8) function to track Action Event "RegisterAccount"
LeoObserver.recordEventRegisterAccount = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("register-account", eventData);
};

// (2.9) function to track Action Event "UserLogin"
LeoObserver.recordEventUserLogin = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("user-login", eventData);
};

// (2.10) function to track Action Event "ShortLinkClick"
LeoObserver.recordEventShortLinkClick = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("short-link-click", eventData);
};

// (2.11) function to track View Event "Login"
LeoObserver.recordEventLogin = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordViewEvent("login-success", eventData);
};

// (2.12) function to track Action Event "AskQuestion"
LeoObserver.recordEventAskQuestion = function (eventData) {
  eventData = eventData ? eventData : {};
  LeoObserverProxy.recordActionEvent("ask-question", eventData);
};

// (3) CDP EVENT OBSERVER is ready
function leoObserverProxyReady(session) {
  // auto tracking when CDP JS is ready
  LeoObserver.recordEventPageView(parseDataUTM());

  // set tracking CDP web visitor ID into all a[href] nodes
  LeoObserverProxy.synchLeoVisitorId(function (vid) {
    var aNodes = document.querySelectorAll("a");
    [].forEach.call(aNodes, function (aNode) {
      var hrefUrl = aNode.href || "";
      var check =
        hrefUrl.indexOf("http") >= 0 && hrefUrl.indexOf(location.host) < 0;
      if (check) {
        if (hrefUrl.indexOf("?") > 0) hrefUrl += "&leosyn=" + vid;
        else hrefUrl += "?leosyn=" + vid;
        aNode.href = hrefUrl;
      }
    });
    if (typeof window.synchLeoCdpToGA4 === "function") {
      window.synchLeoCdpToGA4(vid);
    }
  });
}

// track users when they click any link in the web-page
LeoObserver.addTrackingAllLinks = function () {
  setTimeout(function () {
    document.querySelectorAll("a").forEach(function (e) {
      e.addEventListener("click", function () {
        var url = e.getAttribute("href") || "";
        var data = { url: url, "link-text": e.innerText };
        LeoObserver.recordEventClickDetails(data);
      });
    });
  }, 1500);
};

// track users when they click any button in the web-page
LeoObserver.addTrackingAllButtons = function () {
  setTimeout(function () {
    document.querySelectorAll("button").forEach(function (e) {
      e.addEventListener("click", function () {
        var data = { "button-text": e.innerText };
        LeoObserver.recordEventClickDetails(data);
      });
    });
  }, 1600);
};
