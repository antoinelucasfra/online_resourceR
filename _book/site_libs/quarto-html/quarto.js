const sectionChanged = new CustomEvent("quarto-sectionChanged", {
  detail: {},
  bubbles: true,
  cancelable: false,
  composed: false,
});

window.document.addEventListener("DOMContentLoaded", function (_event) {
  var tocEl = window.document.getElementById("TOC");
  var sidebarEl = window.document.getElementById("quarto-sidebar");
  var marginSidebarEl = window.document.getElementById("quarto-margin-sidebar");

  // function to determine whether the element has a previous sibling that is active
  const prevSiblingIsActiveLink = (el) => {
    const sibling = el.previousElementSibling;
    if (sibling && sibling.tagName === "A") {
      return sibling.classList.contains("active");
    } else {
      return false;
    }
  };

  // Track scrolling and mark TOC links as active
  // get table of contents and sidebar (bail if we don't have at least one)
  const tocLinks = tocEl
    ? [...tocEl.querySelectorAll("a[data-scroll-target]")]
    : [];
  const makeActive = (link) => tocLinks[link].classList.add("active");
  const removeActive = (link) => tocLinks[link].classList.remove("active");
  const removeAllActive = () =>
    [...Array(tocLinks.length).keys()].forEach((link) => removeActive(link));

  // activate the anchor for a section associated with this TOC entry
  tocLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (link.href.indexOf("#") !== -1) {
        const anchor = link.href.split("#")[1];
        const heading = window.document.querySelector(
          `[data-anchor-id=${anchor}]`
        );
        if (heading) {
          // Add the class
          heading.classList.add("reveal-anchorjs-link");

          // function to show the anchor
          const handleMouseout = () => {
            heading.classList.remove("reveal-anchorjs-link");
            heading.removeEventListener("mouseout", handleMouseout);
          };

          // add a function to clear the anchor when the user mouses out of it
          heading.addEventListener("mouseout", handleMouseout);
        }
      }
    });
  });

  const sections = tocLinks.map((link) => {
    const target = link.getAttribute("data-scroll-target");
    return window.document.querySelector(`${target}`);
  });

  const sectionMargin = 200;
  let currentActive = 0;
  // track whether we've initialized state the first time
  let init = false;

  const updateActiveLink = () => {
    // The index from bottom to top (e.g. reversed list)
    let sectionIndex = -1;
    if (
      window.innerHeight + window.pageYOffset >=
      window.document.body.offsetHeight
    ) {
      sectionIndex = 0;
    } else {
      sectionIndex = [...sections].reverse().findIndex((section) => {
        if (section) {
          return window.pageYOffset >= section.offsetTop - sectionMargin;
        } else {
          return false;
        }
      });
    }
    if (sectionIndex > -1) {
      const current = sections.length - sectionIndex - 1;
      if (current !== currentActive) {
        removeAllActive();
        currentActive = current;
        makeActive(current);
        if (init) {
          window.dispatchEvent(sectionChanged);
        }
        init = true;
      }
    }
  };

  const inHiddenRegion = (top, bottom, hiddenRegions) => {
    for (const region of hiddenRegions) {
      if (top <= region.bottom && bottom >= region.top) {
        return true;
      }
    }
    return false;
  };

  const manageSidebarVisiblity = (el, placeholderDescriptor) => {
    let isVisible = true;

    return (hiddenRegions) => {
      if (el === null) {
        return;
      }

      // Find the last element of the TOC
      const lastChildEl = el.lastElementChild;

      if (lastChildEl) {
        // Find the top and bottom o the element that is being managed
        const elTop = el.offsetTop;
        const elBottom =
          elTop + lastChildEl.offsetTop + lastChildEl.offsetHeight;

        // Converts the sidebar to a menu
        const convertToMenu = () => {
          const elBackground = window
            .getComputedStyle(window.document.body, null)
            .getPropertyValue("background");
          el.classList.add("rollup");

          for (const child of el.children) {
            child.style.opacity = 0;
          }

          const toggleContainer = window.document.createElement("div");
          toggleContainer.style.width = "100%";
          toggleContainer.classList.add("zindex-over-content");
          toggleContainer.classList.add("quarto-sidebar-toggle");
          toggleContainer.classList.add("headroom-target"); // Marks this to be managed by headeroom
          toggleContainer.id = placeholderDescriptor.id;
          toggleContainer.style.position = "fixed";

          const toggleIcon = window.document.createElement("i");
          toggleIcon.classList.add("quarto-sidebar-toggle-icon");
          toggleIcon.classList.add("bi");
          toggleIcon.classList.add("bi-caret-down-fill");

          const toggleTitle = window.document.createElement("div");
          const titleEl = window.document.body.querySelector(
            placeholderDescriptor.titleSelector
          );
          if (titleEl) {
            toggleTitle.append(titleEl.innerText, toggleIcon);
          }
          toggleTitle.classList.add("zindex-over-content");
          toggleTitle.classList.add("quarto-sidebar-toggle-title");
          toggleContainer.append(toggleTitle);

          const toggleContents = window.document.createElement("div");
          toggleContents.style.background = elBackground;
          toggleContents.classList = el.classList;
          toggleContents.classList.add("zindex-over-content");
          toggleContents.classList.add("quarto-sidebar-toggle-contents");
          for (const child of el.children) {
            if (child.id === "toc-title") {
              continue;
            }

            const clone = child.cloneNode(true);
            clone.style.opacity = 1;
            toggleContents.append(clone);
          }
          toggleContents.style.height = "0px";
          toggleContainer.append(toggleContents);
          el.parentElement.prepend(toggleContainer);

          // Process clicks
          let tocShowing = false;
          // Allow the caller to control whether this is dismissed
          // when it is clicked (e.g. sidebar navigation supports
          // opening and closing the nav tree, so don't dismiss on click)
          const clickEl = placeholderDescriptor.dismissOnClick
            ? toggleContainer
            : toggleTitle;

          const closeToggle = () => {
            if (tocShowing) {
              toggleContainer.classList.remove("expanded");
              toggleContents.style.height = "0px";
              tocShowing = false;
            }
          };

          const positionToggle = () => {
            // position the element (top left of parent, same width as parent)
            const elRect = el.getBoundingClientRect();
            toggleContainer.style.left = `${elRect.left}px`;
            toggleContainer.style.top = `${elRect.top}px`;
            toggleContainer.style.width = `${elRect.width}px`;
          };

          // Get rid of any expanded toggle if the user scrolls
          window.document.addEventListener(
            "scroll",
            throttle(() => {
              closeToggle();
            }, 50)
          );

          // Handle positioning of the toggle
          window.addEventListener(
            "resize",
            throttle(() => {
              positionToggle();
            }, 50)
          );
          positionToggle();

          // Process the click
          clickEl.onclick = () => {
            if (!tocShowing) {
              toggleContainer.classList.add("expanded");
              toggleContents.style.height = null;
              tocShowing = true;
            } else {
              closeToggle();
            }
          };
        };

        // Converts a sidebar from a menu back to a sidebar
        const convertToSidebar = () => {
          for (const child of el.children) {
            child.style.opacity = 1;
          }

          const placeholderEl = window.document.getElementById(
            placeholderDescriptor.id
          );
          if (placeholderEl) {
            placeholderEl.remove();
          }

          el.classList.remove("rollup");
        };

        if (isReaderMode()) {
          convertToMenu();
          isVisible = false;
        } else {
          if (!isVisible) {
            // If the element is current not visible reveal if there are
            // no conflicts with overlay regions
            if (!inHiddenRegion(elTop, elBottom, hiddenRegions)) {
              convertToSidebar();
              isVisible = true;
            }
          } else {
            // If the element is visible, hide it if it conflicts with overlay regions
            // and insert a placeholder toggle (or if we're in reader mode)
            if (inHiddenRegion(elTop, elBottom, hiddenRegions)) {
              convertToMenu();
              isVisible = false;
            }
          }
        }
      }
    };
  };

  const offsetEl = window.document.querySelector(
    `*[data-sidebar-align="true"]`
  );
  let offsetTopPadding = null;
  const positionSidebars = () => {
    if (offsetEl !== null) {
      if (offsetTopPadding === null) {
        offsetTopPadding = offsetEl.style.paddingTop;
      }
      const rect = offsetEl.getBoundingClientRect();
      const position = Math.max(rect.height, 0);

      const floating = window.document.querySelector("body.floating");
      const sidebarIds = ["quarto-margin-sidebar"];
      if (floating) {
        sidebarIds.push("quarto-sidebar");
      }
      sidebarIds.forEach((sidebarId) => {
        const sidebarEl = window.document.getElementById(sidebarId);
        if (sidebarEl) {
          sidebarEl.style.marginTop = `${position}px`;
          if (position > 0) {
            sidebarEl.style.paddingTop = "0.5em";
          } else {
            sidebarEl.style.paddingTop = offsetTopPadding;
          }
        }
      });
    }
  };
  positionSidebars();

  // Manage the visibility of the toc and the sidebar
  const marginScrollVisibility = manageSidebarVisiblity(marginSidebarEl, {
    id: "quarto-toc-toggle",
    titleSelector: "#toc-title",
    dismissOnClick: true,
  });
  const sidebarScrollVisiblity = manageSidebarVisiblity(sidebarEl, {
    id: "quarto-sidebarnav-toggle",
    titleSelector: ".title",
    dismissOnClick: false,
  });
  // Find the first element that uses formatting in special columns
  const conflictingEls = window.document.body.querySelectorAll(
    '[class^="column-"], [class*=" column-"], aside, [class*="margin-caption"], [class*=" margin-caption"], [class*="margin-ref"], [class*=" margin-ref"]'
  );

  // Filter all the possibly conflicting elements into ones
  // the do conflict on the left or ride side
  const arrConflictingEls = Array.from(conflictingEls);
  const leftSideConflictEls = arrConflictingEls.filter((el) => {
    if (el.tagName === "ASIDE") {
      return false;
    }
    return Array.from(el.classList).find((className) => {
      return (
        className !== "column-body" &&
        className.startsWith("column-") &&
        !className.endsWith("right") &&
        !className.endsWith("container") &&
        className !== "column-margin"
      );
    });
  });
  const rightSideConflictEls = arrConflictingEls.filter((el) => {
    if (el.tagName === "ASIDE") {
      return true;
    }

    const hasMarginCaption = Array.from(el.classList).find((className) => {
      return className == "margin-caption";
    });
    if (hasMarginCaption) {
      return true;
    }

    return Array.from(el.classList).find((className) => {
      return (
        className !== "column-body" &&
        !className.endsWith("container") &&
        className.startsWith("column-") &&
        !className.endsWith("left")
      );
    });
  });

  const kOverlapPaddingSize = 10;
  function toRegions(els) {
    return els.map((el) => {
      const top =
        el.getBoundingClientRect().top +
        document.documentElement.scrollTop -
        kOverlapPaddingSize;
      return {
        top,
        bottom: top + el.scrollHeight + 2 * kOverlapPaddingSize,
      };
    });
  }

  const hideOverlappedSidebars = () => {
    marginScrollVisibility(toRegions(rightSideConflictEls));
    sidebarScrollVisiblity(toRegions(leftSideConflictEls));
  };

  window.quartoToggleReader = () => {
    // Applies a slow class (or removes it)
    // to update the transition speed
    const slowTransition = (slow) => {
      const manageTransition = (id, slow) => {
        const el = document.getElementById(id);
        if (el) {
          if (slow) {
            el.classList.add("slow");
          } else {
            el.classList.remove("slow");
          }
        }
      };

      manageTransition("TOC", slow);
      manageTransition("quarto-sidebar", slow);
    };

    const readerMode = !isReaderMode();
    setReaderModeValue(readerMode);

    // If we're entering reader mode, slow the transition
    if (readerMode) {
      slowTransition(readerMode);
    }
    highlightReaderToggle(readerMode);
    hideOverlappedSidebars();

    // If we're exiting reader mode, restore the non-slow transition
    if (!readerMode) {
      slowTransition(!readerMode);
    }
  };

  const highlightReaderToggle = (readerMode) => {
    const els = document.querySelectorAll(".quarto-reader-toggle");
    if (els) {
      els.forEach((el) => {
        if (readerMode) {
          el.classList.add("reader");
        } else {
          el.classList.remove("reader");
        }
      });
    }
  };

  const setReaderModeValue = (val) => {
    if (window.location.protocol !== "file:") {
      window.localStorage.setItem("quarto-reader-mode", val);
    } else {
      localReaderMode = val;
    }
  };

  const isReaderMode = () => {
    if (window.location.protocol !== "file:") {
      return window.localStorage.getItem("quarto-reader-mode") === "true";
    } else {
      return localReaderMode;
    }
  };
  let localReaderMode = null;

  // Walk the TOC and collapse/expand nodes
  // Nodes are expanded if:
  // - they are top level
  // - they have children that are 'active' links
  // - they are directly below an link that is 'active'
  const walk = (el, depth) => {
    // Tick depth when we enter a UL
    if (el.tagName === "UL") {
      depth = depth + 1;
    }

    // It this is active link
    let isActiveNode = false;
    if (el.tagName === "A" && el.classList.contains("active")) {
      isActiveNode = true;
    }

    // See if there is an active child to this element
    let hasActiveChild = false;
    for (child of el.children) {
      hasActiveChild = walk(child, depth) || hasActiveChild;
    }

    // Process the collapse state if this is an UL
    if (el.tagName === "UL") {
      if (depth === 1 || hasActiveChild || prevSiblingIsActiveLink(el)) {
        el.classList.remove("collapse");
      } else {
        el.classList.add("collapse");
      }

      // untick depth when we leave a UL
      depth = depth - 1;
    }
    return hasActiveChild || isActiveNode;
  };

  // walk the TOC and expand / collapse any items that should be shown

  if (tocEl) {
    walk(tocEl, 0);
    updateActiveLink();
  }

  // Throttle the scroll event and walk peridiocally
  window.document.addEventListener(
    "scroll",
    throttle(() => {
      if (tocEl) {
        positionSidebars();
        updateActiveLink();
        walk(tocEl, 0);
      }
      if (!isReaderMode()) {
        hideOverlappedSidebars();
      }
    }, 5)
  );
  window.addEventListener(
    "resize",
    throttle(() => {
      if (tocEl) {
        positionSidebars();
      }

      if (!isReaderMode()) {
        hideOverlappedSidebars();
      }
    }, 10)
  );
  hideOverlappedSidebars();
  highlightReaderToggle(isReaderMode());
});

function throttle(func, wait) {
  var waiting = false;
  return function () {
    if (!waiting) {
      func.apply(this, arguments);
      waiting = true;
      setTimeout(function () {
        waiting = false;
      }, wait);
    }
  };
}
