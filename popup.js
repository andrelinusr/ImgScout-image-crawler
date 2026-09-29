const downloadBtn = document.getElementById("downloadBtn");
const retryBtn = document.getElementById("retryBtn");
const downloadLinksBtn = document.getElementById("downloadLinksBtn");

const status = document.getElementById("status");
const results = document.getElementById("results");
const emptyState = document.getElementById("emptyState");
const imageGrid = document.getElementById("imageGrid");
const resultCount = document.getElementById("resultCount");

let currentUrls = [];


/* --------------------------------
   UI helpers
-------------------------------- */

function setLoading(isLoading) {
  downloadBtn.disabled = isLoading;

  document.body.classList.toggle(
    "loading",
    isLoading
  );

  if (isLoading) {
    downloadBtn.querySelector("span:last-child").textContent =
      "Scouting...";

    status.querySelector("strong").textContent =
      "Scanning page";

    status.querySelector("p").textContent =
      "Looking for matching images...";
  } else {
    downloadBtn.querySelector("span:last-child").textContent =
      "Scout Images";
  }
}


function showStatus(title, description) {
  status.querySelector("strong").textContent = title;
  status.querySelector("p").textContent = description;
}


function hideAllResults() {
  results.classList.add("hidden");
  emptyState.classList.add("hidden");
}


function showEmptyState() {
  hideAllResults();

  emptyState.classList.remove("hidden");

  showStatus(
    "No matching images",
    "Try changing the format or URL filter."
  );
}


/* --------------------------------
   Render images
-------------------------------- */

function renderImages(items) {
  imageGrid.innerHTML = "";

  items.forEach(item => {

    const card =
      document.createElement("article");

    card.className = "image-card";


    let mediaElement;


    if (item.type === "video") {

      mediaElement =
        document.createElement("video");

      mediaElement.src = item.url;

      mediaElement.autoplay = true;
      mediaElement.loop = true;
      mediaElement.muted = true;
      mediaElement.playsInline = true;

      mediaElement.preload = "metadata";

      mediaElement.setAttribute(
        "aria-label",
        "WEBM preview"
      );

    } else {

      mediaElement =
        document.createElement("img");

      mediaElement.src = item.url;

      mediaElement.alt =
        "Found image";

      mediaElement.loading =
        "lazy";

      mediaElement.referrerPolicy =
        "no-referrer";
    }


    mediaElement.addEventListener(
      "error",
      () => {
        card.remove();
      },
      { once: true }
    );


    const downloadLink =
      document.createElement("a");

    downloadLink.href =
      item.url;

    downloadLink.download =
      getFileName(item.url);

    downloadLink.target =
      "_blank";

    downloadLink.rel =
      "noopener";

    downloadLink.title =
      item.type === "video"
        ? "Open WEBM"
        : "Open image";

    downloadLink.textContent =
      "↓";


    card.appendChild(
      mediaElement
    );

    card.appendChild(
      downloadLink
    );

    imageGrid.appendChild(
      card
    );
  });
}


function getFileName(url) {
  try {
    const parsed = new URL(url);

    const pathname =
      parsed.pathname.split("/").filter(Boolean);

    return pathname.pop() || "image";
  } catch {
    return "image";
  }
}


/* --------------------------------
   Export links
-------------------------------- */

function exportLinks() {
  if (!currentUrls.length) {
    return;
  }

  const content =
    currentUrls.join("\r\n");

  const blob = new Blob(
    [content],
    {
      type: "text/plain;charset=utf-8"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = "imgscout-links.txt";

  document.body.appendChild(link);

  link.click();

  link.remove();

  URL.revokeObjectURL(url);
}


/* --------------------------------
   Scout
-------------------------------- */

async function scoutImages() {
  const format =
    document.getElementById("format").value;

  const limit =
    parseInt(
      document.getElementById("limit").value,
      10
    ) || 0;

  const filterText =
    document
      .getElementById("filter")
      .value
      .trim()
      .toLowerCase();


  setLoading(true);

  hideAllResults();


  try {
    const [tab] =
      await chrome.tabs.query({
        active: true,
        currentWindow: true
      });


    if (
      !tab ||
      !tab.id ||
      !tab.url ||
      tab.url.startsWith("chrome://") ||
      tab.url.startsWith("edge://") ||
      tab.url.startsWith("about:")
    ) {
      showStatus(
        "Page unavailable",
        "ImgScout cannot scan this browser page."
      );

      return;
    }


    const response =
      await chrome.scripting.executeScript({
        target: {
          tabId: tab.id
        },

        func: executeImageExtraction,

        args: [
          format,
          limit,
          filterText
        ]
      });


    const urls =
      response?.[0]?.result || [];


    currentUrls = urls;


    if (!urls.length) {
      showEmptyState();
      return;
    }


    resultCount.textContent =
      `${urls.length} ${urls.length === 1 ? "image" : "images"}`;


    renderImages(urls);

    results.classList.remove("hidden");


    showStatus(
      "Scout complete",
      `${urls.length} matching ${urls.length === 1 ? "image" : "images"} found.`
    );

  } catch (error) {
    console.error(
      "ImgScout error:",
      error
    );

    showStatus(
      "Something went wrong",
      "The page could not be scanned."
    );

  } finally {
    setLoading(false);
  }
}


/* --------------------------------
   Extraction function
-------------------------------- */

function executeImageExtraction(format, limit, filterText) {
  const media = new Map();

  const addMedia = (rawUrl, type = "image") => {
    if (!rawUrl) return;

    try {
      const url = new URL(rawUrl, document.baseURI).href;

      const lowerUrl = url.toLowerCase();

      const isWebm =
        /\.webm(?:[?#]|$)/i.test(lowerUrl);

      const finalType =
        isWebm ? "video" : type;

      media.set(url, {
        url,
        type: finalType
      });

    } catch {
      // Ignora URLs inválidas
    }
  };


  // 1. <img>
  document.querySelectorAll("img").forEach(img => {
    addMedia(
      img.currentSrc ||
      img.getAttribute("src") ||
      img.getAttribute("data-src") ||
      img.getAttribute("data-lazy-src") ||
      img.getAttribute("lazy-src"),
      "image"
    );
  });


  // 2. <video>
  document.querySelectorAll("video").forEach(video => {

    addMedia(
      video.currentSrc ||
      video.getAttribute("src") ||
      video.getAttribute("data-src") ||
      video.getAttribute("data-video") ||
      video.getAttribute("data-url"),
      "video"
    );


    // <source> dentro de <video>
    video.querySelectorAll("source").forEach(source => {
      addMedia(
        source.getAttribute("src") ||
        source.getAttribute("data-src"),
        "video"
      );
    });
  });


  // 3. Todas as tags <source>
  document.querySelectorAll("source").forEach(source => {
    addMedia(
      source.getAttribute("src") ||
      source.getAttribute("data-src"),
      "video"
    );
  });


  // 4. Links diretos para WEBM
  document.querySelectorAll("a[href]").forEach(link => {
    const href = link.getAttribute("href");

    if (href && /\.webm(?:[?#]|$)/i.test(href)) {
      addMedia(href, "video");
    }
  });


  // 5. Atributos data-* comuns usados por sites
  document.querySelectorAll("*").forEach(element => {

    [
      "data-src",
      "data-video",
      "data-url",
      "data-file",
      "data-source",
      "data-original"
    ].forEach(attribute => {

      const value =
        element.getAttribute(attribute);

      if (
        value &&
        /\.webm(?:[?#]|$)/i.test(value)
      ) {
        addMedia(value, "video");
      }
    });
  });


  // 6. CSS background-image
  document.querySelectorAll("*").forEach(element => {

    const background =
      window.getComputedStyle(element)
        .backgroundImage;

    if (
      !background ||
      background === "none"
    ) {
      return;
    }


    const matches =
      background.matchAll(
        /url\((['"]?)(.*?)\1\)/g
      );


    for (const match of matches) {
      if (match[2]) {
        addMedia(match[2], "image");
      }
    }
  });


  // 7. Filtros
  let filtered =
    Array.from(media.values())
      .filter(item => {

        const lowerUrl =
          item.url.toLowerCase();


        // Formato específico
        if (format !== "all") {

          if (
            format === ".jpg" &&
            !lowerUrl.includes(".jpg") &&
            !lowerUrl.includes(".jpeg")
          ) {
            return false;
          }


          if (
            format !== ".jpg" &&
            !lowerUrl.includes(format)
          ) {
            return false;
          }
        }


        // Todos os formatos
        else {

          const validExtensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".webp",
            ".gif",
            ".webm"
          ];


          if (
            !validExtensions.some(
              extension =>
                lowerUrl.includes(extension)
            )
          ) {
            return false;
          }
        }


        // Filtro de texto
        if (
          filterText &&
          !lowerUrl.includes(filterText)
        ) {
          return false;
        }


        return true;
      });


  // 8. Limite
  if (limit > 0) {
    filtered =
      filtered.slice(0, limit);
  }


  return filtered;
}


/* --------------------------------
   Events
-------------------------------- */

downloadBtn.addEventListener(
  "click",
  scoutImages
);


retryBtn.addEventListener(
  "click",
  scoutImages
);


downloadLinksBtn.addEventListener(
  "click",
  exportLinks
);


/* Enter = scout */

document
  .getElementById("filter")
  .addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Enter") {
        scoutImages();
      }
    }
  );