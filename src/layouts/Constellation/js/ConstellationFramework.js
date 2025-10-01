/**
 * Constellation Framework - Main Class (Performance Optimized)
 */
class ConstellationFramework {
  constructor(config = {}) {
    this.config = {
      constellationName: config.constellationName || "Constellation",
      starData: config.starData || {},
      coordinateData: config.coordinateData || {
        ra: {
          value: "RA: 00h 00m",
          description: "Right Ascension coordinates for this constellation",
        },
        dec: {
          value: "Dec: +00°",
          description: "Declination coordinates for this constellation",
        },
      },
      astronomicalFacts: config.astronomicalFacts || [],
      starfieldCount: config.starfieldCount || 150,
      enableMouseTrail: config.enableMouseTrail !== false,
      enableTypingEffect: config.enableTypingEffect !== false,
      enableParallax: config.enableParallax !== false,
      ...config,
    };

    this.init();
  }

  init() {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initializeAll());
    } else {
      this.initializeAll();
    }
  }

  initializeAll() {
    this.createStarfield();
    this.initConstellationInteractions();
    this.initConstellationDrawing();
    this.initNebulaInteractions();
    this.initFactCardInteractions();
    this.initCoordinateInteractions();
    this.initScrollAnimations();

    if (this.config.enableParallax) this.initParallax();
    if (this.config.enableTypingEffect) this.initTypingEffect();
    if (this.config.enableMouseTrail) this.initMouseTrail();

    this.initStarGlowEffects();
    this.showInstructionTooltip();
  }

  createStarfield() {
    const starsContainer = document.querySelector(".constellation-starfield");
    if (!starsContainer) return;

    for (let i = 0; i < this.config.starfieldCount; i++) {
      const star = document.createElement("div");
      star.className = "star-point";

      const starSize = Math.random();
      let width, height, opacity;

      if (starSize < 0.7) {
        width = height = Math.random() * 1.5 + 0.5;
        opacity = Math.random() * 0.6 + 0.3;
      } else if (starSize < 0.9) {
        width = height = Math.random() * 2 + 1.5;
        opacity = Math.random() * 0.8 + 0.4;
      } else {
        width = height = Math.random() * 3 + 2;
        opacity = Math.random() * 0.9 + 0.5;
      }

      star.style.cssText = `
        position: absolute;
        width: ${width}px;
        height: ${width}px;
        background: white;
        border-radius: 50%;
        top: ${Math.random() * 100}%;
        left: ${Math.random() * 100}%;
        opacity: ${opacity};
        animation: constellation-twinkle ${Math.random() * 4 + 2}s infinite ease-in-out;
        animation-delay: ${Math.random() * 3}s;
        box-shadow: 0 0 ${width}px rgba(255, 255, 255, 0.3);
      `;
      starsContainer.appendChild(star);
    }
  }

  initConstellationInteractions() {
    const stars = document.querySelectorAll(".constellation-star");
    stars.forEach((star) => {
      star.addEventListener("mouseenter", (e) =>
        this.showStarTooltip(e.target),
      );
      star.addEventListener("mouseleave", () => this.hideStarTooltip());
      star.addEventListener("click", (e) => this.showStarInfo(e.target));
    });
  }

  showStarTooltip(star) {
    const name = star.getAttribute("data-name");
    if (!name) return;

    let tooltip = document.querySelector(".constellation-star-tooltip");
    if (!tooltip) {
      tooltip = document.createElement("div");
      tooltip.className = "constellation-star-tooltip";
      tooltip.style.cssText = `
        position: absolute;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        pointer-events: none;
        z-index: 1000;
        border: 1px solid rgba(74, 158, 255, 0.5);
        font-family: 'Courier New', monospace;
      `;
      document.body.appendChild(tooltip);
    }

    tooltip.textContent = name;
    tooltip.style.display = "block";

    const rect = star.getBoundingClientRect();
    tooltip.style.left =
      rect.left + rect.width / 2 - tooltip.offsetWidth / 2 + "px";
    tooltip.style.top = rect.top - tooltip.offsetHeight - 10 + "px";
  }

  hideStarTooltip() {
    const tooltip = document.querySelector(".constellation-star-tooltip");
    if (tooltip) tooltip.style.display = "none";
  }

  showStarInfo(star) {
    const starName = star.getAttribute("data-name");
    if (!starName) return;

    const info =
      this.config.starData[starName] ||
      `A beautiful star in the ${this.config.constellationName} constellation.`;

    let infoPanel = document.querySelector(".constellation-star-info-panel");
    if (!infoPanel) {
      infoPanel = document.createElement("div");
      infoPanel.className = "constellation-star-info-panel";
      infoPanel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 20px;
        border-radius: 8px;
        max-width: 300px;
        border: 1px solid rgba(74, 158, 255, 0.3);
        z-index: 1000;
        transform: translateY(100px);
        opacity: 0;
        transition: all 0.3s ease;
        font-family: 'Courier New', monospace;
      `;
      document.body.appendChild(infoPanel);
    }

    infoPanel.innerHTML = `
      <h3 style="color: #4a9eff; margin-bottom: 10px;">${starName}</h3>
      <p style="line-height: 1.5; font-size: 14px;">${info}</p>
      <button onclick="this.parentElement.style.transform='translateY(100px)'; this.parentElement.style.opacity='0';" 
              style="margin-top: 15px; background: transparent; border: 1px solid #4a9eff; color: #4a9eff; padding: 5px 15px; border-radius: 4px; cursor: pointer; font-family: inherit;">
          Close
      </button>
    `;

    setTimeout(() => {
      infoPanel.style.transform = "translateY(0)";
      infoPanel.style.opacity = "1";
    }, 100);
  }

  initConstellationDrawing() {
    const lines = document.querySelectorAll(".constellation-lines line");
    if (lines.length === 0) return;

    lines.forEach((line) => {
      const length = line.getTotalLength();
      line.style.strokeDasharray = length;
      line.style.strokeDashoffset = "0";
      line.style.transition = "stroke-dashoffset 0.8s ease";
    });

    const toggleButton = document.createElement("button");
    toggleButton.className = "constellation-toggle-btn";
    toggleButton.style.cssText = `
      position: absolute;
      top: 20px;
      right: 20px;
      background: rgba(74, 158, 255, 0.2);
      border: 1px solid #4a9eff;
      color: #4a9eff;
      padding: 0.8rem 1.5rem;
      border-radius: 25px;
      cursor: pointer;
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
      transition: all 0.3s ease;
      z-index: 100;
    `;

    const heroSection = document.querySelector(".constellation-hero");
    if (heroSection) heroSection.appendChild(toggleButton);

    let drawState = 2;
    let animationInterval = null;

    const updateButtonText = () => {
      switch (drawState) {
        case 0:
          toggleButton.textContent = "Draw Lines";
          break;
        case 1:
          toggleButton.textContent = "Animate Lines";
          break;
        case 2:
          toggleButton.textContent = "Hide Lines";
          break;
      }
    };

    const hideLines = () => {
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
      lines.forEach((line) => {
        line.style.strokeDashoffset = line.getTotalLength();
      });
    };

    const showLines = () => {
      if (animationInterval) {
        clearInterval(animationInterval);
        animationInterval = null;
      }
      lines.forEach((line, index) => {
        setTimeout(() => {
          line.style.strokeDashoffset = "0";
        }, index * 200);
      });
    };

    const startInfiniteAnimation = () => {
      if (animationInterval) clearInterval(animationInterval);

      let isDrawing = true;
      const animate = () => {
        if (isDrawing) {
          lines.forEach((line, index) => {
            setTimeout(() => {
              line.style.strokeDashoffset = "0";
            }, index * 150);
          });
        } else {
          lines.forEach((line, index) => {
            setTimeout(() => {
              line.style.strokeDashoffset = line.getTotalLength();
            }, index * 150);
          });
        }
        isDrawing = !isDrawing;
      };

      animate();
      animationInterval = setInterval(animate, 3000);
    };

    updateButtonText();
    startInfiniteAnimation();

    toggleButton.addEventListener("click", () => {
      drawState = (drawState + 1) % 3;
      updateButtonText();

      switch (drawState) {
        case 0:
          hideLines();
          break;
        case 1:
          showLines();
          break;
        case 2:
          startInfiniteAnimation();
          break;
      }
    });

    toggleButton.addEventListener("mouseenter", function () {
      this.style.background = "rgba(74, 158, 255, 0.3)";
      this.style.transform = "scale(1.05)";
    });

    toggleButton.addEventListener("mouseleave", function () {
      this.style.background = "rgba(74, 158, 255, 0.2)";
      this.style.transform = "scale(1)";
    });
  }

  initNebulaInteractions(root = document.body) {
    // Regex to match "nebula", "nebulae", or "nebulas" (case-insensitive)
    const nebulaRegex = /\b(nebula(?:e|s)?)\b/gi;

    // Use TreeWalker to efficiently find text nodes containing "nebula"
    const walker = document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const txt = node.nodeValue;
          if (!txt || !txt.trim()) return NodeFilter.FILTER_REJECT;

          const parent = node.parentNode;
          if (!parent) return NodeFilter.FILTER_REJECT;

          // Skip nodes inside these tags
          const skipTags = /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|INPUT|IFRAME)$/i;
          if (skipTags.test(parent.nodeName)) return NodeFilter.FILTER_REJECT;

          return txt.toLowerCase().includes("nebula")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
      false,
    );

    // Collect nodes first (so DOM changes don't break the walker)
    const textNodes = [];
    let cur;
    while ((cur = walker.nextNode())) textNodes.push(cur);

    // Replace matches in each text node
    textNodes.forEach((node) => {
      const original = node.nodeValue;
      const replaced = original.replace(
        nebulaRegex,
        '<span class="nebula-hover" title="A nebula is a giant cloud of dust and gas in space, often where stars are born or die">$1</span>',
      );

      if (replaced === original) return; // nothing changed

      // Build fragment from HTML to preserve inline flow & multiple nodes
      const wrapper = document.createElement("span");
      wrapper.innerHTML = replaced;
      const frag = document.createDocumentFragment();
      while (wrapper.firstChild) frag.appendChild(wrapper.firstChild);

      node.parentNode.replaceChild(frag, node);
    });

    // Inject style once
    if (!document.getElementById("nebula-hover-style")) {
      const style = document.createElement("style");
      style.id = "nebula-hover-style";
      style.textContent = `
      .nebula-hover {
        border-bottom: 1px dotted #4a9eff;
        cursor: help;
        position: relative;
      }
      .nebula-hover:hover {
        color: #4a9eff;
      }
    `;
      document.head.appendChild(style);
    }
  }

  getTextNodes(element) {
    const textNodes = [];
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null,
      false,
    );
    let node;
    while ((node = walker.nextNode())) {
      if (node.textContent.trim()) {
        textNodes.push(node);
      }
    }
    return textNodes;
  }

  initFactCardInteractions() {
    const factCards = document.querySelectorAll(".constellation-fact-card");
    factCards.forEach((card) => {
      card.addEventListener("mouseenter", function () {
        this.style.transform = "translateY(-5px)";
        this.style.boxShadow = "0 10px 30px rgba(74, 158, 255, 0.2)";
      });

      card.addEventListener("mouseleave", function () {
        this.style.transform = "translateY(0)";
        this.style.boxShadow = "none";
      });
    });
  }

  initCoordinateInteractions() {
    const coordinates = document.querySelector(".constellation-coordinates");
    if (!coordinates) return;

    const spans = coordinates.querySelectorAll("span");
    spans.forEach((span) => {
      span.style.cursor = "pointer";
      span.style.transition = "all 0.3s ease";

      span.addEventListener("click", (e) => {
        const text = e.target.textContent;
        this.showCoordinateCard(text, e.target);
      });

      span.addEventListener("mouseenter", function () {
        this.style.color = "#4a9eff";
        this.style.textShadow = "0 0 10px rgba(74, 158, 255, 0.5)";
      });

      span.addEventListener("mouseleave", function () {
        this.style.color = "";
        this.style.textShadow = "";
      });
    });
  }

  showCoordinateCard(coordinateText, element) {
    // Remove existing card
    const existingCard = document.querySelector(".coordinate-info-card");
    if (existingCard) existingCard.remove();

    const card = document.createElement("div");
    card.className = "coordinate-info-card";

    let title,
      content,
      additionalInfo = "";

    if (coordinateText.includes("RA:")) {
      title = "Right Ascension (RA)";

      // Extract specific constellation info if available
      if (this.config.constellationName === "Sagittarius") {
        additionalInfo = `
          <div class="coordinate-specific-info">
            <h4>Sagittarius RA Range</h4>
            <p>Sagittarius spans from approximately 18h to 20h in Right Ascension, making it visible during summer months in the Northern Hemisphere.</p>
            <p><strong>Best Viewing:</strong> July-August around midnight</p>
          </div>
        `;
      }

      content = `
        <p><strong>Current Value:</strong> ${coordinateText}</p>
        <p>Right Ascension is like longitude on Earth's surface, but projected onto the celestial sphere. It's measured in hours, minutes, and seconds (24 hours = 360°).</p>
        <p><strong>Educational Note:</strong> RA coordinates help astronomers locate objects in the sky. This measurement remains relatively constant as it's tied to distant stars.</p>
        ${additionalInfo}
      `;
    } else if (coordinateText.includes("Dec:")) {
      title = "Declination (Dec)";

      // Extract specific constellation info if available
      if (this.config.constellationName === "Sagittarius") {
        additionalInfo = `
          <div class="coordinate-specific-info">
            <h4>Sagittarius Dec Range</h4>
            <p>Sagittarius ranges from approximately -45° to -12° in Declination, placing it in the southern celestial hemisphere.</p>
            <p><strong>Visibility:</strong> Best seen from southern latitudes, partially visible from northern locations</p>
          </div>
        `;
      }

      content = `
        <p><strong>Current Value:</strong> ${coordinateText}</p>
        <p>Declination is like latitude on Earth's surface, but projected onto the celestial sphere. It's measured in degrees from the celestial equator.</p>
        <p><strong>Educational Note:</strong> Positive declination means the object is north of the celestial equator, negative means south. This helps determine visibility from different locations on Earth.</p>
        ${additionalInfo}
      `;
    }

    card.innerHTML = `
      <div class="coordinate-card-header">
        <h3>${title}</h3>
        <button class="coordinate-card-close">&times;</button>
      </div>
      <div class="coordinate-card-content">
        ${content}
      </div>
    `;

    card.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) scale(0.8);
      background: rgba(0, 0, 0, 0.95);
      border: 1px solid rgba(74, 158, 255, 0.3);
      border-radius: 12px;
      padding: 0;
      max-width: 400px;
      width: 90%;
      z-index: 1000;
      opacity: 0;
      transition: all 0.3s ease;
      font-family: 'Courier New', monospace;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    `;

    // Add styles for card components
    const cardStyle = document.createElement("style");
    cardStyle.textContent = `
      .coordinate-card-header {
        background: linear-gradient(135deg, rgba(74, 158, 255, 0.2), rgba(74, 158, 255, 0.1));
        padding: 1rem 1.5rem;
        border-bottom: 1px solid rgba(74, 158, 255, 0.2);
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-radius: 12px 12px 0 0;
      }
      .coordinate-card-header h3 {
        color: #4a9eff;
        margin: 0;
        font-size: 1.2rem;
      }
      .coordinate-card-close {
        background: none;
        border: none;
        color: #4a9eff;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.2s ease;
      }
      .coordinate-card-close:hover {
        background: rgba(74, 158, 255, 0.2);
        transform: scale(1.1);
      }
      .coordinate-card-content {
        padding: 1.5rem;
        color: #e0e0e0;
        line-height: 1.6;
      }
      .coordinate-card-content p {
        margin-bottom: 1rem;
      }
      .coordinate-card-content strong {
        color: #4a9eff;
      }
      .coordinate-specific-info {
        margin-top: 1.5rem;
        padding: 1rem;
        background: rgba(74, 158, 255, 0.05);
        border-left: 3px solid #4a9eff;
        border-radius: 0 8px 8px 0;
      }
      .coordinate-specific-info h4 {
        color: #4a9eff;
        margin: 0 0 0.5rem 0;
        font-size: 1rem;
      }
      .coordinate-specific-info p {
        margin-bottom: 0.5rem;
        font-size: 0.9rem;
      }
    `;
    document.head.appendChild(cardStyle);

    document.body.appendChild(card);

    // Animate in
    setTimeout(() => {
      card.style.opacity = "1";
      card.style.transform = "translate(-50%, -50%) scale(1)";
    }, 10);

    // Close functionality
    const closeBtn = card.querySelector(".coordinate-card-close");
    const closeCard = () => {
      card.style.opacity = "0";
      card.style.transform = "translate(-50%, -50%) scale(0.8)";
      setTimeout(() => card.remove(), 300);
    };

    closeBtn.addEventListener("click", closeCard);

    // Close on outside click
    document.addEventListener("click", function closeOnOutside(e) {
      if (!card.contains(e.target) && !element.contains(e.target)) {
        closeCard();
        document.removeEventListener("click", closeOnOutside);
      }
    });

    // Close on escape key
    document.addEventListener("keydown", function closeOnEscape(e) {
      if (e.key === "Escape") {
        closeCard();
        document.removeEventListener("keydown", closeOnEscape);
      }
    });
  }

  initScrollAnimations() {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: "0px 0px -50px 0px",
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = "1";
          entry.target.style.transform = "translateY(0)";
        }
      });
    }, observerOptions);

    const animatedElements = document.querySelectorAll(
      ".constellation-fact-card, .constellation-nebula-item, .constellation-culture-item",
    );
    animatedElements.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(30px)";
      el.style.transition = "all 0.6s ease";
      observer.observe(el);
    });
  }

  initParallax() {
    window.addEventListener("scroll", () => {
      const scrolled = window.pageYOffset;
      const parallaxElements = document.querySelectorAll(
        ".constellation-starfield",
      );

      parallaxElements.forEach((element) => {
        const speed = 0.5;
        element.style.transform = `translateY(${scrolled * speed}px)`;
      });
    });
  }

  initTypingEffect() {
    const typeElements = document.querySelectorAll(".constellation-subtitle");
    typeElements.forEach((element) => {
      const text = element.textContent;
      element.textContent = "";
      element.style.borderRight = "2px solid #4a9eff";

      let i = 0;
      const typeWriter = () => {
        if (i < text.length) {
          element.textContent += text.charAt(i);
          i++;
          setTimeout(typeWriter, 100);
        } else {
          setTimeout(() => {
            element.style.borderRight = "none";
          }, 1000);
        }
      };

      setTimeout(typeWriter, 1000);
    });
  }

  initMouseTrail() {
    return;
    const trail = [];
    const trailLength = 10;

    document.addEventListener("mousemove", (e) => {
      trail.push({ x: e.clientX, y: e.clientY, time: Date.now() });

      if (trail.length > trailLength) {
        trail.shift();
      }

      this.updateTrail(trail);
    });
  }

  updateTrail(trail) {
    let existingTrail = document.querySelector(".mouse-trail-container");
    if (!existingTrail) {
      existingTrail = document.createElement("div");
      existingTrail.className = "mouse-trail-container";
      existingTrail.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        pointer-events: none;
        z-index: 9999;
        width: 100%;
        height: 100%;
      `;
      document.body.appendChild(existingTrail);
    }

    existingTrail.innerHTML = "";

    trail.forEach((point, index) => {
      const dot = document.createElement("div");
      const opacity = ((index + 1) / trail.length) * 0.5;
      const size = ((index + 1) / trail.length) * 4;

      dot.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        background: rgba(74, 158, 255, ${opacity});
        border-radius: 50%;
        left: ${point.x - size / 2}px;
        top: ${point.y - size / 2}px;
        transition: opacity 0.3s ease;
      `;

      existingTrail.appendChild(dot);
    });
  }

  initStarGlowEffects() {
    const stars = document.querySelectorAll(".constellation-star");
    stars.forEach((star) => {
      star.addEventListener("mouseenter", function () {
        this.style.filter = "drop-shadow(0 0 10px #4a9eff)";
      });

      star.addEventListener("mouseleave", function () {
        this.style.filter = "";
      });
    });
  }

  showInstructionTooltip() {
    // Removed to prevent popup interruptions as requested in context
  }

  // Static method to create constellation configurations
  static createConstellationConfig(name, options = {}) {
    const baseConfig = {
      constellationName: name,
      starData: options.starData || {},
      coordinateData: {
        ra: {
          value: options.ra || "RA: 00h 00m",
          description:
            options.raDescription || `Right Ascension coordinates for ${name}`,
        },
        dec: {
          value: options.dec || "Dec: +00°",
          description:
            options.decDescription || `Declination coordinates for ${name}`,
        },
      },
      astronomicalFacts: options.astronomicalFacts || [],
      enableMouseTrail: options.enableMouseTrail !== false,
      enableTypingEffect: options.enableTypingEffect !== false,
      enableParallax: options.enableParallax !== false,
      starfieldCount: options.starfieldCount || 150,
    };

    return baseConfig;
  }

  static addNebulaTooltips(customTooltipText) {
    const defaultTooltip =
      "A nebula is a giant cloud of dust and gas in space, often where stars are born or die";
    const tooltipText = customTooltipText || defaultTooltip;

    if (!document.getElementById("nebula-tooltip-style")) {
      const style = document.createElement("style");
      style.id = "nebula-tooltip-style";
      style.textContent = `
      .nebula-hover {
        border-bottom: 1px dotted #4a9eff;
        cursor: help;
        position: relative;
      }
      .nebula-hover::after {
        content: attr(data-nebula-tooltip);
        display: inline-block;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.95);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: normal;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s ease;
        z-index: 1000;
        border: 1px solid rgba(74, 158, 255, 0.3);
        max-width: 300px;
        box-sizing: border-box;
      }
      .nebula-hover:hover::after,
      .nebula-hover:focus::after {
        opacity: 1;
      }
    `;
      document.head.appendChild(style);
    }

    document.querySelectorAll(".nebula-hover").forEach((el) => {
      if (!el.hasAttribute("data-nebula-tooltip")) {
        el.setAttribute("data-nebula-tooltip", tooltipText);
      }
      if (!el.getAttribute("title")) el.setAttribute("title", tooltipText);
    });
  }
}

export default ConstellationFramework;
