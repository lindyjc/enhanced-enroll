// TODO: Returns catalog course number

// Insert plot into html page 
const observer = new MutationObserver(() => {
    const buttons = document.querySelectorAll("button");
    const btn = buttons ? [...buttons].find(b => b.textContent.includes("See sections")) : null
    if (btn) {
        currentCourse(btn);
    }
})
observer.observe(document.body, { childList: true, subtree: true })

const currentCourse = (seeSectionsBtn) => {
    if (!seeSectionsBtn) {
        return
    }

    // Create button for displaying MadGrades plot in popup 
    const plotBtn = document.createElement("button")
    plotBtn.textContent = "Show MadGrades Plot"
    plotBtn.className = "madgrades-btn"
    seeSectionsBtn.insertAdjacentElement("afterend", plotBtn)

    // Create popup container 
    const popup = document.createElement("div")
    popup.id = "madgrades-popup"

    // Add plot inside of popup 
    const avgGradesPlotDiv = document.createElement("div")
    avgGradesPlotDiv.id = "madgrades-plot"
    popup.appendChild(avgGradesPlotDiv)

    plotBtn.addEventListener("click", () => {
        popup.style.display = "block"

        // TODO: Call Madgrades func (course catalog num) -> returns plot
    })

    // Button to close popup 
    const closeBtn = document.createElement("button")
    closeBtn.textContent = "Close"
    closeBtn.id = "close-btn"
    popup.appendChild(closeBtn)
    closeBtn.addEventListener("click", () => {
        popup.style.display = "none"
    })

    // // Click outside popup to close
    // window.addEventListener("click", (e) => {
    //     if (e.target === popup) {
    //         popup.style.display = "none"
    //     }
    // })
}

// TODO: Returns prof name
// TODO: Feed into RMP func -> returns avg rating for prof 
// TODO: Insert avg into html page 
const courseProfs = () => {
    // one-instructor ng-star-inserted
    // [...document.querySelectorAll(".parent-summary")]
} 